"""Seed initial foods into MongoDB.

Run: python setup_database.py
"""

from pymongo import MongoClient
from datetime import datetime
import os
import sys
import csv


MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/nutrilens')
DB_NAME = os.getenv('MONGO_DB_NAME', 'nutrilens')


SEED_FOODS = [
    {
        'name': 'Grilled Chicken Breast',
        'category': 'protein',
        'calories': 165,
        'protein': 31,
        'carbs': 0,
        'fat': 3.6,
        'serving_size': '100 g',
        'serving_weight_grams': 100,
        'tags': 'chicken,meat,grilled,protein'
    },
    {
        'name': 'Cooked White Rice',
        'category': 'carbs',
        'calories': 130,
        'protein': 2.4,
        'carbs': 28,
        'fat': 0.3,
        'serving_size': '100 g',
        'serving_weight_grams': 100,
        'tags': 'rice,grain,carbohydrate'
    },
    {
        'name': 'Avocado',
        'category': 'fat',
        'calories': 160,
        'protein': 2,
        'carbs': 9,
        'fat': 15,
        'fiber': 7,
        'serving_size': '100 g',
        'serving_weight_grams': 100,
        'tags': 'avocado,fruit,healthy-fat'
    },
    {
        'name': 'Chicken Burger',
        'category': 'protein',
        'calories': 600,
        'protein': 30,
        'carbs': 45,
        'fat': 28,
        'fiber': 2,
        'sugar': 5,
        'sodium': 850,
        'serving_size': '1 piece',
        'serving_weight_grams': 180,
        'tags': 'chicken,burger,fast-food,protein'
    },
    {
        'name': 'Kunafa',
        'category': 'dessert',
        'calories': 350,
        'protein': 6,
        'carbs': 45,
        'fat': 16,
        'fiber': 1,
        'sugar': 25,
        'sodium': 200,
        'serving_size': '100 g',
        'serving_weight_grams': 100,
        'tags': 'kunafa,dessert,middle-eastern,sweet'
    },
    {
        'name': 'Lebanese Bread',
        'category': 'grain',
        'calories': 170,
        'protein': 5,
        'carbs': 33,
        'fat': 1,
        'fiber': 2,
        'sugar': 1,
        'sodium': 400,
        'serving_size': '1 piece',
        'serving_weight_grams': 60,
        'tags': 'lebanese-bread,pita,bread,middle-eastern,grain'
    },
    {
        'name': 'Tabbouleh',
        'category': 'salad',
        'calories': 130,
        'protein': 3,
        'carbs': 20,
        'fat': 5,
        'fiber': 3,
        'sugar': 2,
        'sodium': 300,
        'serving_size': '100 g',
        'serving_weight_grams': 100,
        'tags': 'tabbouleh,salad,middle-eastern,lebanese,parsley'
    },
    {
        'name': 'Bemye',
        'category': 'vegetable',
        'calories': 140,
        'protein': 2,
        'carbs': 7,
        'fat': 0.2,
        'fiber': 3,
        'sugar': 1,
        'sodium': 7,
        'serving_size': '100 g',
        'serving_weight_grams': 100,
        'tags': 'bemye,okra,bamia,middle-eastern,vegetable'
    },
]


def seed_foods():
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    foods = db.foods
    # Indexes
    try:
        foods.create_index([('name', 'text'), ('tags', 'text'), ('category', 'text')])
    except Exception:
        pass

    inserted = 0
    for item in SEED_FOODS:
        existing = foods.find_one({'name': item['name']})
        if existing:
            continue
        item['created_at'] = datetime.utcnow()
        item['updated_at'] = datetime.utcnow()
        foods.insert_one(item)
        inserted += 1
    print(f"Seed complete. Inserted {inserted} foods. Total: {foods.count_documents({})}")


def import_csv(csv_path: str):
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    foods = db.foods
    try:
        foods.create_index([('name', 'text'), ('tags', 'text'), ('category', 'text')])
    except Exception:
        pass

    def to_float(val, default=0.0):
        try:
            if val is None or val == "":
                return default
            return float(val)
        except Exception:
            return default

    inserted = 0
    updated = 0
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = (row.get('name') or '').strip()
            if not name:
                continue
            doc = {
                'name': name,
                'category': (row.get('category') or 'misc').strip(),
                'description': (row.get('description') or '').strip() or None,
                'calories': to_float(row.get('calories'), 0.0),
                'protein': to_float(row.get('protein'), 0.0),
                'carbs': to_float(row.get('carbs'), 0.0),
                'fat': to_float(row.get('fat'), 0.0),
                'fiber': to_float(row.get('fiber'), 0.0),
                'sugar': to_float(row.get('sugar'), 0.0),
                'sodium': to_float(row.get('sodium'), 0.0),
                'serving_size': (row.get('serving_size') or '100 g').strip(),
                'serving_weight_grams': to_float(row.get('serving_weight_grams'), 100.0),
                'barcode': (row.get('barcode') or '').strip() or None,
                'tags': (row.get('tags') or '').strip() or None,
            }
            existing = foods.find_one({'$or': [{'barcode': doc['barcode']}, {'name': doc['name']}]}) if doc.get('barcode') else foods.find_one({'name': doc['name']})
            if existing:
                foods.update_one({'_id': existing['_id']}, {'$set': doc})
                updated += 1
            else:
                doc['created_at'] = datetime.utcnow()
                foods.insert_one(doc)
                inserted += 1
    total = foods.count_documents({})
    print(f"Import complete. Inserted {inserted}, updated {updated}. Total: {total}")


if __name__ == '__main__':
    # Usage:
    # 1) python setup_database.py            -> seed small sample
    # 2) python setup_database.py foods.csv -> bulk import CSV
    if len(sys.argv) > 1:
        import_csv(sys.argv[1])
    else:
        seed_foods()

