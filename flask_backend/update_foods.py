"""Update food calories in MongoDB.

Run: 
    python update_foods.py              -> update all foods
    python update_foods.py white_rice    -> update only white rice
    python update_foods.py mujadara      -> update only mujadara
    python update_foods.py stuffed_kousa -> update only stuffed kousa
    python update_foods.py tabbouleh     -> update only tabbouleh
    python update_foods.py bemye         -> update only bemye
"""

from pymongo import MongoClient
from datetime import datetime, timezone
import os
import sys

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/nutrilens')
DB_NAME = os.getenv('MONGO_DB_NAME', 'nutrilens')


def update_white_rice(foods):
    """Update white rice calories to 130 per 100g"""
    print("\n" + "=" * 60)
    print("Updating White Rice")
    print("=" * 60)
    
    # Search for white rice (case-insensitive, various name patterns)
    queries = [
        {'name': {'$regex': 'white.*rice', '$options': 'i'}},
        {'name': {'$regex': 'cooked.*white.*rice', '$options': 'i'}},
        {'name': {'$regex': '^white rice$', '$options': 'i'}},
        {'tags': {'$regex': 'rice', '$options': 'i'}, 'name': {'$regex': 'white', '$options': 'i'}}
    ]
    
    updated_count = 0
    found_foods = set()
    
    for query in queries:
        matching_foods = list(foods.find(query))
        
        for food in matching_foods:
            food_id = str(food.get('_id'))
            if food_id in found_foods:
                continue
            found_foods.add(food_id)
            
            # Skip if it's brown rice or wild rice
            name_lower = food.get('name', '').lower()
            if 'brown' in name_lower or 'wild' in name_lower:
                continue
            
            print(f"\nFound food: {food.get('name')}")
            print(f"Current calories per 100g: {food.get('calories', 'N/A')}")
            print(f"Serving size: {food.get('serving_size', 'N/A')}")
            print(f"Serving weight (grams): {food.get('serving_weight_grams', 'N/A')}")
            
            # Update calories to 130 per 100g
            new_calories_per_100g = 130.0
            
            # Update the food
            result = foods.update_one(
                {'_id': food['_id']},
                {'$set': {'calories': new_calories_per_100g}}
            )
            
            if result.modified_count > 0:
                updated_count += 1
                print(f"✓ Successfully updated calories to {new_calories_per_100g} per 100g")
                
                # Verify the update
                updated_food = foods.find_one({'_id': food['_id']})
                print(f"Verified: Updated calories = {updated_food.get('calories')}")
            else:
                print(f"No changes made (calories may already be {new_calories_per_100g})")
    
    if updated_count == 0:
        print("\nNo white rice entries found or all entries already have 130 calories per 100g.")
    else:
        print(f"\n✓ Total updated: {updated_count} white rice entr{'y' if updated_count == 1 else 'ies'}")


def update_mujadara(foods):
    """Update mujadara calories to 140 per 100g"""
    print("\n" + "=" * 60)
    print("Updating Mujadara")
    print("=" * 60)
    
    # Search for mujadara (case-insensitive)
    query = {'name': {'$regex': 'mujadara', '$options': 'i'}}
    
    food = foods.find_one(query)
    
    if not food:
        print("Mujadara not found in database.")
        return
    
    print(f"\nFound food: {food.get('name')}")
    print(f"Current calories per 100g: {food.get('calories', 'N/A')}")
    print(f"Serving size: {food.get('serving_size', 'N/A')}")
    print(f"Serving weight (grams): {food.get('serving_weight_grams', 'N/A')}")
    
    # Calculate new calories per 100g
    # 500g should be 700 calories, so 100g should be 140 calories
    new_calories_per_100g = 140.0
    
    # Update the food
    result = foods.update_one(
        {'_id': food['_id']},
        {'$set': {'calories': new_calories_per_100g}}
    )
    
    if result.modified_count > 0:
        print(f"\n✓ Successfully updated calories to {new_calories_per_100g} per 100g")
        print(f"  This means 500g will show as {new_calories_per_100g * 5} calories")
        
        # Verify the update
        updated_food = foods.find_one({'_id': food['_id']})
        print(f"Verified: Updated calories = {updated_food.get('calories')}")
    else:
        print("No changes made (calories may already be correct)")


