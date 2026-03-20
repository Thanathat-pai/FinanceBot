from datetime import datetime, timezone, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session
from app.models import Transaction

TH_TZ = timezone(timedelta(hours=7))


def _today_utc_range():
    now_th = datetime.now(TH_TZ)
    start_th = now_th.replace(hour=0, minute=0, second=0, microsecond=0)
    end_th = start_th + timedelta(days=1)
    return start_th.astimezone(timezone.utc), end_th.astimezone(timezone.utc)


def _month_utc_range():
    now_th = datetime.now(TH_TZ)
    start_th = now_th.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if now_th.month == 12:
        end_th = start_th.replace(year=now_th.year + 1, month=1)
    else:
        end_th = start_th.replace(month=now_th.month + 1)
    return start_th.astimezone(timezone.utc), end_th.astimezone(timezone.utc)


def save_transaction(db: Session, user_id: str, type_: str, amount: float, description: str) -> Transaction:
    tx = Transaction(
        user_id=user_id,
        type=type_,
        amount=Decimal(str(amount)),
        description=description,
        created_at=datetime.now(timezone.utc),
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


def get_today_transactions(db: Session, user_id: str) -> list[Transaction]:
    start, end = _today_utc_range()
    return (
        db.query(Transaction)
        .filter(
            Transaction.user_id == user_id,
            Transaction.created_at >= start,
            Transaction.created_at < end,
        )
        .order_by(Transaction.created_at)
        .all()
    )


def get_month_transactions(db: Session, user_id: str) -> list[Transaction]:
    start, end = _month_utc_range()
    return (
        db.query(Transaction)
        .filter(
            Transaction.user_id == user_id,
            Transaction.created_at >= start,
            Transaction.created_at < end,
        )
        .order_by(Transaction.created_at)
        .all()
    )
