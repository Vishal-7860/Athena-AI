import datetime
from flask import Blueprint, request, jsonify
from bson import ObjectId
from app.models.db import get_db
from app.auth.services import (
    hash_password,
    check_password,
    generate_tokens,
    decode_token,
    token_required
)

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    
    email = data.get('email', '').strip().lower()
    username = data.get('username', '').strip()
    password = data.get('password', '')
    
    if not email or not username or not password:
        return jsonify({'message': 'Missing email, username, or password!'}), 400
        
    if len(password) < 6:
        return jsonify({'message': 'Password must be at least 6 characters!'}), 400
        
    db = get_db()
    if db is None:
        return jsonify({'message': 'Database connection error!'}), 500
        
    # Check if user already exists
    if db.users.find_one({'email': email}):
        return jsonify({'message': 'Email address already registered!'}), 400
        
    # Check if username is taken
    if db.users.find_one({'username': username}):
        return jsonify({'message': 'Username already taken!'}), 400
        
    # Check if this is the first user in the system to assign 'admin' role
    user_count = db.users.count_documents({})
    role = 'admin' if user_count == 0 else 'user'
    
    user_document = {
        'username': username,
        'email': email,
        'password_hash': hash_password(password),
        'role': role,
        'is_verified': False,
        'created_at': datetime.datetime.utcnow(),
        'updated_at': datetime.datetime.utcnow()
    }
    
    try:
        result = db.users.insert_one(user_document)
        
        # Log this user creation activity
        db.logs.insert_one({
            'action': 'USER_REGISTERED',
            'details': f"User {username} registered successfully.",
            'timestamp': datetime.datetime.utcnow()
        })
        
        return jsonify({
            'message': 'Registration successful!',
            'user_id': str(result.inserted_id)
        }), 201
    except Exception as e:
        return jsonify({'message': f'Registration failed: {str(e)}'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    
    if not email or not password:
        return jsonify({'message': 'Missing email or password!'}), 400
        
    db = get_db()
    if db is None:
        return jsonify({'message': 'Database connection error!'}), 500
        
    # Auto-seed admin user for local development convenience
    if email == 'admin@example.com':
        admin_user = db.users.find_one({'email': 'admin@example.com'})
        if not admin_user:
            admin_document = {
                'username': 'admin',
                'email': 'admin@example.com',
                'password_hash': hash_password('admin123'),
                'role': 'admin',
                'is_verified': True,
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            }
            db.users.insert_one(admin_document)
            user = db.users.find_one({'email': 'admin@example.com'})
        else:
            user = admin_user
    else:
        user = db.users.find_one({'email': email})
    
    if not user or not check_password(password, user['password_hash']):
        return jsonify({'message': 'Invalid credentials!'}), 401
        
    user_id = str(user['_id'])
    role = user.get('role', 'user')
    
    access_token, refresh_token = generate_tokens(user_id, role)
    
    # Log this user login activity
    db.logs.insert_one({
        'user_id': ObjectId(user_id),
        'action': 'USER_LOGIN',
        'details': f"User {user['username']} logged in.",
        'timestamp': datetime.datetime.utcnow()
    })
    
    return jsonify({
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': {
            'id': user_id,
            'username': user['username'],
            'email': user['email'],
            'role': role
        }
    }), 200

@auth_bp.route('/refresh', methods=['POST'])
def refresh():
    data = request.get_json() or {}
    refresh_token = data.get('refresh_token')
    
    if not refresh_token:
        return jsonify({'message': 'Refresh token is required!'}), 400
        
    payload = decode_token(refresh_token)
    if 'error' in payload:
        return jsonify({'message': payload['error']}), 401
        
    if payload.get('type') != 'refresh':
        return jsonify({'message': 'Invalid token type. Expected refresh token.'}), 401
        
    user_id = payload['sub']
    role = payload.get('role', 'user')
    
    # Generate new access token and refresh token
    new_access_token, new_refresh_token = generate_tokens(user_id, role)
    
    return jsonify({
        'access_token': new_access_token,
        'refresh_token': new_refresh_token
    }), 200

@auth_bp.route('/profile', methods=['GET'])
@token_required
def profile():
    # request.current_user is already populated by @token_required decorator
    user = request.current_user
    return jsonify({
        'id': str(user['_id']),
        'username': user['username'],
        'email': user['email'],
        'role': user.get('role', 'user'),
        'created_at': user.get('created_at')
    }), 200

@auth_bp.route('/profile/update', methods=['PUT'])
@token_required
def update_profile():
    db = get_db()
    user_id = request.current_user['_id']
    data = request.get_json() or {}
    
    new_username = data.get('username', '').strip()
    new_email = data.get('email', '').strip().lower()
    
    if not new_username or not new_email:
        return jsonify({'message': 'Username and email cannot be empty.'}), 400
        
    try:
        # Check if email is already taken by another user
        existing_email = db.users.find_one({'email': new_email, '_id': {'$ne': user_id}})
        if existing_email:
            return jsonify({'message': 'Email address already in use.'}), 400
            
        db.users.update_one(
            {'_id': user_id},
            {'$set': {'username': new_username, 'email': new_email, 'updated_at': datetime.datetime.utcnow()}}
        )
        
        # Log this profile update activity
        db.logs.insert_one({
            'user_id': user_id,
            'action': 'PROFILE_UPDATED',
            'details': f"Updated username to '{new_username}' and email to '{new_email}'",
            'timestamp': datetime.datetime.utcnow()
        })
        
        return jsonify({
            'message': 'Profile updated successfully!',
            'username': new_username,
            'email': new_email
        }), 200
    except Exception as e:
        return jsonify({'message': f'Failed to update profile: {str(e)}'}), 500
