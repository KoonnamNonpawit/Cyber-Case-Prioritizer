from flask import Blueprint, request, jsonify, current_app, send_from_directory
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

# --- Helper Function ---
def get_db_conn():
    conn = sqlite3.connect('cyber_cases.db')
    conn.row_factory = sqlite3.Row
    return conn

# --- Dashboard API ---
@main_bp.route('/dashboard', methods=['GET'])
def get_dashbroad_stats():
    try:
        conn = get_db_conn()
        cursor = conn.cursor()

        total_cases = cursor.execute("SELECT COUNT(id) FROM cases").fetchone()[0]
        pending_cases = cursor.execute("SELECT COUNT(id) FROM cases WHERE status = 'รับเรื่อง'").fetchone()[0]
        in_progress_cases = cursor.execute("SELECT COUNT(id) FROM cases WHERE status = 'กำลังสืบสวน'").fetchone()[0]
        completed_cases = cursor.execute("SELECT COUNT(id) FROM cases WHERE status = 'ปิดคดี'").fetchone()[0]

        today_str = datetime.date.today().isoformat()
        cases_today = cursor.execute("SELECT COUNT(id) FROM cases WHERE date(timestamp) = ?", (today_str,)).fetchone()[0]

        seven_days_ago = (datetime.date.today() - datetime.timedelta(days=6)).isoformat()
        daily_cases_rows = cursor.execute("""
            SELECT date(timestamp) as day, COUNT(id) as count
            FROM cases
            WHERE date(timestamp) >= ?
            GROUP BY day
            ORDER BY day ASC
        """, (seven_days_ago,)).fetchall()
        cases_last_7_days = [dict(row) for row in daily_cases_rows]

        # แก้ alias COUNT
        cases_by_type_rows = cursor.execute(
            "SELECT case_type, COUNT(id) as count FROM cases GROUP BY case_type"
        ).fetchall()
        cases_by_type = {row['case_type']: row['count'] for row in cases_by_type_rows}

        monthly_breakdown_rows = cursor.execute("""
            SELECT strftime('%Y-%m', timestamp) as month, case_type, COUNT(id) as count
            FROM cases
            GROUP BY month, case_type
            ORDER BY month, case_type
        """).fetchall()
        monthly_breakdown = defaultdict(dict)
        for row in monthly_breakdown_rows:
            monthly_breakdown[row['month']][row['case_type']] = row['count']

        top_5_cases_rows = cursor.execute("""
            SELECT case_number, case_type, case_name, priority_score, description, num_victims, timestamp, estimated_financial_damage
            FROM cases ORDER BY priority_score DESC LIMIT 5
        """).fetchall()
        top_5_cases = [dict(row) for row in top_5_cases_rows]

        conn.close()
        return jsonify({
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
        }), 200
    except Exception as e:
        current_app.logger.error(f"Failed to get dashboard stats: {e}")
        return jsonify({"error": "Failed to retrieve dashboard stats."}), 500

