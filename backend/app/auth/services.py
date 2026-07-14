import datetime
from functools import wraps
import jwt
import bcrypt
from flask import request, jsonify, current_app
from bson import ObjectId
from app.models.db import get_db

def hash_password(password: str) -> str:
    """
    Encrypts password using bcrypt
    """
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def check_password(password: str, hashed: str) -> bool:
    """
    Validates regular text password against stored hash
    """
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False

def generate_tokens(user_id: str, role: str) -> tuple:
    """
    Generates access and refresh tokens
    """
    secret = current_app.config['JWT_SECRET_KEY']
    
    access_payload = {
        'sub': user_id,
        'role': role,
        'type': 'access',
        'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=60) # 1 hour
    }
    
    refresh_payload = {
        'sub': user_id,
        'role': role,
        'type': 'refresh',
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7) # 7 days
    }
    
    access_token = jwt.encode(access_payload, secret, algorithm='HS256')
    refresh_token = jwt.encode(refresh_payload, secret, algorithm='HS256')
    
    return access_token, refresh_token

def decode_token(token: str) -> dict:
    """
    Decodes the JWT token and returns payload, or None if invalid/expired
    """
    secret = current_app.config['JWT_SECRET_KEY']
    try:
        payload = jwt.decode(token, secret, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return {'error': 'Token has expired'}
    except jwt.InvalidTokenError:
        return {'error': 'Invalid token'}

def token_required(f):
    """
    Decorator for endpoints that require token-based authentication
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        # Check authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(" ")[1]
        
        if not token:
            return jsonify({'message': 'Authentication token is missing!'}), 401
            
        payload = decode_token(token)
        if 'error' in payload:
            return jsonify({'message': payload['error']}), 401
            
        if payload.get('type') != 'access':
            return jsonify({'message': 'Invalid token type. Expected access token.'}), 401
            
        # Add user context to request
        db = get_db()
        user = db.users.find_one({"_id": ObjectId(payload['sub'])}, {"password_hash": 0})
        if not user:
            return jsonify({'message': 'User not found!'}), 401
            
        # Attach user info to request context for endpoints to access
        request.current_user = user
        return f(*args, **kwargs)
        
    return decorated

def admin_required(f):
    """
    Decorator for endpoints that require administrative permissions
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        # Admin check must run after token_required
        if not hasattr(request, 'current_user'):
            return jsonify({'message': 'Access denied: User not authenticated!'}), 401
            
        if request.current_user.get('role') != 'admin':
            return jsonify({'message': 'Access denied: Admin role required!'}), 403
            
        return f(*args, **kwargs)
        
    return decorated
