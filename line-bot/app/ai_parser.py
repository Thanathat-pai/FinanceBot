import json
import os
from typing import Optional

import anthropic

_client: Optional[anthropic.Anthropic] = None

SYSTEM_PROMPT = """คุณเป็นผู้ช่วยบัญชีร้านค้า แปลงข้อความเป็น JSON เท่านั้น ไม่มีข้อความอื่น

คำที่หมายถึงรายรับ (income): ขาย ขายได้ รับเงิน ยอดขาย รายรับ ได้รับ รับมา ขายออก
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
"จ่ายค่าของสด 350" → {"type":"expense","item":"ของสด","quantity":null,"unit_price":null,"amount":350,"description":"ค่าของสด"}
"รับค่าบุหรี่ 50" → {"type":"income","item":"บุหรี่","quantity":null,"unit_price":null,"amount":50,"description":"รับค่าบุหรี่"}
"ขายบุหรี่ 3 ซอง 60 บาท" → {"type":"income","item":"บุหรี่","quantity":3,"unit_price":60,"amount":180,"description":"ขายบุหรี่ 3 ซอง"}"""


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    return _client


def parse(text: str) -> dict:
    try:
        response = _get_client().messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=150,
            temperature=0,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": text}],
        )
        raw = response.content[0].text.strip()
        return json.loads(raw)
    except Exception:
        return {"type": "unknown"}
