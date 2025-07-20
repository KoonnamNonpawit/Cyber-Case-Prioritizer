# app/services/ml_service.py

import pandas as pd
import psycopg2
from psycopg2.extras import RealDictCursor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, OrdinalEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.feature_extraction.text import TfidfVectorizer
import joblib
import os

# --- 1. Define All Features for the Model ---
CATEGORICAL_FEATURES = ['case_type']
ORDINAL_FEATURES = ['reputational_damage_level', 'technical_complexity_level', 'initial_evidence_clarity']
BINARY_FEATURES = [
    'sensitive_data_compromised', 'ongoing_threat', 'risk_of_evidence_loss',
    'has_actionable_evidence', 'is_grouped'
]
NUMERICAL_FEATURES = [
    'estimated_financial_damage', 'num_victims', 'evidence_count',
    'days_since_creation', 'num_linked_cases'
]
TARGET_COLUMN = 'priority_score'

REPUTATIONAL_DAMAGE_ORDER = ['None', 'Low', 'Medium', 'High', 'Critical']
TECHNICAL_COMPLEXITY_ORDER = ['Low', 'Medium', 'High', 'Very High', 'Extreme']
INITIAL_EVIDENCE_ORDER = ['None', 'Low', 'Medium', 'High', 'Very High']

# --- Helper Function for DB Connection (Corrected) ---
def get_db_conn():
    db_url = os.environ.get('DATABASE_URL')
    if not db_url:
        raise Exception("DATABASE_URL environment variable is not set.")
    return psycopg2.connect(db_url)

# --- Functions to Save and Load the Model ---
def save_model(pipeline, path):
    print(f"Saving model to {path}...")
    joblib.dump(pipeline, path)
    print("Model saved successfully.")

def load_model(path):
    if not os.path.exists(path):
        print(f"Model file not found at {path}. A new model will be trained.")
        return None
    print(f"Loading model from {path}...")
    return joblib.load(path)

# --- Main Function to Train the Model ---
def train_ml_model():
    df_train = None
    MINIMUM_RECORDS_FOR_TRAINING = 10

    try:
        conn = get_db_conn()
        query = """
            WITH GroupStats AS (
                SELECT group_id, COUNT(id) as num_linked_cases
                FROM cases
                WHERE group_id IS NOT NULL AND status != 'ปิดคดี'
                GROUP BY group_id
            )
            SELECT
                COALESCE(c.verified_score, c.priority_score) as priority_score,
                c.case_type,
                c.estimated_financial_damage,
                c.num_victims,
                c.reputational_damage_level,
                c.sensitive_data_compromised,
                c.ongoing_threat,
                c.risk_of_evidence_loss,
                c.technical_complexity_level,
                c.initial_evidence_clarity,
                COALESCE(ef.evidence_count, 0) as evidence_count,
                COALESCE(se.has_actionable_evidence, FALSE) as has_actionable_evidence,
                EXTRACT(DAY FROM (NOW() - c.timestamp)) as days_since_creation,
                COALESCE(gs.num_linked_cases, 0) as num_linked_cases,
                (CASE WHEN c.group_id IS NOT NULL THEN TRUE ELSE FALSE END) as is_grouped
            FROM cases c
            LEFT JOIN (SELECT case_id, COUNT(id) as evidence_count FROM evidence_files GROUP BY case_id) ef ON c.id = ef.case_id
            LEFT JOIN (SELECT case_id, TRUE as has_actionable_evidence FROM structured_evidence WHERE evidence_type IN ('BANK_ACCOUNT', 'PHONE_NUMBER') GROUP BY case_id) se ON c.id = se.case_id
            LEFT JOIN GroupStats gs ON c.group_id = gs.group_id
            WHERE c.verified_score IS NOT NULL
        """
        db_df = pd.read_sql_query(query, conn)
        conn.close()

        if len(db_df) >= MINIMUM_RECORDS_FOR_TRAINING:
            print(f"Training model with {len(db_df)} HUMAN-VERIFIED records from PostgreSQL...")
            df_train = db_df
        else:
            print(f"Not enough verified data ({len(db_df)} records). Falling back to sample data.")
            df_train = None
    except Exception as e:
        print(f"Failed to load training data from PostgreSQL: {e}")
        df_train = None

    if df_train is None or len(df_train) < MINIMUM_RECORDS_FOR_TRAINING:
        print("Using hardcoded sample data for training.")
        # ข้อมูลตัวอย่างยังคงเป็นข้อความดิบ
        data = {
            'case_type': ['Hacking', 'Scam', 'Phishing', 'Illegal Content', 'Scam', 'Hacking', 'Cyberbullying', 'Unknown'],
            'estimated_financial_damage': [15000000, 120000, 8500000, 0, 45000, 5000, 0, 100],
            'num_victims': [1, 1, 250, 1, 80, 1, 1, 0],
            'reputational_damage_level': ['Critical', 'Low', 'High', 'High', 'None', 'Low', 'Medium', 'None'],
            'sensitive_data_compromised': [True, False, True, False, False, False, True, False],
            'ongoing_threat': [True, True, True, True, False, False, True, False],
            'risk_of_evidence_loss': [True, True, False, False, True, True, False, False],
            'technical_complexity_level': ['Extreme', 'Medium', 'High', 'Low', 'Low', 'Medium', 'Low', 'Low'],
            'initial_evidence_clarity': ['High', 'Low', 'High', 'Very High', 'Medium', 'Low', 'Very High', 'None'],
            'evidence_count': [5, 2, 10, 1, 3, 0, 4, 0],
            'has_actionable_evidence': [True, True, True, False, True, False, True, False],
            'priority_score': [98, 85, 95, 58, 64, 45, 75, 10],
            'days_since_creation': [15, 3, 45, 90, 5, 2, 30, 1],
            'num_linked_cases': [2, 0, 4, 0, 0, 1, 0, 0],
            'is_grouped': [True, False, True, False, False, True, False, False]
        }
        df_train = pd.DataFrame(data)

        print("Cleaning and preparing training data...")
        # เติมค่าว่างในฟีเจอร์ข้อความด้วย 'none' หรือ 'unknown'
        for col in TEXT_FEATURES:
            df_train[col] = df_train[col].fillna('none').astype(str)
        
        # (ส่วนการทำความสะอาดข้อมูล Numerical และ Binary เหมือนเดิม)
        for col in NUMERICAL_FEATURES:
            df_train[col] = pd.to_numeric(df_train[col], errors='coerce').fillna(0)
        for col in BINARY_FEATURES:
            df_train[col] = df_train[col].fillna(False).astype(int)

        preprocessor = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore'), CATEGORICAL_FEATURES),
            ('ord', OrdinalEncoder(categories=[REPUTATIONAL_DAMAGE_ORDER, TECHNICAL_COMPLEXITY_ORDER, INITIAL_EVIDENCE_ORDER]), ORDINAL_FEATURES),
            ('num', StandardScaler(), NUMERICAL_FEATURES),
            ('bin', 'passthrough', BINARY_FEATURES) # <<< แก้ไขโดยการแยก Binary ออกมา
        ],
        remainder='drop'
    )

        # --- 5. สร้างและฝึกสอนโมเดล (เหมือนเดิม) ---
        model = RandomForestRegressor(n_estimators=100, random_state=42)
        pipeline = Pipeline(steps=[('preprocessor', preprocessor), ('regressor', model)])

        X_train = df_train.drop(TARGET_COLUMN, axis=1)
        y_train = df_train[TARGET_COLUMN]

        pipeline.fit(X_train, y_train)
        print("✅ RandomForest Model trained successfully.")
    return pipeline
