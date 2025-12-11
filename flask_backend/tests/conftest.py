"""
Pytest configuration and fixtures for testing
"""
import pytest
import os
from flask import Flask
from pymongo import MongoClient
from unittest.mock import Mock, patch
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app


@pytest.fixture
def app():
    """Create application for testing"""
    app = create_app()
    app.config['TESTING'] = True
    app.config['SECRET_KEY'] = 'test-secret-key'
    app.config['MONGO_URI'] = os.getenv('TEST_MONGO_URI', 'mongodb://localhost:27017/test_nutrilens')
    app.config['MONGO_DB_NAME'] = 'test_nutrilens'
    
    # Disable email sending in tests
    app.config['SMTP_HOST'] = None
    
    with app.app_context():
        yield app


@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()


@pytest.fixture
def auth_token(app, client):
    """Create a test user and return auth token"""
    from bson import ObjectId
    from datetime import datetime
    from routes.auth import hash_password, create_access_token
    
    # Create test user
    test_user = {
        '_id': ObjectId(),
        'name': 'Test User',
        'email': 'test@example.com',
        'password': hash_password('Test123!@#'),
        'email_verified': True,
        'is_admin': False,
        'created_at': datetime.utcnow()
    }
    
    app.mongo_db.users.insert_one(test_user)
    
    user_id = str(test_user['_id'])
    token = create_access_token(user_id)
    
    yield token
    
    # Cleanup
    app.mongo_db.users.delete_one({'_id': test_user['_id']})


@pytest.fixture
def admin_token(app, client):
    """Create an admin user and return auth token"""
    from bson import ObjectId
    from datetime import datetime
    from routes.auth import hash_password, create_access_token
    
    # Create admin user
    admin_user = {
        '_id': ObjectId(),
        'name': 'Admin User',
        'email': 'admin@example.com',
        'password': hash_password('Admin123!@#'),
        'email_verified': True,
        'is_admin': True,
        'created_at': datetime.utcnow()
    }
    
    app.mongo_db.users.insert_one(admin_user)
    
    user_id = str(admin_user['_id'])
    token = create_access_token(user_id)
    
    yield token
    
    # Cleanup
    app.mongo_db.users.delete_one({'_id': admin_user['_id']})


@pytest.fixture(autouse=True)
def cleanup_db(app):
    """Clean up test database after each test"""
    yield
    # Clean up collections
    collections = ['users', 'foods', 'user_food_logs', 'daily_meals', 'daily_activity', 'daily_goals']
    for collection_name in collections:
        try:
            app.mongo_db[collection_name].delete_many({})
        except Exception:
            pass

