from datetime import datetime
import os

from flask import Flask, jsonify
from pymongo import MongoClient
from flask_cors import CORS
from config import Config
from database import db

# Try to load .env file if python-dotenv is available
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # python-dotenv not installed, skip loading .env file
    pass

def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config())
    
    # Initialize database
    app.config['SQLALCHEMY_DATABASE_URI'] = (
        f"mysql+pymysql://{app.config['DB_USER']}:{app.config['DB_PASSWORD']}"
        f"@{app.config['DB_HOST']}:{app.config['DB_PORT']}/{app.config['DB_NAME']}"
        f"?charset=utf8mb4"
    )
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)

    # Initialize MongoDB (explicit database selection)
    mongo_client = MongoClient(app.config['MONGO_URI'])
    db_name = app.config.get('MONGO_DB_NAME', 'nutrilens')
    app.mongo_db = mongo_client[db_name]

    # CORS (allow local dev origins)
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
    # Configure Flask-CORS but don't let it handle OPTIONS (we handle it manually)
    CORS(app, 
         resources={r"/api/*": {
             "origins": cors_origins,
             "methods": cors_methods,
             "allow_headers": cors_headers,
             "supports_credentials": True,
             "expose_headers": cors_exposed_headers,
             "automatic_options": False  # Don't auto-handle OPTIONS, we do it manually
         }},
         allow_headers=cors_headers,
         supports_credentials=True,
         automatic_options=False)

    # Health
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

    # API blueprint registration
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
    app.register_blueprint(admin_bp, url_prefix='/api/admin')

    # Handle OPTIONS requests BEFORE authentication (CORS preflight)
    # This ensures preflight requests get CORS headers before hitting route handlers
    @app.before_request
    def handle_preflight():
        from flask import request as flask_request
        if flask_request.method == "OPTIONS":
            origin = flask_request.headers.get('Origin')
            response = jsonify({'success': True})
            if origin and origin in cors_origins:
                # Set headers directly - Flask-CORS will handle the actual request
                response.headers['Access-Control-Allow-Origin'] = origin
                response.headers['Access-Control-Allow-Headers'] = ", ".join(cors_headers)
                response.headers['Access-Control-Allow-Methods'] = ", ".join(cors_methods)
                response.headers['Access-Control-Allow-Credentials'] = 'true'
                response.headers['Access-Control-Max-Age'] = cors_max_age
            return response

    # 404 handler
    @app.errorhandler(404)
    def not_found(_):
        return jsonify({'success': False, 'message': 'API endpoint not found'}), 404

    # 500 handler
    @app.errorhandler(500)
    def server_error(e):
        return jsonify({'success': False, 'message': 'Internal server error'}), 500

    # Start reminder email scheduler
    from routes.auth import start_reminder_scheduler
    start_reminder_scheduler(app)

    return app


if __name__ == '__main__':
    port = int(os.getenv('PORT', '3001'))
    app = create_app()
    app.run(host='0.0.0.0', port=port, debug=True, use_reloader=False)


