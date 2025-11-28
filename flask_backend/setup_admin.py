"""
Script to set up the admin user in the database.
Run this script once to set youssefdahdah33@gmail.com as admin.
"""
import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

ADMIN_EMAIL = 'youssefdahdah33@gmail.com'

def setup_admin():
    """Set the admin user in MongoDB"""
    mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
    db_name = os.getenv('MONGO_DB_NAME', 'nutrilens')
    
    try:
        client = MongoClient(mongo_uri)
        db = client[db_name]
        users = db.users
        
        # Find the admin user
        user = users.find_one({'email': ADMIN_EMAIL})
        
        if not user:
            print(f"[ERROR] User with email {ADMIN_EMAIL} not found!")
            print("Please make sure the user has registered first.")
            return False
        
        # Update user to be admin
        result = users.update_one(
            {'email': ADMIN_EMAIL},
            {'$set': {'is_admin': True}}
        )
        
        if result.modified_count > 0:
            print(f"[SUCCESS] Successfully set {ADMIN_EMAIL} as admin!")
            return True
        elif result.matched_count > 0:
            print(f"[INFO] {ADMIN_EMAIL} is already an admin.")
            return True
        else:
            print(f"[ERROR] Failed to update user {ADMIN_EMAIL}")
            return False
            
    except Exception as e:
        print(f"[ERROR] Error setting up admin: {e}")
        return False
    finally:
        if 'client' in locals():
            client.close()

if __name__ == '__main__':
    print("Setting up admin user...")
    setup_admin()

