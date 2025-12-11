"""
Swagger documentation examples for auth routes
"""
from flasgger import swag_from

# Example Swagger spec for register endpoint
register_spec = {
    "tags": ["Authentication"],
    "summary": "Register a new user",
    "description": "Creates a new user account with email verification",
    "parameters": [
        {
            "name": "body",
            "in": "body",
            "required": True,
            "schema": {
                "type": "object",
                "required": ["name", "email", "password"],
                "properties": {
                    "name": {
                        "type": "string",
                        "example": "John Doe"
                    },
                    "email": {
                        "type": "string",
                        "format": "email",
                        "example": "john@example.com"
                    },
                    "password": {
                        "type": "string",
                        "format": "password",
                        "example": "SecurePass123!@#"
                    }
                }
            }
        }
    ],
    "responses": {
        "201": {
            "description": "User registered successfully",
            "schema": {
                "type": "object",
                "properties": {
                    "success": {"type": "boolean", "example": True},
                    "message": {"type": "string"},
                    "data": {
                        "type": "object",
                        "properties": {
                            "email": {"type": "string"},
                            "emailSent": {"type": "boolean"}
                        }
                    }
                }
            }
        },
        "400": {
            "description": "Invalid input or weak password"
        },
        "409": {
            "description": "Email already exists"
        }
    }
}

login_spec = {
    "tags": ["Authentication"],
    "summary": "User login",
    "description": "Authenticate user and receive JWT token",
    "parameters": [
        {
            "name": "body",
            "in": "body",
            "required": True,
            "schema": {
                "type": "object",
                "required": ["email", "password"],
                "properties": {
                    "email": {
                        "type": "string",
                        "format": "email",
                        "example": "john@example.com"
                    },
                    "password": {
                        "type": "string",
                        "format": "password",
                        "example": "SecurePass123!@#"
                    }
                }
            }
        }
    ],
    "responses": {
        "200": {
            "description": "Login successful",
            "schema": {
                "type": "object",
                "properties": {
                    "success": {"type": "boolean"},
                    "message": {"type": "string"},
                    "data": {
                        "type": "object",
                        "properties": {
                            "user": {"type": "object"},
                            "token": {"type": "string"}
                        }
                    }
                }
            }
        },
        "401": {
            "description": "Invalid credentials"
        },
        "403": {
            "description": "Email not verified"
        }
    }
}

