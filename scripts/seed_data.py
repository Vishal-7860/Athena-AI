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

def seed_database():
    mongo_uri = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/ai_research_db')
    print(f"Connecting to MongoDB: {mongo_uri}")
    
    try:
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        db_name = mongo_uri.split('/')[-1].split('?')[0] or 'ai_research_db'
        db = client[db_name]
        
        # Test connection
        client.admin.command('ping')
        print("Connected successfully!")
        
        # Drop users collection to reset if requested, or just insert if not exists
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
                "is_verified": True,
                "created_at": datetime.datetime.utcnow(),
                "updated_at": datetime.datetime.utcnow()
            }
            
            db.users.insert_one(admin_user)
            print(f"Seeded admin user: {test_email} / password: rabhvidh")
        else:
            print(f"Admin user {test_email} already exists. Skipping seed.")
            
        print("Seeding completed successfully!")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        sys.exit(1)

if __name__ == '__main__':
    seed_database()
