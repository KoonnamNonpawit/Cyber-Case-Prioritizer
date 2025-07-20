# app/routes/main.py
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from collections import defaultdict
from werkzeug.utils import secure_filename
import psycopg2
from psycopg2.extras import RealDictCursor
import pandas as pd
import uuid
import datetime
import math
import os
from app.services import ml_service,linking_service


main_bp = Blueprint('main', __name__)

# --- Helper Functions ---
def get_db_conn():
    """Establishes a connection to the PostgreSQL database."""
    db_url = os.environ.get('DATABASE_URL')
    if not db_url:
        raise Exception("DATABASE_URL environment variable is not set.")
    conn = psycopg2.connect(db_url)
    return conn

def update_case_links(case_id):
    """
    ตรวจสอบคดีอื่น ๆ ว่ามีความคล้ายกับคดีนี้หรือไม่ และเสนอการจัดกลุ่ม
    """
    conn = get_db_conn()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    # ดึงรายละเอียดของคดีนี้
    cursor.execute("SELECT * FROM cases WHERE id = %s", (case_id,))
    new_case = cursor.fetchone()
    if not new_case:
        return

    # ดึงกลุ่มคดีที่มีอยู่
    cursor.execute("SELECT id, group_number FROM case_groups")
    existing_groups = cursor.fetchall()

    best_group = None
    best_score = 0.0

    for group in existing_groups:
        # ตัวอย่าง: หาเคสในกลุ่มนี้ เพื่อเปรียบเทียบ
        cursor.execute("SELECT * FROM cases WHERE group_id = %s", (group['group_number'],))
        group_cases = cursor.fetchall()

        if not group_cases:
            continue

        # คำนวณ similarity โดยใช้ชื่อคดีเป็นเกณฑ์ง่าย ๆ (สามารถเปลี่ยนเป็น NLP ได้)
        sim_scores = [
            jellyfish.jaro_winkler_similarity(new_case['case_name'], c['case_name'])
            for c in group_cases
        ]
        avg_sim = sum(sim_scores) / len(sim_scores)

        if avg_sim > best_score and avg_sim >= 0.85:
            best_score = avg_sim
            best_group = group

    if best_group:
        # เสนอให้เข้า group นี้
        suggestion_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO case_group_suggestions (id, case_id, suggested_group_id, ml_score, status)
            VALUES (%s, %s, %s, %s, %s)
        """, (suggestion_id, case_id, best_group['id'], best_score, 'pending'))

    conn.commit()
    conn.close()

def get_best_suggested_group(case_id):
    conn = get_db_conn()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("""
        SELECT cg.id, cg.group_number, s.ml_score
        FROM case_group_suggestions s
        JOIN case_groups cg ON s.suggested_group_id = cg.id
        WHERE s.case_id = %s AND s.status = 'pending'
        ORDER BY s.ml_score DESC
        LIMIT 1
    """, (case_id,))
    row = cursor.fetchone()
    conn.close()
    return row if row else None

# --- Dashboard Stats API ---
@main_bp.route('/dashboard', methods=['GET'])
def get_dashboard_stats():
    try:
        conn = get_db_conn()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # 1. จำนวนคดีทั้งหมด
        cursor.execute("SELECT COUNT(id) AS count FROM cases")
        total_cases = cursor.fetchone()['count']

        # 2. คดีตามสถานะ
        cursor.execute("SELECT COUNT(id) AS count FROM cases WHERE status = 'รับเรื่อง'")
        pending_cases = cursor.fetchone()['count']
        cursor.execute("SELECT COUNT(id) AS count FROM cases WHERE status = 'กำลังสืบสวน'")
        in_progress_cases = cursor.fetchone()['count']
        cursor.execute("SELECT COUNT(id) AS count FROM cases WHERE status = 'ปิดคดี'")
        completed_cases = cursor.fetchone()['count']

        # 3. คดีใหม่วันนี้
        cursor.execute("SELECT COUNT(id) AS count FROM cases WHERE timestamp::date = CURRENT_DATE")
        cases_today = cursor.fetchone()['count']

        # 4. คดีใน 7 วันล่าสุด
        cursor.execute("""
            SELECT timestamp::date as day, COUNT(id) as count
            FROM cases
            WHERE timestamp >= CURRENT_DATE - INTERVAL '6 days'
            GROUP BY day ORDER BY day
        """)
        cases_last_7_days = cursor.fetchall()

        # 5. จำนวนคดีแต่ละประเภท
        cursor.execute("""
            SELECT case_type, COUNT(id) AS count
            FROM cases
            WHERE case_type IS NOT NULL
            GROUP BY case_type
        """)
        cases_by_type = {row['case_type']: row['count'] for row in cursor.fetchall()}

        # 6. จำนวนคดีแต่ละประเภทในแต่ละเดือน
        cursor.execute("""
            SELECT TO_CHAR(timestamp, 'YYYY-MM') as month, case_type, COUNT(id) as count
            FROM cases
            WHERE case_type IS NOT NULL
            GROUP BY month, case_type
            ORDER BY month
        """)
        monthly_breakdown_rows = cursor.fetchall()
        monthly_breakdown = defaultdict(dict)
        for row in monthly_breakdown_rows:
            monthly_breakdown[row['month']][row['case_type']] = row['count']

        # 7. Top 5 คดีสำคัญ
        cursor.execute("""
            SELECT id, case_number, case_name, description, timestamp,
                   num_victims, estimated_financial_damage, priority_score
            FROM cases
            ORDER BY priority_score DESC
            LIMIT 5
        """)
        top_5_cases = cursor.fetchall()

        # 8. Top 5 บัญชีธนาคารที่พบบ่อยที่สุด (ถ้ามีตาราง bank_accounts)
        cursor.execute("""
            SELECT account_number, COUNT(*) as case_count
            FROM bank_accounts
            GROUP BY account_number
            ORDER BY case_count DESC
            LIMIT 5
        """)
        top_5_accounts = cursor.fetchall()

        cursor.close()
        conn.close()

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
            "top_5_priority_cases": top_5_cases,
            "top_5_accounts": top_5_accounts
        }
        return jsonify(response_data), 200

    except Exception as e:
        current_app.logger.error(f"Failed to get dashboard stats: {e}")
        return jsonify({"error": "Failed to retrieve dashboard stats."}), 500

@main_bp.route('/cases', methods=['GET'])
def get_all_cases():
    page = request.args.get('page', default=1, type=int)
    limit = 12
    offset = (page - 1) * limit

    base_query = "FROM cases c LEFT JOIN complainants comp ON c.complainant_id = comp.id"
    select_clause = """
        SELECT c.*, 
               CONCAT(comp.first_name, ' ', comp.last_name) as complainant_name,
               (SELECT STRING_AGG(CONCAT(o.first_name, ' ', o.last_name), ', ') 
                FROM officers o JOIN case_officers co ON o.id = co.officer_id 
                WHERE co.case_id = c.id) as officer_names
    """
    
    where_clause = " WHERE 1=1"
    params = []
    
    search_term = request.args.get('q')
    if search_term:
        where_clause += " AND (REPLACE(c.case_number, '-', '') ILIKE %s OR c.case_name ILIKE %s)"
        params.extend([f"%{search_term.replace('-', '')}%", f"%{search_term}%"])
    filter_map = {
        # Text fields from 'cases' table
        'case_number': {'column': 'c.case_number', 'operator': 'LIKE', 'formatter': lambda v: f"%{v}%"},
        'case_type': {'column': 'c.case_type', 'operator': '='},
        'reputational_damage_level': {'column': 'c.reputational_damage_level', 'operator': '='},
        'technical_complexity_level': {'column': 'c.technical_complexity_level', 'operator': '='},
        'group_id': {'column': 'c.group_id', 'operator': 'ILIKE', 'formatter': lambda v: f"%{v}%"},
        
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
            formatted_value = mapping.get('formatter', lambda v: v)(arg_value)
            where_clause += f" AND {mapping['column']} {mapping['operator']} %s"
            params.append(formatted_value)

    try:
        conn = get_db_conn()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Use a simplified query for counting to improve performance
        count_query = f"SELECT COUNT(c.id) {base_query}{where_clause}"
        cursor.execute(count_query, tuple(params))
        total_records = cursor.fetchone()['count']
        total_pages = math.ceil(total_records / limit) if total_records > 0 else 1

        data_query = f"{select_clause}{base_query}{where_clause} ORDER BY c.priority_score DESC LIMIT %s OFFSET %s"
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

@main_bp.route('/rank_case', methods=['POST'])
def rank_case():
    ml_model_pipeline = current_app.config['ML_PIPELINE']
    if not ml_model_pipeline:
        return jsonify({"error": "Model is not loaded."}), 503

    data = request.get_json()
    if not data or 'case_details' not in data or 'complainant' not in data:
        return jsonify({"error": "Invalid data format."}), 400

    case_details = data['case_details']
    complainant_data = data['complainant']
    officers_data = data.get('officers', [])
    suspects_data = data.get('suspects', [])
    structured_evidence_data = data.get('structured_evidence', [])

    try:
        # เตรียมข้อมูลสำหรับโมเดล
        case_details_filled = case_details.copy()

        # Calculate derived features that the model expects
        case_details_filled['evidence_count'] = len(structured_evidence_data)
        case_details_filled['has_actionable_evidence'] = any(
            ev.get('evidence_type', '').upper() in ['BANK_ACCOUNT', 'PHONE_NUMBER'] 
            for ev in structured_evidence_data
        )
        case_details_filled['days_since_creation'] = 0  # New case
        case_details_filled['num_linked_cases'] = 0     # New case, no links yet
        case_details_filled['is_grouped'] = False           # New case, not grouped yet

        # Create DataFrame with all features expected by the model
        input_df = pd.DataFrame([case_details_filled])
        all_features = (
            ml_service.CATEGORICAL_FEATURES +
            ml_service.ORDINAL_FEATURES +
            ml_service.NUMERICAL_FEATURES +
            ml_service.BINARY_FEATURES
        )
        for feature in all_features:
            if feature not in input_df.columns:
                # ถ้าไม่มีคอลัมน์นั้น ให้สร้างขึ้นมาแล้วเติมค่า default ที่เหมาะสม
                if feature in ml_service.BINARY_FEATURES:
                    input_df[feature] = 0 # False
                elif feature in ml_service.NUMERICAL_FEATURES:
                    input_df[feature] = 0
                else:
                    input_df[feature] = 'None' # หรือ 'Unknown'
        REPUTATIONAL_DAMAGE_MAP = {
            "1": "Low", "2": "Medium", "3": "High", "4": "Critical", "None": "None", None: "None",
            1: "Low", 2: "Medium", 3: "High", 4: "Critical"
        }
        TECHNICAL_COMPLEXITY_MAP = {
            "1": "Low", "2": "Medium", "3": "High", "4": "Very High", "5": "Extreme", "None": "Low", None: "Low",
            1: "Low", 2: "Medium", 3: "High", 4: "Very High", 5: "Extreme"
        }
        EVIDENCE_CLARITY_MAP = {
            "1": "Low", "2": "Medium", "3": "High", "4": "Very High", "None": "None", None: "None",
            1: "Low", 2: "Medium", 3: "High", 4: "Very High"
        }

       # Apply mappings
        input_df['reputational_damage_level'] = input_df['reputational_damage_level'].map(REPUTATIONAL_DAMAGE_MAP).fillna("Low")
        input_df['technical_complexity_level'] = input_df['technical_complexity_level'].map(TECHNICAL_COMPLEXITY_MAP).fillna("Low")
        input_df['initial_evidence_clarity'] = input_df['initial_evidence_clarity'].map(EVIDENCE_CLARITY_MAP).fillna("Medium")

        # Fill missing columns
        all_model_features = ml_service.CATEGORICAL_FEATURES + ml_service.ORDINAL_FEATURES + ml_service.NUMERICAL_FEATURES + ml_service.BINARY_FEATURES
        for feature in all_model_features:
            if feature not in input_df.columns:
                if feature in ml_service.BINARY_FEATURES:
                    input_df[feature] = 0
                elif feature in ml_service.NUMERICAL_FEATURES:
                    input_df[feature] = 0
                else:
                    input_df[feature] = 'None'

        # Clean and convert dtypes
        for col in ml_service.CATEGORICAL_FEATURES + ml_service.ORDINAL_FEATURES:
            input_df[col] = input_df[col].astype(str)
        for col in ml_service.BINARY_FEATURES:
            input_df[col] = input_df[col].apply(lambda x: 1 if x == True else 0)

        input_df = input_df[all_model_features]
        # เช็คว่า dtype ถูกต้องก่อนเข้า predict
        print(input_df.dtypes)
        print(input_df.head())
        
        priority_score = ml_model_pipeline.predict(input_df)[0]
        priority_score = max(0, min(100, priority_score))
        
        conn = get_db_conn()
        cursor = conn.cursor()
        
        # Insert case
        cursor.execute("""
            INSERT INTO cases (
                id, case_number, case_name, timestamp, last_updated, date_closed, status, priority_score, 
                case_type, description, estimated_financial_damage, num_victims, 
                reputational_damage_level, sensitive_data_compromised, ongoing_threat, 
                risk_of_evidence_loss, technical_complexity_level, initial_evidence_clarity, 
                complainant_id, group_id, suspests
            ) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            case_id, 
            case_number, 
            case_details.get('case_name'), 
            current_time,               # timestamp as datetime
            current_time,               # last_updated as datetime
            None,                      # date_closed (ยังไม่ปิดคดี)
            'รับเรื่อง',               # status (string)
            float(priority_score),      # priority_score (float)
            case_details.get('case_type'), 
            case_details.get('description'), 
            int(case_details.get('estimated_financial_damage', 0)), 
            int(case_details.get('num_victims', 0)), 
            case_details.get('reputational_damage_level'), 
            sensitive_data_compromised,  # boolean
            ongoing_threat,              # boolean
            risk_of_evidence_loss,       # boolean
            case_details.get('technical_complexity_level'), 
            case_details.get('initial_evidence_clarity'), 
            complainant_id, 
            None,      # group_id (ถ้าไม่มี ให้ใส่ None)
            None       # suspests (ถ้าไม่มี ให้ใส่ None)
        ))
        conn.commit()  # <=== ต้อง commit ตรงนี้ก่อน

        # Insert officers (ถ้ามี)
        for officer in officers_data:
            officer_id = officer.get('id', str(uuid.uuid4()))
            cursor.execute("""
                INSERT INTO officers (id, first_name, last_name, phone_number, email) VALUES (%s, %s, %s, %s, %s) 
                ON CONFLICT (id) DO NOTHING
            """, (
                officer_id, officer['first_name'], officer['last_name'], officer['phone_number'], officer.get('email')
            ))
            cursor.execute("INSERT INTO case_officers (case_id, officer_id) VALUES (%s, %s)", (case_id, officer_id))

        # Insert suspects (ถ้ามี)
        for suspect in suspects_data:
            suspect_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO suspests (
                    id, first_name, last_name, national_id, account, phone_number, email, address, province, district, subdistrict, zipcode, created_at, updated_at, case_number
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                suspect_id,
                suspect.get('first_name'),
                suspect.get('last_name'),
                suspect.get('national_id'),
                suspect.get('account'),
                suspect.get('phone_number'),
                suspect.get('email'),
                suspect.get('address'),
                suspect.get('province'),
                suspect.get('district'),
                suspect.get('subdistrict'),
                suspect.get('zipcode'),
                datetime.datetime.now(),
                datetime.datetime.now(),
                case_number
            ))

        # Insert structured evidence (ถ้ามี)
        for ev in structured_evidence_data:
            evidence_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO structured_evidence (id, case_number, evidence_type, evidence_value, created_timestamp) 
                VALUES (%s, %s, %s, %s, %s)
            """, (
                evidence_id, case_number, ev.get('evidence_type'), ev.get('evidence_value'), current_time
            ))



        conn.commit()
        linking_service.update_case_links(case_id)
        conn.close()
        
        return jsonify({"message": "Case created successfully", "case_number": case_number, "priority_score": float(priority_score)}), 201

    except Exception as e:
        current_app.logger.error(f"Failed to create case: {e}")
        import traceback
        current_app.logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({"error": "Failed to create case due to a server error."}), 500
    
@main_bp.route('/group_cases/<string:group_number>', methods=['GET'])
def get_all_group_cases(group_number):
    page = request.args.get('page', default=1, type=int)
    limit = 12
    offset = (page - 1) * limit
    search_term = request.args.get('q', '').strip()

    try:
        conn = get_db_conn()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        base_query = """
            SELECT * FROM cases 
            WHERE group_id = %s
        """
        params = [group_number]

        if search_term:
            # ใช้ ILIKE และ wildcard % สำหรับค้นหาแบบใกล้เคียง case_name และ case_number
            base_query += " AND (case_name ILIKE %s OR REPLACE(case_number, '-', '') ILIKE %s)"
            like_pattern = f"%{search_term}%"
            params.extend([like_pattern, like_pattern])

        base_query += " ORDER BY timestamp DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        cursor.execute(base_query, tuple(params))
        case_data = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify({
            "page": page,
            "limit": limit,
            "data": [dict(row) for row in case_data]
        }), 200

    except Exception as e:
        current_app.logger.error(f"Failed to get group number {group_number}: {e}")
        return jsonify({"error": "Failed to retrieve case details."}), 500

@main_bp.route('/cases/<string:case_number>', methods=['GET'])
def get_case_by_number(case_number):
    try:
        conn = get_db_conn()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("SELECT * FROM cases WHERE case_number = %s", (case_number,))
        case_data = cursor.fetchone()
        
        if not case_data:
            conn.close()
            return jsonify({"error": "Case not found"}), 404
        
        case_dict = dict(case_data)
        
        cursor.execute("SELECT * FROM complainants WHERE id = %s", (case_dict['complainant_id'],))
        complainant_data = cursor.fetchone()
        case_dict['complainant'] = dict(complainant_data) if complainant_data else None
        
        cursor.execute("""
            SELECT o.* FROM officers o
            JOIN case_officers co ON o.id = co.officer_id
            WHERE co.case_id = %s
        """, (case_dict['id'],))
        officers_data = cursor.fetchall()
        case_dict['officers'] = [dict(row) for row in officers_data]

        conn.close()
        return jsonify(case_dict), 200

    except Exception as e:
        current_app.logger.error(f"Failed to get case {case_number}: {e}")
        return jsonify({"error": "Failed to retrieve case details."}), 500

@main_bp.route('/suggestion_group_case/<string:group_number>', methods=['GET'])
def get_suggested_cases_by_group(group_number):
    try:
        conn = get_db_conn()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("SELECT id FROM case_groups WHERE group_number = %s", (group_number,))
        group = cursor.fetchone()

        if not group:
            return jsonify({"error": "Group not found"}), 404

        group_id = group['id']

        # ดึงคดีที่ ML แนะนำให้เข้า group นี้
        cursor.execute("""
            SELECT s.id AS suggestion_id, c.case_number, c.case_name, c.priority_score, s.ml_score, s.status
            FROM case_group_suggestions s
            JOIN cases c ON s.case_id = c.id
            WHERE s.suggested_group_id = %s AND s.status = 'pending'
            ORDER BY s.ml_score DESC
        """, (group_id,))

        suggestions = cursor.fetchall()

        conn.close()
        return jsonify(suggestions), 200

    except Exception as e:
        current_app.logger.error(f"Failed to load suggestions: {e}")
        return jsonify({"error": "Failed to retrieve suggestions."}), 500

@main_bp.route('/case_group_suggestions/<string:suggestion_id>/respond', methods=['POST'])
def respond_group_suggestion(suggestion_id):
    data = request.get_json()
    action = data.get('action')  # 'accept' หรือ 'reject'

    if action not in ['accept', 'reject']:
        return jsonify({"error": "Invalid action"}), 400

    try:
        conn = get_db_conn()
        cursor = conn.cursor()

        # ดึง suggestion เดิม
        cursor.execute("SELECT case_id, suggested_group_id FROM case_group_suggestions WHERE id = %s", (suggestion_id,))
        suggestion = cursor.fetchone()

        if not suggestion:
            return jsonify({"error": "Suggestion not found"}), 404

        if action == 'accept':
            # อัปเดต case ให้เข้า group
            cursor.execute("UPDATE cases SET group_id = %s WHERE id = %s", (suggestion['suggested_group_id'], suggestion['case_id']))
        
        # อัปเดตสถานะของ suggestion
        cursor.execute("UPDATE case_group_suggestions SET status = %s WHERE id = %s", (action, suggestion_id))

        conn.commit()
        conn.close()

        return jsonify({"message": f"Suggestion {action}ed successfully"}), 200

    except Exception as e:
        current_app.logger.error(f"Failed to respond to suggestion {suggestion_id}: {e}")
        return jsonify({"error": "Server error"}), 500

@main_bp.route('/cases/<string:case_number>', methods=['PUT'])
def update_case(case_number):
    ml_model_pipeline = current_app.config['ML_PIPELINE']
    data = request.get_json()
    case_details = data.get('case_details', {})
    officers_data = data.get('officers', [])
    
    try:
        # เตรียมข้อมูลสำหรับโมเดล
        input_df = pd.DataFrame([case_details])[ml_service.TEXT_FEATURES + ml_service.BINARY_FEATURES + ml_service.NUMERICAL_FEATURES + ml_service.TARGET_COLUMN]
        priority_score = ml_model_pipeline.predict(input_df)[0]
        priority_score = max(0, min(100, priority_score))

        conn = get_db_conn()
        cursor = conn.cursor()

        current_time = datetime.datetime.now().isoformat()
        date_closed = None

        cursor.execute("SELECT date_closed FROM cases WHERE case_number = %s", (case_number,))
        old_case = cursor.fetchone()
        if case_details.get('status') == 'ปิดคดี':
            if not (old_case and old_case[0]):
                date_closed = current_time

        update_fields = {
            'last_updated': current_time,
            'priority_score': float(priority_score),
            'case_number': case_details.get('case_number'),
            'case_name': case_details.get('case_name'),
            'status': case_details.get('status'),
            'description': case_details.get('description'),
            'case_type': case_details.get('case_type')
        }
        if date_closed:
            update_fields['date_closed'] = date_closed
        
        update_fields = {k: v for k, v in update_fields.items() if v is not None}

        if update_fields:
            set_clause = ", ".join([f"{key} = %s" for key in update_fields.keys()])
            params = list(update_fields.values()) + [case_number]
            cursor.execute(f"UPDATE cases SET {set_clause} WHERE case_number = %s", tuple(params))

        # Update assigned officers: delete old ones, add new ones
        cursor.execute("DELETE FROM case_officers WHERE case_id = (SELECT id FROM cases WHERE case_number = %s)", (case_number,))
        for officer in officers_data:
            officer_id = officer.get('id')
            if officer_id:
                cursor.execute(
                    "INSERT INTO case_officers (case_id, officer_id) VALUES ((SELECT id FROM cases WHERE case_number = %s), %s)", 
                    (case_number, officer_id)
                )

        conn.commit()
        conn.close()
        return jsonify({"message": f"Case {case_number} updated successfully."}), 200

    except Exception as e:
        current_app.logger.error(f"Failed to update case {case_number}: {e}")
        return jsonify({"error": "Failed to update case."}), 500

@main_bp.route('/cases/<string:case_id>', methods=['DELETE'])
def delete_case(case_id):
    try:
        conn = get_db_conn()
        cursor = conn.cursor()

        cursor.execute("SELECT complainant_id FROM cases WHERE id = %s", (case_id,))
        result = cursor.fetchone()
        if not result:
            conn.close()
            return jsonify({"error": "Case not found"}), 404
        
        complainant_id_to_delete = result['complainant_id']

        cursor.execute("DELETE FROM cases WHERE id = %s", (case_id,))
        
        if complainant_id_to_delete:
            cursor.execute("DELETE FROM complainants WHERE id = %s", (complainant_id_to_delete,))

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
    files = conn.execute("SELECT id, original_filename, upload_timestamp FROM evidence_files WHERE case_id = %s", (case_id,)).fetchall()
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
    
    file_info = cursor.execute("SELECT stored_filename FROM evidence_files WHERE id = %s", (file_id,)).fetchone()
    
    if file_info:
        # Delete file from filesystem
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], file_info['stored_filename'])
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # Delete record from database
        cursor.execute("DELETE FROM evidence_files WHERE id = %s", (file_id,))
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