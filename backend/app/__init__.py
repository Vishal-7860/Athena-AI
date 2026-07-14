import logging
from flask import Flask, jsonify
from flask_cors import CORS
from app.config import Config
from app.models.db import init_db

# Configure logger
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
)
logger = logging.getLogger(__name__)

def create_app(config_class=Config):
    """
    Flask Application Factory
    """
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Configure Cross-Origin Resource Sharing
    # Allow local React SPA requests during development
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    # Initialize Database
    try:
        init_db(app)
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
    
    # Register Blueprints
    from app.auth.routes import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    
    from app.search.routes import search_bp, bookmarks_bp
    app.register_blueprint(search_bp, url_prefix='/api/papers')
    app.register_blueprint(bookmarks_bp, url_prefix='/api/bookmarks')
    
    from app.pdf.routes import pdf_bp
    app.register_blueprint(pdf_bp, url_prefix='/api/papers')
    
    from app.ai.routes import ai_bp
    app.register_blueprint(ai_bp, url_prefix='/api/ai')
    
    from app.similarity.routes import similarity_bp
    app.register_blueprint(similarity_bp, url_prefix='/api/similarity')
    
    from app.admin.routes import admin_bp
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    
    # Health check route
    @app.route('/api/status', methods=['GET'])
    def status():
        return jsonify({
            'status': 'healthy',
            'service': 'AI-Research-System Backend',
            'database': 'connected' if init_db_success_check() else 'disconnected'
        }), 200
        
    return app

def init_db_success_check():
    from app.models.db import get_db
    try:
        db = get_db()
        if db is not None:
            # Simple ping
            db.command('ping')
            return True
    except Exception:
        pass
    return False
