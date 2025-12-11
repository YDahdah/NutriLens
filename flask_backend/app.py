from datetime import datetime
import os
import time

from flask import Flask, jsonify, request
from pymongo import MongoClient
from flask_cors import CORS
from config import Config
from database import db
from utils.logger import setup_logging, log_request_info
from utils.errors import handle_error, AppError
from utils.rate_limit import init_rate_limiter
from utils.swagger import init_swagger

# Optional import for rate limiting
try:
    from flask_limiter.util import get_remote_address
except ImportError:
    get_remote_address = None

# Try to load .env file if python-dotenv is available
try:
    from dotenv import load_dotenv
    # Load .env from the flask_backend directory
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_path):
        load_dotenv(env_path)
except ImportError:
    pass
except Exception:
    pass

def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config())
    
    # Increase max content length to handle large image uploads (15MB)
    # This prevents 502 errors from body size limits
    app.config['MAX_CONTENT_LENGTH'] = 15 * 1024 * 1024  # 15MB
    
    # Setup logging
    setup_logging(app)
    app.logger.info("Application starting...")
    
    # Initialize rate limiter (optional)
    try:
        limiter = init_rate_limiter(app)
        app.limiter = limiter
    except Exception as e:
        app.logger.warning(f"Rate limiter initialization failed: {e}. Continuing without rate limiting.")
        app.limiter = None
        limiter = None
    
    # Initialize Swagger documentation
    try:
        init_swagger(app)
        app.logger.info("Swagger documentation initialized at /api/docs")
    except Exception as e:
        app.logger.warning(f"Swagger initialization failed: {e}")
    
    # Initialize database
    app.config['SQLALCHEMY_DATABASE_URI'] = (
        f"mysql+pymysql://{app.config['DB_USER']}:{app.config['DB_PASSWORD']}"
        f"@{app.config['DB_HOST']}:{app.config['DB_PORT']}/{app.config['DB_NAME']}"
        f"?charset=utf8mb4"
    )
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)

    
    mongo_uri = app.config['MONGO_URI']
    # Improved connection pooling for better scalability
    mongo_client = MongoClient(
        mongo_uri,
        maxPoolSize=100,  # Increased for better concurrency
        minPoolSize=20,   # Increased for faster initial connections
        maxIdleTimeMS=45000,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=10000, 
        socketTimeoutMS=30000, 
        retryWrites=True,  
        retryReads=True,
        # Connection pool monitoring
        waitQueueTimeoutMS=10000,  # Wait up to 10s for connection from pool
        # Heartbeat for connection health
        heartbeatFrequencyMS=10000,  # Check connection health every 10s
    )
    db_name = app.config.get('MONGO_DB_NAME', 'nutrilens')
    app.mongo_db = mongo_client[db_name]
    
    # Ensure indexes are created on startup
    try:
        from database_indexes import ensure_indexes
        ensure_indexes(app.mongo_db)
    except Exception as e:
        app.logger.warning(f'Could not initialize database indexes: {e}')


    cors_origins = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:8080',
        'http://127.0.0.1:8080',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
    ]
    cors_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
    cors_headers = ["Content-Type", "Authorization", "X-Requested-With"]
    cors_exposed_headers = ["Content-Type"]
    cors_max_age = '3600'
    
    CORS(app, 
         resources={r"/api/*": {
             "origins": cors_origins,
             "methods": cors_methods,
             "allow_headers": cors_headers,
             "supports_credentials": True,
             "expose_headers": cors_exposed_headers,
             "automatic_options": True  # Enable automatic OPTIONS handling
         }},
         allow_headers=cors_headers,
         supports_credentials=True,
         automatic_options=True)  # Enable automatic OPTIONS handling

    @app.get('/health')
    def health():
        return jsonify({
            'success': True,
            'message': 'NutriLens Flask API is running',
            'timestamp': datetime.utcnow().isoformat(),
            'version': '1.0.0'
        })

    @app.get('/health/mongo')
    def health_mongo():
        try:
            app.mongo_db.command('ping')
            db_name = app.mongo_db.name
            return jsonify({'success': True, 'mongo': 'ok', 'database': db_name})
        except Exception as e:
            return jsonify({'success': False, 'mongo': 'error', 'message': str(e)}), 500


    from routes.foods import foods_bp
    from routes.auth import auth_bp
    from routes.food_logs import food_logs_bp
    from routes.vision import vision_bp
    from routes.user_data import user_data_bp
    from routes.chat import chat_bp
    from routes.admin import admin_bp

    app.register_blueprint(foods_bp, url_prefix='/api/foods')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(food_logs_bp, url_prefix='/api/food-logs')
    app.register_blueprint(vision_bp, url_prefix='/api/vision')
    app.register_blueprint(user_data_bp, url_prefix='/api/user-data')
    app.register_blueprint(chat_bp, url_prefix='/api/chat')
    
    # Apply rate limiting to chat endpoint after blueprint registration (if limiter is available)
    if limiter and get_remote_address:
        try:
            limiter.limit("10 per minute", key_func=get_remote_address)(chat_bp.view_functions['chat_message'])
        except Exception as e:
            app.logger.warning(f"Failed to apply rate limit to chat endpoint: {e}")
    
    app.register_blueprint(admin_bp, url_prefix='/api/admin')

    @app.before_request
    def before_request():
        request.start_time = time.time()
        if request.method == "OPTIONS":
            origin = request.headers.get('Origin')
            response = jsonify({'success': True})
            # Allow all configured origins or the requesting origin
            if origin and (origin in cors_origins or any(origin.startswith(allowed) for allowed in ['http://localhost', 'http://127.0.0.1'])):
                response.headers['Access-Control-Allow-Origin'] = origin
            elif cors_origins:
                # Fallback to first allowed origin if origin doesn't match
                response.headers['Access-Control-Allow-Origin'] = cors_origins[0]
            response.headers['Access-Control-Allow-Headers'] = ", ".join(cors_headers)
            response.headers['Access-Control-Allow-Methods'] = ", ".join(cors_methods)
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            response.headers['Access-Control-Max-Age'] = cors_max_age
            return response
    
    @app.after_request
    def after_request(response):
        # Log request info
        if hasattr(request, 'start_time'):
            duration_ms = (time.time() - request.start_time) * 1000
            log_request_info(request, response)
            if duration_ms > 1000:  # Log slow requests
                app.logger.warning(f"Slow request: {request.path} took {duration_ms:.2f}ms")
        
        # Add CORS headers to all responses (backup in case CORS middleware doesn't catch it)
        origin = request.headers.get('Origin')
        if origin and (origin in cors_origins or any(origin.startswith(allowed) for allowed in ['http://localhost', 'http://127.0.0.1'])):
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
        elif cors_origins and request.method != 'OPTIONS':
            # For non-OPTIONS requests, add CORS headers if origin matches
            response.headers['Access-Control-Allow-Origin'] = cors_origins[0]
            response.headers['Access-Control-Allow-Credentials'] = 'true'
        
        # Add security headers
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        
        return response

    @app.errorhandler(AppError)
    def handle_app_error(error):
        return handle_error(error)
    
    @app.errorhandler(404)
    def not_found(_):
        return jsonify({
            'success': False, 
            'message': 'The API endpoint you requested was not found. Please check the URL and try again.'
        }), 404

    @app.errorhandler(500)
    def server_error(e):
        app.logger.error(f"Internal server error: {str(e)}", exc_info=True)
        return jsonify({
            'success': False, 
            'message': 'An internal server error occurred. Our team has been notified. Please try again later.'
        }), 500
    
    @app.errorhandler(Exception)
    def handle_exception(e):
        request_context = {
            'endpoint': request.endpoint if request else None,
            'method': request.method if request else None,
            'path': request.path if request else None,
        }
        return handle_error(e, request_context)

    from routes.auth import start_reminder_scheduler
    start_reminder_scheduler(app)

    return app


if __name__ == '__main__':
    port = int(os.getenv('PORT', '3001'))
    app = create_app()
    app.run(host='0.0.0.0', port=port, debug=True, use_reloader=False)


