# app/routes/main.py

from flask import Blueprint, request, jsonify, current_app
import sqlite3
import pandas as pd
import uuid
import datetime
import math
from app.services import ml_service

main_bp = Blueprint('main', __name__)

# --- Helper Function to get DB connection ---
def get_db_conn():
    conn = sqlite3.connect('cyber_cases.db')
    conn.row_factory = sqlite3.Row
    return conn

# --- GET ALL CASES (with Full Filtering & Pagination) ---
@main_bp.route('/cases', methods=['GET'])
def get_all_cases():
    page = request.args.get('page', default=1, type=int)
    limit = 12
    offset = (page - 1) * limit

    base_query = """
        SELECT 
            c.*, 
            comp.first_name || ' ' || comp.last_name as complainant_name,
            (SELECT GROUP_CONCAT(o.first_name || ' ' || o.last_name, ', ') 
             FROM officers o
             JOIN case_officers co ON o.id = co.officer_id
             WHERE co.case_id = c.id) as officer_names
        FROM cases c
        LEFT JOIN complainants comp ON c.complainant_id = comp.id
    """
    
    where_clause = " WHERE 1=1"
    params = []

    filter_map = {
        # Text fields from 'cases' table
        'case_number': {'column': 'c.case_number', 'operator': 'LIKE', 'formatter': lambda v: f"%{v}%"},
        'case_type': {'column': 'c.case_type', 'operator': '='},
        'reputational_damage_level': {'column': 'c.reputational_damage_level', 'operator': '='},
        'technical_complexity_level': {'column': 'c.technical_complexity_level', 'operator': '='},
        
        # Boolean fields from 'cases' table
        'sensitive_data_compromised': {'column': 'c.sensitive_data_compromised', 'operator': '=', 'formatter': lambda v: 1 if v.lower() == 'true' else 0},
        'ongoing_threat': {'column': 'c.ongoing_threat', 'operator': '=', 'formatter': lambda v: 1 if v.lower() == 'true' else 0},
        
        # Numeric range fields from 'cases' table
        'min_damage': {'column': 'c.estimated_financial_damage', 'operator': '>='},
        'max_damage': {'column': 'c.estimated_financial_damage', 'operator': '<='},
        
        # Date range fields from 'cases' table
        'start_date': {'column': 'c.timestamp', 'operator': '>='},
        'end_date': {'column': 'c.timestamp', 'operator': '<=', 'formatter': lambda v: f"{v}T23:59:59"},
    }

    for arg_name, mapping in filter_map.items():
        arg_value = request.args.get(arg_name)
        if arg_value:
            column = mapping['column']
            operator = mapping['operator']
            formatted_value = mapping.get('formatter', lambda v: v)(arg_value)
            where_clause += f" AND {column} {operator} ?"
            params.append(formatted_value)

    try:
        conn = get_db_conn()
        cursor = conn.cursor()
        
        # Use a simplified query for counting to improve performance
        count_query = f"SELECT COUNT(c.id) FROM cases c{where_clause}"
        cursor.execute(count_query, tuple(params))
        total_records = cursor.fetchone()[0]
        total_pages = math.ceil(total_records / limit) if total_records > 0 else 1

        data_query = f"{base_query}{where_clause} ORDER BY c.priority_score DESC LIMIT ? OFFSET ?"
        data_params = tuple(params + [limit, offset])
        cursor.execute(data_query, data_params)
        cases_from_db = cursor.fetchall()
        conn.close()
        
        response_data = {
            "pagination": {"page": page, "limit": limit, "total_records": total_records, "total_pages": total_pages},
            "data": [dict(row) for row in cases_from_db]
        }
        return jsonify(response_data), 200
        
    except Exception as e:
        current_app.logger.error(f"Failed to get cases: {e}")
        return jsonify({"error": "Failed to retrieve cases."}), 500

