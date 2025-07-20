from app import create_app
from flask import Flask
from dotenv import load_dotenv
from app.database import init_db
from flask_cors import CORS

load_dotenv()

# Initialize the database if it doesn't exist
init_db()

app = create_app()

# เปิด CORS ให้ frontend (Next.js) เรียก API ได้
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})

if __name__ == '__main__':
    app.run(debug=True, port=5001)
