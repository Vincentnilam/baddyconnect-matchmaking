from fastapi import FastAPI, HTTPException, Body
from pymongo import UpdateOne
from database import test_connection, players_collection, waiting_list_collection, courts_collection, presets_collection
from models import Player, Court, Preset
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
        if unique:
            operations = [
                UpdateOne(
                    {"name": player["name"]},  # match by name
                    {"$set": player},          # update full data
                    upsert=True
                )
                for player in unique
            ]

            result = await waiting_list_collection.bulk_write(operations)
            return {
                "upserts": len(result.upserted_ids),
                "modified": result.modified_count
            }
        else:
            return {"upserts": 0, "modified": 0}

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to save waiting list: {e}")



@app.get("/waiting-list", response_model=list[Player])
async def get_waiting_list():
    waiting_cursor = waiting_list_collection.find().sort("order", 1)
    waiting_list = await waiting_cursor.to_list(length=None)

    # Add games_played from main players collection
    all_players = await players_collection.find().to_list(length=None)
    player_stats = {p["name"]: p.get("games_played", 0) for p in all_players}

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
    incoming_ids = {str(court.id) for court in courts}
    existing = await courts_collection.find().to_list(length=None)
    existing_ids = {c.get("id") for c in existing}

    ids_to_delete = existing_ids - incoming_ids

    operations = [
        UpdateOne(
            {"id": str(court.id)},
            {
                "$set": {
                    "id": str(court.id),
                    "court_number": court.court_number,
                    "players": [p.model_dump() for p in court.players],
                }
            },
            upsert=True
        )
        for court in courts
    ]

    if ids_to_delete:
        await courts_collection.delete_many({"id": {"$in": list(ids_to_delete)}})

    if operations:
        result = await courts_collection.bulk_write(operations)
        return {
            "upserts": len(result.upserted_ids),
            "modified": result.modified_count,
            "deleted": len(ids_to_delete)
        }

    return {"upserts": 0, "modified": 0, "deleted": len(ids_to_delete)}


@app.get("/courts", response_model=List[Court])
async def get_courts():
    cursor = courts_collection.find().sort("court_number", 1)
    courts = await cursor.to_list(length=None)
    for c in courts:
        c["_id"] = str(c["_id"])  # keep or remove as needed
    return courts

@app.post("/increment-games-played")
async def increment_games_played(players: list[str]):
    for name in players:
        await players_collection.update_one(
            {"name": name},
            {"$inc": {"games_played": 1}}
        )
    return {"updated": len(players)}

@app.get("/presets", response_model=List[Preset])
async def get_presets():
    presets = await presets_collection.find().sort("order", 1).to_list(length=None)
    for p in presets:
        p["_id"] = str(p["_id"])
    return presets

@app.post("/presets")
async def save_presets(presets: List[Preset]):
    try:
        incoming_ids = {preset.id for preset in presets}
        existing = await presets_collection.find().to_list(length=None)
        existing_ids = {p.get("id") for p in existing}

        ids_to_delete = existing_ids - incoming_ids

        # Delete removed presets
        if ids_to_delete:
            await presets_collection.delete_many({"id": {"$in": list(ids_to_delete)}})

        # Upsert current presets
        operations = [
            UpdateOne(
                {"id": preset.id},
                {"$set": preset.model_dump()},
                upsert=True
            )
            for preset in presets
        ]

        if operations:
            result = await presets_collection.bulk_write(operations)
            return {
                "upserts": len(result.upserted_ids),
                "modified": result.modified_count,
                "deleted": len(ids_to_delete)
            }

        return {"upserts": 0, "modified": 0, "deleted": len(ids_to_delete)}

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to save presets: {e}")

