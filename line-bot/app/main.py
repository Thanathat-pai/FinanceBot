import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from linebot.v3.messaging import (
    ApiClient,
    Configuration,
    MessagingApi,
    ReplyMessageRequest,
    TextMessage,
)
from linebot.v3.webhook import WebhookParser
from linebot.v3.webhooks import MessageEvent, TextMessageContent

from app.database import Base, SessionLocal, engine
from app import line_handler


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(lifespan=lifespan)

_LINE_SECRET = os.getenv("LINE_CHANNEL_SECRET", "")
_LINE_TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN", "")

_webhook_parser = WebhookParser(_LINE_SECRET)
_line_config = Configuration(access_token=_LINE_TOKEN)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/webhook")
async def webhook(request: Request):
    signature = request.headers.get("X-Line-Signature", "")
    body = await request.body()

    try:
        events = _webhook_parser.parse(body.decode("utf-8"), signature)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid signature")

    for event in events:
        if not isinstance(event, MessageEvent):
            continue
        if not isinstance(event.message, TextMessageContent):
            continue

        user_id = getattr(event.source, "user_id", None)
        if not user_id:
            continue

        text = event.message.text.strip()
        reply_token = event.reply_token

        db = SessionLocal()
        try:
            reply_text = line_handler.handle_text(db, user_id, text)
        except Exception:
            reply_text = "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง 🙏"
        finally:
            db.close()

        try:
            with ApiClient(_line_config) as api_client:
                MessagingApi(api_client).reply_message(
                    ReplyMessageRequest(
                        reply_token=reply_token,
                        messages=[TextMessage(text=reply_text)],
                    )
                )
        except Exception:
            pass  # LINE reply failed but still return 200 to avoid retries

    return {"status": "ok"}
