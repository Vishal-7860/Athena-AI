import logging
from pymongo import MongoClient

logger = logging.getLogger(__name__)

# Global database instances
client = None
db = None

def init_db(app):
    """
    Initialize PyMongo Client and connect to MongoDB database
    """
    global client, db
    try:
        mongo_uri = app.config['MONGO_URI']
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        
        # Test connection by triggering a server ping
        client.admin.command('ping')
        
        # Extract database name from URI, e.g., mongodb://.../db_name?options
        # If no database name is specified, fallback to 'ai_research_db'
        db_name = None
        if '/' in mongo_uri.replace('mongodb+srv://', '').replace('mongodb://', ''):
            parts = mongo_uri.split('/')
            if parts and len(parts) > 3:
                db_name = parts[-1].split('?')[0]
                
        if not db_name:
            db_name = 'ai_research_db'
            
        db = client[db_name]
        logger.info(f"Successfully connected to MongoDB database: {db_name}")
        
        # Create schema constraints and indexes
        _create_indexes()
        
    except Exception as e:
        logger.critical(f"Could not connect to MongoDB database. Error: {e}")
        # We don't crash the server start immediately to allow fallback/diagnostic modes,
        # but we log it as critical.
        raise e

def _create_indexes():
    """
    Create necessary indexes for performance and uniqueness constraints
    """
    global db
    if db is None:
        return
        
    def safe_create_index(collection, key, **kwargs):
        try:
            collection.create_index(key, **kwargs)
        except Exception as e:
            # If there's an IndexKeySpecsConflict, drop the conflicting index and recreate it
            if "IndexKeySpecsConflict" in str(e) or "already exists with different options" in str(e) or "code" in str(e):
                index_name = f"{key}_1" if isinstance(key, str) else None
                if index_name:
                    try:
                        collection.drop_index(index_name)
                        collection.create_index(key, **kwargs)
                        return
                    except Exception:
                        pass
            logger.error(f"Error creating index on {collection.name} for key {key}: {e}")

    try:
        # Users Collection Indexes
        safe_create_index(db.users, "email", unique=True)
        safe_create_index(db.users, "username", unique=True)
        
        # ResearchPapers Indexes
        safe_create_index(db.research_papers, "title")
        safe_create_index(db.research_papers, "doi")
        safe_create_index(db.research_papers, "year")
        
        # Bookmarks Indexes
        try:
            db.bookmarks.create_index([("user_id", 1), ("paper_id", 1)], unique=True)
        except Exception as e:
            if "IndexKeySpecsConflict" in str(e) or "already exists with different options" in str(e):
                try:
                    db.bookmarks.drop_index("user_id_1_paper_id_1")
                    db.bookmarks.create_index([("user_id", 1), ("paper_id", 1)], unique=True)
                except Exception:
                    logger.error(f"Error recreating bookmarks index: {e}")
            else:
                logger.error(f"Error creating bookmarks index: {e}")
        
        # SearchHistory Indexes
        try:
            db.search_history.create_index([("user_id", 1), ("searched_at", -1)])
        except Exception as e:
            logger.error(f"Error creating search history index: {e}")
        
        # Logs Indexes
        safe_create_index(db.logs, "timestamp")
        
        logger.info("MongoDB indexes created successfully.")
    except Exception as e:
        logger.error(f"Error creating MongoDB indexes: {e}")

def get_db():
    """
    Exposes global database helper connection
    """
    global db
    return db
