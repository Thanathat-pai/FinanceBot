from datetime import datetime, timezone, timedelta

from sqlalchemy.orm import Session

from app import ai_parser, crud

TH_TZ = timezone(timedelta(hours=7))

_COMMANDS = {
    "summary_today": ["สรุป", "วันนี้", "ดูยอด", "ยอดวันนี้"],
    "summary_month": ["เดือนนี้", "สรุปเดือน", "ยอดเดือน"],
    "help": ["help", "ช่วย", "วิธีใช้", "คำสั่ง"],
}

HELP_TEXT = (
    "🏪 Finance Bot ร้านค้า — วิธีใช้งาน\n\n"
    "📥 บันทึกรายรับ:\n"
    "  ขายน้ำ 10 ขวด 20 บาท\n"
    "  ขายกาแฟ 5 แก้ว 35\n"
    "  รายรับ ขายขนม 150\n"
    "  รับค่าบุหรี่ 50\n\n"
    "📤 บันทึกรายจ่าย:\n"
    "  ซื้อน้ำตาล 2 กิโล 25 บาท\n"
    "  รายจ่าย ค่าไฟ 800\n"
    "  จ่ายค่าของสด 350\n\n"
    "📊 ดูสรุป:\n"
    "  สรุป / วันนี้  →  ยอดวันนี้\n"
    "  เดือนนี้       →  ยอดเดือนนี้\n\n"
    "💡 พิมพ์ได้หลายรูปแบบ ระบบ AI จัดการให้อัตโนมัติ"
)


def _fmt(amount) -> str:
    return f"฿{float(amount):,.2f}"


def _fmt_qty(qty) -> str:
    v = float(qty)
    return f"{v:,.0f}" if v == int(v) else f"{v:,.2f}"


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
    if action == "help":
        return HELP_TEXT
    if action in ("income", "expense"):
        return _save(db, user_id, action, parsed)

    return "ไม่เข้าใจ 🤔\nพิมพ์ help เพื่อดูวิธีใช้"


def _save(db: Session, user_id: str, type_: str, parsed: dict) -> str:
    amount = parsed.get("amount")
    if not amount or float(amount) <= 0:
        return "ระบุจำนวนเงินด้วยนะ 💰\nเช่น: ขายน้ำ 10 ขวด 20 บาท"

    item_name = parsed.get("item") or parsed.get("description", "")
    quantity = parsed.get("quantity")
    unit_price = parsed.get("unit_price")
    description = parsed.get("description", item_name)

    crud.save_transaction(
        db, user_id, type_, float(amount), description,
        item_name=item_name, quantity=quantity, unit_price=unit_price,
    )

    now_th = datetime.now(TH_TZ)
    icon = "📥" if type_ == "income" else "📤"
    type_th = "รายรับ" if type_ == "income" else "รายจ่าย"

    lines = [f"{icon} บันทึกแล้ว!", f"ประเภท: {type_th}"]

    if quantity and unit_price:
        lines.append(f"สินค้า: {item_name}")
        lines.append(f"จำนวน: {_fmt_qty(quantity)} × {_fmt(unit_price)}")
        lines.append(f"รวม:   {_fmt(amount)}")
    else:
        lines.append(f"รายการ: {item_name}")
        lines.append(f"จำนวน: {_fmt(amount)}")

    lines.append(f"เวลา:  {now_th.strftime('%H:%M น.')}")
    return "\n".join(lines)


def _build_today(db: Session, user_id: str) -> str:
    rows = crud.get_today_transactions(db, user_id)
    income_rows = [r for r in rows if r.type == "income"]
    expense_rows = [r for r in rows if r.type == "expense"]
    income = sum(float(r.amount) for r in income_rows)
    expense = sum(float(r.amount) for r in expense_rows)
    net = income - expense

    now_th = datetime.now(TH_TZ)
    lines = [f"📊 ยอดวันนี้ {now_th.strftime('%d/%m/%Y')}", ""]
    lines.append(f"📥 รายรับ   {_fmt(income)}")
    lines.append(f"📤 รายจ่าย  {_fmt(expense)}")
    lines.append(f"{'✅' if net >= 0 else '⚠️'} กำไร    {_fmt(net)}")

    if income_rows:
        lines.append("\nรายรับล่าสุด:")
        for r in income_rows[-5:]:
            name = r.item_name or r.description
            if r.quantity and r.unit_price:
                lines.append(f"  📥 {name} {_fmt_qty(r.quantity)}×{_fmt(r.unit_price)} = {_fmt(r.amount)}")
            else:
                lines.append(f"  📥 {name}  {_fmt(r.amount)}")

    if expense_rows:
        lines.append("\nรายจ่ายล่าสุด:")
        for r in expense_rows[-3:]:
            name = r.item_name or r.description
            lines.append(f"  📤 {name}  {_fmt(r.amount)}")

    if not rows:
        lines.append("\nยังไม่มีรายการวันนี้")

    return "\n".join(lines)


def _build_month(db: Session, user_id: str) -> str:
    rows = crud.get_month_transactions(db, user_id)
    income = sum(float(r.amount) for r in rows if r.type == "income")
    expense = sum(float(r.amount) for r in rows if r.type == "expense")
    net = income - expense

    # รายรับแยกตามสินค้า
    income_by_item: dict[str, float] = {}
    for r in rows:
        if r.type == "income":
            key = r.item_name or r.description
            income_by_item[key] = income_by_item.get(key, 0) + float(r.amount)

    expense_by_item: dict[str, float] = {}
    for r in rows:
        if r.type == "expense":
            key = r.item_name or r.description
            expense_by_item[key] = expense_by_item.get(key, 0) + float(r.amount)

    now_th = datetime.now(TH_TZ)
    month_names = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
                   "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]
    month_th = month_names[now_th.month]
    year_be = now_th.year + 543

    lines = [f"📅 สรุป{month_th} {year_be} ({len(rows)} รายการ)", ""]
    lines.append(f"📥 รายรับ   {_fmt(income)}")
    lines.append(f"📤 รายจ่าย  {_fmt(expense)}")
    lines.append(f"{'✅' if net >= 0 else '⚠️'} กำไร    {_fmt(net)}")

    if income_by_item:
        lines.append("\nสินค้าขายดี:")
        for item, amt in sorted(income_by_item.items(), key=lambda x: -x[1])[:5]:
            lines.append(f"  {item}  {_fmt(amt)}")

    if expense_by_item:
        lines.append("\nรายจ่ายหลัก:")
        for item, amt in sorted(expense_by_item.items(), key=lambda x: -x[1])[:3]:
            lines.append(f"  {item}  {_fmt(amt)}")

    if not rows:
        lines.append("\nยังไม่มีรายการเดือนนี้")

    return "\n".join(lines)
