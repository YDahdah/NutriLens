"""
Tests for authentication routes
"""
import pytest
from bson import ObjectId
from datetime import datetime


def test_health_endpoint(client):
    """Test health check endpoint"""
    response = client.get('/health')
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert 'message' in data


def test_register_success(client, app):
    """Test successful user registration"""
    with app.app_context():
        response = client.post('/api/auth/register', json={
            'name': 'New User',
            'email': 'newuser@example.com',
            'password': 'StrongPass123!@#'
        })
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['success'] is True
        assert 'message' in data
        
        # Verify user was created
        user = app.mongo_db.users.find_one({'email': 'newuser@example.com'})
        assert user is not None
        assert user['name'] == 'New User'


def test_register_duplicate_email(client, app):
    """Test registration with duplicate email"""
    with app.app_context():
        # Create existing user
        app.mongo_db.users.insert_one({
            'name': 'Existing User',
            'email': 'existing@example.com',
            'password': 'hashed_password',
            'email_verified': False,
            'created_at': datetime.utcnow()
        })
        
        response = client.post('/api/auth/register', json={
            'name': 'New User',
            'email': 'existing@example.com',
            'password': 'StrongPass123!@#'
        })
        
        assert response.status_code == 409
        data = response.get_json()
        assert data['success'] is False


def test_register_weak_password(client):
    """Test registration with weak password"""
    response = client.post('/api/auth/register', json={
        'name': 'New User',
        'email': 'newuser@example.com',
        'password': 'weak'
    })
    
    assert response.status_code == 400
    data = response.get_json()
    assert data['success'] is False
    assert 'password' in data['message'].lower() or 'weak' in data['message'].lower()


def test_login_success(client, app, auth_token):
    """Test successful login"""
    with app.app_context():
        response = client.post('/api/auth/login', json={
            'email': 'test@example.com',
            'password': 'Test123!@#'
        })
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'token' in data['data']
        assert 'user' in data['data']


def test_login_invalid_credentials(client):
    """Test login with invalid credentials"""
    response = client.post('/api/auth/login', json={
        'email': 'nonexistent@example.com',
        'password': 'WrongPass123!@#'
    })
    
    assert response.status_code in [401, 404]
    data = response.get_json()
    assert data['success'] is False


def test_profile_authenticated(client, auth_token):
    """Test getting profile with valid token"""
    response = client.get('/api/auth/profile', headers={
        'Authorization': f'Bearer {auth_token}'
    })
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert 'user' in data['data']
    assert data['data']['user']['email'] == 'test@example.com'


def test_profile_unauthenticated(client):
    """Test getting profile without token"""
    response = client.get('/api/auth/profile')
    
    assert response.status_code == 401
    data = response.get_json()
    assert data['success'] is False


def test_verify_token_valid(client, app):
    """Test token verification with valid token"""
    from routes.auth import create_access_token, verify_token
    
    with app.app_context():
        user_id = str(ObjectId())
        token = create_access_token(user_id)
        
        decoded = verify_token(token)
        assert decoded is not None
        assert decoded['userId'] == user_id


def test_verify_token_invalid(client, app):
    """Test token verification with invalid token"""
    from routes.auth import verify_token
    
    with app.app_context():
        decoded = verify_token('invalid_token')
        assert decoded is None

