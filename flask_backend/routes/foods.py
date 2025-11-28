from flask import Blueprint, request, jsonify, current_app
from bson import ObjectId

foods_bp = Blueprint('foods', __name__)


@foods_bp.get('/search')
def search_foods():
    q = (request.args.get('q') or '').strip()
    try:
        limit = int(request.args.get('limit', '10'))
    except ValueError:
        limit = 10

    if not q:
        return jsonify({'success': False, 'message': 'Search query is required'}), 400

    coll = current_app.mongo_db.foods
    # Ensure indexes (idempotent)
    try:
        coll.create_index([('name', 'text'), ('tags', 'text'), ('category', 'text')])
    except Exception:
        pass

    # Use case-insensitive regex for simple search
    cursor = coll.find({
        '$or': [
            {'name': {'$regex': q, '$options': 'i'}},
            {'tags': {'$regex': q, '$options': 'i'}},
            {'category': {'$regex': q, '$options': 'i'}},
        ]
    }).limit(limit)

    foods = []
    for doc in cursor:
        doc['food_id'] = str(doc.get('_id'))
        doc.pop('_id', None)
        foods.append(doc)
    return jsonify({'success': True, 'data': foods, 'count': len(foods)})


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
