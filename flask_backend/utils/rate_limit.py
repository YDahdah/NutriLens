"""
Rate limiting configuration
"""
try:
    from flask_limiter import Limiter
    from flask_limiter.util import get_remote_address
    FLASK_LIMITER_AVAILABLE = True
except ImportError:
    FLASK_LIMITER_AVAILABLE = False
    Limiter = None
    get_remote_address = None

from flask import request, g


def get_user_id():
    """Get user ID from token for rate limiting"""
    if not FLASK_LIMITER_AVAILABLE or not get_remote_address:
        # Fallback to IP address if available
        try:
            return request.remote_addr or 'unknown'
        except:
            return 'unknown'
    if hasattr(g, 'user_id'):
        return g.user_id
    return get_remote_address()


def init_rate_limiter(app):
    """Initialize Flask-Limiter"""
    if not FLASK_LIMITER_AVAILABLE:
        raise ImportError("flask-limiter is not installed. Install it with: pip install flask-limiter")
    
    limiter = Limiter(
        app=app,
        key_func=get_user_id,
        default_limits=["200 per day", "50 per hour"],
        storage_uri="memory://",  # Use Redis in production: "redis://localhost:6379"
        strategy="fixed-window",
    )
    return limiter

