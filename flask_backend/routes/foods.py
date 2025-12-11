from flask import Blueprint, request, jsonify, current_app
from bson import ObjectId
import re

foods_bp = Blueprint('foods', __name__)


def escape_regex(query: str) -> str:
    """Escape special regex characters in the query string."""
    return re.escape(query)


@foods_bp.get('/search')
def search_foods():
    q = (request.args.get('q') or '').strip()
    try:
        limit = int(request.args.get('limit', '10'))
    except ValueError:
        limit = 10

    if not q:
        return jsonify({'success': False, 'message': 'Search query is required'}), 400

    try:
        coll = current_app.mongo_db.foods
        # Ensure indexes (idempotent)
        try:
            coll.create_index([('name', 'text'), ('tags', 'text'), ('category', 'text')])
        except Exception:
            pass

        # Escape special regex characters to prevent errors
        escaped_q = escape_regex(q)
        
        # Use case-insensitive regex for simple search
        cursor = coll.find({
            '$or': [
                {'name': {'$regex': escaped_q, '$options': 'i'}},
                {'tags': {'$regex': escaped_q, '$options': 'i'}},
                {'category': {'$regex': escaped_q, '$options': 'i'}},
            ]
        }).limit(limit)

        foods = []
        for doc in cursor:
            doc['food_id'] = str(doc.get('_id'))
            doc.pop('_id', None)
            foods.append(doc)
        return jsonify({'success': True, 'data': foods, 'count': len(foods)})
    except Exception as e:
        current_app.logger.error(f'Error searching foods: {str(e)}')
        return jsonify({'success': False, 'message': f'Error searching foods: {str(e)}'}), 500


@foods_bp.get('/category/<category>')
def get_by_category(category: str):
    try:
        limit = int(request.args.get('limit', '20'))
    except ValueError:
        limit = 20
    coll = current_app.mongo_db.foods
    cursor = coll.find({'category': {'$regex': f'^{category}$', '$options': 'i'}}).limit(limit)
    foods = []
    for doc in cursor:
        doc['food_id'] = str(doc.get('_id'))
        doc.pop('_id', None)
        foods.append(doc)
    return jsonify({'success': True, 'data': foods, 'count': len(foods)})


@foods_bp.get('/categories')
def get_categories():
    coll = current_app.mongo_db.foods
    cats = sorted(list(set([c for c in coll.distinct('category') if c])))
    return jsonify({'success': True, 'data': cats, 'count': len(cats)})


@foods_bp.get('/random')
def get_random():
    try:
        limit = int(request.args.get('limit', '5'))
    except ValueError:
        limit = 5
    coll = current_app.mongo_db.foods
    pipeline = [{'$sample': {'size': max(1, limit)}}]
    docs = list(coll.aggregate(pipeline))
    foods = []
    for doc in docs:
        doc['food_id'] = str(doc.get('_id'))
        doc.pop('_id', None)
        foods.append(doc)
    return jsonify({'success': True, 'data': foods, 'count': len(foods)})


@foods_bp.post('/')
def add_food():
    data = request.get_json(silent=True) or {}
    required = ['name', 'calories']
    missing = [k for k in required if data.get(k) is None]
    if missing:
        return jsonify({'success': False, 'message': f"Missing required fields: {', '.join(missing)}"}), 400

    try:
        coll = current_app.mongo_db.foods
        doc = {
            'name': data['name'],
            'category': data.get('category', 'misc'),
            'brand': data.get('brand'),
            'description': data.get('description'),
            'calories': float(data['calories']),
            'protein': float(data.get('protein', 0)),
            'carbs': float(data.get('carbs', 0)),
            'fat': float(data.get('fat', 0)),
            'fiber': float(data.get('fiber', 0)),
            'sugar': float(data.get('sugar', 0)),
            'sodium': float(data.get('sodium', 0)),
            'serving_size': data.get('serving_size', '100 g'),
            'serving_weight_grams': data.get('serving_weight_grams', 100),
            'image_url': data.get('image_url'),
            'barcode': data.get('barcode'),
            'allergens': data.get('allergens'),
            'tags': data.get('tags'),
        }
        ins = coll.insert_one(doc)
        return jsonify({'success': True, 'message': 'Food added successfully', 'data': {'foodId': str(ins.inserted_id)}}), 201
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error adding food: {str(e)}'}), 500


@foods_bp.get('/<food_id>')
def get_food_by_id(food_id: str):
    coll = current_app.mongo_db.foods
    try:
        oid = ObjectId(food_id)
    except Exception:
        return jsonify({'success': False, 'message': 'Invalid food id'}), 400
    food = coll.find_one({'_id': oid})
    if not food:
        return jsonify({'success': False, 'message': 'Food not found'}), 404
    food['food_id'] = str(food.get('_id'))
    food.pop('_id', None)
    return jsonify({'success': True, 'data': food})


@foods_bp.put('/<food_id>')
def update_food(food_id: str):
    """Update food item by ID"""
    data = request.get_json(silent=True) or {}
    
    if not data:
        return jsonify({'success': False, 'message': 'No data provided'}), 400
    
    try:
        coll = current_app.mongo_db.foods
        try:
            oid = ObjectId(food_id)
        except Exception:
            return jsonify({'success': False, 'message': 'Invalid food id'}), 400
        
        food = coll.find_one({'_id': oid})
        if not food:
            return jsonify({'success': False, 'message': 'Food not found'}), 404
        
        # Build update document with only provided fields
        update_doc = {}
        if 'name' in data:
            update_doc['name'] = data['name']
        if 'category' in data:
            update_doc['category'] = data['category']
        if 'brand' in data:
            update_doc['brand'] = data['brand']
        if 'description' in data:
            update_doc['description'] = data['description']
        if 'calories' in data:
            update_doc['calories'] = float(data['calories'])
        if 'protein' in data:
            update_doc['protein'] = float(data['protein'])
        if 'carbs' in data:
            update_doc['carbs'] = float(data['carbs'])
        if 'fat' in data:
            update_doc['fat'] = float(data['fat'])
        if 'fiber' in data:
            update_doc['fiber'] = float(data['fiber'])
        if 'sugar' in data:
            update_doc['sugar'] = float(data['sugar'])
        if 'sodium' in data:
            update_doc['sodium'] = float(data['sodium'])
        if 'serving_size' in data:
            update_doc['serving_size'] = data['serving_size']
        if 'serving_weight_grams' in data:
            update_doc['serving_weight_grams'] = data['serving_weight_grams']
        if 'image_url' in data:
            update_doc['image_url'] = data['image_url']
        if 'barcode' in data:
            update_doc['barcode'] = data['barcode']
        if 'allergens' in data:
            update_doc['allergens'] = data['allergens']
        if 'tags' in data:
            update_doc['tags'] = data['tags']
        
        if not update_doc:
            return jsonify({'success': False, 'message': 'No valid fields to update'}), 400
        
        coll.update_one({'_id': oid}, {'$set': update_doc})
        
        # Return updated food
        updated_food = coll.find_one({'_id': oid})
        updated_food['food_id'] = str(updated_food.get('_id'))
        updated_food.pop('_id', None)
        
        return jsonify({'success': True, 'message': 'Food updated successfully', 'data': updated_food}), 200
    except Exception as e:
        current_app.logger.error(f'Error updating food: {str(e)}')
        return jsonify({'success': False, 'message': f'Error updating food: {str(e)}'}), 500