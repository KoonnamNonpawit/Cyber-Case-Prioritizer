from flask import Blueprint, request, jsonify, current_app, send_from_directory
from collections import defaultdict
from werkzeug.utils import secure_filename
import psycopg2
from psycopg2.extras import RealDictCursor
import os

dashboard = Blueprint('dashboard', __name__)
def get_db_conn():
    """Establishes a connection to the PostgreSQL database."""
    db_url = os.environ.get('DATABASE_URL')
    if not db_url:
        raise Exception("DATABASE_URL environment variable is not set.")
    conn = psycopg2.connect(db_url)
    return conn

# --- Dashboard Stats API ---
@dashboard.route('/dashboard', methods=['GET'])
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
