"""
Load testing with Locust
"""
from locust import HttpUser, task, between  # type: ignore
import random


class NutriLensUser(HttpUser):
    """Simulate a NutriLens user"""
    wait_time = between(1, 3)  # Wait 1-3 seconds between tasks
    
    def on_start(self):
        """Called when a user starts"""
        # Register and login
        self.register()
        self.login()
    
    def register(self):
        """Register a new user"""
        email = f"testuser{random.randint(1000, 9999)}@example.com"
        password = "TestPass123!@#"
        
        response = self.client.post("/api/auth/register", json={
            "name": "Test User",
            "email": email,
            "password": password
        })
        
        if response.status_code == 201:
            self.email = email
            self.password = password
    
    def login(self):
        """Login user"""
        if not hasattr(self, 'email'):
            return
        
        response = self.client.post("/api/auth/login", json={
            "email": self.email,
            "password": self.password
        })
        
        if response.status_code == 200:
            data = response.json()
            self.token = data.get('data', {}).get('token', '')
            self.headers = {"Authorization": f"Bearer {self.token}"}
    
    @task(3)
    def get_foods(self):
        """Search for foods"""
        self.client.get("/api/foods/search?q=apple", headers=self.headers)
    
    @task(2)
    def get_profile(self):
        """Get user profile"""
        self.client.get("/api/auth/profile", headers=self.headers)
    
    @task(2)
    def get_food_logs(self):
        """Get food logs"""
        self.client.get("/api/food-logs/logs", headers=self.headers)
    
    @task(1)
    def get_summary(self):
        """Get nutrition summary"""
        self.client.get("/api/food-logs/summary", headers=self.headers)
    
    @task(1)
    def get_goals(self):
        """Get daily goals"""
        self.client.get("/api/user-data/goals", headers=self.headers)
    
    @task(1)
    def get_activity(self):
        """Get today's activity"""
        self.client.get("/api/user-data/activity/today", headers=self.headers)
    
    @task(1)
    def health_check(self):
        """Health check endpoint"""
        self.client.get("/health")


class AdminUser(HttpUser):
    """Simulate an admin user"""
    wait_time = between(2, 5)
    weight = 1  # Fewer admin users
    
    def on_start(self):
        """Login as admin"""
        # Use existing admin credentials or create one
        response = self.client.post("/api/auth/login", json={
            "email": "admin@example.com",
            "password": "AdminPass123!@#"
        })
        
        if response.status_code == 200:
            data = response.json()
            self.token = data.get('data', {}).get('token', '')
            self.headers = {"Authorization": f"Bearer {self.token}"}
    
    @task(2)
    def get_admin_stats(self):
        """Get admin statistics"""
        self.client.get("/api/admin/stats", headers=self.headers)
    
    @task(1)
    def get_admin_users(self):
        """Get all users"""
        self.client.get("/api/admin/users", headers=self.headers)
    
    @task(1)
    def get_admin_logs(self):
        """Get admin logs"""
        self.client.get("/api/admin/logs", headers=self.headers)

