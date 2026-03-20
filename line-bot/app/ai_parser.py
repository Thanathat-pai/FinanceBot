import json
import os
from typing import Optional

import anthropic

_client: Optional[anthropic.Anthropic] = None

SYSTEM_PROMPT = """แปลงข้อความภาษาไทยเกี่ยวกับการเงินเป็น JSON เท่านั้น ไม่มีข้อความอื่น

รูปแบบ:
- รายจ่าย: {"type":"expense","amount":จำนวน,"description":"ชื่อรายการ"}
- รายรับ: {"type":"income","amount":จำนวน,"description":"ชื่อรายการ"}
- สรุปวันนี้: {"type":"summary_today"}
- สรุปเดือน: {"type":"summary_month"}
- ไม่รู้: {"type":"unknown"}

ตัวอย่าง:
"ข้าวเที่ยง 85" → {"type":"expense","amount":85,"description":"ข้าวเที่ยง"}
"กาแฟ starbucks 180" → {"type":"expense","amount":180,"description":"กาแฟ starbucks"}
"เงินเดือน 35000" → {"type":"income","amount":35000,"description":"เงินเดือน"}
"แท็กซี่ไปออฟฟิศ 200" → {"type":"expense","amount":200,"description":"แท็กซี่ไปออฟฟิศ"}
"+1000 ขายของ" → {"type":"income","amount":1000,"description":"ขายของ"}
"ค่าไฟ 800" → {"type":"expense","amount":800,"description":"ค่าไฟ"}

ประเภท income: เงินเดือน โบนัส ค่าจ้าง รายได้ ขายของ freelance
ประเภทอื่นทั้งหมดเป็น expense"""


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    return _client


def parse(text: str) -> dict:
    try:
        response = _get_client().messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=100,
            temperature=0,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": text}],
        )
        return json.loads(response.content[0].text.strip())
    except Exception:
        return {"type": "unknown"}
