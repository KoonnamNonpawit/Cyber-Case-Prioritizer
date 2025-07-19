# app/services/ml_service.py

import pandas as pd
import sqlite3
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, OrdinalEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
import joblib
import os

# --- 1. Define All Features for the Model ---
# These are the columns the model will learn from.
CATEGORICAL_FEATURES = ['case_type']
ORDINAL_FEATURES = ['reputational_damage_level', 'technical_complexity_level', 'initial_evidence_clarity']
BINARY_FEATURES = ['sensitive_data_compromised', 'ongoing_threat', 'risk_of_evidence_loss', 'has_actionable_evidence']
NUMERICAL_FEATURES = [
    'estimated_financial_damage', 
    'num_victims', 
    'evidence_count'
    # 'days_since_creation', 'num_linked_cases' etc. could be added here later
]
TARGET_COLUMN = 'priority_score'

# Define the order for ordinal features to ensure consistency
REPUTATIONAL_DAMAGE_ORDER = ['None', 'Low', 'Medium', 'High', 'Critical']
TECHNICAL_COMPLEXITY_ORDER = ['Low', 'Medium', 'High', 'Very High', 'Extreme']
INITIAL_EVIDENCE_ORDER = ['Low', 'Medium', 'High', 'Very High']


# --- 2. Functions to Save and Load the Model ---
def save_model(pipeline, path):
    """Saves the trained model pipeline to a file."""
    print(f"Saving model to {path}...")
    joblib.dump(pipeline, path)
    print("Model saved successfully.")

def load_model(path):
    """Loads a pre-trained model pipeline from a file."""
    if not os.path.exists(path):
        print(f"Model file not found at {path}. A new model will be trained.")
        return None
    print(f"Loading model from {path}...")
    pipeline = joblib.load(path)
    print("Model loaded successfully.")
    return pipeline

# --- 3. Main Function to Train the Model ---
def train_ml_model():
    """
    Trains the model by first trying to load real, human-verified data from the database.
    If there's not enough verified data, it falls back to a hardcoded sample dataset.
    """
    df_train = None
    MINIMUM_RECORDS_FOR_TRAINING = 10

    # Attempt to load high-quality, human-verified data from the database first
    try:
        conn = sqlite3.connect('cyber_cases.db')
        # This query prioritizes the human-verified score for training
        query = """
            SELECT 
                COALESCE(verified_score, priority_score) as priority_score,
                case_type, estimated_financial_damage, num_victims, reputational_damage_level, 
                sensitive_data_compromised, ongoing_threat, risk_of_evidence_loss, 
                technical_complexity_level, initial_evidence_clarity, evidence_count, 
                has_actionable_evidence
            FROM cases
            WHERE verified_score IS NOT NULL
        """
        db_df = pd.read_sql_query(query, conn)
        conn.close()
        
        if len(db_df) >= MINIMUM_RECORDS_FOR_TRAINING:
            print(f"Training RandomForest model with {len(db_df)} HUMAN-VERIFIED records from the database...")
            df_train = db_df
        else:
            print(f"Not enough human-verified data in DB ({len(db_df)} records). Falling back to sample data.")
            
    except Exception as e:
        print(f"Could not read from database, falling back to sample data. Error: {e}")

    # If database loading fails or data is insufficient, use a hardcoded sample dataset
    if df_train is None:
        print("Using hardcoded sample data for training.")
        data = {
            'case_type': ['Hacking', 'Scam', 'Phishing', 'Illegal Content', 'Scam', 'Hacking', 'Cyberbullying'],
            'estimated_financial_damage': [15000000, 120000, 8500000, 0, 45000, 5000, 0],
            'num_victims': [1, 1, 250, 1, 80, 1, 1],
            'reputational_damage_level': ['Critical', 'Low', 'High', 'High', 'None', 'Low', 'Medium'],
            'sensitive_data_compromised': [True, False, True, False, False, False, True],
            'ongoing_threat': [True, True, True, True, False, False, True],
            'risk_of_evidence_loss': [True, True, False, False, True, True, False],
            'technical_complexity_level': ['Extreme', 'Medium', 'High', 'Low', 'Low', 'Medium', 'Low'],
            'initial_evidence_clarity': ['High', 'Low', 'High', 'Very High', 'Medium', 'Low', 'Very High'],
            'evidence_count': [5, 2, 10, 1, 3, 0, 4],
            'has_actionable_evidence': [True, True, True, False, True, False, True],
            'priority_score': [98, 85, 95, 58, 64, 45, 75]
        }
        df_train = pd.DataFrame(data)

    # --- Preprocessing Pipeline ---
    # Defines how to transform each type of feature before feeding it to the model
    preprocessor = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore'), CATEGORICAL_FEATURES),
            ('ord', OrdinalEncoder(categories=[REPUTATIONAL_DAMAGE_ORDER, TECHNICAL_COMPLEXITY_ORDER, INITIAL_EVIDENCE_ORDER]), ORDINAL_FEATURES),
            ('num', StandardScaler(), NUMERICAL_FEATURES),
            ('bin', 'passthrough', BINARY_FEATURES)
        ],
        remainder='drop'
    )

    # --- Define and Train the RandomForest Model ---
    model = RandomForestRegressor(n_estimators=100, random_state=42)

    # Chain the preprocessor and the model into a single, powerful pipeline
    pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('regressor', model)
    ])
    
    # Define features (X) and target (y)
    X_train = df_train.drop(TARGET_COLUMN, axis=1)
    y_train = df_train[TARGET_COLUMN]
    
    # Train the pipeline on the prepared data
    pipeline.fit(X_train, y_train)

    print("RandomForest Model trained successfully.")
    return pipeline