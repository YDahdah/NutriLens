"""
Tests for user data routes
"""
import pytest
from bson import ObjectId
from datetime import datetime


def test_get_profile(client, app, auth_token):
    """Test getting user profile"""
    with app.app_context():
        response = client.get('/api/user-data/profile',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True


def test_update_profile(client, app, auth_token):
    """Test updating user profile"""
    with app.app_context():
        response = client.put('/api/user-data/profile',
            json={
                'name': 'Updated Name',
                'age': 25,
                'weight': 70,
                'height': 175,
                'gender': 'male',
                'activityLevel': 'active',
                'goal': 'weight_loss'
            },
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True


def test_get_daily_goals(client, app, auth_token):
    """Test getting daily goals"""
    with app.app_context():
        response = client.get('/api/user-data/goals',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'calories' in data['data']


def test_update_daily_goals(client, app, auth_token):
    """Test updating daily goals"""
    with app.app_context():
        response = client.put('/api/user-data/goals',
            json={
                'calories': 2200,
                'protein': 150,
                'carbs': 250,
                'fat': 70
            },
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True


def test_get_activity_today(client, app, auth_token):
    """Test getting today's activity"""
    with app.app_context():
        response = client.get('/api/user-data/activity/today',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'exercises' in data['data']
        assert 'waterIntake' in data['data']


def test_add_exercise(client, app, auth_token):
    """Test adding exercise"""
    with app.app_context():
        response = client.post('/api/user-data/activity/exercise',
            json={
                'name': 'Running',
                'duration': 30,
                'caloriesBurned': 300,
                'type': 'cardio'
            },
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True


def test_add_exercise_negative_duration(client, app, auth_token):
    """Test adding exercise with negative duration"""
    with app.app_context():
        response = client.post('/api/user-data/activity/exercise',
            json={
                'name': 'Running',
                'duration': -10,
                'caloriesBurned': 300
            },
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False