# --- CREATE A NEW CASE (Same as before, already correct) ---
@main_bp.route('/rank_case', methods=['POST'])
def rank_case():
    # ... (โค้ดส่วนนี้ทำงานถูกต้องกับ DB ใหม่แล้ว ไม่ต้องแก้ไข) ...
    ml_model_pipeline = current_app.config['ML_PIPELINE']
    if not ml_model_pipeline:
        return jsonify({"error": "Model is not loaded."}), 503
    
    data = request.get_json()
    if not data or 'case_details' not in data or 'complainant' not in data:
        return jsonify({"error": "Invalid data format. Required keys: 'case_details', 'complainant'."}), 400
    
    case_details = data['case_details']
    complainant_data = data['complainant']
    officers_data = data.get('officers', [])

    try:
        input_df = pd.DataFrame([case_details])[ml_service.CATEGORICAL_FEATURES + ml_service.ORDINAL_FEATURES + ml_service.NUMERICAL_FEATURES + ml_service.BINARY_FEATURES]
        priority_score = ml_model_pipeline.predict(input_df)[0]
        priority_score = max(0, min(100, priority_score))
        
        conn = get_db_conn()
        cursor = conn.cursor()

        complainant_id = str(uuid.uuid4())
        cursor.execute("INSERT INTO complainants (id, first_name, last_name, phone_number, email, address, province, district, subdistrict, zipcode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (complainant_id, complainant_data['first_name'], complainant_data['last_name'], complainant_data['phone_number'], complainant_data.get('email'), complainant_data['address'], complainant_data['province'], complainant_data['district'], complainant_data['subdistrict'], complainant_data['zipcode']))

        case_id = str(uuid.uuid4())
        cursor.execute("INSERT INTO cases (id, case_number, timestamp, priority_score, case_type, description, estimated_financial_damage, num_victims, reputational_damage_level, sensitive_data_compromised, ongoing_threat, risk_of_evidence_loss, technical_complexity_level, initial_evidence_clarity, complainant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (case_id, case_details.get('case_number'), datetime.datetime.now().isoformat(), float(priority_score), case_details.get('case_type'), case_details.get('description'), case_details.get('estimated_financial_damage'), case_details.get('num_victims'), case_details.get('reputational_damage_level'), case_details.get('sensitive_data_compromised'), case_details.get('ongoing_threat'), case_details.get('risk_of_evidence_loss'), case_details.get('technical_complexity_level'), case_details.get('initial_evidence_clarity'), complainant_id))

        for officer in officers_data:
            officer_id = officer.get('id', str(uuid.uuid4()))
            cursor.execute("INSERT OR IGNORE INTO officers (id, position, first_name, last_name, team, phone_number, email) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (officer_id, officer['position'], officer['first_name'], officer['last_name'], officer.get('team'), officer['phone_number'], officer.get('email')))
            cursor.execute("INSERT INTO case_officers (case_id, officer_id) VALUES (?, ?)", (case_id, officer_id))
            
        conn.commit()
        conn.close()
        
        return jsonify({"message": "Case created successfully", "case_id": case_id}), 201

    except Exception as e:
        current_app.logger.error(f"Failed to create case: {e}")
        return jsonify({"error": "Failed to create case."}), 500

# --- OTHER FUNCTIONS (Same as before, already correct) ---
# ... (วางโค้ดฟังก์ชัน get_case_by_id, update_case, delete_case, retrain_model ที่ถูกต้องจากเวอร์ชันก่อนหน้าไว้ที่นี่) ...
@main_bp.route('/cases/<string:case_id>', methods=['GET'])
def get_case_by_id(case_id):
    try:
        conn = get_db_conn()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM cases WHERE id = ?", (case_id,))
        case_data = cursor.fetchone()
        
        if not case_data:
            conn.close()
            return jsonify({"error": "Case not found"}), 404
            
        case_dict = dict(case_data)
        
        cursor.execute("SELECT * FROM complainants WHERE id = ?", (case_dict['complainant_id'],))
        complainant_data = cursor.fetchone()
        case_dict['complainant'] = dict(complainant_data) if complainant_data else None
        
        cursor.execute("""
            SELECT o.* FROM officers o
            JOIN case_officers co ON o.id = co.officer_id
            WHERE co.case_id = ?
        """, (case_id,))
        officers_data = cursor.fetchall()
        case_dict['officers'] = [dict(row) for row in officers_data]

        conn.close()
        return jsonify(case_dict), 200

    except Exception as e:
        current_app.logger.error(f"Failed to get case {case_id}: {e}")
        return jsonify({"error": "Failed to retrieve case details."}), 500

@main_bp.route('/cases/<string:case_id>', methods=['PUT'])
def update_case(case_id):
    ml_model_pipeline = current_app.config['ML_PIPELINE']
    data = request.get_json()
    if not data or 'case_details' not in data:
        return jsonify({"error": "Invalid data format. Required key: 'case_details'."}), 400
        
    case_details = data['case_details']
    
    try:
        input_df = pd.DataFrame([case_details])[ml_service.CATEGORICAL_FEATURES + ml_service.ORDINAL_FEATURES + ml_service.NUMERICAL_FEATURES + ml_service.BINARY_FEATURES]
        priority_score = ml_model_pipeline.predict(input_df)[0]
        priority_score = max(0, min(100, priority_score))

        conn = get_db_conn()
        cursor = conn.cursor()

        cursor.execute("UPDATE cases SET case_number=?, priority_score=?, case_type=?, description=?, estimated_financial_damage=?, num_victims=?, reputational_damage_level=?, sensitive_data_compromised=?, ongoing_threat=?, risk_of_evidence_loss=?, technical_complexity_level=?, initial_evidence_clarity=? WHERE id=?",
            (case_details.get('case_number'), float(priority_score), case_details.get('case_type'), case_details.get('description'), case_details.get('estimated_financial_damage'), case_details.get('num_victims'), case_details.get('reputational_damage_level'), case_details.get('sensitive_data_compromised'), case_details.get('ongoing_threat'), case_details.get('risk_of_evidence_loss'), case_details.get('technical_complexity_level'), case_details.get('initial_evidence_clarity'), case_id))

        conn.commit()
        conn.close()

        return jsonify({"message": f"Case {case_id} updated successfully."}), 200
    except Exception as e:
        current_app.logger.error(f"Failed to update case {case_id}: {e}")
        return jsonify({"error": "Failed to update case."}), 500

@main_bp.route('/cases/<string:case_id>', methods=['DELETE'])
def delete_case(case_id):
    try:
        conn = get_db_conn()
        cursor = conn.cursor()

        cursor.execute("SELECT complainant_id FROM cases WHERE id = ?", (case_id,))
        result = cursor.fetchone()
        if not result:
            conn.close()
            return jsonify({"error": "Case not found"}), 404
        
        complainant_id_to_delete = result['complainant_id']

        cursor.execute("DELETE FROM cases WHERE id = ?", (case_id,))
        
        if complainant_id_to_delete:
            cursor.execute("DELETE FROM complainants WHERE id = ?", (complainant_id_to_delete,))

        conn.commit()
        conn.close()
        
        return jsonify({"message": f"Case {case_id} and associated data deleted successfully."}), 200
    except Exception as e:
        current_app.logger.error(f"Failed to delete case {case_id}: {e}")
        return jsonify({"error": "Failed to delete case."}), 500

@main_bp.route('/retrain_model', methods=['POST'])
def retrain_model():
    ml_model_pipeline = current_app.config['ML_PIPELINE']
    try:
        conn = get_db_conn()
        df_train = pd.read_sql_query("SELECT * FROM cases", conn)
        conn.close()

        if len(df_train) < 10:
            return jsonify({"error": "Not enough data to retrain model. At least 10 cases required."}), 400
        
        X_train = df_train[ml_service.CATEGORICAL_FEATURES + ml_service.ORDINAL_FEATURES + ml_service.NUMERICAL_FEATURES + ml_service.BINARY_FEATURES]
        y_train = df_train[ml_service.TARGET_COLUMN]
        ml_model_pipeline.fit(X_train, y_train)
        
        ml_service.save_model(ml_model_pipeline, current_app.config['MODEL_PATH'])
        return jsonify({"message": "Model retrained successfully."}), 200
    except Exception as e:
        current_app.logger.error(f"Model retraining failed: {e}")
        return jsonify({"error": "Model retraining failed."}), 500