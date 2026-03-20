from datetime import datetime, timezone, timedelta

from sqlalchemy.orm import Session

from app import ai_parser, crud

TH_TZ = timezone(timedelta(hours=7))

# Fast-path patterns — checked before calling Claude
_COMMANDS = {
    "summary_today": ["สรุป", "วันนี้", "ดูยอด", "ยอดวันนี้"],
    "summary_month": ["เดือนนี้", "สรุปเดือน", "ยอดเดือน"],
    "help": ["help", "ช่วย", "วิธีใช้", "คำสั่ง"],
}

HELP_TEXT = (
    "🤖 Finance Bot วิธีใช้งาน\n\n"
    "📝 บันทึกรายการ:\n"
    '  พิมพ์ "ชื่อรายการ จำนวนเงิน"\n'
    "  เช่น:\n"
    "  ข้าวเที่ยง 85\n"
    "  กาแฟ 60\n"
    "  เงินเดือน 35000\n"
    "  แท็กซี่ 150\n\n"
    "📊 ดูสรุป:\n"
    "  สรุป / วันนี้  →  สรุปวันนี้\n"
    "  เดือนนี้       →  สรุปเดือนนี้\n\n"
    "💡 ระบบ AI จะแยกรายรับ/รายจ่ายให้อัตโนมัติ"
)


def _fmt(amount) -> str:
    return f"฿{float(amount):,.2f}"


def _detect_fast_command(text: str) -> str | None:
    lower = text.lower().strip()
    for cmd, patterns in _COMMANDS.items():
        if any(p in lower for p in patterns):
            return cmd
    return None


def handle_text(db: Session, user_id: str, text: str) -> str:
    cmd = _detect_fast_command(text)
    if cmd == "help":
        return HELP_TEXT
    if cmd == "summary_today":
        return _build_today(db, user_id)
    if cmd == "summary_month":
        return _build_month(db, user_id)

    parsed = ai_parser.parse(text)
    action = parsed.get("type", "unknown")

    if action == "summary_today":
        return _build_today(db, user_id)
    if action == "summary_month":
        return _build_month(db, user_id)
    if action in ("income", "expense"):
        return _save(db, user_id, action, parsed)

    return "ไม่เข้าใจ 🤔\nพิมพ์ help เพื่อดูวิธีใช้"


def _save(db: Session, user_id: str, type_: str, parsed: dict) -> str:
    amount = parsed.get("amount")
    if not amount or float(amount) <= 0:
        return "ระบุจำนวนเงินด้วยนะ 💰\nเช่น: ข้าวเที่ยง 85"

    description = parsed.get("description", "")
    crud.save_transaction(db, user_id, type_, float(amount), description)

    now_th = datetime.now(TH_TZ)
    icon = "💰" if type_ == "income" else "💸"
    type_th = "รายรับ" if type_ == "income" else "รายจ่าย"
    return (
        f"{icon} บันทึกแล้ว!\n"
        f"ประเภท: {type_th}\n"
        f"จำนวน: {_fmt(amount)}\n"
        f"รายการ: {description}\n"
        f"เวลา: {now_th.strftime('%H:%M น.')}"
    )


def _build_today(db: Session, user_id: str) -> str:
    rows = crud.get_today_transactions(db, user_id)
    income = sum(float(r.amount) for r in rows if r.type == "income")
    expense = sum(float(r.amount) for r in rows if r.type == "expense")
    net = income - expense

    now_th = datetime.now(TH_TZ)
    lines = [f"📊 สรุปวันนี้ {now_th.strftime('%d/%m/%Y')}", ""]
    lines.append(f"💰 รายรับ   {_fmt(income)}")
    lines.append(f"💸 รายจ่าย  {_fmt(expense)}")
    lines.append(f"{'✅' if net >= 0 else '⚠️'} คงเหลือ   {_fmt(net)}")

    if rows:
        lines.append("\nรายการล่าสุด:")
        for r in rows[-5:]:
            icon = "↑" if r.type == "income" else "↓"
            lines.append(f"  {icon} {r.description}  {_fmt(r.amount)}")
    else:
        lines.append("\nยังไม่มีรายการวันนี้")

    return "\n".join(lines)


def _build_month(db: Session, user_id: str) -> str:
    rows = crud.get_month_transactions(db, user_id)
    income = sum(float(r.amount) for r in rows if r.type == "income")
    expense = sum(float(r.amount) for r in rows if r.type == "expense")
    net = income - expense

    expense_by_desc: dict[str, float] = {}
    for r in rows:
        if r.type == "expense":
            expense_by_desc[r.description] = expense_by_desc.get(r.description, 0) + float(r.amount)

    now_th = datetime.now(TH_TZ)
    month_names = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
                   "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]
    month_th = month_names[now_th.month]
    year_be = now_th.year + 543  # Buddhist Era

    lines = [f"📅 สรุป{month_th} {year_be}", ""]
    lines.append(f"💰 รายรับ   {_fmt(income)}")
    lines.append(f"💸 รายจ่าย  {_fmt(expense)}")
    lines.append(f"{'✅' if net >= 0 else '⚠️'} คงเหลือ   {_fmt(net)}")

    if not rows:
        lines.append("\nยังไม่มีรายการเดือนนี้")
        return "\n".join(lines)

    top = sorted(expense_by_desc.items(), key=lambda x: -x[1])[:5]
    if top:
        lines.append(f"\nรายจ่ายสูงสุด ({len(rows)} รายการ):")
        for desc, amt in top:
            lines.append(f"  {desc}  {_fmt(amt)}")
        if len(expense_by_desc) > 5:
            lines.append(f"  ...และอีก {len(expense_by_desc) - 5} รายการ")

    return "\n".join(lines)
