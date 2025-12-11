from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from routes.auth import verify_token
import re

food_logs_bp = Blueprint('food_logs', __name__)

# Compile regex patterns once for better performance
ML_PATTERN = re.compile(r'(\d+)\s*ml', re.IGNORECASE)
WEIGHT_PATTERN = re.compile(r'(\d+(?:\.\d+)?)\s*g(?:rams?)?', re.IGNORECASE)


def require_auth():
    auth = request.headers.get('Authorization', '')
    token = auth.replace('Bearer ', '') if auth.startswith('Bearer ') else None
    if not token:
        return None, (jsonify({'success': False, 'message': 'Access token required'}), 401)
    decoded = verify_token(token)
    if not decoded:
        return None, (jsonify({'success': False, 'message': 'Invalid or expired token'}), 401)
    return decoded.get('userId'), None


@food_logs_bp.post('/log')
def log_food():
    user_id, err = require_auth()
    if err:
        return err
    
    data = request.get_json(silent=True) or {}
    food_id = data.get('foodId')
    quantity = data.get('quantity')
    meal_type = data.get('mealType')
    logged_at = data.get('loggedAt') or datetime.utcnow()
    unit = data.get('unit', 'g').lower()
    original_amount = data.get('originalAmount', quantity)
    
    if not food_id or not quantity or not meal_type:
        return jsonify({'success': False, 'message': 'Food ID, quantity, and meal type are required'}), 400
    
    try:
        quantity_float = float(quantity)
        if quantity_float <= 0:
            return jsonify({'success': False, 'message': 'Quantity must be greater than 0'}), 400
        original_amount_float = float(original_amount) if original_amount else quantity_float
    except (ValueError, TypeError):
        return jsonify({'success': False, 'message': 'Invalid quantity value'}), 400
    
    try:
        from bson import ObjectId
        foods_collection = current_app.mongo_db.foods
        
        try:
            food = foods_collection.find_one({'_id': ObjectId(str(food_id))})
        except:
            food = None
        
        if not food:
            return jsonify({'success': False, 'message': f'Food not found with ID: {food_id}'}), 404
        
        food_logs_collection = current_app.mongo_db.user_food_logs
        
        serving_weight = food.get('serving_weight_grams') or 100
        serving_size = food.get('serving_size') or food.get('serving') or '100 g'
        food_name = food.get('name', '').lower()
        
        piece_based_units = ['piece', 'slice', 'egg', 'apple', 'banana', 'cookie', 'cracker', 'muffin', 'donut', 'bagel', 'roll', 'meatball', 'nugget', 'patty', 'sausage', 'hot dog', 'burger', 'pancake', 'waffle', 'toast', 'biscuit', 'croissant', 'pretzel']
        is_piece_based = any(piece_unit in unit for piece_unit in piece_based_units)
        is_drink = unit in ['can', 'bottle'] or 'ml' in unit
        
        multiplier = 1.0
        
        if is_drink:
            serving_size_ml = serving_weight
            if serving_size:
                ml_match = ML_PATTERN.search(serving_size)
                if ml_match:
                    serving_size_ml = float(ml_match.group(1))
            multiplier = quantity_float / serving_size_ml if serving_size_ml > 0 else quantity_float / 100
        elif is_piece_based:
            weight_per_piece = serving_weight
            if serving_size:
                weight_match = WEIGHT_PATTERN.search(serving_size)
                if weight_match:
                    weight_per_piece = float(weight_match.group(1))
                else:
                    if 'egg' in unit:
                        weight_per_piece = 50
                    elif 'apple' in unit:
                        weight_per_piece = 182
                    elif 'banana' in unit:
                        weight_per_piece = 118
                    elif serving_weight < 200:
                        weight_per_piece = serving_weight
                    else:
                        weight_per_piece = 100
            total_weight = original_amount_float * weight_per_piece
            multiplier = total_weight / serving_weight if serving_weight > 0 else 1.0
        else:
            multiplier = quantity_float / serving_weight if serving_weight > 0 else quantity_float / 100
        
        nutrition = {
            'calories': round(float(food.get('calories', 0)) * multiplier),
            'protein': round(float(food.get('protein', 0)) * multiplier, 1),
            'carbs': round(float(food.get('carbs', 0)) * multiplier, 1),
            'fat': round(float(food.get('fat', 0)) * multiplier, 1),
            'fiber': round(float(food.get('fiber', 0)) * multiplier, 1),
            'sugar': round(float(food.get('sugar', 0)) * multiplier, 1),
            'sodium': round(float(food.get('sodium', 0)) * multiplier, 1),
        }
        
        # Parse logged_at datetime
        if isinstance(logged_at, datetime):
            logged_at_dt = logged_at
        elif isinstance(logged_at, str):
            try:
                # Handle ISO format strings
                logged_at_dt = datetime.fromisoformat(logged_at.replace('Z', '+00:00'))
            except:
                try:
                    # Fallback to parsing without timezone
                    logged_at_dt = datetime.fromisoformat(logged_at.split('Z')[0])
                except:
                    logged_at_dt = datetime.utcnow()
        else:
            logged_at_dt = datetime.utcnow()
        
        # Create log entry in MongoDB
        log_entry = {
            'user_id': user_id,
            'food_id': str(food_id),
            'food_name': food.get('name', 'Unknown'),
            'quantity': quantity_float,
            'meal_type': meal_type,
            'logged_at': logged_at_dt,
            'nutrition': nutrition,
            'created_at': datetime.utcnow()
        }
        
        result = food_logs_collection.insert_one(log_entry)
        
        return jsonify({
            'success': True, 
            'message': 'Food logged successfully', 
            'data': {
                'logId': str(result.inserted_id),
                'foodName': food.get('name', 'Unknown'),
                'quantity': quantity_float,
                'mealType': meal_type,
                'loggedAt': log_entry['logged_at'].isoformat(),
                'nutrition': nutrition,
            }
        }), 201
    except Exception as e:
        import traceback
        error_msg = str(e)
        error_trace = traceback.format_exc()
        # Log the full error for debugging
        current_app.logger.error(f'Error logging food: {error_msg}\n{error_trace}')
        return jsonify({'success': False, 'message': f'Error logging food: {error_msg}'}), 500


