"""
Swagger/OpenAPI documentation setup
"""
from flask import Flask
import os

# Optional import for Swagger
try:
    from flasgger import Swagger, swag_from
    FLASGGER_AVAILABLE = True
except ImportError:
    FLASGGER_AVAILABLE = False
    Swagger = None
    swag_from = None


def init_swagger(app: Flask):
    """Initialize Swagger documentation"""
    if not FLASGGER_AVAILABLE:
        raise ImportError("flasgger is not installed. Install it with: pip install flasgger")
    
    swagger_config = {
        "headers": [],
        "specs": [
            {
                "endpoint": "apispec",
                "route": "/apispec.json",
                "rule_filter": lambda rule: True,
                "model_filter": lambda tag: True,
            }
        ],
        "static_url_path": "/flasgger_static",
        "swagger_ui": True,
        "specs_route": "/api/docs",
    }
    
    swagger_template = {
        "swagger": "2.0",
        "info": {
            "title": "NutriLens API",
            "description": "API documentation for NutriLens nutrition tracking platform",
            "version": "1.0.0",
            "contact": {
                "name": "NutriLens API Support",
            },
        },
        "basePath": "/api",
        "schemes": ["http", "https"],
        "securityDefinitions": {
            "Bearer": {
                "type": "apiKey",
                "name": "Authorization",
                "in": "header",
                "description": "JWT Authorization header using the Bearer scheme. Example: 'Authorization: Bearer {token}'"
            }
        },
        "security": [
            {
                "Bearer": []
            }
        ],
    }
    
    swagger = Swagger(app, config=swagger_config, template=swagger_template)
    return swagger

