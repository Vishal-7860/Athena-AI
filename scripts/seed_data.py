import os
import sys
import datetime
from dotenv import load_dotenv

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))

# Load environmental variables
load_dotenv(os.path.join(os.path.dirname(__file__), '../backend/.env'))
load_dotenv() # also check root

from pymongo import MongoClient
import bcrypt

def seed_database(reset=False):
    mongo_uri = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/ai_research_db')
    print(f"Connecting to MongoDB: {mongo_uri}")
    
    try:
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        db_name = mongo_uri.split('/')[-1].split('?')[0] or 'ai_research_db'
        db = client[db_name]
        
        # Test connection
        client.admin.command('ping')
        print("Connected successfully!")
        
        if reset or '--reset' in sys.argv:
            print("Purging old database collections...")
            db.users.drop()
            db.research_papers.drop()
            db.bookmarks.drop()
            db.summaries.drop()
            db.literature_reviews.drop()
            db.search_history.drop()
            db.logs.drop()
            db.downloads.drop()
            print("Old data purged cleanly.")
        
        # Create collections and indexes
        print("Creating collections and indexes...")
        try:
            db.users.create_index("email", unique=True)
        except Exception as e:
            if "IndexKeySpecsConflict" in str(e) or "already exists" in str(e):
                db.users.drop_index("email_1")
                db.users.create_index("email", unique=True)
        
        try:
            db.users.create_index("username", unique=True)
        except Exception as e:
            if "IndexKeySpecsConflict" in str(e) or "already exists" in str(e):
                db.users.drop_index("username_1")
                db.users.create_index("username", unique=True)
        
        # Create a test admin user if it doesn't exist
        test_email = "admin@research.com"
        existing_user = db.users.find_one({"$or": [{"email": test_email}, {"username": "admin"}]})
        
        if not existing_user:
            salt = bcrypt.gensalt()
            hashed_password = bcrypt.hashpw("rabhvidh".encode('utf-8'), salt).decode('utf-8')
            
            admin_user = {
                "username": "admin",
                "email": test_email,
                "password_hash": hashed_password,
                "role": "admin",
                "credits": 999999,
                "max_credits": 999999,
                "is_verified": True,
                "created_at": datetime.datetime.utcnow(),
                "updated_at": datetime.datetime.utcnow()
            }
            
            db.users.insert_one(admin_user)
            print(f"Seeded fresh admin user: {test_email} / password: rabhvidh")
        else:
            db.users.update_one(
                {"_id": existing_user["_id"]},
                {"$set": {"credits": 999999, "max_credits": 999999, "role": "admin"}}
            )
            print(f"Admin user {test_email} updated with unlimited credits.")
            
        print("Database seeding completed successfully!")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        sys.exit(1)

if __name__ == '__main__':
    reset_flag = '--reset' in sys.argv or 'reset' in sys.argv
    seed_database(reset=reset_flag)

