# run.py

from app import create_app
from app.database import init_db
from flask_cors import CORS
# Initialize the database if it doesn't exist
init_db()

app = create_app()

CORS(app)

if __name__ == '__main__':
    app.run(debug=True, port=5001)