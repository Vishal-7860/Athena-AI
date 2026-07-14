import pytest
from unittest.mock import MagicMock
import sys
import os

# Ensure the backend directory is in the python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

@pytest.fixture
def mock_db():
    """
    Mock MongoDB database client
    """
    mock_client = MagicMock()
    mock_database = MagicMock()
    mock_client.__getitem__.return_value = mock_database
    
    # Mock specific collections
    mock_users = MagicMock()
    mock_logs = MagicMock()
    
    # Support both dictionary and attribute access
    mock_database.users = mock_users
    mock_database.logs = mock_logs
    mock_database.__getitem__.side_effect = lambda name: {
        'users': mock_users,
        'logs': mock_logs
    }.get(name, MagicMock())
    
    return mock_database, mock_users, mock_logs

@pytest.fixture
def app(mock_db):
    """
    Create Flask app configured for testing
    """
    from unittest.mock import patch
    
    # Patch MongoClient to prevent actual database connections
    with patch('app.models.db.MongoClient') as mock_mongo:
        # Configure mock mongo return values
        database, _, _ = mock_db
        mock_mongo.return_value.admin.command.return_value = {"ok": 1.0}
        
        # When parsing database name
        mock_mongo.return_value.__getitem__.return_value = database
        
        from app import create_app
        from app.config import Config
        
        class TestConfig(Config):
            TESTING = True
            MONGO_URI = 'mongodb://localhost:27017/test_db'
            JWT_SECRET_KEY = 'test-jwt-secret-key'
            SECRET_KEY = 'test-secret-key'
            
        flask_app = create_app(TestConfig)
        yield flask_app

@pytest.fixture
def client(app):
    """
    Flask client for executing test requests
    """
    return app.test_client()