# --- GET ALL CASES ---
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
    where_clause, params = " WHERE 1=1", []

    search_term = request.args.get('q')
    if search_term:
        where_clause += " AND (REPLACE(c.case_number, '-', '') LIKE ? OR c.case_name LIKE ?)"
        processed_term = f"%{search_term.replace('-', '')}%"
        params.extend([processed_term, f"%{search_term}%"])

    filter_map = {
        'case_number': {'column': 'c.case_number', 'operator': 'LIKE', 'formatter': lambda v: f"%{v}%"},
        'case_type': {'column': 'c.case_type', 'operator': '='},
        'status': {'column': 'c.status', 'operator': '='},
        'reputational_damage_level': {'column': 'c.reputational_damage_level', 'operator': '='},
        'technical_complexity_level': {'column': 'c.technical_complexity_level', 'operator': '='},
        'sensitive_data_compromised': {'column': 'c.sensitive_data_compromised', 'operator': '=', 'formatter': lambda v: 1 if v.lower() == 'true' else 0},
        'ongoing_threat': {'column': 'c.ongoing_threat', 'operator': '=', 'formatter': lambda v: 1 if v.lower() == 'true' else 0},
        'min_damage': {'column': 'c.estimated_financial_damage', 'operator': '>='},
        'max_damage': {'column': 'c.estimated_financial_damage', 'operator': '<='},
        'start_date': {'column': 'c.timestamp', 'operator': '>='},
        'end_date': {'column': 'c.timestamp', 'operator': '<=', 'formatter': lambda v: f"{v}T23:59:59"},
    }
    for arg, mapping in filter_map.items():
        val = request.args.get(arg)
        if val:
            where_clause += f" AND {mapping['column']} {mapping['operator']} ?"
            params.append(mapping.get('formatter', lambda x: x)(val))

    sort_by = request.args.get('sort_by', 'priority')
    sort_map = {'date': 'c.timestamp', 'priority': 'c.priority_score', 'damage': 'c.estimated_financial_damage'}
    sort_column = sort_map.get(sort_by, 'c.priority_score')

    try:
        conn = get_db_conn()
        cursor = conn.cursor()
        count_query = f"SELECT COUNT(c.id) FROM cases c{where_clause}"
        cursor.execute(count_query, tuple(params))
        total_records = cursor.fetchone()[0]
        total_pages = max(1, math.ceil(total_records / limit))

        data_query = f"{base_query}{where_clause} ORDER BY {sort_column} DESC LIMIT ? OFFSET ?"
        cursor.execute(data_query, tuple(params + [limit, offset]))
        cases = cursor.fetchall()
        conn.close()

        return jsonify({"pagination": {"page": page, "limit": limit, "total_records": total_records, "total_pages": total_pages},
                        "data": [dict(row) for row in cases]}), 200
    except Exception as e:
        current_app.logger.error(f"Failed to get cases: {e}")
        return jsonify({"error": "Failed to retrieve cases."}), 500

