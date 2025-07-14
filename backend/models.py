from pydantic import BaseModel
from typing import Literal
from typing import List

class Player(BaseModel):
    name: str
    color: Literal["Green", "Orange", "Blue"]
    games_played: int = 0

class Court(BaseModel):
    court_number: int
    players: list[Player]

    class Config:
        orm_mode = True
