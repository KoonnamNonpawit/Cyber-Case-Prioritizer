# run.py

from app import create_app
from app.database import init_db

# Initialize the database if it doesn't exist
init_db()

app = create_app()

if __name__ == '__main__':
    app.run(debug=True, port=5001)