def update_stuffed_kousa(foods):
    """Update stuffed kousa calories to 180 per 100g"""
    print("\n" + "=" * 60)
    print("Updating Stuffed Kousa")
    print("=" * 60)
    
    # Search for stuffed kousa (case-insensitive)
    query = {'name': {'$regex': 'stuffed.*kousa', '$options': 'i'}}
    
    food = foods.find_one(query)
    
    if not food:
        print("Stuffed kousa not found in database.")
        print("Searching for any food containing 'kousa'...")
        query = {'name': {'$regex': 'kousa', '$options': 'i'}}
        food = foods.find_one(query)
        if not food:
            print("No food containing 'kousa' found in database.")
            return
    
    print(f"\nFound food: {food.get('name')}")
    print(f"Current calories per 100g: {food.get('calories', 'N/A')}")
    print(f"Serving size: {food.get('serving_size', 'N/A')}")
    print(f"Serving weight (grams): {food.get('serving_weight_grams', 'N/A')}")
    
    # Calculate new calories per 100g
    # 500g should be 900 calories, so 100g should be 180 calories
    new_calories_per_100g = 180.0
    
    # Update the food
    result = foods.update_one(
        {'_id': food['_id']},
        {'$set': {'calories': new_calories_per_100g}}
    )
    
    if result.modified_count > 0:
        print(f"\n✓ Successfully updated calories to {new_calories_per_100g} per 100g")
        print(f"  This means 500g will show as {new_calories_per_100g * 5} calories")
        
        # Verify the update
        updated_food = foods.find_one({'_id': food['_id']})
        print(f"Verified: Updated calories = {updated_food.get('calories')}")
    else:
        print("No changes made (calories may already be correct)")


def update_tabbouleh(foods):
    """Update tabbouleh calories to 130 per 100g"""
    print("\n" + "=" * 60)
    print("Updating Tabbouleh")
    print("=" * 60)
    
    # Search for tabbouleh (case-insensitive, various name patterns)
    query = {
        '$or': [
            {'name': {'$regex': 'tabbouleh', '$options': 'i'}},
            {'name': {'$regex': 'taboule', '$options': 'i'}},
            {'name': {'$regex': 'tabouli', '$options': 'i'}},
            {'tags': {'$regex': 'tabbouleh', '$options': 'i'}}
        ]
    }
    
    matching_foods = list(foods.find(query))
    
    if not matching_foods:
        print("No tabbouleh entries found in database.")
        print("Searching for any food with 'tab' in name...")
        # Try a broader search
        broad_query = {'name': {'$regex': 'tab', '$options': 'i'}}
        broad_results = list(foods.find(broad_query))
        if broad_results:
            print(f"Found {len(broad_results)} foods with 'tab' in name:")
            for f in broad_results:
                print(f"  - {f.get('name')}: {f.get('calories')} cal/100g")
        return
    
    updated_count = 0
    found_foods = set()
    
    for food in matching_foods:
        food_id = str(food.get('_id'))
        # Skip if we've already processed this food
        if food_id in found_foods:
            continue
        found_foods.add(food_id)
        
        print(f"\nFound food: {food.get('name')}")
        print(f"Current calories per 100g: {food.get('calories', 'N/A')}")
        print(f"Serving size: {food.get('serving_size', 'N/A')}")
        print(f"Serving weight (grams): {food.get('serving_weight_grams', 'N/A')}")
        
        # Update calories to 130 per 100g
        new_calories_per_100g = 130.0
        
        # Update the food
        result = foods.update_one(
            {'_id': food['_id']},
            {'$set': {'calories': new_calories_per_100g}}
        )
        
        if result.modified_count > 0:
            updated_count += 1
            print(f"✓ Successfully updated calories to {new_calories_per_100g} per 100g")
            
            # Verify the update
            updated_food = foods.find_one({'_id': food['_id']})
            print(f"Verified: Updated calories = {updated_food.get('calories')}")
        else:
            print(f"No changes made (calories may already be {new_calories_per_100g})")
    
    if updated_count == 0:
        print("\nAll tabbouleh entries already have 130 calories per 100g.")
    else:
        print(f"\n✓ Total updated: {updated_count} tabbouleh entr{'y' if updated_count == 1 else 'ies'}")


