"""
Centralized error handling and user-friendly error messages
"""
from flask import jsonify, request
import logging
from typing import Optional, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class AppError(Exception):
    """Base application error"""
    def __init__(self, message, status_code=400, user_message=None):
        self.message = message
        self.status_code = status_code
        self.user_message = user_message or message
        super().__init__(self.message)


class ValidationError(AppError):
    """Validation error"""
    def __init__(self, message, user_message=None):
        super().__init__(message, 400, user_message or f"Invalid input: {message}")


class AuthenticationError(AppError):
    """Authentication error"""
    def __init__(self, message="Authentication required", user_message=None):
        super().__init__(message, 401, user_message or "Please log in to continue")


class AuthorizationError(AppError):
    """Authorization error"""
    def __init__(self, message="Access denied", user_message=None):
        super().__init__(message, 403, user_message or "You don't have permission to perform this action")


class NotFoundError(AppError):
    """Resource not found error"""
    def __init__(self, resource="Resource", user_message=None):
        message = f"{resource} not found"
        super().__init__(message, 404, user_message or f"The {resource.lower()} you're looking for doesn't exist")


class DatabaseError(AppError):
    """Database operation error"""
    def __init__(self, message="Database error", user_message=None):
        super().__init__(message, 500, user_message or "A database error occurred. Please try again later")


def handle_error(error, request_context: Optional[Dict[str, Any]] = None):
    """Handle application errors with better context"""
    if isinstance(error, AppError):
        log_level = logging.WARNING if error.status_code < 500 else logging.ERROR
        logger.log(
            log_level,
            f"AppError: {error.message} - Status: {error.status_code} - Endpoint: {request_context.get('endpoint', 'unknown') if request_context else 'unknown'}"
        )
        is_debug = logger.isEnabledFor(logging.DEBUG)
        
        response = {
            'success': False,
            'message': error.user_message,
            'error_code': error.__class__.__name__,
        }
        
        if is_debug:
            response['error'] = error.message
            if request_context:
                response['context'] = {
                    'endpoint': request_context.get('endpoint'),
                    'method': request_context.get('method'),
                }
        
        return jsonify(response), error.status_code
    
    # Handle unexpected errors
    endpoint = request.endpoint if request else 'unknown'
    method = request.method if request else 'unknown'
    
    logger.error(
        f"Unexpected error: {str(error)} - Endpoint: {endpoint} - Method: {method}",
        exc_info=True
    )
    
    is_debug = logger.isEnabledFor(logging.DEBUG)
    response = {
        'success': False,
        'message': 'An unexpected error occurred. Please try again later.',
        'error_code': 'InternalServerError',
    }
    
    if is_debug:
        response['error'] = str(error)
        response['timestamp'] = datetime.utcnow().isoformat()
    
    return jsonify(response), 500


USER_FRIENDLY_MESSAGES = {
    'invalid_credentials': 'The email or password you entered is incorrect. Please try again.',
    'email_exists': 'An account with this email already exists. Please log in instead.',
    'email_not_verified': 'Please verify your email address before logging in. Check your inbox for the verification link.',
    'weak_password': 'Password is too weak. Please use at least 8 characters with uppercase, lowercase, numbers, and special characters.',
    'invalid_token': 'Your session has expired. Please log in again.',
    'food_not_found': 'The food item you selected could not be found. Please try searching again.',
    'invalid_quantity': 'Please enter a valid quantity greater than 0.',
    'invalid_date': 'Please enter a valid date.',
    'network_error': 'Unable to connect to the server. Please check your internet connection and try again.',
    'server_error': 'Something went wrong on our end. Please try again in a few moments.',
    'rate_limit': 'Too many requests. Please wait a moment before trying again.',
    'file_too_large': 'The file you uploaded is too large. Maximum size is 5MB.',
    'invalid_file_type': 'Please upload a valid image file (PNG, JPG, JPEG, GIF, or WEBP).',
    'goal_not_set': 'Please set your daily nutrition goals first.',
    'exercise_not_found': 'The exercise you selected could not be found.',
    'water_intake_invalid': 'Water intake must be between 0 and 5 liters (5000ml).',
    'duration_invalid': 'Exercise duration must be a positive number.',
    'calories_invalid': 'Calories burned must be a positive number.',
}


def get_user_message(key, default=None):
    """Get user-friendly error message"""
    return USER_FRIENDLY_MESSAGES.get(key, default or 'An error occurred. Please try again.')

