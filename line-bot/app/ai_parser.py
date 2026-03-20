import json
import os
import re
from typing import Optional

import anthropic

_client: Optional[anthropic.Anthropic] = None

SYSTEM_PROMPT = """คุณเป็นผู้ช่วยบัญชีร้านค้า แปลงข้อความเป็น JSON เท่านั้น ไม่มีข้อความอื่น

คำที่หมายถึงรายรับ (income): ขาย ขายได้ รับเงิน ยอดขาย รายรับ ได้รับ รับมา ขายออก รับค่า
คำที่หมายถึงรายจ่าย (expense): ซื้อ จ่าย ค่า รายจ่าย จ่ายออก ซื้อของ ค่าใช้จ่าย

รูปแบบ JSON:
{"type":"income หรือ expense","item":"ชื่อสินค้า/รายการ","quantity":จำนวน_หรือ_null,"unit_price":ราคาต่อหน่วย_หรือ_null,"amount":ราคารวม,"description":"ข้อความสรุปสั้น"}

คำสั่ง:
{"type":"summary_today"}  ← สรุป, วันนี้, ยอดวันนี้
{"type":"summary_month"}  ← เดือนนี้, สรุปเดือน, ยอดเดือน
{"type":"help"}           ← help, วิธีใช้
{"type":"unknown"}        ← ไม่เข้าใจ

ตัวอย่าง:
"ขายน้ำ 10 ขวด 20 บาท" → {"type":"income","item":"น้ำ","quantity":10,"unit_price":20,"amount":200,"description":"ขายน้ำ 10 ขวด"}
"ขายกาแฟ 5 แก้ว 35" → {"type":"income","item":"กาแฟ","quantity":5,"unit_price":35,"amount":175,"description":"ขายกาแฟ 5 แก้ว"}
"รายรับ ขายขนม 150" → {"type":"income","item":"ขนม","quantity":null,"unit_price":null,"amount":150,"description":"ขายขนม"}
"ซื้อน้ำตาล 2 กิโล 25" → {"type":"expense","item":"น้ำตาล","quantity":2,"unit_price":25,"amount":50,"description":"ซื้อน้ำตาล 2 กิโล"}
"รายจ่าย ค่าไฟ 800" → {"type":"expense","item":"ค่าไฟ","quantity":null,"unit_price":null,"amount":800,"description":"ค่าไฟ"}
"รับค่าบุหรี่ 50" → {"type":"income","item":"บุหรี่","quantity":null,"unit_price":null,"amount":50,"description":"รับค่าบุหรี่"}"""

# --- Keyword fallback (ทำงานได้แม้ Claude API ล้มเหลว) ---
_INCOME_KW = ["ขาย", "รับ", "รายรับ", "ยอดขาย", "ได้รับ"]
_EXPENSE_KW = ["ซื้อ", "จ่าย", "รายจ่าย", "ค่า"]


def _fallback_parse(text: str) -> dict:
    numbers = re.findall(r"\d+(?:\.\d+)?", text)
    if not numbers:
        return {"type": "unknown"}

    amount = float(numbers[-1])
    lower = text.lower()
    is_income = any(kw in lower for kw in _INCOME_KW)
    is_expense = any(kw in lower for kw in _EXPENSE_KW)

    if is_income and not is_expense:
        type_ = "income"
    elif is_expense:
        type_ = "expense"
    else:
        return {"type": "unknown"}

    # ดึงชื่อรายการออกจากข้อความ (ตัดตัวเลขและคำสั่วไปออก)
    item = re.sub(r"\d+(?:\.\d+)?", "", text)
    item = re.sub(r"\b(บาท|ขวด|แก้ว|กิโล|ชิ้น|อัน|ถุง|กล่อง|แผ่น)\b", "", item)
    item = item.strip(" .")

    return {
        "type": type_,
        "item": item or text,
        "quantity": None,
        "unit_price": None,
        "amount": amount,
        "description": text,
    }


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    return _client


def parse(text: str) -> dict:
    # ลอง Claude ก่อน
    try:
        response = _get_client().messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=150,
            temperature=0,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": text}],
        )
        raw = response.content[0].text.strip()
        result = json.loads(raw)
        print(f"[AI] '{text}' → {result}")
        return result
    except Exception as e:
        print(f"[AI ERROR] '{text}' → {type(e).__name__}: {e}")

    # Fallback: regex keyword matching
    result = _fallback_parse(text)
    print(f"[FALLBACK] '{text}' → {result}")
    return result
