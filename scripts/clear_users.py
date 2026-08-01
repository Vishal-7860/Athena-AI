import os
import sys
from dotenv import load_dotenv
from pymongo import MongoClient

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))

# Load env variables
load_dotenv(os.path.join(os.path.dirname(__file__), '../backend/.env'))
load_dotenv()

def clear_database():
    mongo_uri = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/ai_research_db')
    print(f"Connecting to MongoDB: {mongo_uri}")
    
    try:
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        db_name = mongo_uri.split('/')[-1].split('?')[0] or 'ai_research_db'
        db = client[db_name]
        
        # Test connection
        client.admin.command('ping')
        print("Connected successfully!")
        
        # Clear collections
        collections = ['users', 'logs', 'bookmarks', 'searches']
        for col in collections:
            count = db[col].count_documents({})
            db[col].delete_many({})
            print(f"Cleared {count} documents from '{col}' collection.")
            
        print("\nDatabase has been successfully cleared and reset to a fresh state!")
        
    except Exception as e:
        print(f"Error clearing database: {e}")
        sys.exit(1)

if __name__ == '__main__':
    clear_database()
