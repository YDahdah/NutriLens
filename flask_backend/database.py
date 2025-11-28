from flask import Flask
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

def init_db(app: Flask):
    """Initialize database connection"""
    db.init_app(app)
    return db

# User model
class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    email_verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.TIMESTAMP, server_default=db.func.current_timestamp())
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'email_verified': self.email_verified,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

# Food model
class Food(db.Model):
    __tablename__ = 'foods'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(100))
    brand = db.Column(db.String(100))
    description = db.Column(db.Text)
    calories = db.Column(db.Numeric(10, 2), nullable=False)
    protein = db.Column(db.Numeric(10, 2), default=0)
    carbs = db.Column(db.Numeric(10, 2), default=0)
    fat = db.Column(db.Numeric(10, 2), default=0)
    fiber = db.Column(db.Numeric(10, 2), default=0)
    sugar = db.Column(db.Numeric(10, 2), default=0)
    sodium = db.Column(db.Numeric(10, 2), default=0)
    serving_size = db.Column(db.String(100))
    serving_weight_grams = db.Column(db.Numeric(10, 2), default=100)
    image_url = db.Column(db.String(500))
    barcode = db.Column(db.String(100))
    allergens = db.Column(db.Text)
    tags = db.Column(db.Text)
    created_at = db.Column(db.TIMESTAMP, server_default=db.func.current_timestamp())
    
    def to_dict(self):
        return {
            'food_id': self.id,  # Use id as food_id for frontend compatibility
            'name': self.name,
            'category': self.category,
            'brand': self.brand if self.brand else None,
            'description': self.description if self.description else None,
            'calories': float(self.calories) if self.calories else 0,
            'protein': float(self.protein) if self.protein else 0,
            'carbs': float(self.carbs) if self.carbs else 0,
            'fat': float(self.fat) if self.fat else 0,
            'fiber': float(self.fiber) if self.fiber else 0,
            'sugar': float(self.sugar) if self.sugar else 0,
            'sodium': float(self.sodium) if self.sodium else 0,
            'serving_size': self.serving_size if self.serving_size else '100 g',
            'serving_weight_grams': float(self.serving_weight_grams) if self.serving_weight_grams else 100,
            'image_url': self.image_url if hasattr(self, 'image_url') else None,
            'barcode': self.barcode if hasattr(self, 'barcode') else None,
            'allergens': self.allergens if hasattr(self, 'allergens') else None,
            'tags': self.tags if self.tags else None,
        }

# User Food Log model
class UserFoodLog(db.Model):
    __tablename__ = 'user_food_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    food_id = db.Column(db.Integer, db.ForeignKey('foods.id', ondelete='CASCADE'), nullable=False)
    quantity = db.Column(db.Numeric(10, 2), nullable=False)
    meal_type = db.Column(db.Enum('breakfast', 'lunch', 'dinner', 'snack'), nullable=False)
    logged_at = db.Column(db.TIMESTAMP, server_default=db.func.current_timestamp())
    
    # Relationships
    food = db.relationship('Food', backref='logs')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'food_id': self.food_id,
            'quantity': float(self.quantity) if self.quantity else 0,
            'meal_type': self.meal_type,
            'logged_at': self.logged_at.isoformat() if self.logged_at else None
        }

