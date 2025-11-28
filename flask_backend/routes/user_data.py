from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from routes.auth import verify_token
from collections import defaultdict
import base64
import os


user_data_bp = Blueprint('user_data', __name__)


def _require_user_id():
    auth = request.headers.get('Authorization', '')
    token = auth.replace('Bearer ', '') if auth.startswith('Bearer ') else None
    if not token:
        return None, (jsonify({'success': False, 'message': 'Access token required'}), 401)
    decoded = verify_token(token)
    if not decoded:
        return None, (jsonify({'success': False, 'message': 'Invalid or expired token'}), 401)
    return decoded.get('userId'), None


# Profile photo routes must be defined BEFORE /profile routes to avoid routing conflicts
@user_data_bp.get('/profile/photo')
def get_profile_photo():
    user_id, err = _require_user_id()
    if err:
        return err
    try:
        coll = current_app.mongo_db.user_profiles
        doc = coll.find_one({'userId': user_id})
        photo_url = doc.get('profilePhoto') if doc else None
        return jsonify({'success': True, 'data': {'photoUrl': photo_url}})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error getting photo: {str(e)}'}), 500


@user_data_bp.post('/profile/photo')
def upload_profile_photo():
    user_id, err = _require_user_id()
    if err:
        return err
    try:
        if 'photo' not in request.files:
            return jsonify({'success': False, 'message': 'No photo file provided'}), 400
        
        file = request.files['photo']
        if file.filename == '':
            return jsonify({'success': False, 'message': 'No file selected'}), 400
        
        # Validate file type - be extremely permissive, only reject clearly non-image files
        # Accept any file with image extension, image/* content type, or unknown type (rely on size limit)
        clearly_not_image_extensions = {'exe', 'dll', 'bat', 'cmd', 'sh', 'zip', 'rar', '7z', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'json', 'xml', 'html', 'css', 'js', 'py', 'java', 'cpp', 'c', 'h'}
        
        # Check file extension
        file_ext = ''
        filename_lower = (file.filename or '').lower()
        if '.' in filename_lower:
            file_ext = filename_lower.rsplit('.', 1)[1].lower()
        
        # Check content type - handle None and empty strings
        raw_content_type = file.content_type or ''
        content_type = raw_content_type.lower().strip()
        
        # Debug logging
        print(f"File upload validation - filename: {file.filename}, ext: {file_ext}, content_type: {raw_content_type}")
        
        # Reject only if we're CERTAIN it's not an image:
        # 1. Has a clearly non-image extension (like .exe, .pdf, etc.)
        # 2. AND has a clearly non-image content type (not image/*, not empty, not application/octet-stream)
        is_clearly_not_image_ext = file_ext in clearly_not_image_extensions
        is_clearly_not_image_mime = (
            content_type and 
            not content_type.startswith('image/') and 
            content_type != 'application/octet-stream' and
            not content_type.startswith('application/x-')  # Some image formats use this
        )
        
        # Only reject if BOTH extension and mime type clearly indicate it's not an image
        if is_clearly_not_image_ext and is_clearly_not_image_mime:
            return jsonify({
                'success': False, 
                'message': f'Invalid file type. Please upload an image file (PNG, JPG, JPEG, GIF, WEBP, etc.). Got: {file_ext or "unknown"} ({raw_content_type or "unknown"})'
            }), 400
        
        # Read and convert to base64
        image_bytes = file.read()
        if len(image_bytes) > 5 * 1024 * 1024:  # 5MB limit
            return jsonify({'success': False, 'message': 'File too large. Maximum size is 5MB'}), 400
        
        image_b64 = base64.b64encode(image_bytes).decode('utf-8')
        data_url = f"data:{file.content_type};base64,{image_b64}"
        
        # Store in user profile
        coll = current_app.mongo_db.user_profiles
        coll.update_one(
            {'userId': user_id},
            {'$set': {'profilePhoto': data_url, 'updated_at': datetime.utcnow()}, '$setOnInsert': {'created_at': datetime.utcnow()}},
            upsert=True,
        )
        
        return jsonify({'success': True, 'data': {'photoUrl': data_url}})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error uploading photo: {str(e)}'}), 500


