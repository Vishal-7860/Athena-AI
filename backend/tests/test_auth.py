import json
from unittest.mock import MagicMock
from bson import ObjectId

def test_status_endpoint(client):
    """
    Test the status check endpoint
    """
    response = client.get('/api/status')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['status'] == 'healthy'
    assert 'service' in data

def test_register_validation(client):
    """
    Test register endpoint validation rules
    """
    # Empty data
    response = client.post('/api/auth/register', json={})
    assert response.status_code == 400
    assert b'Missing email, username, or password!' in response.data

    # Short password
    response = client.post('/api/auth/register', json={
        'email': 'test@test.com',
        'username': 'testuser',
        'password': '123'
    })
    assert response.status_code == 400
    assert b'Password must be at least 6 characters!' in response.data

def test_register_success(client, mock_db):
    """
    Test successful user registration
    """
    database, mock_users, mock_logs = mock_db
    
    # Configure user counts and user queries to simulate empty database
    mock_users.count_documents.return_value = 0
    mock_users.find_one.return_value = None
    mock_users.insert_one.return_value = MagicMock(inserted_id=ObjectId())
    
    response = client.post('/api/auth/register', json={
        'email': 'admin@test.com',
        'username': 'adminuser',
        'password': 'securepassword'
    })
    
    assert response.status_code == 201
    data = json.loads(response.data)
    assert data['message'] == 'Registration successful!'
    assert 'user_id' in data
    
    # Assert logs and user inserts were performed
    assert mock_users.insert_one.called
    assert mock_logs.insert_one.called
    
    # Verify the role assigned was 'admin' for the first user
    user_doc = mock_users.insert_one.call_args[0][0]
    assert user_doc['role'] == 'admin'
    assert user_doc['email'] == 'admin@test.com'
    assert user_doc['username'] == 'adminuser'
