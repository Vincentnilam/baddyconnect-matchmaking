from pydantic import BaseModel
from typing import Literal
from typing import List
from uuid import UUID

class Player(BaseModel):
    name: str
    color: Literal["Green", "Orange", "Blue"]
    games_played: int = 0

class Court(BaseModel):
    id: UUID
    court_number: int
    players: List[Player]

    class Config:
        orm_mode = True