@user_data_bp.route('/profile/photo', methods=['DELETE'])
def delete_profile_photo():
    user_id, err = _require_user_id()
    if err:
        return err
    try:
        coll = current_app.mongo_db.user_profiles
        coll.update_one(
            {'userId': user_id},
            {
                '$unset': {'profilePhoto': ''},
                '$set': {'updated_at': datetime.utcnow()}
            },
            upsert=False
        )
        return jsonify({'success': True, 'message': 'Profile photo removed'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error deleting photo: {str(e)}'}), 500


@user_data_bp.post('/profile/photo/remove')
def remove_profile_photo():
    user_id, err = _require_user_id()
    if err:
        return err
    try:
        coll = current_app.mongo_db.user_profiles
        coll.update_one(
            {'userId': user_id},
            {
                '$unset': {'profilePhoto': ''},
                '$set': {'updated_at': datetime.utcnow()}
            },
            upsert=False
        )
        return jsonify({'success': True, 'message': 'Profile photo removed'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error deleting photo: {str(e)}'}), 500


@user_data_bp.get('/profile')
def get_profile():
    user_id, err = _require_user_id()
    if err:
        return err
    coll = current_app.mongo_db.user_profiles
    doc = coll.find_one({'userId': user_id})
    profile = doc.get('profile') if doc else None
    return jsonify({'success': True, 'data': profile})


@user_data_bp.put('/profile')
def put_profile():
    user_id, err = _require_user_id()
    if err:
        return err
    data = request.get_json(silent=True) or {}
    coll = current_app.mongo_db.user_profiles
    coll.update_one(
        {'userId': user_id},
        {'$set': {'profile': data, 'updated_at': datetime.utcnow()}, '$setOnInsert': {'created_at': datetime.utcnow()}},
        upsert=True,
    )
    return jsonify({'success': True})


@user_data_bp.get('/goals/today')
def get_goals_today():
    user_id, err = _require_user_id()
    if err:
        return err
    # Persist goals across days: store a single document per user
    coll = current_app.mongo_db.user_goals
    doc = coll.find_one({'userId': user_id})
    goals = doc.get('goals') if doc else None
    return jsonify({'success': True, 'data': goals})


@user_data_bp.put('/goals/today')
def put_goals_today():
    user_id, err = _require_user_id()
    if err:
        return err
    data = request.get_json(silent=True) or {}
    # Persist goals forever until changed
    coll = current_app.mongo_db.user_goals
    coll.update_one(
        {'userId': user_id},
        {'$set': {'goals': data, 'updated_at': datetime.utcnow()}, '$setOnInsert': {'created_at': datetime.utcnow()}},
        upsert=True,
    )
    return jsonify({'success': True})


@user_data_bp.get('/meals/today')
def get_meals_today():
    user_id, err = _require_user_id()
    if err:
        return err
    coll = current_app.mongo_db.daily_meals
    key = datetime.utcnow().strftime('%Y-%m-%d')
    doc = coll.find_one({'userId': user_id, 'date': key})
    meals = doc.get('meals') if doc else []
    return jsonify({'success': True, 'data': meals})


@user_data_bp.post('/meals/today')
def save_meals_today():
    user_id, err = _require_user_id()
    if err:
        return err
    data = request.get_json(silent=True) or {}
    meals = data.get('meals', [])
    coll = current_app.mongo_db.daily_meals
    key = datetime.utcnow().strftime('%Y-%m-%d')
    coll.update_one(
        {'userId': user_id, 'date': key},
        {'$set': {'meals': meals, 'updated_at': datetime.utcnow()}, '$setOnInsert': {'created_at': datetime.utcnow()}},
        upsert=True,
    )
    return jsonify({'success': True})


# Get meals for a specific date (YYYY-MM-DD)
@user_data_bp.get('/meals/by-date')
def get_meals_by_date():
    user_id, err = _require_user_id()
    if err:
        return err
    date_str = request.args.get('date')
    if not date_str:
        return jsonify({'success': False, 'message': 'date query param (YYYY-MM-DD) is required'}), 400
    coll = current_app.mongo_db.daily_meals
    doc = coll.find_one({'userId': user_id, 'date': date_str})
    meals = doc.get('meals') if doc else []
    return jsonify({'success': True, 'data': {'date': date_str, 'meals': meals}})


# Append a meal entry to a specific date's history (defaults to today)
@user_data_bp.post('/meals/add')
def add_meal_entry():
    user_id, err = _require_user_id()
    if err:
        return err
    body = request.get_json(silent=True) or {}
    meal = body.get('meal')
    date_str = body.get('date') or datetime.utcnow().strftime('%Y-%m-%d')
    if not meal or not isinstance(meal, dict):
        return jsonify({'success': False, 'message': 'meal object is required'}), 400
    # Basic normalization: ensure a timestamp exists
    if 'loggedAt' not in meal:
        meal['loggedAt'] = datetime.utcnow().isoformat()
    coll = current_app.mongo_db.daily_meals
    coll.update_one(
        {'userId': user_id, 'date': date_str},
        {
            '$push': {'meals': meal},
            '$set': {'updated_at': datetime.utcnow()},
            '$setOnInsert': {'created_at': datetime.utcnow()}
        },
        upsert=True,
    )
    return jsonify({'success': True, 'message': 'Meal added', 'data': {'date': date_str}})


# Get all dates with meals (history)
@user_data_bp.get('/meals/history')
def get_meals_history():
    user_id, err = _require_user_id()
    if err:
        return err
    try:
        limit = request.args.get('limit', type=int) or 30  # Default to last 30 days
        coll = current_app.mongo_db.daily_meals
        # Get all documents for this user, sorted by date descending
        docs = list(coll.find(
            {'userId': user_id},
            {'date': 1, 'meals': 1, 'created_at': 1, 'updated_at': 1}
        ).sort('date', -1).limit(limit))
        
        history = []
        for doc in docs:
            date_str = doc.get('date')
            meals = doc.get('meals', [])
            # Calculate totals for the day
            total_calories = sum(m.get('totalCalories', 0) for m in meals)
            total_protein = sum(m.get('totalProtein', 0) for m in meals)
            total_carbs = sum(m.get('totalCarbs', 0) for m in meals)
            total_fat = sum(m.get('totalFat', 0) for m in meals)
            
            history.append({
                'date': date_str,
                'mealsCount': len(meals),
                'totalCalories': total_calories,
                'totalProtein': round(total_protein, 1),
                'totalCarbs': round(total_carbs, 1),
                'totalFat': round(total_fat, 1),
                'created_at': doc.get('created_at').isoformat() if doc.get('created_at') else None,
                'updated_at': doc.get('updated_at').isoformat() if doc.get('updated_at') else None
            })
        
        return jsonify({
            'success': True,
            'data': {
                'history': history,
                'totalDays': len(history)
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error getting history: {str(e)}'}), 500


# Delete meals for a specific date
@user_data_bp.route('/meals/delete', methods=['DELETE'])
def delete_meals_by_date():
    user_id, err = _require_user_id()
    if err:
        return err
    date_str = request.args.get('date')
    if not date_str:
        return jsonify({'success': False, 'message': 'date query param (YYYY-MM-DD) is required'}), 400
    try:
        today_str = datetime.utcnow().strftime('%Y-%m-%d')
        if date_str != today_str:
            return jsonify({
                'success': False,
                'message': 'You can only delete meals for today.'
            }), 403

        coll = current_app.mongo_db.daily_meals
        result = coll.delete_one({'userId': user_id, 'date': date_str})
        if result.deleted_count == 0:
            return jsonify({'success': False, 'message': 'No meals found for this date'}), 404
        return jsonify({'success': True, 'message': 'Day deleted successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error deleting day: {str(e)}'}), 500


# Get weekly report
@user_data_bp.get('/reports/weekly')
def get_weekly_report():
    user_id, err = _require_user_id()
    if err:
        return err
    try:
        coll = current_app.mongo_db.daily_meals
        # Get last 7 days
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=6)
        
        # Query meals documents in the date range
        meals_coll = current_app.mongo_db.daily_meals
        meals_docs = list(meals_coll.find(
            {
                'userId': user_id,
                'date': {
                    '$gte': start_date.strftime('%Y-%m-%d'),
                    '$lte': end_date.strftime('%Y-%m-%d')
                }
            },
            {'date': 1, 'meals': 1}
        ).sort('date', 1))
        
        # Query activity documents in the date range
        activity_coll = current_app.mongo_db.daily_activity
        activity_docs = list(activity_coll.find(
            {
                'userId': user_id,
                'date': {
                    '$gte': start_date.strftime('%Y-%m-%d'),
                    '$lte': end_date.strftime('%Y-%m-%d')
                }
            },
            {'date': 1, 'activity': 1}
        ).sort('date', 1))
        
        # Create data points for each day
        report_data = []
        for i in range(7):
            current_date = start_date + timedelta(days=i)
            date_str = current_date.strftime('%Y-%m-%d')
            meals_doc = next((d for d in meals_docs if d.get('date') == date_str), None)
            activity_doc = next((d for d in activity_docs if d.get('date') == date_str), None)
            
            if meals_doc:
                meals = meals_doc.get('meals', [])
                total_calories = sum(m.get('totalCalories', 0) for m in meals)
                total_protein = sum(m.get('totalProtein', 0) for m in meals)
                total_carbs = sum(m.get('totalCarbs', 0) for m in meals)
                total_fat = sum(m.get('totalFat', 0) for m in meals)
            else:
                total_calories = 0
                total_protein = 0
                total_carbs = 0
                total_fat = 0
            
            # Get activity data
            if activity_doc:
                activity = activity_doc.get('activity', {})
                exercises = activity.get('exercises', [])
                water_intake = activity.get('waterIntake', 0)
                total_calories_burned = sum(e.get('caloriesBurned', 0) for e in exercises)
                total_exercise_duration = sum(e.get('duration', 0) for e in exercises)
            else:
                exercises = []
                water_intake = 0
                total_calories_burned = 0
                total_exercise_duration = 0
            
            report_data.append({
                'date': date_str,
                'day': current_date.strftime('%a'),  # Mon, Tue, etc.
                'calories': total_calories,
                'protein': round(total_protein, 1),
                'carbs': round(total_carbs, 1),
                'fat': round(total_fat, 1),
                'mealsCount': len(meals) if meals_doc else 0,
                'exercisesCount': len(exercises),
                'caloriesBurned': round(total_calories_burned, 1),
                'exerciseDuration': round(total_exercise_duration, 1),
                'waterIntake': round(water_intake, 1)
            })
        
        # Calculate averages
        total_cal = sum(d['calories'] for d in report_data)
        total_prot = sum(d['protein'] for d in report_data)
        total_carb = sum(d['carbs'] for d in report_data)
        total_f = sum(d['fat'] for d in report_data)
        total_cal_burned = sum(d['caloriesBurned'] for d in report_data)
        total_ex_duration = sum(d['exerciseDuration'] for d in report_data)
        total_water = sum(d['waterIntake'] for d in report_data)
        days_with_data = sum(1 for d in report_data if d['mealsCount'] > 0)
        days_with_activity = sum(1 for d in report_data if d['exercisesCount'] > 0 or d['waterIntake'] > 0)
        
        return jsonify({
            'success': True,
            'data': {
                'period': 'weekly',
                'startDate': start_date.strftime('%Y-%m-%d'),
                'endDate': end_date.strftime('%Y-%m-%d'),
                'dailyData': report_data,
                'averages': {
                    'calories': round(total_cal / 7, 1) if days_with_data > 0 else 0,
                    'protein': round(total_prot / 7, 1) if days_with_data > 0 else 0,
                    'carbs': round(total_carb / 7, 1) if days_with_data > 0 else 0,
                    'fat': round(total_f / 7, 1) if days_with_data > 0 else 0,
                    'caloriesBurned': round(total_cal_burned / 7, 1) if days_with_activity > 0 else 0,
                    'exerciseDuration': round(total_ex_duration / 7, 1) if days_with_activity > 0 else 0,
                    'waterIntake': round(total_water / 7, 1) if days_with_activity > 0 else 0
                },
                'totals': {
                    'calories': total_cal,
                    'protein': round(total_prot, 1),
                    'carbs': round(total_carb, 1),
                    'fat': round(total_f, 1),
                    'caloriesBurned': round(total_cal_burned, 1),
                    'exerciseDuration': round(total_ex_duration, 1),
                    'waterIntake': round(total_water, 1)
                },
                'daysTracked': days_with_data
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error getting weekly report: {str(e)}'}), 500


# Get monthly report
@user_data_bp.get('/reports/monthly')
def get_monthly_report():
    user_id, err = _require_user_id()
    if err:
        return err
    try:
        coll = current_app.mongo_db.daily_meals
        # Get last 30 days
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=29)
        
        # Query meals documents in the date range
        meals_coll = current_app.mongo_db.daily_meals
        meals_docs = list(meals_coll.find(
            {
                'userId': user_id,
                'date': {
                    '$gte': start_date.strftime('%Y-%m-%d'),
                    '$lte': end_date.strftime('%Y-%m-%d')
                }
            },
            {'date': 1, 'meals': 1}
        ).sort('date', 1))
        
        # Query activity documents in the date range
        activity_coll = current_app.mongo_db.daily_activity
        activity_docs = list(activity_coll.find(
            {
                'userId': user_id,
                'date': {
                    '$gte': start_date.strftime('%Y-%m-%d'),
                    '$lte': end_date.strftime('%Y-%m-%d')
                }
            },
            {'date': 1, 'activity': 1}
        ).sort('date', 1))
        
        # Group by week
        weekly_data = defaultdict(lambda: {
            'calories': 0,
            'protein': 0,
            'carbs': 0,
            'fat': 0,
            'mealsCount': 0,
            'caloriesBurned': 0,
            'exerciseDuration': 0,
            'waterIntake': 0,
            'days': []
        })
        
        for meals_doc in meals_docs:
            date_str = meals_doc.get('date')
            date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
            week_num = (date_obj - start_date).days // 7
            
            meals = meals_doc.get('meals', [])
            total_calories = sum(m.get('totalCalories', 0) for m in meals)
            total_protein = sum(m.get('totalProtein', 0) for m in meals)
            total_carbs = sum(m.get('totalCarbs', 0) for m in meals)
            total_fat = sum(m.get('totalFat', 0) for m in meals)
            
            weekly_data[week_num]['calories'] += total_calories
            weekly_data[week_num]['protein'] += total_protein
            weekly_data[week_num]['carbs'] += total_carbs
            weekly_data[week_num]['fat'] += total_fat
            weekly_data[week_num]['mealsCount'] += len(meals)
            weekly_data[week_num]['days'].append(date_str)
        
        # Add activity data
        for activity_doc in activity_docs:
            date_str = activity_doc.get('date')
            date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
            week_num = (date_obj - start_date).days // 7
            
            activity = activity_doc.get('activity', {})
            exercises = activity.get('exercises', [])
            water_intake = activity.get('waterIntake', 0)
            total_calories_burned = sum(e.get('caloriesBurned', 0) for e in exercises)
            total_exercise_duration = sum(e.get('duration', 0) for e in exercises)
            
            weekly_data[week_num]['caloriesBurned'] += total_calories_burned
            weekly_data[week_num]['exerciseDuration'] += total_exercise_duration
            weekly_data[week_num]['waterIntake'] += water_intake
        
        # Create report data for 4 weeks
        report_data = []
        for week in range(4):
            week_start = start_date + timedelta(days=week * 7)
            week_end = min(week_start + timedelta(days=6), end_date)
            week_data = weekly_data[week]
            
            report_data.append({
                'week': week + 1,
                'startDate': week_start.strftime('%Y-%m-%d'),
                'endDate': week_end.strftime('%Y-%m-%d'),
                'label': f'Week {week + 1}',
                'calories': week_data['calories'],
                'protein': round(week_data['protein'], 1),
                'carbs': round(week_data['carbs'], 1),
                'fat': round(week_data['fat'], 1),
                'mealsCount': week_data['mealsCount'],
                'daysTracked': len(week_data['days']),
                'caloriesBurned': round(week_data['caloriesBurned'], 1),
                'exerciseDuration': round(week_data['exerciseDuration'], 1),
                'waterIntake': round(week_data['waterIntake'], 1)
            })
        
        # Calculate totals
        total_cal = sum(d['calories'] for d in report_data)
        total_prot = sum(d['protein'] for d in report_data)
        total_carb = sum(d['carbs'] for d in report_data)
        total_f = sum(d['fat'] for d in report_data)
        total_cal_burned = sum(d['caloriesBurned'] for d in report_data)
        total_ex_duration = sum(d['exerciseDuration'] for d in report_data)
        total_water = sum(d['waterIntake'] for d in report_data)
        total_days = sum(d['daysTracked'] for d in report_data)
        
        return jsonify({
            'success': True,
            'data': {
                'period': 'monthly',
                'startDate': start_date.strftime('%Y-%m-%d'),
                'endDate': end_date.strftime('%Y-%m-%d'),
                'weeklyData': report_data,
                'averages': {
                    'calories': round(total_cal / 30, 1) if total_days > 0 else 0,
                    'protein': round(total_prot / 30, 1) if total_days > 0 else 0,
                    'carbs': round(total_carb / 30, 1) if total_days > 0 else 0,
                    'fat': round(total_f / 30, 1) if total_days > 0 else 0,
                    'caloriesBurned': round(total_cal_burned / 30, 1) if total_days > 0 else 0,
                    'exerciseDuration': round(total_ex_duration / 30, 1) if total_days > 0 else 0,
                    'waterIntake': round(total_water / 30, 1) if total_days > 0 else 0
                },
                'totals': {
                    'calories': total_cal,
                    'protein': round(total_prot, 1),
                    'carbs': round(total_carb, 1),
                    'fat': round(total_f, 1),
                    'caloriesBurned': round(total_cal_burned, 1),
                    'exerciseDuration': round(total_ex_duration, 1),
                    'waterIntake': round(total_water, 1)
                },
                'daysTracked': total_days
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error getting monthly report: {str(e)}'}), 500


# Get yearly report
@user_data_bp.get('/reports/yearly')
def get_yearly_report():
    user_id, err = _require_user_id()
    if err:
        return err
    try:
        coll = current_app.mongo_db.daily_meals
        # Get last 12 months
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=364)  # ~12 months
        
        # Query meals documents in the date range
        meals_coll = current_app.mongo_db.daily_meals
        meals_docs = list(meals_coll.find(
            {
                'userId': user_id,
                'date': {
                    '$gte': start_date.strftime('%Y-%m-%d'),
                    '$lte': end_date.strftime('%Y-%m-%d')
                }
            },
            {'date': 1, 'meals': 1}
        ).sort('date', 1))
        
        # Query activity documents in the date range
        activity_coll = current_app.mongo_db.daily_activity
        activity_docs = list(activity_coll.find(
            {
                'userId': user_id,
                'date': {
                    '$gte': start_date.strftime('%Y-%m-%d'),
                    '$lte': end_date.strftime('%Y-%m-%d')
                }
            },
            {'date': 1, 'activity': 1}
        ).sort('date', 1))
        
        # Group by month
        monthly_data = defaultdict(lambda: {
            'calories': 0,
            'protein': 0,
            'carbs': 0,
            'fat': 0,
            'mealsCount': 0,
            'caloriesBurned': 0,
            'exerciseDuration': 0,
            'waterIntake': 0,
            'days': []
        })
        
        for meals_doc in meals_docs:
            date_str = meals_doc.get('date')
            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
            month_key = date_obj.strftime('%Y-%m')
            
            meals = meals_doc.get('meals', [])
            total_calories = sum(m.get('totalCalories', 0) for m in meals)
            total_protein = sum(m.get('totalProtein', 0) for m in meals)
            total_carbs = sum(m.get('totalCarbs', 0) for m in meals)
            total_fat = sum(m.get('totalFat', 0) for m in meals)
            
            monthly_data[month_key]['calories'] += total_calories
            monthly_data[month_key]['protein'] += total_protein
            monthly_data[month_key]['carbs'] += total_carbs
            monthly_data[month_key]['fat'] += total_fat
            monthly_data[month_key]['mealsCount'] += len(meals)
            monthly_data[month_key]['days'].append(date_str)
        
        # Add activity data
        for activity_doc in activity_docs:
            date_str = activity_doc.get('date')
            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
            month_key = date_obj.strftime('%Y-%m')
            
            activity = activity_doc.get('activity', {})
            exercises = activity.get('exercises', [])
            water_intake = activity.get('waterIntake', 0)
            total_calories_burned = sum(e.get('caloriesBurned', 0) for e in exercises)
            total_exercise_duration = sum(e.get('duration', 0) for e in exercises)
            
            monthly_data[month_key]['caloriesBurned'] += total_calories_burned
            monthly_data[month_key]['exerciseDuration'] += total_exercise_duration
            monthly_data[month_key]['waterIntake'] += water_intake
        
        # Create report data for last 12 months
        report_data = []
        for i in range(12):
            month_date = datetime(end_date.year, end_date.month, 1) - timedelta(days=30 * (11 - i))
            month_key = month_date.strftime('%Y-%m')
            month_label = month_date.strftime('%b %Y')
            month_data = monthly_data[month_key]
            
            report_data.append({
                'month': month_key,
                'label': month_label,
                'calories': month_data['calories'],
                'protein': round(month_data['protein'], 1),
                'carbs': round(month_data['carbs'], 1),
                'fat': round(month_data['fat'], 1),
                'mealsCount': month_data['mealsCount'],
                'daysTracked': len(month_data['days']),
                'caloriesBurned': round(month_data['caloriesBurned'], 1),
                'exerciseDuration': round(month_data['exerciseDuration'], 1),
                'waterIntake': round(month_data['waterIntake'], 1)
            })
        
        # Calculate totals
        total_cal = sum(d['calories'] for d in report_data)
        total_prot = sum(d['protein'] for d in report_data)
        total_carb = sum(d['carbs'] for d in report_data)
        total_f = sum(d['fat'] for d in report_data)
        total_cal_burned = sum(d['caloriesBurned'] for d in report_data)
        total_ex_duration = sum(d['exerciseDuration'] for d in report_data)
        total_water = sum(d['waterIntake'] for d in report_data)
        total_days = sum(d['daysTracked'] for d in report_data)
        
        return jsonify({
            'success': True,
            'data': {
                'period': 'yearly',
                'startDate': start_date.strftime('%Y-%m-%d'),
                'endDate': end_date.strftime('%Y-%m-%d'),
                'monthlyData': report_data,
                'averages': {
                    'calories': round(total_cal / 365, 1) if total_days > 0 else 0,
                    'protein': round(total_prot / 365, 1) if total_days > 0 else 0,
                    'carbs': round(total_carb / 365, 1) if total_days > 0 else 0,
                    'fat': round(total_f / 365, 1) if total_days > 0 else 0,
                    'caloriesBurned': round(total_cal_burned / 365, 1) if total_days > 0 else 0,
                    'exerciseDuration': round(total_ex_duration / 365, 1) if total_days > 0 else 0,
                    'waterIntake': round(total_water / 365, 1) if total_days > 0 else 0
                },
                'totals': {
                    'calories': total_cal,
                    'protein': round(total_prot, 1),
                    'carbs': round(total_carb, 1),
                    'fat': round(total_f, 1),
                    'caloriesBurned': round(total_cal_burned, 1),
                    'exerciseDuration': round(total_ex_duration, 1),
                    'waterIntake': round(total_water, 1)
                },
                'daysTracked': total_days
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error getting yearly report: {str(e)}'}), 500


# Exercise and Water Tracking Routes

@user_data_bp.get('/activity/today')
def get_activity_today():
    """Get today's exercise and water intake"""
    user_id, err = _require_user_id()
    if err:
        return err
    try:
        coll = current_app.mongo_db.daily_activity
        key = datetime.utcnow().strftime('%Y-%m-%d')
        doc = coll.find_one({'userId': user_id, 'date': key})
        if doc and 'activity' in doc:
            activity = doc.get('activity', {})
            exercises = activity.get('exercises', [])
            
            # Recalculate calories for exercises with 0 calories but valid name and duration
            needs_update = False
            for exercise in exercises:
                calories_burned = exercise.get('caloriesBurned', 0)
                exercise_name = exercise.get('name', '').strip()
                duration = exercise.get('duration', 0)
                
                # Recalculate if calories are 0 or missing, and we have name and duration
                if (calories_burned <= 0 and exercise_name and duration > 0):
                    # Calculate calories using fallback
                    calculated_calories = _estimate_calories_fallback(exercise_name, duration)
                    if calculated_calories > 0:
                        exercise['caloriesBurned'] = calculated_calories
                        needs_update = True
            
            # Update database if any calories were recalculated
            if needs_update:
                coll.update_one(
                    {'userId': user_id, 'date': key},
                    {
                        '$set': {
                            'activity.exercises': exercises,
                            'updated_at': datetime.utcnow()
                        }
                    }
                )
            
            activity['exercises'] = exercises
        else:
            activity = {
                'exercises': [],
                'waterIntake': 0  # in ml
            }
        return jsonify({'success': True, 'data': activity})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error getting activity: {str(e)}'}), 500


@user_data_bp.put('/activity/today')
def save_activity_today():
    """Save today's exercise and water intake"""
    user_id, err = _require_user_id()
    if err:
        return err
    try:
        data = request.get_json(silent=True) or {}
        exercises = data.get('exercises', [])
        water_intake = data.get('waterIntake', 0)
        
        coll = current_app.mongo_db.daily_activity
        key = datetime.utcnow().strftime('%Y-%m-%d')
        coll.update_one(
            {'userId': user_id, 'date': key},
            {
                '$set': {
                    'activity': {
                        'exercises': exercises,
                        'waterIntake': float(water_intake)
                    },
                    'updated_at': datetime.utcnow()
                },
                '$setOnInsert': {'created_at': datetime.utcnow()}
            },
            upsert=True
        )
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error saving activity: {str(e)}'}), 500


@user_data_bp.post('/activity/exercise')
def add_exercise():
    """Add a new exercise entry for today"""
    user_id, err = _require_user_id()
    if err:
        return err
    try:
        data = request.get_json(silent=True) or {}
        exercise_name = data.get('name', '').strip()
        duration = float(data.get('duration', 0))  # in minutes
        calories_burned = float(data.get('caloriesBurned', 0))
        
        # If calories are 0 or not provided, automatically calculate them using fallback
        if calories_burned <= 0 and exercise_name and duration > 0:
            calories_burned = _estimate_calories_fallback(exercise_name, duration)
        
        exercise = {
            'name': exercise_name,
            'duration': duration,
            'caloriesBurned': calories_burned,
            'type': data.get('type', 'other'),  # cardio, strength, yoga, other
            'notes': data.get('notes', ''),
            'timestamp': datetime.utcnow().isoformat()
        }
        
        if not exercise['name']:
            return jsonify({'success': False, 'message': 'Exercise name is required'}), 400
        
        coll = current_app.mongo_db.daily_activity
        key = datetime.utcnow().strftime('%Y-%m-%d')
        
        # Ensure the document exists with proper structure before pushing
        coll.update_one(
            {'userId': user_id, 'date': key},
            {
                '$setOnInsert': {
                    'created_at': datetime.utcnow(),
                    'activity': {'exercises': [], 'waterIntake': 0}
                }
            },
            upsert=True
        )
        
        # Now push the exercise
        coll.update_one(
            {'userId': user_id, 'date': key},
            {
                '$push': {'activity.exercises': exercise},
                '$set': {'updated_at': datetime.utcnow()}
            }
        )
        return jsonify({'success': True, 'data': {'exercise': exercise}})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error adding exercise: {str(e)}'}), 500


@user_data_bp.put('/activity/water')
def update_water_intake():
    """Update water intake for today (in ml)"""
    user_id, err = _require_user_id()
    if err:
        return err
    try:
        data = request.get_json(silent=True) or {}
        water_intake = float(data.get('waterIntake', 0))
        
        coll = current_app.mongo_db.daily_activity
        key = datetime.utcnow().strftime('%Y-%m-%d')
        
        # First, ensure the document exists with proper structure
        coll.update_one(
            {'userId': user_id, 'date': key},
            {
                '$setOnInsert': {
                    'created_at': datetime.utcnow(),
                    'activity': {'exercises': [], 'waterIntake': 0}
                }
            },
            upsert=True
        )
        
        # Now update only the water intake field
        coll.update_one(
            {'userId': user_id, 'date': key},
            {
                '$set': {
                    'activity.waterIntake': water_intake,
                    'updated_at': datetime.utcnow()
                }
            }
        )
        return jsonify({'success': True, 'data': {'waterIntake': water_intake}})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error updating water intake: {str(e)}'}), 500


@user_data_bp.delete('/activity/exercise/<int:exercise_index>')
def delete_exercise(exercise_index: int):
    """Delete an exercise entry by index"""
    user_id, err = _require_user_id()
    if err:
        return err
    try:
        coll = current_app.mongo_db.daily_activity
        key = datetime.utcnow().strftime('%Y-%m-%d')
        doc = coll.find_one({'userId': user_id, 'date': key})
        
        if not doc:
            return jsonify({'success': False, 'message': 'No activity found for today'}), 404
        
        exercises = doc.get('activity', {}).get('exercises', [])
        if exercise_index < 0 or exercise_index >= len(exercises):
            return jsonify({'success': False, 'message': 'Invalid exercise index'}), 400
        
        # Remove the exercise at the specified index
        exercises.pop(exercise_index)
        
        coll.update_one(
            {'userId': user_id, 'date': key},
            {
                '$set': {
                    'activity.exercises': exercises,
                    'updated_at': datetime.utcnow()
                }
            }
        )
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error deleting exercise: {str(e)}'}), 500


@user_data_bp.get('/activity/history')
def get_activity_history():
    """Get activity history for the last N days"""
    user_id, err = _require_user_id()
    if err:
        return err
    try:
        limit = request.args.get('limit', type=int) or 30
        coll = current_app.mongo_db.daily_activity
        docs = list(coll.find(
            {'userId': user_id},
            {'date': 1, 'activity': 1, 'created_at': 1, 'updated_at': 1}
        ).sort('date', -1).limit(limit))
        
        history = []
        for doc in docs:
            date_str = doc.get('date')
            activity = doc.get('activity', {})
            exercises = activity.get('exercises', [])
            water_intake = activity.get('waterIntake', 0)
            
            total_calories_burned = sum(e.get('caloriesBurned', 0) for e in exercises)
            total_duration = sum(e.get('duration', 0) for e in exercises)
            
            history.append({
                'date': date_str,
                'exercisesCount': len(exercises),
                'totalCaloriesBurned': round(total_calories_burned, 1),
                'totalDuration': round(total_duration, 1),
                'waterIntake': round(water_intake, 1),
                'created_at': doc.get('created_at').isoformat() if doc.get('created_at') else None,
                'updated_at': doc.get('updated_at').isoformat() if doc.get('updated_at') else None
            })
        
        return jsonify({
            'success': True,
            'data': {
                'history': history,
                'totalDays': len(history)
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error getting activity history: {str(e)}'}), 500


@user_data_bp.get('/activity/exercise/suggestions')
def get_exercise_suggestions():
    """Get exercise name suggestions based on query"""
    query = request.args.get('q', '').strip().lower()
    if not query or len(query) < 2:
        return jsonify({'success': True, 'data': []})
    
    # Common exercise names database
    common_exercises = [
        'Running', 'Jogging', 'Walking', 'Cycling', 'Swimming', 'Rowing',
        'Weight Lifting', 'Bench Press', 'Squats', 'Deadlifts', 'Pull-ups',
        'Push-ups', 'Sit-ups', 'Crunches', 'Plank', 'Burpees', 'Jumping Jacks',
        'Yoga', 'Pilates', 'Stretching', 'Dancing', 'Zumba', 'Aerobics',
        'HIIT', 'CrossFit', 'Boxing', 'Martial Arts', 'Tennis', 'Basketball',
        'Soccer', 'Football', 'Volleyball', 'Badminton', 'Table Tennis',
        'Hiking', 'Climbing', 'Skating', 'Skiing', 'Snowboarding',
        'Elliptical', 'Treadmill', 'Stair Climbing', 'Rowing Machine',
        'Kettlebell', 'Dumbbells', 'Resistance Training', 'Circuit Training'
    ]
    
    # Filter exercises that match the query
    suggestions = [ex for ex in common_exercises if query in ex.lower()]
    
    # Limit to 10 suggestions
    return jsonify({'success': True, 'data': suggestions[:10]})


@user_data_bp.post('/activity/exercise/estimate-calories')
def estimate_calories_burned():
    """Use AI to estimate calories burned based on exercise name and duration"""
    user_id, err = _require_user_id()
    if err:
        return err
    
    try:
        data = request.get_json(silent=True) or {}
        exercise_name = data.get('exerciseName', '').strip()
        duration_minutes = data.get('duration', 0)
        
        if not exercise_name:
            return jsonify({'success': False, 'message': 'Exercise name is required'}), 400
        
        if duration_minutes <= 0:
            return jsonify({'success': False, 'message': 'Duration must be greater than 0'}), 400
        
        # Use the chat API to estimate calories
        import json
        import urllib.request as urllib_request
        import urllib.error as urllib_error
        
        api_key = current_app.config.get('CHAT_API_KEY')
        model = current_app.config.get('CHAT_MODEL', 'deepseek/deepseek-chat')
        api_url = current_app.config.get('LLM_API_URL', 'https://openrouter.ai/api/v1/chat/completions')
        
        prompt = f"""Estimate the calories burned for the following exercise:

Exercise: {exercise_name}
Duration: {duration_minutes} minutes

Please provide ONLY a single number representing the estimated calories burned. 
Base your estimate on standard MET (Metabolic Equivalent of Task) values and average body weight (70kg/154lbs).
Consider the intensity level of the exercise.

Respond with ONLY the number, no explanation or units."""

        try:
            payload = json.dumps({
                'model': model,
                'messages': [
                    {'role': 'user', 'content': prompt}
                ],
                'temperature': 0.3,
                'max_tokens': 50
            }).encode('utf-8')
            
            req = urllib_request.Request(
                api_url,
                data=payload,
                headers={
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json',
                    'HTTP-Referer': current_app.config.get('FRONTEND_URL', 'http://localhost:5173'),
                    'X-Title': 'NutriLens Activity'
                },
                method='POST'
            )
            
            with urllib_request.urlopen(req, timeout=10) as response:
                response_body = response.read().decode('utf-8')
                result = json.loads(response_body)
                
                if 'choices' in result and len(result['choices']) > 0:
                    response_text = result['choices'][0].get('message', {}).get('content', '').strip()
                    
                    # Extract number from response
                    import re
                    numbers = re.findall(r'\d+\.?\d*', response_text)
                    if numbers:
                        estimated_calories = float(numbers[0])
                        # Ensure reasonable range (0-2000 calories for the duration)
                        estimated_calories = max(0, min(estimated_calories, 2000))
                        return jsonify({
                            'success': True,
                            'data': {
                                'estimatedCalories': round(estimated_calories, 1),
                                'exerciseName': exercise_name,
                                'duration': duration_minutes
                            }
                        })
            
            # Fallback if AI response parsing fails
            estimated_calories = _estimate_calories_fallback(exercise_name, duration_minutes)
            return jsonify({
                'success': True,
                'data': {
                    'estimatedCalories': estimated_calories,
                    'exerciseName': exercise_name,
                    'duration': duration_minutes,
                    'note': 'Used fallback estimation'
                }
            })
        except Exception as e:
            current_app.logger.warning(f'AI calorie estimation failed: {str(e)}, using fallback')
            # Fallback to basic estimation if AI call fails
            estimated_calories = _estimate_calories_fallback(exercise_name, duration_minutes)
            return jsonify({
                'success': True,
                'data': {
                    'estimatedCalories': estimated_calories,
                    'exerciseName': exercise_name,
                    'duration': duration_minutes,
                    'note': 'Used fallback estimation'
                }
            })
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error estimating calories: {str(e)}'}), 500


def _estimate_calories_fallback(exercise_name: str, duration_minutes: float) -> float:
    """Fallback calorie estimation using MET values (for average 70kg person)"""
    exercise_lower = exercise_name.lower()
    
    # MET values (calories per minute for 70kg person)
    met_values = {
        'running': 11.5, 'jogging': 7.0, 'walking': 3.5, 'cycling': 8.0,
        'swimming': 8.0, 'rowing': 7.0, 'weight': 6.0, 'lifting': 6.0,
        'bench': 6.0, 'squats': 5.5, 'deadlift': 6.0, 'pull': 8.0,
        'push': 8.0, 'sit': 3.0, 'crunch': 3.0, 'plank': 3.5,
        'burpee': 10.0, 'jumping': 8.0, 'yoga': 3.0, 'pilates': 3.0,
        'stretching': 2.5, 'dancing': 6.0, 'zumba': 7.0, 'aerobics': 7.0,
        'hiit': 10.0, 'crossfit': 10.0, 'boxing': 12.0, 'martial': 10.0,
        'tennis': 8.0, 'basketball': 8.0, 'soccer': 10.0, 'football': 8.0,
        'volleyball': 3.0, 'badminton': 5.5, 'hiking': 6.0, 'climbing': 8.0,
        'skating': 7.0, 'skiing': 7.0, 'elliptical': 7.0, 'treadmill': 7.0,
        'stair': 9.0, 'kettlebell': 8.0, 'dumbbell': 6.0, 'resistance': 6.0,
        'circuit': 8.0
    }
    
    # Find matching MET value
    met = 5.0  # Default moderate intensity
    for key, value in met_values.items():
        if key in exercise_lower:
            met = value
            break
    
    # Calories = MET × weight(kg) × time(hours)
    # For 70kg person: Calories = MET × 70 × (minutes/60)
    calories = met * 70 * (duration_minutes / 60)
    
    return round(calories, 1)