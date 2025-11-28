import datetime
from flask import Blueprint, request, jsonify, current_app
from bson import ObjectId
from routes.auth import verify_token

admin_bp = Blueprint('admin', __name__)

# Admin email
ADMIN_EMAIL = 'youssefdahdah33@gmail.com'


def require_admin():
    """Check if the current user is an admin"""
    auth = request.headers.get('Authorization', '')
    token = auth.replace('Bearer ', '') if auth.startswith('Bearer ') else None
    if not token:
        return None, (jsonify({'success': False, 'message': 'Access token required'}), 401)
    
    decoded = verify_token(token)
    if not decoded:
        return None, (jsonify({'success': False, 'message': 'Invalid or expired token'}), 401)
    
    try:
        users = current_app.mongo_db.users
        user_id = decoded.get('userId')
        try:
            oid = ObjectId(user_id)
        except Exception:
            return None, (jsonify({'success': False, 'message': 'Invalid user id'}), 400)
        
        user = users.find_one({'_id': oid})
        if not user:
            return None, (jsonify({'success': False, 'message': 'User not found'}), 404)
        
        # Check if user is admin
        if not user.get('is_admin', False):
            return None, (jsonify({'success': False, 'message': 'Admin access required'}), 403)
        
        return user_id, None
    except Exception as e:
        return None, (jsonify({'success': False, 'message': f'Error checking admin status: {str(e)}'}), 500)


