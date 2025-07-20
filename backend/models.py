from pydantic import BaseModel, Field
from typing import Literal, Optional
from typing import List
from uuid import UUID
from uuid import uuid4

class Player(BaseModel):
    name: str
    color: Literal["Green", "Orange", "Blue"]
    games_played: int = 0
    order: Optional[int] = 0

class Court(BaseModel):
    id: UUID
    court_number: int
    players: List[Player]

    class Config:
        orm_mode = True


class Preset(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    players: List[Player]
    order: int = 0

    class Config:
        orm_mode = True
