"""
Quick test script to verify activity routes are registered.
Run this after restarting the Flask server.
"""

import requests

BASE_URL = "http://localhost:3001/api/user-data"

# Test routes (will fail auth but should not return 404)
routes_to_test = [
    ("GET", f"{BASE_URL}/activity/today"),
    ("PUT", f"{BASE_URL}/activity/water"),
    ("POST", f"{BASE_URL}/activity/exercise"),
    ("GET", f"{BASE_URL}/activity/history"),
]

print("Testing activity routes...")
print("=" * 50)

for method, url in routes_to_test:
    try:
        if method == "GET":
            response = requests.get(url, timeout=2)
        elif method == "PUT":
            response = requests.put(url, json={}, timeout=2)
        elif method == "POST":
            response = requests.post(url, json={}, timeout=2)
        else:
            continue
        
        if response.status_code == 404:
            print(f"❌ {method} {url} - 404 NOT FOUND (route not registered)")
        elif response.status_code == 401:
            print(f"✅ {method} {url} - 401 UNAUTHORIZED (route exists, needs auth)")
        else:
            print(f"✅ {method} {url} - {response.status_code}")
    except requests.exceptions.ConnectionError:
        print(f"❌ {method} {url} - Connection Error (Flask server not running)")
    except Exception as e:
        print(f"⚠️  {method} {url} - Error: {e}")

print("=" * 50)
print("\nIf you see 404 errors, restart your Flask server:")
print("  cd flask_backend")
print("  python app.py")