@food_logs_bp.get('/logs')
def get_logs():
    user_id, err = require_auth()
    if err:
        return err
    
    try:
        date_str = request.args.get('date')
        target = datetime.strptime(date_str, '%Y-%m-%d') if date_str else datetime.utcnow()
        
        start_date = target.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = target.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        # Get logs from MongoDB
        food_logs_collection = current_app.mongo_db.user_food_logs
        
        # Use projection to only fetch needed fields
        logs = list(food_logs_collection.find(
            {
                'user_id': user_id,
                'logged_at': {
                    '$gte': start_date,
                    '$lte': end_date
                }
            },
            {
                'food_name': 1,
                'quantity': 1,
                'meal_type': 1,
                'logged_at': 1,
                'nutrition': 1
            }
        ).sort('logged_at', -1))
        
        groups = {'breakfast': [], 'lunch': [], 'dinner': [], 'snack': []}
        totals = {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0, 'fiber': 0, 'sugar': 0, 'sodium': 0}
        
        for log in logs:
            # Nutrition is already calculated and stored in the log
            nutrition = log.get('nutrition', {})
            
            entry = {
                'id': str(log.get('_id')),
                'foodName': log.get('food_name', 'Unknown'),
                'quantity': float(log.get('quantity', 0)),
                'mealType': log.get('meal_type', 'snack'),
                'loggedAt': log.get('logged_at').isoformat() if isinstance(log.get('logged_at'), datetime) else (log.get('logged_at') if log.get('logged_at') else None),
                'nutrition': nutrition,
            }
            
            meal_type = log.get('meal_type', 'snack')
            groups.setdefault(meal_type, []).append(entry)
            for k in totals:
                totals[k] += nutrition.get(k, 0)
        
        return jsonify({
            'success': True, 
            'data': {
                'date': target.strftime('%Y-%m-%d'),
                'meals': groups,
                'totalNutrition': totals,
                'totalLogs': len(logs),
            }
        })
    except Exception as e:
        error_msg = str(e)
        return jsonify({'success': False, 'message': f'Error getting logs: {error_msg}'}), 500


