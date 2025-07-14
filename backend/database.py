from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "")

client = AsyncIOMotorClient(MONGODB_URI)
db = client["unitybc"]
players_collection = db["players"]
waiting_list_collection = db["waiting_list"]
courts_collection = db["courts_collection"]

async def test_connection():
    doc = await players_collection.find_one()
    if doc:
        doc["_id"] = str(doc["_id"])  # convert ObjectId to string
    return doc