def update_bemye(foods):
    """Add or update bemye calories to 140 per 100g"""
    print("\n" + "=" * 60)
    print("Updating Bemye")
    print("=" * 60)
    
    # Search for bemye (case-insensitive, various name patterns)
    query = {
        '$or': [
            {'name': {'$regex': 'bemye', '$options': 'i'}},
            {'name': {'$regex': 'bamye', '$options': 'i'}},
            {'name': {'$regex': 'bamia', '$options': 'i'}},
            {'tags': {'$regex': 'bemye', '$options': 'i'}}
        ]
    }
    
    matching_foods = list(foods.find(query))
    
    if not matching_foods:
        # Add new entry if it doesn't exist
        print("Bemye not found in database. Adding new entry...")
        new_food = {
            'name': 'Bemye',
            'category': 'vegetable',
            'calories': 140.0,
            'protein': 2.0,
            'carbs': 7.0,
            'fat': 0.2,
            'fiber': 3.0,
            'sugar': 1.0,
            'sodium': 7.0,
            'serving_size': '100 g',
            'serving_weight_grams': 100.0,
            'tags': 'bemye,okra,bamia,middle-eastern,vegetable',
            'created_at': datetime.now(timezone.utc),
            'updated_at': datetime.now(timezone.utc)
        }
        result = foods.insert_one(new_food)
        print(f"✓ Successfully added Bemye with 140 calories per 100g")
        print(f"  Food ID: {result.inserted_id}")
        
        # Verify the insertion
        verify = foods.find_one({'_id': result.inserted_id})
        if verify:
            print(f"  Verified: {verify.get('name')} - {verify.get('calories')} cal/100g")
    else:
        # Update existing entries
        updated_count = 0
        found_foods = set()
        
        for food in matching_foods:
            food_id = str(food.get('_id'))
            # Skip if we've already processed this food
            if food_id in found_foods:
                continue
            found_foods.add(food_id)
            
            print(f"\nFound food: {food.get('name')}")
            print(f"Current calories per 100g: {food.get('calories', 'N/A')}")
            print(f"Serving size: {food.get('serving_size', 'N/A')}")
            print(f"Serving weight (grams): {food.get('serving_weight_grams', 'N/A')}")
            
            # Update calories to 140 per 100g
            new_calories_per_100g = 140.0
            
            # Update the food
            result = foods.update_one(
                {'_id': food['_id']},
                {'$set': {
                    'calories': new_calories_per_100g,
                    'updated_at': datetime.now(timezone.utc)
                }}
            )
            
            if result.modified_count > 0:
                updated_count += 1
                print(f"✓ Successfully updated calories to {new_calories_per_100g} per 100g")
                
                # Verify the update
                updated_food = foods.find_one({'_id': food['_id']})
                print(f"Verified: Updated calories = {updated_food.get('calories')}")
            else:
                print(f"No changes made (calories may already be {new_calories_per_100g})")
        
        if updated_count == 0:
            print("\nAll bemye entries already have 140 calories per 100g.")
        else:
            print(f"\n✓ Total updated: {updated_count} bemye entr{'y' if updated_count == 1 else 'ies'}")


def main():
    """Main function to update foods"""
    try:
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        foods = db.foods
        
        # Get command line argument if provided
        food_to_update = sys.argv[1].lower() if len(sys.argv) > 1 else None
        
        print("=" * 60)
        print("Food Calorie Updater")
        print("=" * 60)
        
        if food_to_update == 'white_rice':
            update_white_rice(foods)
        elif food_to_update == 'mujadara':
            update_mujadara(foods)
        elif food_to_update == 'stuffed_kousa':
            update_stuffed_kousa(foods)
        elif food_to_update == 'tabbouleh':
            update_tabbouleh(foods)
        elif food_to_update == 'bemye':
            update_bemye(foods)
        else:
            # Update all foods
            print("\nUpdating all foods...")
            update_white_rice(foods)
            update_mujadara(foods)
            update_stuffed_kousa(foods)
            update_tabbouleh(foods)
            update_bemye(foods)
            print("\n" + "=" * 60)
            print("All updates completed!")
            print("=" * 60)
        
        client.close()
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()