@admin_bp.get('/users')
def get_all_users():
    """Get all users with pagination"""
    user_id, error = require_admin()
    if error:
        return error
    
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 50))
        search = request.args.get('search', '').strip()
        
        users = current_app.mongo_db.users
        query = {}
        
        if search:
            query = {
                '$or': [
                    {'email': {'$regex': search, '$options': 'i'}},
                    {'name': {'$regex': search, '$options': 'i'}}
                ]
            }
        
        skip = (page - 1) * limit
        total = users.count_documents(query)
        
        user_list = []
        for user in users.find(query).skip(skip).limit(limit).sort('created_at', -1):
            user_list.append({
                'id': str(user.get('_id')),
                'name': user.get('name'),
                'email': user.get('email'),
                'email_verified': user.get('email_verified', False),
                'is_admin': user.get('is_admin', False),
                'created_at': user.get('created_at').isoformat() if user.get('created_at') else None,
                'last_login': user.get('last_login').isoformat() if user.get('last_login') else None,
            })
        
        return jsonify({
            'success': True,
            'data': {
                'users': user_list,
                'total': total,
                'page': page,
                'limit': limit,
                'total_pages': (total + limit - 1) // limit
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error fetching users: {str(e)}'}), 500


@admin_bp.get('/users/<user_id>')
def get_user(user_id):
    """Get a specific user's details with complete profile and data"""
    admin_id, error = require_admin()
    if error:
        return error
    
    try:
        users = current_app.mongo_db.users
        try:
            oid = ObjectId(user_id)
        except Exception:
            return jsonify({'success': False, 'message': 'Invalid user id'}), 400
        
        user = users.find_one({'_id': oid})
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        user_id_str = str(user.get('_id'))
        
        # Get user profile from profiles collection
        profile = current_app.mongo_db.profiles.find_one({'userId': user_id_str})
        
        # Get user stats
        daily_meals = current_app.mongo_db.daily_meals
        daily_activity = current_app.mongo_db.daily_activity
        daily_goals = current_app.mongo_db.daily_goals
        user_food_logs = current_app.mongo_db.user_food_logs
        
        # Count documents
        total_meals_docs = daily_meals.count_documents({'userId': user_id_str})
        total_activity_docs = daily_activity.count_documents({'userId': user_id_str})
        total_goals_docs = daily_goals.count_documents({'userId': user_id_str})
        total_food_logs = user_food_logs.count_documents({'user_id': user_id_str})
        
        # Get recent meals (last 10 days)
        recent_meals = []
        for meal_doc in daily_meals.find({'userId': user_id_str}).sort('date', -1).limit(10):
            meals_list = meal_doc.get('meals', [])
            recent_meals.append({
                'date': meal_doc.get('date'),
                'meals_count': len(meals_list),
                'total_calories': sum(m.get('totalCalories', 0) for m in meals_list),
                'meals': meals_list[:5]  # First 5 meals of the day
            })
        
        # Get recent activity (last 10 days)
        recent_activity = []
        for activity_doc in daily_activity.find({'userId': user_id_str}).sort('date', -1).limit(10):
            activity_data = activity_doc.get('activity', {})
            exercises = activity_data.get('exercises', [])
            recent_activity.append({
                'date': activity_doc.get('date'),
                'exercises_count': len(exercises),
                'water_intake': activity_data.get('waterIntake', 0),
                'total_calories_burned': sum(e.get('caloriesBurned', 0) for e in exercises)
            })
        
        # Get current goals
        current_goals = None
        goals_doc = daily_goals.find_one({'userId': user_id_str})
        if goals_doc:
            current_goals = goals_doc.get('goals', {})
        
        # Calculate engagement metrics
        first_meal_date = daily_meals.find_one({'userId': user_id_str}, sort=[('date', 1)])
        days_since_first = 0
        if first_meal_date and first_meal_date.get('date'):
            try:
                first_date = datetime.datetime.strptime(first_meal_date.get('date'), '%Y-%m-%d')
                days_since_first = (datetime.datetime.utcnow() - first_date).days
            except:
                pass
        
        total_days_with_data = total_meals_docs + total_activity_docs
        engagement_rate = (total_days_with_data / max(days_since_first, 1)) * 100 if days_since_first > 0 else 0
        
        user_out = {
            'id': str(user.get('_id')),
            'name': user.get('name'),
            'email': user.get('email'),
            'email_verified': user.get('email_verified', False),
            'is_admin': user.get('is_admin', False),
            'created_at': user.get('created_at').isoformat() if user.get('created_at') else None,
            'last_login': user.get('last_login').isoformat() if user.get('last_login') else None,
            'profile': profile,
            'stats': {
                'total_meals_days': total_meals_docs,
                'total_activity_days': total_activity_docs,
                'total_goals_days': total_goals_docs,
                'total_food_logs': total_food_logs,
                'days_since_first_activity': days_since_first,
                'engagement_rate': round(engagement_rate, 2)
            },
            'recent_meals': recent_meals,
            'recent_activity': recent_activity,
            'current_goals': current_goals
        }
        
        return jsonify({'success': True, 'data': {'user': user_out}})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error fetching user: {str(e)}'}), 500


@admin_bp.put('/users/<user_id>/admin')
def toggle_admin_status(user_id):
    """Promote or demote a user's admin status"""
    admin_id, error = require_admin()
    if error:
        return error
    
    try:
        data = request.get_json(silent=True) or {}
        is_admin = data.get('is_admin', False)
        
        # Prevent demoting yourself
        if user_id == admin_id and not is_admin:
            return jsonify({'success': False, 'message': 'Cannot demote yourself'}), 400
        
        users = current_app.mongo_db.users
        try:
            oid = ObjectId(user_id)
        except Exception:
            return jsonify({'success': False, 'message': 'Invalid user id'}), 400
        
        user = users.find_one({'_id': oid})
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        # Prevent demoting the main admin
        if user.get('email') == ADMIN_EMAIL and not is_admin:
            return jsonify({'success': False, 'message': 'Cannot demote the main admin'}), 400
        
        users.update_one(
            {'_id': oid},
            {'$set': {'is_admin': is_admin, 'updated_at': datetime.datetime.utcnow()}}
        )
        
        # Log admin action
        _log_admin_action(admin_id, 'toggle_admin', {'user_id': user_id, 'is_admin': is_admin})
        
        return jsonify({
            'success': True,
            'message': f'User {"promoted to" if is_admin else "demoted from"} admin successfully'
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error updating admin status: {str(e)}'}), 500


@admin_bp.delete('/users/<user_id>')
def delete_user(user_id):
    """Delete a user and all their data"""
    admin_id, error = require_admin()
    if error:
        return error
    
    try:
        # Prevent deleting yourself
        if user_id == admin_id:
            return jsonify({'success': False, 'message': 'Cannot delete yourself'}), 400
        
        users = current_app.mongo_db.users
        try:
            oid = ObjectId(user_id)
        except Exception:
            return jsonify({'success': False, 'message': 'Invalid user id'}), 400
        
        user = users.find_one({'_id': oid})
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        # Prevent deleting the main admin
        if user.get('email') == ADMIN_EMAIL:
            return jsonify({'success': False, 'message': 'Cannot delete the main admin'}), 400
        
        # Delete all user data
        user_id_str = str(user.get('_id'))
        
        # Delete user data
        current_app.mongo_db.user_data.delete_many({'user_id': user_id_str})
        
        # Delete food logs
        current_app.mongo_db.user_food_logs.delete_many({'user_id': user_id_str})
        
        # Delete activity data
        current_app.mongo_db.user_activity.delete_many({'user_id': user_id_str})
        
        # Delete profile photos (if stored in database)
        # Note: If photos are stored as files, you'd need to delete them from the filesystem
        
        # Finally, delete the user
        users.delete_one({'_id': oid})
        
        # Log admin action
        _log_admin_action(admin_id, 'delete_user', {'user_id': user_id, 'user_email': user.get('email')})
        
        return jsonify({'success': True, 'message': 'User and all associated data deleted successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error deleting user: {str(e)}'}), 500


@admin_bp.delete('/users/<user_id>/history')
def delete_user_history(user_id):
    """Delete a user's history (meals, logs, activity) but keep the account"""
    admin_id, error = require_admin()
    if error:
        return error
    
    try:
        users = current_app.mongo_db.users
        try:
            oid = ObjectId(user_id)
        except Exception:
            return jsonify({'success': False, 'message': 'Invalid user id'}), 400
        
        user = users.find_one({'_id': oid})
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        user_id_str = str(user.get('_id'))
        
        # Get query parameters for filtering
        date_filter = request.args.get('date')  # Format: YYYY-MM-DD
        category = request.args.get('category')  # meals, food_logs, activity, goals, all
        
        deleted_counts = {}
        
        # Build date query if provided
        date_query = {}
        if date_filter:
            try:
                # Parse date and create range for the entire day
                target_date = datetime.datetime.strptime(date_filter, '%Y-%m-%d')
                start_of_day = datetime.datetime.combine(target_date.date(), datetime.datetime.min.time())
                end_of_day = datetime.datetime.combine(target_date.date(), datetime.datetime.max.time())
                date_query = {
                    '$gte': start_of_day,
                    '$lte': end_of_day
                }
            except ValueError:
                return jsonify({'success': False, 'message': 'Invalid date format. Use YYYY-MM-DD'}), 400
        
        # Delete based on category
        if category == 'meals' or category == 'all':
            query = {'userId': user_id_str}
            if date_filter:
                query['date'] = date_filter
            deleted_counts['meals'] = current_app.mongo_db.daily_meals.delete_many(query).deleted_count
        
        if category == 'food_logs' or category == 'all':
            query = {'user_id': user_id_str}
            if date_filter:
                query['logged_at'] = date_query
            deleted_counts['food_logs'] = current_app.mongo_db.user_food_logs.delete_many(query).deleted_count
        
        if category == 'activity' or category == 'all':
            query = {'userId': user_id_str}
            if date_filter:
                query['date'] = date_filter
            deleted_counts['activity'] = current_app.mongo_db.daily_activity.delete_many(query).deleted_count
        
        if category == 'goals' or category == 'all':
            query = {'userId': user_id_str}
            if date_filter:
                query['date'] = date_filter
            deleted_counts['goals'] = current_app.mongo_db.daily_goals.delete_many(query).deleted_count
        
        # Also delete from user_data collection (legacy/backup meals data)
        if (category == 'meals' or category == 'all') and not date_filter:
            query = {'user_id': user_id_str}
            deleted_counts['user_data'] = current_app.mongo_db.user_data.delete_many(query).deleted_count
        
        total_deleted = sum(deleted_counts.values())
        
        # Log admin action
        _log_admin_action(admin_id, 'delete_history', {
            'user_id': user_id,
            'user_email': user.get('email'),
            'date_filter': date_filter,
            'category': category or 'all',
            'deleted_counts': deleted_counts
        })
        
        return jsonify({
            'success': True,
            'message': f'User history deleted successfully. {total_deleted} record(s) removed.',
            'data': {
                'deleted_counts': deleted_counts,
                'total_deleted': total_deleted,
                'date_filter': date_filter,
                'category': category or 'all'
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error deleting user history: {str(e)}'}), 500


@admin_bp.get('/stats')
def get_admin_stats():
    """Get admin dashboard statistics with enhanced analytics"""
    admin_id, error = require_admin()
    if error:
        return error
    
    try:
        users = current_app.mongo_db.users
        daily_meals = current_app.mongo_db.daily_meals
        daily_activity = current_app.mongo_db.daily_activity
        user_food_logs = current_app.mongo_db.user_food_logs
        
        total_users = users.count_documents({})
        verified_users = users.count_documents({'email_verified': True})
        admin_users = users.count_documents({'is_admin': True})
        
        # Get recent signups (last 7 days)
        try:
            seven_days_ago = datetime.datetime.utcnow() - datetime.timedelta(days=7)
            recent_signups = users.count_documents({'created_at': {'$gte': seven_days_ago}})
        except Exception as e:
            # Fallback: count all users if date comparison fails
            recent_signups = 0
            print(f"Error counting recent signups: {e}")
        
        # Get signups over time (last 30 days)
        try:
            thirty_days_ago = datetime.datetime.utcnow() - datetime.timedelta(days=30)
            signups_by_day = {}
            for user in users.find({'created_at': {'$gte': thirty_days_ago}}):
                created_at = user.get('created_at')
                if created_at:
                    # Handle both datetime objects and strings
                    if isinstance(created_at, str):
                        try:
                            created_at = datetime.datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                        except:
                            continue
                    elif hasattr(created_at, 'strftime'):
                        # It's already a datetime object
                        pass
                    else:
                        continue
                    date_str = created_at.strftime('%Y-%m-%d')
                    signups_by_day[date_str] = signups_by_day.get(date_str, 0) + 1
        except Exception as e:
            signups_by_day = {}
            print(f"Error getting signups by day: {e}")
        
        # Calculate active users (users who logged meals in last 7 days)
        active_users = len(daily_meals.distinct('userId', {'date': {'$gte': (datetime.datetime.utcnow() - datetime.timedelta(days=7)).strftime('%Y-%m-%d')}}))
        
        # Calculate average meals per user
        total_meals_docs = daily_meals.count_documents({})
        avg_meals_per_user = round(total_meals_docs / max(total_users, 1), 2)
        
        # Calculate total calories logged
        total_calories = 0
        for meal_doc in daily_meals.find({}):
            meals_list = meal_doc.get('meals', [])
            total_calories += sum(m.get('totalCalories', 0) for m in meals_list)
        
        # Calculate total activity
        total_exercises = 0
        total_calories_burned = 0
        for activity_doc in daily_activity.find({}):
            activity_data = activity_doc.get('activity', {})
            exercises = activity_data.get('exercises', [])
            total_exercises += len(exercises)
            total_calories_burned += sum(e.get('caloriesBurned', 0) for e in exercises)
        
        # Get user engagement metrics
        users_with_meals = len(daily_meals.distinct('userId'))
        users_with_activity = len(daily_activity.distinct('userId'))
        engagement_rate = round((users_with_meals / max(total_users, 1)) * 100, 2)
        
        # Get daily activity trends (last 7 days)
        daily_activity_trend = {}
        for i in range(7):
            date = (datetime.datetime.utcnow() - datetime.timedelta(days=i)).strftime('%Y-%m-%d')
            # Create date range for user signups
            start_of_day = datetime.datetime.strptime(date, '%Y-%m-%d')
            end_of_day = start_of_day + datetime.timedelta(days=1)
            try:
                new_users_count = users.count_documents({'created_at': {'$gte': start_of_day, '$lt': end_of_day}})
            except Exception:
                new_users_count = 0
            daily_activity_trend[date] = {
                'meals_logged': daily_meals.count_documents({'date': date}),
                'activity_logged': daily_activity.count_documents({'date': date}),
                'new_users': new_users_count
            }
        
        return jsonify({
            'success': True,
            'data': {
                'total_users': total_users,
                'verified_users': verified_users,
                'admin_users': admin_users,
                'recent_signups': recent_signups,
                'active_users': active_users,
                'total_meals_days': total_meals_docs,
                'total_food_logs': user_food_logs.count_documents({}),
                'avg_meals_per_user': avg_meals_per_user,
                'total_calories_logged': total_calories,
                'total_exercises_logged': total_exercises,
                'total_calories_burned': total_calories_burned,
                'users_with_meals': users_with_meals,
                'users_with_activity': users_with_activity,
                'engagement_rate': engagement_rate,
                'signups_by_day': signups_by_day,
                'daily_activity_trend': daily_activity_trend
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error fetching stats: {str(e)}'}), 500


@admin_bp.post('/users/bulk')
def bulk_user_operations():
    """Perform bulk operations on multiple users"""
    admin_id, error = require_admin()
    if error:
        return error
    
    try:
        data = request.get_json(silent=True) or {}
        user_ids = data.get('user_ids', [])
        action = data.get('action')  # 'delete', 'verify', 'unverify', 'promote', 'demote'
        
        if not user_ids or not isinstance(user_ids, list):
            return jsonify({'success': False, 'message': 'user_ids array is required'}), 400
        
        if not action or action not in ['delete', 'verify', 'unverify', 'promote', 'demote']:
            return jsonify({'success': False, 'message': 'Valid action is required'}), 400
        
        users = current_app.mongo_db.users
        results = {'success': 0, 'failed': 0, 'errors': []}
        
        for user_id in user_ids:
            try:
                # Prevent self-modification for certain actions
                if user_id == admin_id and action in ['delete', 'demote']:
                    results['failed'] += 1
                    results['errors'].append(f'Cannot {action} yourself')
                    continue
                
                try:
                    oid = ObjectId(user_id)
                except Exception:
                    results['failed'] += 1
                    results['errors'].append(f'Invalid user id: {user_id}')
                    continue
                
                user = users.find_one({'_id': oid})
                if not user:
                    results['failed'] += 1
                    results['errors'].append(f'User not found: {user_id}')
                    continue
                
                # Prevent modifying main admin
                if user.get('email') == ADMIN_EMAIL and action in ['delete', 'demote']:
                    results['failed'] += 1
                    results['errors'].append(f'Cannot {action} main admin')
                    continue
                
                user_id_str = str(user.get('_id'))
                
                if action == 'delete':
                    # Delete all user data
                    current_app.mongo_db.user_data.delete_many({'user_id': user_id_str})
                    current_app.mongo_db.user_food_logs.delete_many({'user_id': user_id_str})
                    current_app.mongo_db.user_activity.delete_many({'user_id': user_id_str})
                    current_app.mongo_db.daily_meals.delete_many({'userId': user_id_str})
                    current_app.mongo_db.daily_activity.delete_many({'userId': user_id_str})
                    current_app.mongo_db.daily_goals.delete_many({'userId': user_id_str})
                    users.delete_one({'_id': oid})
                    results['success'] += 1
                    
                elif action == 'verify':
                    users.update_one({'_id': oid}, {'$set': {'email_verified': True}})
                    results['success'] += 1
                    
                elif action == 'unverify':
                    users.update_one({'_id': oid}, {'$set': {'email_verified': False}})
                    results['success'] += 1
                    
                elif action == 'promote':
                    users.update_one({'_id': oid}, {'$set': {'is_admin': True, 'updated_at': datetime.datetime.utcnow()}})
                    results['success'] += 1
                    
                elif action == 'demote':
                    users.update_one({'_id': oid}, {'$set': {'is_admin': False, 'updated_at': datetime.datetime.utcnow()}})
                    results['success'] += 1
                    
            except Exception as e:
                results['failed'] += 1
                results['errors'].append(f'Error processing {user_id}: {str(e)}')
        
        # Log admin action
        _log_admin_action(admin_id, f'bulk_{action}', {'user_ids': user_ids, 'results': results})
        
        return jsonify({
            'success': True,
            'message': f'Bulk operation completed: {results["success"]} succeeded, {results["failed"]} failed',
            'data': results
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error performing bulk operation: {str(e)}'}), 500


def _log_admin_action(admin_id, action, details=None):
    """Log an admin action to the audit trail"""
    try:
        admin_logs = current_app.mongo_db.admin_logs
        admin_logs.insert_one({
            'admin_id': admin_id,
            'action': action,
            'details': details or {},
            'timestamp': datetime.datetime.utcnow(),
            'ip_address': request.remote_addr if request else None
        })
    except Exception:
        pass  # Don't fail if logging fails


@admin_bp.get('/logs')
def get_admin_logs():
    """Get admin activity logs (audit trail)"""
    admin_id, error = require_admin()
    if error:
        return error
    
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 50))
        action_filter = request.args.get('action', '').strip()
        
        admin_logs = current_app.mongo_db.admin_logs
        query = {}
        
        if action_filter:
            query['action'] = {'$regex': action_filter, '$options': 'i'}
        
        skip = (page - 1) * limit
        total = admin_logs.count_documents(query)
        
        logs_list = []
        for log in admin_logs.find(query).skip(skip).limit(limit).sort('timestamp', -1):
            # Get admin name
            admin_name = 'Unknown'
            admin_email = 'Unknown'
            try:
                admin_oid = ObjectId(log.get('admin_id'))
                admin_user = current_app.mongo_db.users.find_one({'_id': admin_oid})
                if admin_user:
                    admin_name = admin_user.get('name', 'Unknown')
                    admin_email = admin_user.get('email', 'Unknown')
            except:
                pass
            
            logs_list.append({
                'id': str(log.get('_id')),
                'admin_id': log.get('admin_id'),
                'admin_name': admin_name,
                'admin_email': admin_email,
                'action': log.get('action'),
                'details': log.get('details', {}),
                'timestamp': log.get('timestamp').isoformat() if log.get('timestamp') else None,
                'ip_address': log.get('ip_address')
            })
        
        return jsonify({
            'success': True,
            'data': {
                'logs': logs_list,
                'total': total,
                'page': page,
                'limit': limit,
                'total_pages': (total + limit - 1) // limit
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error fetching logs: {str(e)}'}), 500

