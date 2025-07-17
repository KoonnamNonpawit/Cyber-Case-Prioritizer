# app/services/ml_service.py

import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, OrdinalEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
import joblib
import os

# Feature definitions
CATEGORICAL_FEATURES = ['case_type']
ORDINAL_FEATURES = ['reputational_damage_level', 'technical_complexity_level', 'initial_evidence_clarity']
BINARY_FEATURES = ['sensitive_data_compromised', 'ongoing_threat', 'risk_of_evidence_loss']
NUMERICAL_FEATURES = ['estimated_financial_damage', 'num_victims']
TARGET_COLUMN = 'priority_score'
REPUTATIONAL_DAMAGE_ORDER = ['None', 'Low', 'Medium', 'High', 'Critical']
TECHNICAL_COMPLEXITY_ORDER = ['Low', 'Medium', 'High', 'Very High', 'Extreme']
INITIAL_EVIDENCE_ORDER = ['Low', 'Medium', 'High', 'Very High']

# Functions to Manage the ML Model
def save_model(pipeline, path):
    print(f"Saving model to {path}...")
    joblib.dump(pipeline, path)
    print("Model saved successfully.")

def load_model(path):
    if not os.path.exists(path):
        print(f"Model file not found at {path}. A new model will be trained.")
        return None
    print(f"Loading model from {path}...")
    pipeline = joblib.load(path)
    print("Model loaded successfully.")
    return pipeline

def train_ml_model():
    # ... (คัดลอกโค้ดทั้งหมดของฟังก์ชัน train_ml_model จาก app.py เดิมมาวางที่นี่) ...
    data = {
        'case_type': ['Hacking', 'Phishing', 'Scam', 'Cyberbullying', 'Illegal Content', 'Other', 'Hacking', 'Phishing', 'Scam', 'Cyberbullying', 'Illegal Content', 'Other', 'Hacking', 'Phishing', 'Scam', 'Cyberbullying', 'Illegal Content'],
        'estimated_financial_damage': [500000, 100000, 20000, 0, 0, 500, 1000000, 250000, 50000, 0, 0, 1000, 1500000, 300000, 75000, 0, 0],
        'num_victims': [1, 50, 5, 20, 10, 2, 2, 100, 10, 50, 15, 3, 3, 150, 20, 100, 20],
        'reputational_damage_level': ['High', 'Medium', 'Low', 'None', 'High', 'None', 'Critical', 'High', 'Medium', 'Low', 'Critical', 'Low', 'Critical', 'High', 'Medium', 'Low', 'High'],
        'sensitive_data_compromised': [True, True, False, False, True, False, True, True, False, False, True, False, True, True, False, False, True],
        'ongoing_threat': [True, False, False, False, False, False, True, False, False, False, True, False, True, False, False, False, True],
        'risk_of_evidence_loss': [True, True, False, False, True, False, True, True, False, False, True, False, True, True, False, False, True],
        'technical_complexity_level': ['Very High', 'Medium', 'Low', 'Low', 'High', 'Medium', 'Extreme', 'High', 'Medium', 'Low', 'Very High', 'Low', 'Extreme', 'Very High', 'Medium', 'Low', 'High'],
        'initial_evidence_clarity': ['High', 'Medium', 'High', 'Low', 'Medium', 'Low', 'Very High', 'High', 'Medium', 'Low', 'Very High', 'Low', 'Very High', 'High', 'Medium', 'Low', 'Very High'],
        'priority_score': [95, 80, 50, 30, 90, 20, 100, 90, 60, 40, 98, 25, 98, 92, 70, 45, 95]
    }
    df_train = pd.DataFrame(data)
    preprocessor = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore'), CATEGORICAL_FEATURES),
            ('ord', OrdinalEncoder(categories=[REPUTATIONAL_DAMAGE_ORDER, TECHNICAL_COMPLEXITY_ORDER, INITIAL_EVIDENCE_ORDER]), ORDINAL_FEATURES),
            ('num', StandardScaler(), NUMERICAL_FEATURES),
            ('bin', 'passthrough', BINARY_FEATURES)
        ],
        remainder='drop'
    )
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('regressor', model)
    ])
    X_train = df_train[CATEGORICAL_FEATURES + ORDINAL_FEATURES + NUMERICAL_FEATURES + BINARY_FEATURES]
    y_train = df_train[TARGET_COLUMN]
    pipeline.fit(X_train, y_train)
    print("ML Model (RandomForest) trained successfully.")
    return pipeline