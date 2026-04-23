from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))
MONGO_URI = os.getenv("DB")

try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    db = client["quizauto"]
    coll = db["quizzes"]
    docs = list(coll.find({}, {"raw_text": 0}))
    print(f"Database contains {len(docs)} quizzes.")
    for doc in docs:
        print(f"ID: {doc['_id']}, Questions count: {len(doc.get('questions', []))}")
except Exception as e:
    print("Error:", e)
