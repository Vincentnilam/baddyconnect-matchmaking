from fastapi import FastAPI, HTTPException, Body
from database import test_connection, players_collection, waiting_list_collection, courts_collection
from models import Player, Court
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import List

# Create unique index on "name" field when app starts
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create unique index on "name"
    try:
        await waiting_list_collection.create_index("name", unique=True)
        print("Unique index on 'name' ensured.")
        await courts_collection.create_index("court_number", unique=True)
        print("Unique index on 'court-number' ensured.")
    except Exception as e:
        print(f"Failed to create index: {e}")
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://baddyconnect-matchmaking.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/test-db")
async def test_db():
    result = await test_connection()
    if result:
        return {"status": "success", "example_player": result}
    return {"status": "empty or failed"}

@app.get("/players")
async def get_players():
    cursor = players_collection.find()
    players = await cursor.to_list(length=None)
    for player in players:
        player["_id"] = str(player["_id"])
    return players

@app.post("/players")
async def add_player(player: Player):
    # check if this name exists
    existing = await players_collection.find_one({"name": player.name})
    if existing:
        raise HTTPException(status_code=400, detail="Player with this name already exists.")

    result = await players_collection.insert_one(player.model_dump())
    return {"id": str(result.inserted_id), "message": "Player added"}

@app.post("/waiting-list")
async def save_waiting_list(waiting_list: list[Player]):
    # De-duplicate incoming list by name
    seen = set()
    unique = []
    for p in waiting_list:
        if p.name not in seen:
            seen.add(p.name)
            unique.append(p.model_dump())

    try:
        await waiting_list_collection.delete_many({})
        if unique:
            result = await waiting_list_collection.insert_many(unique)
            return {"inserted": len(result.inserted_ids)}
        else:
            return {"inserted": 0}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to save waiting list: {e}")



@app.get("/waiting-list", response_model=list[Player])
async def get_waiting_list():
    waiting_cursor = waiting_list_collection.find()
    waiting_list = await waiting_cursor.to_list(length=None)

    # Fetch all players from main collection to get games_played
    all_players = await players_collection.find().to_list(length=None)
    player_stats = {p["name"]: p.get("games_played", 0) for p in all_players}

    # Merge games_played into waiting list players
    for player in waiting_list:
        player["_id"] = str(player["_id"])
        player["games_played"] = player_stats.get(player["name"], 0)

    return waiting_list

@app.delete("/waiting-list/{player_name}")
async def remove_from_waiting_list(player_name: str):
    result = await waiting_list_collection.delete_one({"name": player_name})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Player not found in waiting list")
    return {"removed": player_name}

@app.patch("/waiting-list/{player_name}")
async def update_player_color(player_name: str, color: str = Body(..., embed=True)):
    if color not in {"Green", "Orange", "Blue"}:
        raise HTTPException(status_code=400, detail="Invalid color")

    result = await waiting_list_collection.update_one(
        {"name": player_name},
        {"$set": {"color": color}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Player not found in waiting list")

    # also update in all players collection
    await players_collection.update_one(
        {"name": player_name},
        {"$set": {"color": color}}
    )

    return {"updated": player_name, "new_color": color}


@app.post("/courts")
async def save_courts(courts: List[Court]):
    await courts_collection.delete_many({})  # replace all
    data = [
        {
            "court_number": i,
            "players": [p.model_dump() for p in court.players]
        }
        for i, court in enumerate(courts)
    ]
    if data:
        result = await courts_collection.insert_many(data)
        return {"inserted": len(result.inserted_ids)}
    return {"inserted": 0}

@app.get("/courts", response_model=List[Court])
async def get_courts():
    cursor = courts_collection.find().sort("court_number", 1)
    courts = await cursor.to_list(length=None)
    for c in courts:
        c["_id"] = str(c["_id"])
    return courts

@app.post("/increment-games-played")
async def increment_games_played(players: list[str]):
    for name in players:
        await players_collection.update_one(
            {"name": name},
            {"$inc": {"games_played": 1}}
        )
    return {"updated": len(players)}