@food_logs_bp.put('/logs/<log_id>')
def update_log(log_id: str):
    user_id, err = require_auth()
    if err:
        return err
    
    try:
        from bson import ObjectId
        data = request.get_json(silent=True) or {}
        
        food_logs_collection = current_app.mongo_db.user_food_logs
        foods_collection = current_app.mongo_db.foods
        
        try:
            oid = ObjectId(log_id)
        except:
            return jsonify({'success': False, 'message': 'Invalid log ID'}), 400
        
        log = food_logs_collection.find_one({'_id': oid, 'user_id': user_id})
        
        if not log:
            return jsonify({'success': False, 'message': 'Food log not found'}), 404
        
        update_data = {}
        recalculate_nutrition = False
        
        if 'quantity' in data or 'unit' in data or 'originalAmount' in data:
            quantity = float(data.get('quantity', log.get('quantity', 0)))
            unit = data.get('unit', 'g').lower()
            original_amount = float(data.get('originalAmount', quantity))
            
            update_data['quantity'] = quantity
            
            try:
                food = foods_collection.find_one({'_id': ObjectId(str(log.get('food_id')))})
                if food:
                    recalculate_nutrition = True
                    serving_weight = food.get('serving_weight_grams') or 100
                    serving_size = food.get('serving_size') or food.get('serving') or '100 g'
                    
                    piece_based_units = ['piece', 'slice', 'egg', 'apple', 'banana', 'cookie', 'cracker', 'muffin', 'donut', 'bagel', 'roll', 'meatball', 'nugget', 'patty', 'sausage', 'hot dog', 'burger', 'pancake', 'waffle', 'toast', 'biscuit', 'croissant', 'pretzel']
                    is_piece_based = any(piece_unit in unit for piece_unit in piece_based_units)
                    is_drink = unit in ['can', 'bottle'] or 'ml' in unit
                    
                    multiplier = 1.0
                    
                    if is_drink:
                        serving_size_ml = serving_weight
                        if serving_size:
                            ml_match = ML_PATTERN.search(serving_size)
                            if ml_match:
                                serving_size_ml = float(ml_match.group(1))
                        multiplier = quantity / serving_size_ml if serving_size_ml > 0 else quantity / 100
                    elif is_piece_based:
                        weight_per_piece = serving_weight
                        if serving_size:
                            weight_match = WEIGHT_PATTERN.search(serving_size)
                            if weight_match:
                                weight_per_piece = float(weight_match.group(1))
                            else:
                                if 'egg' in unit:
                                    weight_per_piece = 50
                                elif 'apple' in unit:
                                    weight_per_piece = 182
                                elif 'banana' in unit:
                                    weight_per_piece = 118
                                elif serving_weight < 200:
                                    weight_per_piece = serving_weight
                                else:
                                    weight_per_piece = 100
                        total_weight = original_amount * weight_per_piece
                        multiplier = total_weight / serving_weight if serving_weight > 0 else 1.0
                    else:
                        multiplier = quantity / serving_weight if serving_weight > 0 else quantity / 100
                    
                    update_data['nutrition'] = {
                        'calories': round(float(food.get('calories', 0)) * multiplier),
                        'protein': round(float(food.get('protein', 0)) * multiplier, 1),
                        'carbs': round(float(food.get('carbs', 0)) * multiplier, 1),
                        'fat': round(float(food.get('fat', 0)) * multiplier, 1),
                        'fiber': round(float(food.get('fiber', 0)) * multiplier, 1),
                        'sugar': round(float(food.get('sugar', 0)) * multiplier, 1),
                        'sodium': round(float(food.get('sodium', 0)) * multiplier, 1),
                    }
            except Exception as e:
                current_app.logger.error(f'Error recalculating nutrition: {e}')
        
        if 'mealType' in data:
            update_data['meal_type'] = data['mealType']
        
        if update_data:
            update_data['updated_at'] = datetime.utcnow()
            food_logs_collection.update_one(
                {'_id': oid, 'user_id': user_id},
                {'$set': update_data}
            )
        
        return jsonify({'success': True, 'message': 'Food log updated successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error updating log: {str(e)}'}), 500


@food_logs_bp.delete('/logs/<log_id>')
def delete_log(log_id: str):
    user_id, err = require_auth()
    if err:
        return err
    
    try:
        from bson import ObjectId
        
        food_logs_collection = current_app.mongo_db.user_food_logs
        
        try:
            oid = ObjectId(log_id)
        except:
            return jsonify({'success': False, 'message': 'Invalid log ID'}), 400
        
        result = food_logs_collection.delete_one({'_id': oid, 'user_id': user_id})
        
        if result.deleted_count == 0:
            return jsonify({'success': False, 'message': 'Food log not found'}), 404
        
        return jsonify({'success': True, 'message': 'Food log deleted successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error deleting log: {str(e)}'}), 500


@food_logs_bp.get('/summary')
def summary():
    user_id, err = require_auth()
    if err:
        return err
    
    try:
        date_str = request.args.get('date')
        target = datetime.strptime(date_str, '%Y-%m-%d') if date_str else datetime.utcnow()
        
        start_date = target.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = target.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        # Get logs from MongoDB
        food_logs_collection = current_app.mongo_db.user_food_logs
        
        # Use aggregation for faster calculation - get totals and count in one query
        totals_pipeline = [
            {'$match': {
                'user_id': user_id,
                'logged_at': {
                    '$gte': start_date,
                    '$lte': end_date
                }
            }},
            {'$group': {
                '_id': None,
                'calories': {'$sum': '$nutrition.calories'},
                'protein': {'$sum': '$nutrition.protein'},
                'carbs': {'$sum': '$nutrition.carbs'},
                'fat': {'$sum': '$nutrition.fat'},
                'fiber': {'$sum': '$nutrition.fiber'},
                'sugar': {'$sum': '$nutrition.sugar'},
                'sodium': {'$sum': '$nutrition.sodium'},
                'count': {'$sum': 1}
            }}
        ]
        totals_result = list(food_logs_collection.aggregate(totals_pipeline))
        if totals_result:
            totals = {
                'calories': round(totals_result[0].get('calories', 0)),
                'protein': round(totals_result[0].get('protein', 0), 1),
                'carbs': round(totals_result[0].get('carbs', 0), 1),
                'fat': round(totals_result[0].get('fat', 0), 1),
                'fiber': round(totals_result[0].get('fiber', 0), 1),
                'sugar': round(totals_result[0].get('sugar', 0), 1),
                'sodium': round(totals_result[0].get('sodium', 0), 1)
            }
            total_logs = totals_result[0].get('count', 0)
        else:
            totals = {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0, 'fiber': 0, 'sugar': 0, 'sodium': 0}
            total_logs = 0
        
        return jsonify({
            'success': True, 
            'data': {
                'date': target.strftime('%Y-%m-%d'),
                'totalNutrition': {k: (round(v) if k == 'calories' else round(v, 1)) for k, v in totals.items()},
                'totalLogs': total_logs,
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error getting summary: {str(e)}'}), 500
