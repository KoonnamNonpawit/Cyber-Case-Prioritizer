# app/routes/main.py

from flask import Blueprint, request, jsonify, render_template_string, current_app
import sqlite3
import pandas as pd
import uuid
import datetime
from app.services import ml_service

main_bp = Blueprint('main', __name__)

@main_bp.route('/cases', methods=['GET'])
def get_ranked_cases():
    query = "SELECT * FROM cases ORDER BY priority_score DESC"

    conn = sqlite3.connect('cyber_cases.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute(query)

    cases_from_db = cursor.fetchall()
    conn.close()
    
    sorted_cases = [dict(row) for row in cases_from_db]
    return jsonify(sorted_cases), 200


@main_bp.route('/rank_case', methods=['POST'])
def rank_case():
    ml_model_pipeline = current_app.config['ML_PIPELINE']
    if not ml_model_pipeline:
        return jsonify({"error": "Model is not loaded or trained."}), 503
    
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON data"}), 400
    
    try:
        # Ensure required fields are present in the request
        required_fields = ['case_number', 'description']
        if not all(field in data for field in required_fields):
            return jsonify({"error": f"Missing required fields: {', '.join(required_fields)}"}), 400

        input_df = pd.DataFrame([data])[ml_service.CATEGORICAL_FEATURES + ml_service.ORDINAL_FEATURES + ml_service.NUMERICAL_FEATURES + ml_service.BINARY_FEATURES]
        priority_score = ml_model_pipeline.predict(input_df)[0]
        priority_score = max(0, min(100, priority_score))
        
        new_case_data = {
            'id': str(uuid.uuid4()),
            'timestamp': datetime.datetime.now().isoformat(),
            'priority_score': float(priority_score),
            **data
        }
        
        conn = sqlite3.connect('cyber_cases.db')
        cursor = conn.cursor()

        cursor.execute('''
            INSERT INTO cases (
                id, timestamp, priority_score, case_number, description, case_type, 
                estimated_financial_damage, num_victims, reputational_damage_level, 
                sensitive_data_compromised, ongoing_threat, risk_of_evidence_loss, 
                technical_complexity_level, initial_evidence_clarity, reporter_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            new_case_data['id'], new_case_data['timestamp'], new_case_data['priority_score'],
            new_case_data['case_number'], new_case_data['description'], new_case_data.get('case_type'),
            new_case_data.get('estimated_financial_damage'), new_case_data.get('num_victims'), new_case_data.get('reputational_damage_level'),
            new_case_data.get('sensitive_data_compromised'), new_case_data.get('ongoing_threat'), new_case_data.get('risk_of_evidence_loss'),
            new_case_data.get('technical_complexity_level'), new_case_data.get('initial_evidence_clarity'),
            new_case_data.get('reporter_id') # Using .get() for optional field
        ))
        
        conn.commit()
        conn.close()
        
        return jsonify(new_case_data), 201
    except KeyError as e:
        current_app.logger.error(f"Prediction failed due to missing feature: {e}")
        return jsonify({"error": f"Missing feature in request data: {e}"}), 400
    except Exception as e:
        current_app.logger.error(f"Prediction failed: {e}")
        return jsonify({"error": "Prediction failed due to server error."}), 500

@main_bp.route('/cases/<string:case_id>', methods=['DELETE'])
def delete_case(case_id):
    # ... (คัดลอกโค้ดของฟังก์ชัน delete_case มาวางที่นี่) ...
    try:
        conn = sqlite3.connect('cyber_cases.db')
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM cases WHERE id = ?", (case_id,))
        case_to_delete = cursor.fetchone()
        if case_to_delete is None:
            conn.close()
            return jsonify({"error": "Case not found"}), 404
        cursor.execute("DELETE FROM cases WHERE id = ?", (case_id,))
        conn.commit()
        conn.close()
        return jsonify({"message": f"Case with ID {case_id} was deleted successfully."}), 200
    except Exception as e:
        current_app.logger.error(f"Failed to delete case {case_id}: {e}")
        return jsonify({"error": "Failed to delete case due to a server error."}), 500

@main_bp.route('/retrain_model', methods=['POST'])
def retrain_model():
    # ... (คัดลอกโค้ดของฟังก์ชัน retrain_model มาวางที่นี่) ...
    ml_model_pipeline = current_app.config['ML_PIPELINE']
    try:
        conn = sqlite3.connect('cyber_cases.db')
        df_train = pd.read_sql_query("SELECT * FROM cases", conn)
        conn.close()
        if len(df_train) < 10:
            return jsonify({"error": "Not enough data to retrain model."}), 400
        
        X_train = df_train[ml_service.CATEGORICAL_FEATURES + ml_service.ORDINAL_FEATURES + ml_service.NUMERICAL_FEATURES + ml_service.BINARY_FEATURES]
        y_train = df_train[ml_service.TARGET_COLUMN]
        ml_model_pipeline.fit(X_train, y_train)
        
        ml_service.save_model(ml_model_pipeline, current_app.config['MODEL_PATH'])
        return jsonify({"message": "Model retrained successfully."}), 200
    except Exception as e:
        current_app.logger.error(f"Model retraining failed: {e}")
        return jsonify({"error": "Model retraining failed."}), 500


@main_bp.route('/cases/<string:case_id>', methods=['PUT'])
def update_case(case_id):
    ml_model_pipeline = current_app.config['ML_PIPELINE']
    if not ml_model_pipeline:
        return jsonify({"error": "Model is not loaded or trained."}), 503

    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON data"}), 400

    try:
        # คำนวณ priority_score ใหม่จากข้อมูลที่อัปเดต
        input_df = pd.DataFrame([data])[ml_service.CATEGORICAL_FEATURES + ml_service.ORDINAL_FEATURES + ml_service.NUMERICAL_FEATURES + ml_service.BINARY_FEATURES]
        priority_score = ml_model_pipeline.predict(input_df)[0]
        priority_score = max(0, min(100, priority_score))

        conn = sqlite3.connect('cyber_cases.db')
        cursor = conn.cursor()

        # ตรวจสอบว่าเคสมีอยู่จริงหรือไม่
        cursor.execute("SELECT id FROM cases WHERE id = ?", (case_id,))
        if cursor.fetchone() is None:
            conn.close()
            return jsonify({"error": "Case not found"}), 404

        # อัปเดตข้อมูลในฐานข้อมูล
        cursor.execute('''
            UPDATE cases SET
                priority_score = ?, case_type = ?, estimated_financial_damage = ?,
                num_victims = ?, reputational_damage_level = ?, sensitive_data_compromised = ?,
                ongoing_threat = ?, risk_of_evidence_loss = ?, technical_complexity_level = ?,
                initial_evidence_clarity = ?
            WHERE id = ?
        ''', (
            float(priority_score), data.get('case_type'), data.get('estimated_financial_damage'),
            data.get('num_victims'), data.get('reputational_damage_level'), data.get('sensitive_data_compromised'),
            data.get('ongoing_threat'), data.get('risk_of_evidence_loss'), data.get('technical_complexity_level'),
            data.get('initial_evidence_clarity'), case_id
        ))
        conn.commit()
        
        # ดึงข้อมูลที่อัปเดตล่าสุดเพื่อส่งกลับไป
        conn.row_factory = sqlite3.Row
        cursor.execute("SELECT * FROM cases WHERE id = ?", (case_id,))
        updated_case = dict(cursor.fetchone())
        conn.close()

        return jsonify(updated_case), 200

    except Exception as e:
        current_app.logger.error(f"Failed to update case {case_id}: {e}")
        return jsonify({"error": "Failed to update case due to a server error."}), 500
    