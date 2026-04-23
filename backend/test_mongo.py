import json
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))
MONGO_URI = os.getenv("DB")

try:
    print("Connecting to MongoDB...")
    client = MongoClient(MONGO_URI)
    db = client["quizauto"]
    coll = db["quizzes"]
    
    print("Loading out.json...")
    with open("out.json", "r", encoding="utf-8") as f:
        data = json.load(f)
        
    print("Testing insert_one...")
    res = coll.insert_one({"raw_text": "Sample text", "questions": data["questions"]})
    print("Inserted successfully with ID:", res.inserted_id)
except Exception as e:
    print(f"Insertion failed! Error: {e}")
