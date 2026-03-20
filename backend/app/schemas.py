from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
import uuid

class TransactionCreate(BaseModel):
    type: str
    amount: float
    category_id: uuid.UUID
    note: Optional[str] = None
    date: date

class TransactionResponse(TransactionCreate):
    id: uuid.UUID
    created_at: datetime
    deleted_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class CategoryResponse(BaseModel):
    id: uuid.UUID
    name: str
    type: str
    icon: Optional[str] = None
    color: Optional[str] = None
    is_default: bool
    class Config:
        from_attributes = True

class BudgetCreate(BaseModel):
    category_id: Optional[uuid.UUID] = None
    month: date
    limit_amount: float
    user_id: uuid.UUID

class SummaryResponse(BaseModel):
    total_income: float
    total_expense: float
    net: float
    top_categories: list[dict]