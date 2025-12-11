"""
Database index initialization for MongoDB collections.
Run this once to ensure all indexes are created for optimal query performance.
"""

def ensure_indexes(mongo_db):
    """Create all necessary indexes for MongoDB collections"""
    
    # Users collection indexes
    users = mongo_db.users
    try:
        users.create_index('email', unique=True)
        users.create_index('created_at')
        users.create_index([('email', 1), ('email_verified', 1)])
        print("✓ Users indexes created")
    except Exception as e:
        print(f"Warning: Users index creation: {e}")
    
    # Foods collection indexes
    foods = mongo_db.foods
    try:
        foods.create_index([('name', 'text'), ('tags', 'text'), ('category', 'text')])
        foods.create_index('name')
        foods.create_index('category')
        foods.create_index('barcode')
        print("✓ Foods indexes created")
    except Exception as e:
        print(f"Warning: Foods index creation: {e}")
    
    # User food logs collection indexes
    user_food_logs = mongo_db.user_food_logs
    try:
        user_food_logs.create_index([('user_id', 1), ('logged_at', -1)])
        user_food_logs.create_index('user_id')
        user_food_logs.create_index('food_id')
        user_food_logs.create_index('logged_at')
        user_food_logs.create_index('meal_type')
        print("✓ User food logs indexes created")
    except Exception as e:
        print(f"Warning: User food logs index creation: {e}")
    
    # Daily meals collection indexes
    daily_meals = mongo_db.daily_meals
    try:
        daily_meals.create_index([('userId', 1), ('date', -1)])
        daily_meals.create_index('userId')
        daily_meals.create_index('date')
        print("✓ Daily meals indexes created")
    except Exception as e:
        print(f"Warning: Daily meals index creation: {e}")
    
    # Daily activity collection indexes
    daily_activity = mongo_db.daily_activity
    try:
        daily_activity.create_index([('userId', 1), ('date', -1)])
        daily_activity.create_index('userId')
        daily_activity.create_index('date')
        print("✓ Daily activity indexes created")
    except Exception as e:
        print(f"Warning: Daily activity index creation: {e}")
    
    # Daily goals collection indexes
    daily_goals = mongo_db.daily_goals
    try:
        daily_goals.create_index([('userId', 1), ('date', -1)])
        daily_goals.create_index('userId')
        daily_goals.create_index('date')
        print("✓ Daily goals indexes created")
    except Exception as e:
        print(f"Warning: Daily goals index creation: {e}")
    
    # Admin logs collection indexes
    admin_logs = mongo_db.admin_logs
    try:
        admin_logs.create_index([('timestamp', -1)])
        admin_logs.create_index('admin_id')
        admin_logs.create_index('action')
        admin_logs.create_index([('admin_id', 1), ('timestamp', -1)])
        print("✓ Admin logs indexes created")
    except Exception as e:
        print(f"Warning: Admin logs index creation: {e}")
    
    # User data collection indexes
    user_data = mongo_db.user_data
    try:
        user_data.create_index([('userId', 1), ('date', 1)])
        user_data.create_index('userId')
        user_data.create_index('date')
        print("✓ User data indexes created")
    except Exception as e:
        print(f"Warning: User data index creation: {e}")
    
    print("\n✅ All database indexes initialized successfully!")

