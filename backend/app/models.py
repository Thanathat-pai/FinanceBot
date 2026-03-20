# models.py

```python
import uuid
from datetime import datetime, date
from decimal import Decimal
from enum import Enum
from typing import Optional

from sqlalchemy import String, Text, Date, DateTime, Numeric, Boolean, ForeignKey, Index, func
from sqlalchemy.orm import Mapped, mapped_column, relationship, DeclarativeBase


class Base(DeclarativeBase):
    pass


class TransactionType(str, Enum):
    INCOME = "income"
    EXPENSE = "expense"


class CategoryType(str, Enum):
    INCOME = "income"
    EXPENSE = "expense"


class FrequencyType(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[CategoryType] = mapped_column(nullable=False)
    icon: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    color: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    transactions: Mapped[list["Transaction"]] = relationship(
        back_populates="category",
        lazy="selectin",
        foreign_keys="Transaction.category_id"
    )
    budgets: Mapped[list["Budget"]] = relationship(
        back_populates="category",
        lazy="selectin",
        foreign_keys="Budget.category_id"
    )
    recurring_transactions: Mapped[list["RecurringTransaction"]] = relationship(
        back_populates="category",
        lazy="selectin",
        foreign_keys="RecurringTransaction.category_id"
    )


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        Index("ix_transactions_date_type", "date", "type"),
        Index("ix_transactions_deleted_at", "deleted_at"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    type: Mapped[TransactionType] = mapped_column(nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    category_id: Mapped[str] = mapped_column(String(36), ForeignKey("categories.id"), nullable=False)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    category: Mapped["Category"] = relationship(
        back_populates="transactions",
        lazy="selectin",
        foreign_keys=[category_id]
    )


class Budget(Base):
    __tablename__ = "budgets"
    __table_args__ = (
        Index("ix_budgets_month", "month"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    category_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("categories.id"), nullable=True)
    month: Mapped[date] = mapped_column(Date, nullable=False)
    limit_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    category: Mapped[Optional["Category"]] = relationship(
        back_populates="budgets",
        lazy="selectin",
        foreign_keys=[category_id]
    )


class RecurringTransaction(Base):
    __tablename__ = "recurring_transactions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    type: Mapped[TransactionType] = mapped_column(nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    category_id: Mapped[str] = mapped_column(String(36), ForeignKey("categories.id"), nullable=False)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    frequency: Mapped[FrequencyType] = mapped_column(nullable=False)
    next_run_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    category: Mapped["Category"] = relationship(
        back_populates="recurring_transactions",
        lazy="selectin",
        foreign_keys=[category_id]
    )
```

---

# alembic/versions/001_initial_schema.py

```python
"""Initial schema with categories and seed data."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql
import uuid
from datetime import datetime


def upgrade() -> None:
    op.create_table(
        'categories',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('type', sa.String(10), nullable=False),
        sa.Column('icon', sa.String(50), nullable=True),
        sa.Column('color', sa.String(7), nullable=True),
        sa.Column('is_default', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'transactions',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('type', sa.String(10), nullable=False),
        sa.Column('amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('category_id', sa.String(36), nullable=False),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_transactions_date_type', 'transactions', ['date', 'type'])
    op.create_index('ix_transactions_deleted_at', 'transactions', ['deleted_at'])

    op.create_table(
        'budgets',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('category_id', sa.String(36), nullable=True),
        sa.Column('month', sa.Date(), nullable=False),
        sa.Column('limit_amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('user_id', sa.String(36), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_budgets_month', 'budgets', ['month'])

    op.create_table(
        'recurring_transactions',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('type', sa.String(10), nullable=False),
        sa.Column('amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('category_id', sa.String(36), nullable=False),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('frequency', sa.String(10), nullable=False),
        sa.Column('next_run_date', sa.Date(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    seed_categories()


def downgrade() -> None:
    op.drop_table('recurring_transactions')
    op.drop_table('budgets')
    op.drop_index('ix_transactions_deleted_at', table_name='transactions')
    op.drop_index('ix_transactions_date_type', table_name='transactions')
    op.drop_table('transactions')
    op.drop_table('categories')


def seed_categories() -> None:
    categories_table = sa.table(
        'categories',
        sa.column('id', sa.String(36)),
        sa.column('name', sa.String(255)),
        sa.column('type', sa.String(10)),
        sa.column('icon', sa.String(50)),
        sa.column('color', sa.String(7)),
        sa.column('is_default', sa.Boolean),
        sa.column('created_at', sa.DateTime),
        sa.column('updated_at', sa.DateTime),
    )

    seed_data = [
        (str(uuid.uuid4()), 'อาหาร', 'expense', '🍚', '#FF6B6B', True, datetime.utcnow(), datetime.utcnow()),
        (str(uuid.uuid4()), 'เครื่องดื่ม', 'expense', '☕', '#FF9F43', True, datetime.utcnow(), datetime.utcnow()),
        (str(uuid.uuid4()), 'เดินทาง', 'expense', '🚗', '#54A0FF', True, datetime.utcnow(), datetime.utcnow()),
        (str(uuid.uuid4()), 'ช้อปปิ้ง', 'expense', '🛍️', '#FF6B9D', True, datetime.utcnow(), datetime.utcnow()),
        (str(uuid.uuid4()), 'ค่าสาธารณูปโภค', 'expense', '💡', '#FFA502', True, datetime.utcnow(), datetime.utcnow()),
        (str(uuid.uuid4()), 'ครอบครัว', 'expense', '👨‍👩‍👧', '#A29BFE', True, datetime.utcnow(), datetime.utcnow()),
        (str(uuid.uuid4()), 'บันเทิง', 'expense', '🎬', '#FD79A8', True, datetime.utcnow(), datetime.utcnow()),
        (str(uuid.uuid4()), 'เงินเดือน', 'income', '💰', '#00B894', True, datetime.utcnow(), datetime.utcnow()),
        (str(uuid.uuid4()), 'โบนัส', 'income', '🎁', '#00CEC9', True, datetime.utcnow(), datetime.utcnow()),
        (str(uuid.uuid4()), 'รายได้อื่น', 'income', '📈', '#6C5CE7', True, datetime.utcnow(), datetime.utcnow()),
    ]

    op.bulk_insert(categories_table, [
        {
            'id': row[0],
            'name': row[1],
            'type': row[2],
            'icon': row[3],
            'color': row[4],
            'is_default': row[5],
            'created_at': row[6],
            'updated_at': row[7],
        }
        for row in seed_data
    ])
```