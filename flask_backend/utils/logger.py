"""
Centralized logging configuration
"""
import logging
import os
from logging.handlers import RotatingFileHandler
from datetime import datetime


def setup_logging(app):
    """Setup application logging"""
    log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
    log_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'logs')
    
    # Create logs directory if it doesn't exist
    os.makedirs(log_dir, exist_ok=True)
    
    # Configure root logger
    logger = logging.getLogger()
    logger.setLevel(getattr(logging, log_level, logging.INFO))
    
    # Remove existing handlers
    logger.handlers.clear()
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)
    
    # File handler with rotation
    file_handler = RotatingFileHandler(
        os.path.join(log_dir, 'app.log'),
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5
    )
    file_handler.setLevel(logging.DEBUG)
    file_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    file_handler.setFormatter(file_formatter)
    logger.addHandler(file_handler)
    
    # Error file handler
    error_handler = RotatingFileHandler(
        os.path.join(log_dir, 'errors.log'),
        maxBytes=10 * 1024 * 1024,
        backupCount=5
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(file_formatter)
    logger.addHandler(error_handler)
    
    app.logger.info(f"Logging configured - Level: {log_level}")
    return logger


def log_request_info(request, response=None):
    """Log request information"""
    logger = logging.getLogger('request')
    log_data = {
        'method': request.method,
        'path': request.path,
        'remote_addr': request.remote_addr,
        'user_agent': request.headers.get('User-Agent', 'Unknown')
    }
    
    if response:
        log_data['status_code'] = response.status_code
    
    logger.info(f"Request: {log_data['method']} {log_data['path']} - Status: {log_data.get('status_code', 'N/A')}")


def log_error(error, context=None):
    """Log error with context"""
    logger = logging.getLogger('error')
    error_data = {
        'error': str(error),
        'type': type(error).__name__,
        'context': context or {}
    }
    logger.error(f"Error occurred: {error_data}", exc_info=True)


def log_performance(operation, duration_ms, details=None):
    """Log performance metrics"""
    logger = logging.getLogger('performance')
    logger.info(f"Performance - {operation}: {duration_ms}ms", extra={'details': details})

