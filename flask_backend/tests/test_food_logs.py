"""
Tests for food logs routes
"""
import pytest
from bson import ObjectId
from datetime import datetime


def test_log_food_success(client, app, auth_token):
    """Test logging food successfully"""
    with app.app_context():
        # Create a test food
        food = {
            '_id': ObjectId(),
            'name': 'Apple',
            'calories': 95,
            'protein': 0.5,
            'carbs': 25,
            'fat': 0.3,
            'serving_weight_grams': 182,
            'serving_size': '1 medium apple'
        }
        app.mongo_db.foods.insert_one(food)
        
        response = client.post('/api/food-logs/log', 
            json={
                'foodId': str(food['_id']),
                'quantity': 182,
                'mealType': 'breakfast',
                'unit': 'g',
                'originalAmount': 182
            },
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['success'] is True
        
        # Verify log was created
        logs = list(app.mongo_db.user_food_logs.find({}))
        assert len(logs) == 1


def test_log_food_invalid_quantity(client, app, auth_token):
    """Test logging food with invalid quantity"""
    with app.app_context():
        food = {
            '_id': ObjectId(),
            'name': 'Apple',
            'calories': 95,
            'serving_weight_grams': 182
        }
        app.mongo_db.foods.insert_one(food)
        
        response = client.post('/api/food-logs/log',
            json={
                'foodId': str(food['_id']),
                'quantity': -10,
                'mealType': 'breakfast'
            },
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False


def test_get_logs(client, app, auth_token):
    """Test getting food logs"""
    with app.app_context():
        from routes.auth import verify_token
        decoded = verify_token(auth_token)
        user_id = decoded['userId']
        
        # Create test logs
        app.mongo_db.user_food_logs.insert_many([
            {
                'user_id': user_id,
                'food_id': ObjectId(),
                'food_name': 'Apple',
                'quantity': 182,
                'meal_type': 'breakfast',
                'nutrition': {'calories': 95},
                'logged_at': datetime.utcnow()
            },
            {
                'user_id': user_id,
                'food_id': ObjectId(),
                'food_name': 'Banana',
                'quantity': 118,
                'meal_type': 'lunch',
                'nutrition': {'calories': 105},
                'logged_at': datetime.utcnow()
            }
        ])
        
        response = client.get('/api/food-logs/logs',
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'meals' in data['data']
        assert len(data['data']['meals']['breakfast']) == 1
        assert len(data['data']['meals']['lunch']) == 1


def test_get_logs_unauthenticated(client):
    """Test getting logs without authentication"""
    response = client.get('/api/food-logs/logs')
    
    assert response.status_code == 401

