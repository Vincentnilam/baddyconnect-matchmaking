from fastapi import FastAPI, HTTPException, Body
from pymongo import UpdateOne
from database import test_connection, players_collection, waiting_list_collection, courts_collection, presets_collection
from models import Player, Court, Preset
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import List
from uuid import uuid4

# Create unique index on "name" field when app starts
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create unique index on "name"
    try:
        await players_collection.create_index("id", unique=True)
        await waiting_list_collection.create_index("id", unique=True)
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
    existing = await players_collection.find_one({"id": player.id})
    if existing:
        raise HTTPException(status_code=400, detail="Player with this ID already exists.")
    result = await players_collection.insert_one(player.model_dump())
    return {"id": str(result.inserted_id), "message": "Player added"}

@app.post("/waiting-list")
async def save_waiting_list(waiting_list: list[Player]):
    seen = set()
    unique = []
    for p in waiting_list:
        if p.id not in seen:
            seen.add(p.id)
            unique.append(p.model_dump())

    try:
        if unique:
            operations = [
                UpdateOne(
                    {"id": player["id"]},
                    {"$set": player},
                    upsert=True
                )
                for player in unique
            ]
            result = await waiting_list_collection.bulk_write(operations)
            return {
                "upserts": len(result.upserted_ids),
                "modified": result.modified_count
            }
        return {"upserts": 0, "modified": 0}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to save waiting list: {e}")



@app.get("/waiting-list", response_model=list[Player])
async def get_waiting_list():
    waiting_cursor = waiting_list_collection.find().sort("order", 1)
    waiting_list = await waiting_cursor.to_list(length=None)
    all_players = await players_collection.find().to_list(length=None)
    player_stats = {p["id"]: p.get("games_played", 0) for p in all_players}

    for player in waiting_list:
        player["_id"] = str(player["_id"])
        player["games_played"] = player_stats.get(player["id"], 0)

    return waiting_list


@app.delete("/waiting-list/{player_id}")
async def remove_from_waiting_list(player_id: str):
    result = await waiting_list_collection.delete_one({"id": player_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Player not found in waiting list")
    return {"removed": player_id}

@app.patch("/waiting-list/{player_id}")
async def update_player_color(player_id: str, color: str = Body(..., embed=True)):
    if color not in {"Green", "Orange", "Blue"}:
        raise HTTPException(status_code=400, detail="Invalid color")

    result = await waiting_list_collection.update_one(
        {"id": player_id},
        {"$set": {"color": color}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Player not found in waiting list")

    await players_collection.update_one(
        {"id": player_id},
        {"$set": {"color": color}}
    )

    return {"updated": player_id, "new_color": color}


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


@app.get("/migrate-add-player-ids")
async def migrate_add_player_ids():
    collections = [
        ("players", players_collection),
        ("waiting_list", waiting_list_collection)
    ]
    updated_count = {}

    for name, collection in collections:
        docs = await collection.find({"id": {"$exists": False}}).to_list(length=None)
        for doc in docs:
            await collection.update_one(
                {"_id": doc["_id"]},
                {"$set": {"id": str(uuid4())}}
            )
        updated_count[name] = len(docs)

    return {
        "status": "migration complete",
        "players_updated": updated_count.get("players", 0),
        "waiting_list_updated": updated_count.get("waiting_list", 0)
    }