# --- CREATE CASE (with suspects) ---
@main_bp.route('/rank_case', methods=['POST'])
def rank_case():
    data = request.get_json()
    if not data or 'case_details' not in data or 'complainant' not in data:
        return jsonify({"error": "Invalid data format"}), 400

    case_details, complainant, officers, suspects = (
        data['case_details'], data['complainant'], data.get('officers', []), data.get('suspects', [])
    )
    try:
        conn, cursor = get_db_conn(), get_db_conn().cursor()
        complainant_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO complainants (id, first_name, last_name, phone_number, email, address, province, district, subdistrict, zipcode)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (complainant_id, complainant.get('first_name', ''), complainant.get('last_name', ''), complainant.get('phone_number', ''),
              complainant.get('email', ''), complainant.get('address', ''), complainant.get('province', ''),
              complainant.get('district', ''), complainant.get('subdistrict', ''), complainant.get('zipcode', '00000')))

        case_id, now = str(uuid.uuid4()), datetime.datetime.now().isoformat()
        cursor.execute("""
            INSERT INTO cases (id, case_number, case_name, timestamp, last_updated, date_closed, status, priority_score,
                case_type, description, estimated_financial_damage, num_victims, reputational_damage_level,
                sensitive_data_compromised, ongoing_threat, risk_of_evidence_loss, technical_complexity_level,
                initial_evidence_clarity, complainant_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (case_id, case_details.get('case_number', ''), case_details.get('case_name', ''), now, now, None, 'รับเรื่อง',
              50.0, case_details.get('case_type', ''), case_details.get('description', ''),
              case_details.get('estimated_financial_damage', 0), case_details.get('num_victims', 0),
              case_details.get('reputational_damage_level', ''), int(case_details.get('sensitive_data_compromised', False)),
              int(case_details.get('ongoing_threat', False)), int(case_details.get('risk_of_evidence_loss', False)),
              case_details.get('technical_complexity_level', ''), case_details.get('initial_evidence_clarity', ''), complainant_id))

        for officer in officers:
            officer_id = officer.get('id', str(uuid.uuid4()))
            cursor.execute("INSERT OR IGNORE INTO officers (id, first_name, last_name, phone_number, email) VALUES (?, ?, ?, ?, ?)",
                           (officer_id, officer.get('first_name', ''), officer.get('last_name', ''), officer.get('phone_number', ''), officer.get('email', '')))
            cursor.execute("INSERT INTO case_officers (case_id, officer_id) VALUES (?, ?)", (case_id, officer_id))

        for suspect in suspects:
            suspect_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO suspects (id, case_id, first_name, last_name, national_id, bank_account, phone_number, email, address, district, subdistrict, province)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (suspect_id, case_id, suspect.get('first_name', ''), suspect.get('last_name', ''),
                  suspect.get('national_id', ''), suspect.get('bank_account', ''), suspect.get('phone_number', ''),
                  suspect.get('email', ''), suspect.get('address', ''), suspect.get('district', ''),
                  suspect.get('subdistrict', ''), suspect.get('province', '')))

        conn.commit()
        conn.close()
        return jsonify({"message": "Case created", "case_id": case_id}), 201
    except Exception as e:
        current_app.logger.error(f"Failed to create case: {e}")
        return jsonify({"error": f"Failed to create case: {e}"}), 500

# --- GET CASE BY ID (with suspects) ---
@main_bp.route('/cases/<string:case_id>', methods=['GET'])
def get_case_by_id(case_id):
    try:
        conn, cursor = get_db_conn(), get_db_conn().cursor()
        cursor.execute("SELECT * FROM cases WHERE id = ? OR case_number = ?", (case_id, case_id))
        case_data = cursor.fetchone()
        if not case_data:
            conn.close()
            return jsonify({"error": "Case not found"}), 404

        case_dict = dict(case_data)
        cursor.execute("SELECT * FROM complainants WHERE id = ?", (case_dict['complainant_id'],))
        comp = cursor.fetchone()
        case_dict['complainant'] = dict(comp) if comp else None

        cursor.execute("""
            SELECT o.* FROM officers o
            JOIN case_officers co ON o.id = co.officer_id WHERE co.case_id = ?
        """, (case_dict['id'],))
        case_dict['officers'] = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM suspects WHERE case_id = ?", (case_dict['id'],))
        case_dict['suspects'] = [dict(r) for r in cursor.fetchall()]

        conn.close()
        return jsonify(case_dict), 200
    except Exception as e:
        current_app.logger.error(f"Failed to get case {case_id}: {e}")
        return jsonify({"error": "Failed to retrieve case details."}), 500

# --- Evidence Files ---
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']

@main_bp.route('/cases/<string:case_id>/upload', methods=['POST'])
def upload_file(case_id):
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    if file and allowed_file(file.filename):
        original = secure_filename(file.filename)
        ext = original.rsplit('.', 1)[1].lower()
        stored = f"{uuid.uuid4()}.{ext}"
        path = os.path.join(current_app.config['UPLOAD_FOLDER'], stored)
        file.save(path)
        conn = get_db_conn()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO evidence_files (id, case_id, original_filename, stored_filename, file_path, upload_timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (str(uuid.uuid4()), case_id, original, stored, 'uploads/', datetime.datetime.now().isoformat()))
        conn.commit()
        conn.close()
        return jsonify({"message": "File uploaded", "filename": stored}), 201
    return jsonify({"error": "File type not allowed"}), 400

@main_bp.route('/cases/<string:case_id>/files', methods=['GET'])
def get_case_files(case_id):
    conn = get_db_conn()
    files = conn.execute("SELECT id, original_filename, upload_timestamp FROM evidence_files WHERE case_id = ?", (case_id,)).fetchall()
    conn.close()
    return jsonify([dict(f) for f in files]), 200

@main_bp.route('/uploads/<path:filename>')
def serve_file(filename):
    return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename)

@main_bp.route('/files/<string:file_id>', methods=['DELETE'])
def delete_file(file_id):
    conn = get_db_conn()
    cursor = conn.cursor()
    f = cursor.execute("SELECT stored_filename FROM evidence_files WHERE id = ?", (file_id,)).fetchone()
    if f:
        fp = os.path.join(current_app.config['UPLOAD_FOLDER'], f['stored_filename'])
        if os.path.exists(fp): os.remove(fp)
        cursor.execute("DELETE FROM evidence_files WHERE id = ?", (file_id,))
        conn.commit()
        conn.close()
        return jsonify({"message": "File deleted"}), 200
    conn.close()
    return jsonify({"error": "File not found"}), 404

# --- Suspects CRUD ---
@main_bp.route('/cases/<string:case_id>/suspects', methods=['GET'])
def get_case_suspects(case_id):
    conn = get_db_conn()
    rows = conn.execute("SELECT * FROM suspects WHERE case_id = ?", (case_id,)).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows]), 200

@main_bp.route('/suspects/<string:suspect_id>', methods=['DELETE'])
def delete_suspect(suspect_id):
    conn = get_db_conn()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM suspects WHERE id = ?", (suspect_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Suspect deleted"}), 200
