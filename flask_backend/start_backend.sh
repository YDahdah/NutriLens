#!/bin/bash
# Start Flask Backend Server

echo "Starting Flask Backend Server..."
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed or not in PATH"
    echo "Please install Python 3.8+ and try again"
    exit 1
fi

# Change to flask_backend directory
cd "$(dirname "$0")"

# Check if virtual environment exists
if [ -d "venv" ]; then
    echo "Activating virtual environment..."
    source venv/bin/activate
else
    echo "WARNING: Virtual environment not found. Using system Python."
    echo "It's recommended to create a virtual environment:"
    echo "  python3 -m venv venv"
    echo "  source venv/bin/activate"
    echo "  pip install -r requirements.txt"
    echo ""
fi

# Check if requirements are installed
python3 -c "import flask" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "ERROR: Flask is not installed"
    echo "Installing requirements..."
    pip install -r requirements.txt
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to install requirements"
        exit 1
    fi
fi

# Start the Flask server
echo ""
echo "Starting Flask server on http://localhost:3001"
echo "Press Ctrl+C to stop the server"
echo ""
python3 app.py

