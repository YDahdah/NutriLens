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
import requests

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
        'iat': datetime.utcnow(),  }
    return jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')
def create_email_token(email: str) -> str:
    payload = {
        'email': email,
        'type': 'verify',
        'exp': datetime.utcnow() + timedelta(hours=24),
        'iat': datetime.utcnow(),   }
    return jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')
def send_email(email: str, subject: str, content: str, html_content: str = None) -> bool:
    """Generic email sending function using SMTP"""
    host = current_app.config.get('SMTP_HOST')
    username = current_app.config.get('SMTP_USERNAME')
    password = current_app.config.get('SMTP_PASSWORD')
    sender_name = current_app.config.get('EMAIL_FROM', 'NutriLens')
    port = current_app.config.get('SMTP_PORT', 587)
    if not host or not username or not password:
        current_app.logger.info(f"SMTP not configured. Email content for {email}: {content}")
        return False
    try:
        msg = EmailMessage()
        msg['Subject'] = subject
        # Format sender as "NutriLens <email@address.com>" so it displays as "NutriLens" in email clients
        msg['From'] = f"{sender_name} <{username}>"
        msg['To'] = email
        msg.set_content(content)
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


def send_verification_email(email: str, verification_code: str) -> bool:
    """Send email verification code for registration"""
    subject = 'Verify your NutriLens email'
    # Plain text version
    content = (
        f"Welcome to NutriLens!\n\n"
        f"Your verification code is: {verification_code}\n\n"
        f"This code expires in 1 minute.\n\n"
        f"Enter this code on the verification page to complete your registration."
    )
    # HTML version
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
            <p>Please verify your email by entering the code below:</p>
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 30px 0; text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #4CAF50; letter-spacing: 8px; margin: 0;">
                    {verification_code}
                </p>
            </div>
            <p style="color: #666; font-size: 14px;">
                Enter this code on the verification page to complete your registration.
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
                <strong>Note:</strong> This code expires in 1 minute. If you didn't request this code, please ignore this email.
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
        f"This code expires in 1 min.\n\n"
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
        return jsonify({
            'success': False, 
            'message': 'Please provide your name, email address, and password to create an account.'
        }), 400
    
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

        # Check if user already exists (verified or unverified)
        existing = users.find_one({'email': email})
        if existing:
            return jsonify({
                'success': False, 
                'message': 'An account with this email address already exists. Please log in instead or use a different email.'
            }), 409

        # Check pending registrations collection for unverified users
        pending_registrations = current_app.mongo_db.pending_registrations
        existing_pending = pending_registrations.find_one({'email': email})
        if existing_pending:
            # Check if expired
            exp = existing_pending.get('verification_expires_at')
            if exp and exp < datetime.utcnow():
                # Delete expired pending registration
                pending_registrations.delete_one({'_id': existing_pending['_id']})
            else:
                return jsonify({
                    'success': False,
                    'message': 'A verification code has already been sent to this email. Please check your inbox or wait before requesting a new code.'
                }), 409

        expires_at = datetime.utcnow() + timedelta(minutes=1)
        # Generate 6-digit verification code
        import random
        verification_code = f"{random.randint(0, 999999):06d}"
        code_hash = bcrypt.hashpw(verification_code.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Store in pending registrations collection (NOT in users collection)
        pending_doc = {
            'name': name,
            'email': email,
            'password': hash_password(password),
            'verification_code_hash': code_hash,
            'verification_expires_at': expires_at,
            'created_at': datetime.utcnow(),
        }
        pending_registrations.insert_one(pending_doc)

        # Check if SMTP is configured
        smtp_configured = bool(
            current_app.config.get('SMTP_HOST') and 
            current_app.config.get('SMTP_USERNAME') and 
            current_app.config.get('SMTP_PASSWORD')
        )
        
        # Try to send email synchronously with a short timeout to check if it works
        # If it fails quickly, we'll include the code in the response
        email_sent = False
        email_error = None
        try:
            # Try sending email with a quick check (non-blocking for user, but we check result)
            email_sent = send_verification_email(email, verification_code)
            if email_sent:
                current_app.logger.info(f"✅ Email sent successfully to {email}")
        except Exception as e:
            email_error = str(e)
            current_app.logger.error(f"❌ Error sending verification email to {email}: {e}")
        
        # Also send in background thread as backup (in case first attempt was slow)
        def send_email_async():
            try:
                # Only send if first attempt didn't succeed
                if not email_sent:
                    email_sent_retry = send_verification_email(email, verification_code)
                    if email_sent_retry:
                        current_app.logger.info(f"✅ Email sent successfully (retry) to {email}")
                    else:
                        current_app.logger.warning(f"⚠️ EMAIL NOT SENT - Verification code for {email}: {verification_code}")
                        current_app.logger.warning(f"⚠️ Check server logs (flask_backend/logs/app.log) or API response for the verification code")
            except Exception as e:
                current_app.logger.error(f"❌ Error sending verification email (retry) to {email}: {e}")
                current_app.logger.error(f"⚠️ VERIFICATION CODE (due to error): {verification_code}")
        
        email_thread = threading.Thread(target=send_email_async, daemon=True)
        email_thread.start()
        
        # Prepare response data
        response_data = {
            'email': email,
            'emailSent': email_sent,
        }
        
        # Include code in response if email wasn't sent (for user convenience)
        # This helps when SMTP fails or is not configured
        if not email_sent:
            response_data['verificationCode'] = verification_code
            response_data['emailError'] = email_error or 'Email sending failed'
            response_data['note'] = 'Email could not be sent. Please use the verification code shown below.'
            current_app.logger.warning(f"⚠️ Including verification code in API response for {email}: {verification_code}")

        message = 'Registration successful! '
        if email_sent:
            message += 'Please check your email for the verification code.'
        else:
            message += 'Email could not be sent. Please use the verification code provided below.'

        return jsonify({
            'success': True,
            'message': message,
            'data': response_data
        }), 201
    except Exception as e:
        return jsonify({'success': False, 'message': f'Registration failed: {str(e)}'}), 500


@auth_bp.post('/verify-email-code')
def verify_email_code():
    """Verify email using a code instead of a token"""
    data = request.get_json(silent=True) or {}
    email = data.get('email')
    code = data.get('code')
    
    if not email or not code:
        return jsonify({'success': False, 'message': 'Email and verification code are required'}), 400
    
    try:
        # Check pending registrations first
        pending_registrations = current_app.mongo_db.pending_registrations
        pending_user = pending_registrations.find_one({'email': email})
        
        if not pending_user:
            # Check if user already exists and is verified (in case they verify twice)
            users = current_app.mongo_db.users
            existing_user = users.find_one({'email': email})
            if existing_user and existing_user.get('email_verified', False):
                return jsonify({'success': True, 'message': 'Email already verified'}), 200
            return jsonify({'success': False, 'message': 'Invalid code or email. Please register again.'}), 400
        
        # Check expiration
        exp = pending_user.get('verification_expires_at')
        if not exp or exp < datetime.utcnow():
            pending_registrations.delete_one({'_id': pending_user['_id']})
            return jsonify({'success': False, 'message': 'Verification code expired. Please register again.'}), 400
        
        # Verify code
        code_hash = pending_user.get('verification_code_hash', '')
        if not code_hash or not bcrypt.checkpw(code.encode('utf-8'), code_hash.encode('utf-8')):
            return jsonify({'success': False, 'message': 'Invalid verification code'}), 400
        
        # Code is valid - NOW create the user in the users collection
        users = current_app.mongo_db.users
        # Double-check user doesn't already exist
        existing_user = users.find_one({'email': email})
        if existing_user:
            # User already exists, remove pending registration
            pending_registrations.delete_one({'_id': pending_user['_id']})
            if existing_user.get('email_verified', False):
                return jsonify({'success': True, 'message': 'Email already verified'}), 200
            else:
                # Mark as verified if somehow unverified user exists
                users.update_one(
                    {'email': email},
                    {'$set': {'email_verified': True, 'updated_at': datetime.utcnow()}}
                )
                return jsonify({'success': True, 'message': 'Email verified successfully! You can now log in.'}), 200
        
        # Create user in users collection (only after verification)
        user_doc = {
            'name': pending_user['name'],
            'email': pending_user['email'],
            'password': pending_user['password'],
            'email_verified': True,  # Verified since code was correct
            'first_login': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        }
        users.insert_one(user_doc)
        
        # Remove from pending registrations
        pending_registrations.delete_one({'_id': pending_user['_id']})
        
        return jsonify({
            'success': True,
            'message': 'Email verified successfully! You can now log in.'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Email verification error: {e}")
        return jsonify({'success': False, 'message': f'Verification failed: {str(e)}'}), 500


@auth_bp.get('/verify-email')
def verify_email():
    """Legacy endpoint for token-based verification (kept for backward compatibility)"""
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
        
        # Check pending registrations first - if user exists there, they haven't verified yet
        pending_registrations = current_app.mongo_db.pending_registrations
        pending_user = pending_registrations.find_one({'email': email})
        if pending_user:
            # Check if expired
            exp = pending_user.get('verification_expires_at')
            if exp and exp < datetime.utcnow():
                pending_registrations.delete_one({'_id': pending_user['_id']})
                return jsonify({'success': False, 'message': 'Verification code expired. Please register again.'}), 403
            return jsonify({'success': False, 'message': 'Please verify your email before logging in. Check your inbox for the verification code.'}), 403
        
        if not user:
            current_app.logger.warning(f"Login attempt with non-existent email: {email}")
            return jsonify({
                'success': False, 
                'message': 'No account found with this email address. Please check your email or sign up for a new account.'
            }), 404
        
        if not verify_password(password, user.get('password', '')):
            current_app.logger.warning(f"Failed login attempt for email: {email}")
            return jsonify({
                'success': False, 
                'message': 'The password you entered is incorrect. Please try again or reset your password.'
            }), 401
        
        # Check if email is verified (should always be True now, but check for legacy users)
        if not user.get('email_verified', False):
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
        current_app.logger.info(f"User logged in: {email}")
        return jsonify({
            'success': True, 
            'message': 'Welcome back! You have successfully logged in.', 
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


@auth_bp.post('/google-signin')
def google_signin():
    """Handle Google Sign-In authentication"""
    data = request.get_json(silent=True) or {}
    id_token = data.get('idToken')
    access_token = data.get('accessToken')
    mode = data.get('mode', 'login')  # 'login' or 'signup'
    
    if not id_token and not access_token:
        return jsonify({'success': False, 'message': 'Google token is required'}), 400
    
    try:
        google_client_id = current_app.config.get('GOOGLE_CLIENT_ID', '')
        # Also try reading directly from environment as fallback
        if not google_client_id:
            import os
            google_client_id = os.getenv('GOOGLE_CLIENT_ID', '')
        
        if not google_client_id:
            current_app.logger.error('Google OAuth not configured: GOOGLE_CLIENT_ID is empty')
            return jsonify({'success': False, 'message': 'Google OAuth not configured'}), 500
        
        # If we have an access token, get user info from Google API
        if access_token:
            user_info_response = requests.get(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                headers={'Authorization': f'Bearer {access_token}'},
                timeout=10
            )
            
            if user_info_response.status_code != 200:
                return jsonify({'success': False, 'message': 'Invalid Google access token'}), 401
            
            token_data = user_info_response.json()
            google_email = token_data.get('email')
            google_name = token_data.get('name', '')
            google_picture = token_data.get('picture', '')
            google_id = token_data.get('sub')
        else:
            # Verify Google ID token
            verify_url = f'https://oauth2.googleapis.com/tokeninfo?id_token={id_token}'
            response = requests.get(verify_url, timeout=10)
            
            if response.status_code != 200:
                return jsonify({'success': False, 'message': 'Invalid Google token'}), 401
            
            token_data = response.json()
            
            # Verify the token is for our app
            if token_data.get('aud') != google_client_id:
                return jsonify({'success': False, 'message': 'Invalid token audience'}), 401
            
            # Extract user information
            google_email = token_data.get('email')
            google_name = token_data.get('name', '')
            google_picture = token_data.get('picture', '')
            google_id = token_data.get('sub')
        
        if not google_email:
            return jsonify({'success': False, 'message': 'Email not provided by Google'}), 400
        
        users = current_app.mongo_db.users
        
        # Check if user exists
        user = users.find_one({'email': google_email})
        
        if user:
            # User exists
            if mode == 'signup':
                # User is trying to sign up but account already exists
                return jsonify({
                    'success': False, 
                    'message': 'An account with this email already exists. Please sign in instead.',
                    'account_exists': True
                }), 409
            
            # User exists and is signing in - update last login
            now = datetime.utcnow()
            users.update_one(
                {'_id': user['_id']},
                {'$set': {
                    'last_login': now,
                    'updated_at': now,
                    'google_id': google_id,
                    'picture': google_picture
                }}
            )
            user_id = str(user.get('_id'))
        else:
            # Create new user account
            now = datetime.utcnow()
            doc = {
                'name': google_name or google_email.split('@')[0],
                'email': google_email,
                'password': '',  # No password for Google users
                'email_verified': True,  # Google emails are pre-verified
                'google_id': google_id,
                'picture': google_picture,
                'auth_provider': 'google',
                'first_login': False,
                'created_at': now,
                'updated_at': now,
                'last_login': now
            }
            result = users.insert_one(doc)
            user_id = str(result.inserted_id)
            user = doc
        
        # Generate access token
        token = create_access_token(user_id)
        user_out = {
            'id': user_id,
            'name': user.get('name') or google_name,
            'email': google_email,
            'email_verified': True,
            'is_admin': user.get('is_admin', False),
            'picture': google_picture,
            'created_at': user.get('created_at')
        }
        
        return jsonify({
            'success': True,
            'message': 'Google sign-in successful',
            'data': {'user': user_out, 'token': token}
        })
    except requests.RequestException as e:
        current_app.logger.error(f'Google token verification error: {e}')
        return jsonify({'success': False, 'message': 'Failed to verify Google token'}), 500
    except Exception as e:
        current_app.logger.error(f'Google sign-in error: {e}')
        return jsonify({'success': False, 'message': f'Google sign-in failed: {str(e)}'}), 500


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

        # Generate 6-digit code and store hashed with 1 min expiry
        import random
        code = f"{random.randint(0, 999999):06d}"
        code_hash = bcrypt.hashpw(code.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        expires_at = datetime.utcnow() + timedelta(minutes=1)
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

        # Email the code in background thread to avoid blocking
        def send_email_async():
            try:
                sent = send_password_reset_email(email, code)
                # If SMTP not configured or email failed, log the code so user can check server logs
                if not sent:
                    current_app.logger.warning(f"⚠️ EMAIL NOT SENT - Password reset code for {email}: {code}")
                    current_app.logger.warning(f"⚠️ Check server logs above for the password reset code if email is not received")
            except Exception as e:
                current_app.logger.error(f"❌ Error sending password reset email to {email}: {e}")
                current_app.logger.error(f"⚠️ PASSWORD RESET CODE (due to error): {code}")
                current_app.logger.error(f"⚠️ User {email} should check server logs for password reset code")
        
        email_thread = threading.Thread(target=send_email_async, daemon=True)
        email_thread.start()

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
        
        # Check if user is already verified
        if user and user.get('email_verified', False):
            return jsonify({'success': True, 'message': 'Email already verified.'})
        
        # Check pending registrations
        pending_registrations = current_app.mongo_db.pending_registrations
        pending_user = pending_registrations.find_one({'email': email})
        
        if not pending_user:
            # Don't reveal existence - could be verified user or no registration
            if user:
                # User exists but not verified (shouldn't happen with new flow, but handle legacy)
                return jsonify({'success': True, 'message': 'If an account exists, a verification email has been sent.'})
            return jsonify({'success': True, 'message': 'If an account exists, a verification email has been sent.'})
        
        # Check expiration; if expired, delete and ask to re-register
        exp = pending_user.get('verification_expires_at')
        if exp and exp < datetime.utcnow():
            pending_registrations.delete_one({'_id': pending_user['_id']})
            return jsonify({'success': False, 'message': 'Verification window expired. Please register again.'}), 400
        
        # Generate new 6-digit verification code
        import random
        verification_code = f"{random.randint(0, 999999):06d}"
        code_hash = bcrypt.hashpw(verification_code.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        expires_at = datetime.utcnow() + timedelta(minutes=1)
        
        # Update pending registration with new code
        pending_registrations.update_one(
            {'_id': pending_user['_id']},
            {
                '$set': {
                    'verification_code_hash': code_hash,
                    'verification_expires_at': expires_at,
                }
            }
        )
        
        # Send verification code via email in background thread to avoid blocking
        def send_email_async():
            try:
                email_sent = send_verification_email(email, verification_code)
                # If SMTP not configured or email failed, log the code so user can check server logs
                if not email_sent:
                    current_app.logger.warning(f"⚠️ EMAIL NOT SENT - Verification code for {email}: {verification_code}")
                    current_app.logger.warning(f"⚠️ Check server logs above for the verification code if email is not received")
            except Exception as e:
                current_app.logger.error(f"❌ Error sending verification email to {email}: {e}")
                current_app.logger.error(f"⚠️ VERIFICATION CODE (due to error): {verification_code}")
                current_app.logger.error(f"⚠️ User {email} should check server logs for verification code")
        
        email_thread = threading.Thread(target=send_email_async, daemon=True)
        email_thread.start()
        
        return jsonify({
            'success': True,
            'message': 'Verification code sent to your email.',
            'data': {
                'emailSent': True,  # Assume email will be sent
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error processing request: {str(e)}'}), 500


@auth_bp.get('/resend-verification')
def resend_verification_get():
    email = request.args.get('email')
    if not email:
        return jsonify({'success': False, 'message': 'Email address is required'}), 400
    # Reuse the POST logic
    try:
        users = current_app.mongo_db.users
        user = users.find_one({'email': email})
        
        # Check if user is already verified
        if user and user.get('email_verified', False):
            return jsonify({'success': True, 'message': 'Email already verified.'})
        
        # Check pending registrations
        pending_registrations = current_app.mongo_db.pending_registrations
        pending_user = pending_registrations.find_one({'email': email})
        
        if not pending_user:
            return jsonify({'success': True, 'message': 'If an account exists, a verification email has been sent.'})

        # Check expiration; if expired, delete and ask to re-register
        exp = pending_user.get('verification_expires_at')
        if exp and exp < datetime.utcnow():
            pending_registrations.delete_one({'_id': pending_user['_id']})
            return jsonify({'success': False, 'message': 'Verification window expired. Please register again.'}), 400

        # Generate new 6-digit verification code
        import random
        verification_code = f"{random.randint(0, 999999):06d}"
        code_hash = bcrypt.hashpw(verification_code.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        expires_at = datetime.utcnow() + timedelta(minutes=1)
        
        # Update pending registration with new code
        pending_registrations.update_one(
            {'_id': pending_user['_id']},
            {
                '$set': {
                    'verification_code_hash': code_hash,
                    'verification_expires_at': expires_at,
                }
            }
        )
        
        # Send verification code via email in background thread to avoid blocking
        def send_email_async():
            try:
                email_sent = send_verification_email(email, verification_code)
                # If SMTP not configured or email failed, log the code so user can check server logs
                if not email_sent:
                    current_app.logger.warning(f"⚠️ EMAIL NOT SENT - Verification code for {email}: {verification_code}")
                    current_app.logger.warning(f"⚠️ Check server logs above for the verification code if email is not received")
            except Exception as e:
                current_app.logger.error(f"❌ Error sending verification email to {email}: {e}")
                current_app.logger.error(f"⚠️ VERIFICATION CODE (due to error): {verification_code}")
                current_app.logger.error(f"⚠️ User {email} should check server logs for verification code")
        
        email_thread = threading.Thread(target=send_email_async, daemon=True)
        email_thread.start()
        
        return jsonify({
            'success': True,
            'message': 'Verification code sent to your email.',
            'data': {
                'emailSent': True,  # Assume email will be sent
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
