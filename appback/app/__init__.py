# app/__init__.py
import os
from flask import Flask
from flask_cors import CORS
from .services import ml_service

def create_app():
    app = Flask(__name__)

    CORS(app)
    
    # Configuration
    app.config['MODEL_PATH'] = 'cyber_case_model_rf.joblib'
    app.config['DEBUG'] = True
    
    # Load or train ML model at startup
    ml_pipeline = ml_service.load_model(app.config['MODEL_PATH'])
    
    if ml_pipeline is None:
        ml_pipeline = ml_service.train_ml_model()
        ml_service.save_model(ml_pipeline, app.config['MODEL_PATH'])
    
    # Store the loaded model in the app config for access in routes
    app.config['ML_PIPELINE'] = ml_pipeline

    UPLOAD_FOLDER = os.path.join(app.root_path, '..', 'uploads')
    app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
    app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'pdf'}
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # Register Blueprints
    from .routes.main import main_bp
    app.register_blueprint(main_bp)

    return app