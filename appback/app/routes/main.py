# app/routes/main.py

from flask import Blueprint, request, jsonify, current_app,send_from_directory
from collections import defaultdict
from werkzeug.utils import secure_filename
import sqlite3
import pandas as pd
import uuid
import datetime
import math
import os
from app.services import ml_service

main_bp = Blueprint('record', __name__)

# --- Helper Function to get DB connection ---
def get_db_conn():
    conn = sqlite3.connect('cyber_cases.db')
    conn.row_factory = sqlite3.Row
    return conn

# --- Dashboard Stats API ---
@main_bp.route('/dashboard', methods=['GET'] )
def get_dashbroad_stats():
    try:
        conn = get_db_conn()
        cursor = conn.cursor()

        # 1. จำนวนคดีทั้งหมด
        total_cases = cursor.execute("SELECT COUNT(id) FROM cases").fetchone()[0]

        # 2. คดีตามสถานะ
        pending_cases = cursor.execute("SELECT COUNT(id) FROM cases WHERE status = 'รับเรื่อง'").fetchone()[0]
        in_progress_cases = cursor.execute("SELECT COUNT(id) FROM cases WHERE status = 'กำลังสืบสวน'").fetchone()[0]
        completed_cases = cursor.execute("SELECT COUNT(id) FROM cases WHERE status = 'ปิดคดี'").fetchone()[0]
        
        # 3. คดีใหม่วันนี้
        today_str = datetime.date.today().isoformat()
        cases_today = cursor.execute("SELECT COUNT(id) FROM cases WHERE date(timestamp) = ?", (today_str,)).fetchone()[0]

        # 4. คดีใน 7 วันล่าสุด
        seven_days_ago = (datetime.date.today() - datetime.timedelta(days=6)).isoformat()
        daily_cases_rows = cursor.execute("""
            SELECT date(timestamp) as day, COUNT(id) as count
            FROM cases
            WHERE date(timestamp) >= ?
            GROUP BY day
            ORDER BY day ASC
        """, (seven_days_ago,)).fetchall()
        
        # จัดรูปแบบข้อมูลให้เป็น list ของ dict ซึ่งจะกลายเป็น JSON Array
        cases_last_7_days = [dict(row) for row in daily_cases_rows]
        # 5. จำนวนคดีแต่ละประเภท
        cases_by_type_rows = cursor.execute("SELECT case_type, COUNT(id) FROM cases GROUP BY case_type").fetchall()
        cases_by_type = {row['case_type']: row['COUNT(id)'] for row in cases_by_type_rows}
        
        # 6. จำนวนคดีแต่ละประเภทในแต่ละเดือน
        monthly_breakdown_rows = cursor.execute("""
            SELECT strftime('%Y-%m', timestamp) as month, case_type, COUNT(id) as count
            FROM cases
            GROUP BY month, case_type
            ORDER BY month, case_type
        """).fetchall()
        
        # จัดโครงสร้างข้อมูลใหม่
        monthly_breakdown = defaultdict(dict)
        for row in monthly_breakdown_rows:
            monthly_breakdown[row['month']][row['case_type']] = row['count']
            
        # 7. Top 5 คดีตาม priority_score (เพิ่มส่วนนี้เข้ามาใหม่)
        top_5_cases_rows = cursor.execute("SELECT case_number, case_type,case_name, priority_score ,description,num_victims ,timestamp, estimated_financial_damage FROM cases ORDER BY priority_score DESC LIMIT 5").fetchall()
        top_5_cases = [dict(row) for row in top_5_cases_rows]

        conn.close()

        # --- รวบรวมข้อมูลทั้งหมดเพื่อส่งกลับ ---
        response_data = {
            "summary_stats": {
                "total_cases": total_cases,
                "pending_cases": pending_cases,
                "in_progress_cases": in_progress_cases,
                "completed_cases": completed_cases,
                "cases_today": cases_today
            },
            "cases_last_7_days": cases_last_7_days,
            "cases_by_type": cases_by_type,
            "monthly_case_breakdown": monthly_breakdown,
            "top_5_priority_cases": top_5_cases 
        }
        
        return jsonify(response_data), 200

    except Exception as e:
        current_app.logger.error(f"Failed to get dashboard stats: {e}")
        return jsonify({"error": "Failed to retrieve dashboard stats."}), 500

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
    
    search_term = request.args.get('q')
    if search_term:
        # Search in both case_number (ignoring hyphens) and case_name
        where_clause += " AND (REPLACE(c.case_number, '-', '') LIKE ? OR c.case_name LIKE ?)"
        processed_term = f"%{search_term.replace('-', '')}%"
        params.extend([processed_term, f"%{search_term}%"])

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
        current_time = datetime.datetime.now().isoformat()

        # --- แก้ไขส่วนนี้: เพิ่มคอลัมน์ให้ตรงกับ VALUES ---
        cursor.execute("""
            INSERT INTO cases (
                id, case_number, case_name, date(timestamp), last_updated, date_closed, status, priority_score, 
                case_type, description, estimated_financial_damage, num_victims, 
                reputational_damage_level, sensitive_data_compromised, ongoing_threat, 
                risk_of_evidence_loss, technical_complexity_level, initial_evidence_clarity, 
                complainant_id
            ) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            case_id, case_details.get('case_number'), case_details.get('case_name'), 
            current_time, # timestamp
            current_time, # last_updated
            None,         # date_closed
            'รับเรื่อง',    
            float(priority_score), 
            case_details.get('case_type'), case_details.get('description'), 
            case_details.get('estimated_financial_damage'), case_details.get('num_victims'), 
            case_details.get('reputational_damage_level'), case_details.get('sensitive_data_compromised'), 
            case_details.get('ongoing_threat'), case_details.get('risk_of_evidence_loss'), 
            case_details.get('technical_complexity_level'), case_details.get('initial_evidence_clarity'), 
            complainant_id
        ))

        for officer in officers_data:
            officer_id = officer.get('id', str(uuid.uuid4()))
            cursor.execute("INSERT OR IGNORE INTO officers (id, first_name, last_name, phone_number, email) VALUES (?, ?, ?, ?, ?)",
                (officer_id, officer['first_name'], officer['last_name'], officer['phone_number'], officer.get('email')))
            cursor.execute("INSERT INTO case_officers (case_id, officer_id) VALUES (?, ?)", (case_id, officer_id))
            
        conn.commit()
        conn.close()
        
        return jsonify({"message": "Case created successfully", "case_id": case_id}), 201

    except Exception as e:
        current_app.logger.error(f"Failed to create case: {e}")
        return jsonify({"error": "Failed to create case due to a server error."}), 500

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
    case_details = data.get('case_details', {})
    officers_data = data.get('officers', []) # Get updated officer list
    
    try:
        input_df = pd.DataFrame([case_details])[ml_service.CATEGORICAL_FEATURES + ml_service.ORDINAL_FEATURES + ml_service.NUMERICAL_FEATURES + ml_service.BINARY_FEATURES]
        priority_score = ml_model_pipeline.predict(input_df)[0]
        priority_score = max(0, min(100, priority_score))

        conn = get_db_conn()
        cursor = conn.cursor()

        current_time = datetime.datetime.now().isoformat()
        date_closed = None
        if case_details.get('status') == 'ปิดคดี':
            old_case = cursor.execute("SELECT date_closed FROM cases WHERE id = ?", (case_id,)).fetchone()
            if not (old_case and old_case['date_closed']):
                date_closed = current_time

        update_fields = {
            'last_updated': current_time, 'priority_score': float(priority_score),
            'case_number': case_details.get('case_number'), 'case_name': case_details.get('case_name'),
            'status': case_details.get('status'), 'description': case_details.get('description'),
            'case_type': case_details.get('case_type')
        }
        if date_closed:
            update_fields['date_closed'] = date_closed
        
        update_fields = {k: v for k, v in update_fields.items() if v is not None}
        
        if update_fields:
            set_clause = ", ".join([f"{key} = ?" for key in update_fields.keys()])
            params = list(update_fields.values()) + [case_id]
            cursor.execute(f"UPDATE cases SET {set_clause} WHERE id = ?", tuple(params))

        # Update assigned officers: delete old ones, add new ones
        cursor.execute("DELETE FROM case_officers WHERE case_id = ?", (case_id,))
        for officer in officers_data:
            officer_id = officer.get('id')
            if officer_id: # Only link existing officers during an update
                cursor.execute("INSERT INTO case_officers (case_id, officer_id) VALUES (?, ?)", (case_id, officer_id))

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

# --- Helper function to check allowed file types ---
def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']

# --- API for File Upload ---
@main_bp.route('/cases/<string:case_id>/upload', methods=['POST'])
def upload_file(case_id):
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if file and allowed_file(file.filename):
        original_filename = secure_filename(file.filename)
        extension = original_filename.rsplit('.', 1)[1].lower()
        stored_filename = f"{uuid.uuid4()}.{extension}"
        
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], stored_filename)
        file.save(file_path)

        # Save file info to database
        conn = get_db_conn()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO evidence_files (id, case_id, original_filename, stored_filename, file_path, upload_timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            str(uuid.uuid4()), case_id, original_filename, stored_filename, 
            'uploads/', datetime.datetime.now().isoformat()
        ))
        conn.commit()
        conn.close()

        return jsonify({"message": "File uploaded successfully", "filename": stored_filename}), 201
    else:
        return jsonify({"error": "File type not allowed"}), 400

# --- API to List Files for a Case ---
@main_bp.route('/cases/<string:case_id>/files', methods=['GET'])
def get_case_files(case_id):
    conn = get_db_conn()
    files = conn.execute("SELECT id, original_filename, upload_timestamp FROM evidence_files WHERE case_id = ?", (case_id,)).fetchall()
    conn.close()
    return jsonify([dict(row) for row in files]), 200

# --- API to Serve/Download a File ---
@main_bp.route('/uploads/<path:filename>')
def serve_file(filename):
    return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename)

# --- API to Delete a File ---
@main_bp.route('/files/<string:file_id>', methods=['DELETE'])
def delete_file(file_id):
    conn = get_db_conn()
    cursor = conn.cursor()
    
    file_info = cursor.execute("SELECT stored_filename FROM evidence_files WHERE id = ?", (file_id,)).fetchone()
    
    if file_info:
        # Delete file from filesystem
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], file_info['stored_filename'])
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # Delete record from database
        cursor.execute("DELETE FROM evidence_files WHERE id = ?", (file_id,))
        conn.commit()
        conn.close()
        return jsonify({"message": "File deleted successfully"}), 200
    else:
        conn.close()
        return jsonify({"error": "File not found"}), 404

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