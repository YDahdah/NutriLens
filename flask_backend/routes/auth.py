from datetime import datetime, timedelta
import bcrypt
import jwt
from flask import Blueprint, request, jsonify, current_app
from bson import ObjectId
import smtplib
from email.message import EmailMessage
import re
import threading
import time

auth_bp = Blueprint('auth', __name__)


def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password strength.
    Requirements:
    - At least 8 characters long
    - Contains at least one uppercase letter
    - Contains at least one lowercase letter
    - Contains at least one digit
    
    Returns: (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    
    if not re.search(r'\d', password):
        return False, "Password must contain at least one digit"
    
    return True, ""


def create_access_token(user_id: str) -> str:
    payload = {
        'userId': user_id,
        'exp': datetime.utcnow() + timedelta(hours=12),
        'iat': datetime.utcnow(),
    }
    return jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')


def create_email_token(email: str) -> str:
    payload = {
        'email': email,
        'type': 'verify',
        'exp': datetime.utcnow() + timedelta(hours=24),
        'iat': datetime.utcnow(),
    }
    return jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')


def send_email(email: str, subject: str, content: str, html_content: str = None) -> bool:
    """Generic email sending function using SMTP"""
    host = current_app.config.get('SMTP_HOST')
    username = current_app.config.get('SMTP_USERNAME')
    password = current_app.config.get('SMTP_PASSWORD')
    sender = current_app.config.get('EMAIL_FROM')
    port = current_app.config.get('SMTP_PORT', 587)

    if not host or not username or not password or not sender:
        # SMTP not configured; log and return False so frontend can show link
        current_app.logger.info(f"SMTP not configured. Email content for {email}: {content}")
        return False

    try:
        msg = EmailMessage()
        msg['Subject'] = subject
        msg['From'] = sender
        msg['To'] = email
        msg.set_content(content)
        # Add HTML version if provided for better link support in email clients
        if html_content:
            msg.add_alternative(html_content, subtype='html')

        with smtplib.SMTP(host, port) as server:
            server.starttls()
            server.login(username, password)
            server.send_message(msg)
        current_app.logger.info(f"Email sent successfully to {email}")
        return True
    except Exception as e:
        current_app.logger.error(f"Error sending email to {email}: {e}")
        return False


def send_verification_email(email: str, verification_url: str) -> bool:
    """Send email verification link for registration"""
    subject = 'Verify your NutriLens email'
    # Plain text version
    content = (
        f"Welcome to NutriLens!\n\n"
        f"Please verify your email by clicking this link:\n{verification_url}\n\n"
        f"This link expires in 24 hours."
    )
    # HTML version with clickable link for better compatibility
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4CAF50;">Welcome to NutriLens!</h2>
            <p>Please verify your email by clicking the button below:</p>
            <p style="margin: 30px 0;">
                <a href="{verification_url}" 
                   style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                    Verify Email Address
                </a>
            </p>
            <p style="color: #666; font-size: 14px;">
                Or copy and paste this link into your browser:<br>
                <a href="{verification_url}" style="color: #4CAF50; word-break: break-all;">{verification_url}</a>
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
                <strong>Note:</strong> This link expires in 24 hours. If you're opening this on a different device, make sure you're on the same network or use the full URL shown above.
            </p>
        </div>
    </body>
    </html>
    """
    return send_email(email, subject, content, html_content)


def send_password_reset_email(email: str, reset_code: str) -> bool:
    """Send password reset code via email"""
    subject = 'Your NutriLens Password Reset Code'
    content = (
        f"Your password reset code is: {reset_code}\n\n"
        f"This code expires in 10 minutes.\n\n"
        f"If you didn't request this, please ignore this email."
    )
    return send_email(email, subject, content)


def send_reminder_email(email: str, name: str) -> bool:
    """Send meal tracking reminder email"""
    subject = 'Don\'t forget to track your meals! 🍎'
    frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5173').rstrip('/')
    login_url = f"{frontend_url}/login"
    
    content = (
        f"Hi {name},\n\n"
        f"We noticed you haven't logged in for a while. Don't forget to track your meals and stay on top of your nutrition goals!\n\n"
        f"Log in here: {login_url}\n\n"
        f"Tracking your meals regularly helps you:\n"
        f"- Monitor your daily nutrition intake\n"
        f"- Stay consistent with your health goals\n"
        f"- Get personalized insights about your diet\n\n"
        f"Keep up the great work!\n\n"
        f"Best regards,\n"
        f"The NutriLens Team"
    )
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4CAF50;">Hi {name}! 👋</h2>
            <p>We noticed you haven't logged in for a while. Don't forget to track your meals and stay on top of your nutrition goals!</p>
            <p style="margin: 30px 0;">
                <a href="{login_url}" 
                   style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                    Log In to NutriLens
                </a>
            </p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="color: #4CAF50; margin-top: 0;">Tracking your meals regularly helps you:</h3>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>Monitor your daily nutrition intake</li>
                    <li>Stay consistent with your health goals</li>
                    <li>Get personalized insights about your diet</li>
                </ul>
            </div>
            <p>Keep up the great work! 💪</p>
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
                Best regards,<br>
                <strong>The NutriLens Team</strong>
            </p>
        </div>
    </body>
    </html>
    """
    return send_email(email, subject, content, html_content)


def verify_token(token: str):
    try:
        return jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
    except Exception:
        return None


@auth_bp.post('/register')
def register():
    data = request.get_json(silent=True) or {}
    name, email, password = data.get('name'), data.get('email'), data.get('password')
    if not name or not email or not password:
        return jsonify({'success': False, 'message': 'Name, email and password are required'}), 400
    
    # Validate password strength
    is_valid, error_message = validate_password_strength(password)
    if not is_valid:
        return jsonify({'success': False, 'message': error_message}), 400
    
    try:
        users = current_app.mongo_db.users
        # Ensure email index exists (idempotent)
        try:
            users.create_index('email', unique=True)
        except Exception:
            pass

        existing = users.find_one({'email': email})
        if existing:
            return jsonify({'success': False, 'message': 'User with this email already exists'}), 409

        expires_at = datetime.utcnow() + timedelta(minutes=1)
        doc = {
            'name': name,
            'email': email,
            'password': hash_password(password),
            'email_verified': False,
            'verification_expires_at': expires_at,
            'first_login': True,  # Track first login
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        }
        users.insert_one(doc)

        token = create_email_token(email)
        # Use backend API URL so verification happens server-side and redirects directly
        # This avoids showing a separate verification page
        base = request.host_url.rstrip('/')
        # URL encode the token to ensure it works properly in all browsers
        from urllib.parse import quote
        encoded_token = quote(token, safe='')
        verify_url = f"{base}/api/auth/verify-email?token={encoded_token}"
        email_sent = send_verification_email(email, verify_url)

        return jsonify({
            'success': True,
            'message': 'Registration successful! Please verify your email to continue.',
            'data': {
                'email': email,
                'emailSent': bool(email_sent),
                'verificationUrl': verify_url if not email_sent else None
            }
        }), 201
    except Exception as e:
        return jsonify({'success': False, 'message': f'Registration failed: {str(e)}'}), 500


@auth_bp.get('/verify-email')
def verify_email():
    token = request.args.get('token')
    if not token:
        # Redirect to frontend with error
        from flask import redirect
        frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5173').rstrip('/')
        return redirect(f"{frontend_url}/?verified_error=no_token")
    
    try:
        # URL decode the token if needed
        from urllib.parse import unquote
        decoded_token = unquote(token)
        data = jwt.decode(decoded_token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        if data.get('type') != 'verify':
            from flask import redirect
            frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5173').rstrip('/')
            return redirect(f"{frontend_url}/?verified_error=invalid_token")
        
        email = data.get('email')
        if not email:
            from flask import redirect
            frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5173').rstrip('/')
            return redirect(f"{frontend_url}/?verified_error=invalid_token")
        
        users = current_app.mongo_db.users
        user = users.find_one({'email': email})
        if not user:
            from flask import redirect
            frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5173').rstrip('/')
            return redirect(f"{frontend_url}/?verified_error=user_not_found")
        
        # Check expiration window
        exp = user.get('verification_expires_at')
        if exp and exp < datetime.utcnow():
            users.delete_one({'_id': user['_id']})
            from flask import redirect
            frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5173').rstrip('/')
            return redirect(f"{frontend_url}/?verified_error=expired")
        
        # Verify the email
        res = users.update_one({'email': email}, {'$set': {'email_verified': True, 'updated_at': datetime.utcnow()}, '$unset': {'verification_expires_at': ''}})
        if res.matched_count == 0:
            from flask import redirect
            frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5173').rstrip('/')
            return redirect(f"{frontend_url}/?verified_error=user_not_found")
        
        # Always redirect to frontend with success
        from flask import redirect
        frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5173').rstrip('/')
        return redirect(f"{frontend_url}/?verified=1")
        
    except jwt.ExpiredSignatureError:
        from flask import redirect
        frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5173').rstrip('/')
        return redirect(f"{frontend_url}/?verified_error=expired")
    except Exception as e:
        from flask import redirect
        frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5173').rstrip('/')
        current_app.logger.error(f"Verification error: {e}")
        return redirect(f"{frontend_url}/?verified_error=failed")


@auth_bp.post('/login')
def login():
    data = request.get_json(silent=True) or {}
    email, password = data.get('email'), data.get('password')
    if not email or not password:
        return jsonify({'success': False, 'message': 'Email and password are required'}), 400
    
    try:
        users = current_app.mongo_db.users
        user = users.find_one({'email': email})
        if not user:
            return jsonify({'success': False, 'message': 'Email not found'}), 404
        if not verify_password(password, user.get('password', '')):
            return jsonify({'success': False, 'message': 'Incorrect password'}), 401
        if not user.get('email_verified', False):
            # If unverified and expired, delete and block
            exp = user.get('verification_expires_at')
            if exp and exp < datetime.utcnow():
                users.delete_one({'_id': user['_id']})
                return jsonify({'success': False, 'message': 'Registration expired. Please register again.'}), 403
            return jsonify({'success': False, 'message': 'Please verify your email before logging in.'}), 403

        # Check if this is first login and password needs to be changed
        is_first_login = user.get('first_login', False)
        if is_first_login:
            # Validate password strength on first login
            is_valid, error_message = validate_password_strength(password)
            if not is_valid:
                return jsonify({
                    'success': False, 
                    'message': f'Weak password detected. {error_message} Please use a strong password.',
                    'requires_password_change': True
                }), 400

        # Mark first_login as False after successful first login and update last_login
        now = datetime.utcnow()
        update_data = {'last_login': now, 'updated_at': now}
        if is_first_login:
            update_data['first_login'] = False
        
        users.update_one(
            {'_id': user['_id']},
            {'$set': update_data}
        )

        user_id = str(user.get('_id'))
        token = create_access_token(user_id)
        user_out = {
            'id': user_id,
            'name': user.get('name'),
            'email': user.get('email'),
            'email_verified': user.get('email_verified', False),
            'is_admin': user.get('is_admin', False),
            'created_at': user.get('created_at')
        }
        return jsonify({
            'success': True, 
            'message': 'Login successful', 
            'data': {'user': user_out, 'token': token}
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'Login failed: {str(e)}'}), 500


@auth_bp.get('/profile')
def profile():
    auth = request.headers.get('Authorization', '')
    token = auth.replace('Bearer ', '') if auth.startswith('Bearer ') else None
    if not token:
        return jsonify({'success': False, 'message': 'Access token required'}), 401
    
    decoded = verify_token(token)
    if not decoded:
        return jsonify({'success': False, 'message': 'Invalid or expired token'}), 401
    
    try:
        users = current_app.mongo_db.users
        user_id = decoded.get('userId')
        try:
            oid = ObjectId(user_id)
        except Exception:
            return jsonify({'success': False, 'message': 'Invalid user id'}), 400
        user = users.find_one({'_id': oid})
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404

        user_out = {
            'id': str(user.get('_id')),
            'name': user.get('name'),
            'email': user.get('email'),
            'email_verified': user.get('email_verified', False),
            'is_admin': user.get('is_admin', False),
            'created_at': user.get('created_at')
        }
        return jsonify({'success': True, 'data': {'user': user_out}})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Profile error: {str(e)}'}), 500


@auth_bp.post('/logout')
def logout():
    return jsonify({'success': True, 'message': 'Logged out successfully'})


@auth_bp.post('/forgot-password')
def forgot_password():
    data = request.get_json(silent=True) or {}
    email = data.get('email')
    if not email:
        return jsonify({'success': False, 'message': 'Email address is required'}), 400
    
    try:
        users = current_app.mongo_db.users
        user = users.find_one({'email': email})
        # Always pretend success to avoid user enumeration
        if not user:
            return jsonify({'success': True, 'message': 'If an account with that email exists, a code has been sent.'})

        # Generate 6-digit code and store hashed with 10 min expiry
        import random
        code = f"{random.randint(0, 999999):06d}"
        code_hash = bcrypt.hashpw(code.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        expires_at = datetime.utcnow() + timedelta(minutes=10)
        users.update_one(
            {'_id': user['_id']},
            {
                '$set': {
                    'reset_code_hash': code_hash,
                    'reset_code_expires_at': expires_at,
                    'updated_at': datetime.utcnow(),
                }
            }
        )

        # Email the code
        sent = send_password_reset_email(email, code)
        # If SMTP not configured, we log the code
        if not sent:
            current_app.logger.info(f"Password reset code for {email}: {code}")

        return jsonify({'success': True, 'message': 'If an account with that email exists, a code has been sent.'})
    except Exception:
        return jsonify({'success': False, 'message': 'Error processing request'}), 500


@auth_bp.post('/verify-code')
def verify_code():
    data = request.get_json(silent=True) or {}
    email = data.get('email')
    code = data.get('code')
    if not email or not code:
        return jsonify({'success': False, 'message': 'Email and code are required'}), 400
    try:
        users = current_app.mongo_db.users
        user = users.find_one({'email': email})
        if not user:
            return jsonify({'success': False, 'message': 'Invalid code or email'}), 400
        exp = user.get('reset_code_expires_at')
        code_hash = user.get('reset_code_hash', '')
        if not exp or exp < datetime.utcnow() or not code_hash or not bcrypt.checkpw(code.encode('utf-8'), code_hash.encode('utf-8')):
            return jsonify({'success': False, 'message': 'Invalid or expired code'}), 400
        return jsonify({'success': True, 'message': 'Code verified'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500


@auth_bp.post('/reset-password')
def reset_password():
    data = request.get_json(silent=True) or {}
    email = data.get('email')
    code = data.get('code')
    new_password = data.get('newPassword')
    if not email or not code or not new_password:
        return jsonify({'success': False, 'message': 'Email, code, and new password are required'}), 400
    
    # Validate password strength
    is_valid, error_message = validate_password_strength(new_password)
    if not is_valid:
        return jsonify({'success': False, 'message': error_message}), 400
    
    try:
        users = current_app.mongo_db.users
        user = users.find_one({'email': email})
        if not user:
            return jsonify({'success': False, 'message': 'Invalid code or email'}), 400
        exp = user.get('reset_code_expires_at')
        code_hash = user.get('reset_code_hash', '')
        if not exp or exp < datetime.utcnow() or not code_hash or not bcrypt.checkpw(code.encode('utf-8'), code_hash.encode('utf-8')):
            return jsonify({'success': False, 'message': 'Invalid or expired code'}), 400

        users.update_one(
            {'_id': user['_id']},
            {
                '$set': {'password': hash_password(new_password), 'updated_at': datetime.utcnow()},
                '$unset': {'reset_code_hash': '', 'reset_code_expires_at': ''}
            }
        )
        return jsonify({'success': True, 'message': 'Password has been reset. You can now log in.'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error resetting password: {str(e)}'}), 500


@auth_bp.post('/resend-verification')
def resend_verification():
    data = request.get_json(silent=True) or {}
    email = data.get('email')
    if not email:
        return jsonify({'success': False, 'message': 'Email address is required'}), 400
    try:
        users = current_app.mongo_db.users
        user = users.find_one({'email': email})
        if not user:
            # Don't reveal existence
            return jsonify({'success': True, 'message': 'If an account exists, a verification email has been sent.'})
        if user.get('email_verified', False):
            return jsonify({'success': True, 'message': 'Email already verified.'})
        # Check expiration; if expired, delete and ask to re-register
        exp = user.get('verification_expires_at')
        if exp and exp < datetime.utcnow():
            users.delete_one({'_id': user['_id']})
            return jsonify({'success': False, 'message': 'Verification window expired. Please register again.'}), 400
        token = create_email_token(email)
        # Use backend API URL so verification happens server-side and redirects directly
        # This avoids showing a separate verification page
        base = request.host_url.rstrip('/')
        # URL encode the token to ensure it works properly in all browsers
        from urllib.parse import quote
        encoded_token = quote(token, safe='')
        verify_url = f"{base}/api/auth/verify-email?token={encoded_token}"
        email_sent = send_verification_email(email, verify_url)
        return jsonify({
            'success': True,
            'message': 'Verification email sent.',
            'data': {
                'emailSent': bool(email_sent),
                'verificationUrl': verify_url if not email_sent else None
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error processing request: {str(e)}'}), 500


@auth_bp.get('/resend-verification')
def resend_verification_get():
    email = request.args.get('email')
    if not email:
        return jsonify({'success': False, 'message': 'Email address is required'}), 400
    # Reuse the POST logic by constructing a request-like payload
    try:
        users = current_app.mongo_db.users
        user = users.find_one({'email': email})
        if not user:
            return jsonify({'success': True, 'message': 'If an account exists, a verification email has been sent.'})
        if user.get('email_verified', False):
            return jsonify({'success': True, 'message': 'Email already verified.'})

        token = create_email_token(email)
        # Use backend API URL so verification happens server-side and redirects directly
        # This avoids showing a separate verification page
        base = request.host_url.rstrip('/')
        # URL encode the token to ensure it works properly in all browsers
        from urllib.parse import quote
        encoded_token = quote(token, safe='')
        verify_url = f"{base}/api/auth/verify-email?token={encoded_token}"
        email_sent = send_verification_email(email, verify_url)
        return jsonify({
            'success': True,
            'message': 'Verification email sent.',
            'data': {
                'emailSent': bool(email_sent),
                'verificationUrl': verify_url if not email_sent else None
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error processing request: {str(e)}'}), 500


def check_and_send_reminders(app_context):
    """
    Check for users who haven't logged in for 5+ hours and send reminder emails.
    This function runs in a background thread.
    """
    with app_context:
        try:
            users = current_app.mongo_db.users
            now = datetime.utcnow()
            five_hours_ago = now - timedelta(hours=5)
            
            # Find users who:
            # 1. Have verified their email
            # 2. Have a last_login timestamp
            # 3. Haven't logged in for 5+ hours
            # 4. Haven't been sent a reminder in the last 5 hours (to avoid spam)
            reminder_threshold = now - timedelta(hours=5)
            
            inactive_users = users.find({
                'email_verified': True,
                'last_login': {'$exists': True, '$lt': five_hours_ago},
                '$or': [
                    {'last_reminder_sent': {'$exists': False}},
                    {'last_reminder_sent': {'$lt': reminder_threshold}}
                ]
            })
            
            sent_count = 0
            for user in inactive_users:
                try:
                    email = user.get('email')
                    name = user.get('name', 'User')
                    
                    if email:
                        sent = send_reminder_email(email, name)
                        if sent:
                            # Update last_reminder_sent timestamp
                            users.update_one(
                                {'_id': user['_id']},
                                {'$set': {'last_reminder_sent': now, 'updated_at': now}}
                            )
                            sent_count += 1
                            current_app.logger.info(f"Reminder email sent to {email}")
                except Exception as e:
                    current_app.logger.error(f"Error sending reminder to {user.get('email', 'unknown')}: {e}")
            
            if sent_count > 0:
                current_app.logger.info(f"Sent {sent_count} reminder email(s)")
        except Exception as e:
            current_app.logger.error(f"Error in reminder check: {e}")


def start_reminder_scheduler(app):
    """
    Start a background thread that checks for inactive users every 5 hours
    and sends reminder emails.
    """
    def scheduler_loop():
        # Wait 5 hours before first check (to allow users to login initially)
        time.sleep(5 * 60 * 60)  # 5 hours in seconds
        
        while True:
            try:
                check_and_send_reminders(app.app_context())
            except Exception as e:
                app.logger.error(f"Error in reminder scheduler: {e}")
            
            # Sleep for 5 hours before next check
            time.sleep(5 * 60 * 60)  # 5 hours in seconds
    
    scheduler_thread = threading.Thread(target=scheduler_loop, daemon=True)
    scheduler_thread.start()
    app.logger.info("Reminder email scheduler started (checks every 5 hours)")
