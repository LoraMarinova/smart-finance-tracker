from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

TransactionType = Literal["income", "expense"]
NonEmptyStr = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class TransactionBase(BaseModel):
    type: TransactionType
    amount: float = Field(gt=0)
    category: NonEmptyStr
    description: str | None = None
    date: datetime | None = None


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(TransactionBase):
    pass


class TransactionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: TransactionType
    amount: float
    category: str
    description: str | None = None
    date: datetime


class Stats(BaseModel):
    total_income: float
    total_expense: float
    balance: float


class TransactionsResponse(BaseModel):
    transactions: list[TransactionRead]
    stats: Stats
