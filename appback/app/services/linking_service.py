# app/services/linking_service.py

import psycopg2
from psycopg2.extras import RealDictCursor
import uuid
import datetime
import re
import os
from collections import Counter

# --- Helper Functions ---
def get_db_conn():
    """Establishes a connection to the PostgreSQL database."""
    db_url = os.environ.get('DATABASE_URL')
    if not db_url:
        raise Exception("DATABASE_URL environment variable is not set.")
    conn = psycopg2.connect(db_url)
    return conn

def normalize_text(text: str) -> str:
    """A general normalization function."""
    if not text: return ""
    text = re.sub(r'^(นาย|นาง|นางสาว|ด\.ช\.?|ด\.ญ\.?)', '', text).strip()
    return re.sub(r'[\s\-]', '', text).lower()

# --- Main Service Functions ---
def update_group_summary(group_id: str):
    """
    Calculates and updates summary statistics for a given case group using PostgreSQL.
    """
    conn = get_db_conn()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # 1. Calculate summary data from active cases in the group
        cursor.execute("""
            SELECT
                MIN(timestamp) as first_case_timestamp,
                MAX(timestamp) as latest_case_timestamp,
                SUM(num_victims) as total_victims,
                SUM(estimated_financial_damage) as total_damage
            FROM cases
            WHERE group_id = %s AND status != 'ปิดคดี'
        """, (group_id,))
        summary_data = cursor.fetchone()

        # 2. Find the most frequently used bank account in the group
        cursor.execute("""
            SELECT evidence_value FROM structured_evidence
            WHERE case_id IN (SELECT id FROM cases WHERE group_id = %s)
            AND evidence_type = 'BANK_ACCOUNT'
        """, (group_id,))
        evidence_rows = cursor.fetchall()

        primary_evidence = None
        if evidence_rows:
            account_counts = Counter(normalize_text(row['evidence_value']) for row in evidence_rows)
            if account_counts:
                primary_evidence = account_counts.most_common(1)[0][0]

        # 3. Update the case_groups table
        if summary_data:
            cursor.execute("""
                UPDATE case_groups SET
                    first_case_timestamp = %s,
                    latest_case_timestamp = %s,
                    total_victims = %s,
                    total_damage = %s,
                    primary_evidence_value = %s
                WHERE id = %s
            """, (
                summary_data['first_case_timestamp'],
                summary_data['latest_case_timestamp'],
                summary_data['total_victims'] or 0,
                summary_data['total_damage'] or 0,
                primary_evidence,
                group_id
            ))
        
        conn.commit()
        print(f"✅ Group summary updated for group {group_id}.")
    except Exception as e:
        print(f"Error updating group summary: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

def update_case_links(case_id: str):
    """
    Finds and updates links for a case, then triggers a group summary update.
    (PostgreSQL Version)
    """
    conn = get_db_conn()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        new_case_evidence = cursor.execute(
            "SELECT evidence_type, evidence_value FROM structured_evidence WHERE case_id = %s", (case_id,)
        ).fetchall()

        if not new_case_evidence:
            return

        linked_case_ids = {case_id}
        primary_evidence = None

        for evidence in new_case_evidence:
            norm_value = normalize_text(evidence['evidence_value'])
            
            cursor.execute("""
                SELECT se.case_id FROM structured_evidence se
                JOIN cases c ON se.case_id = c.id
                WHERE se.evidence_type = %s 
                  AND REPLACE(REPLACE(se.evidence_value, '-', ''), ' ', '') = %s
                  AND c.status != 'ปิดคดี' 
            """, (evidence['evidence_type'], norm_value))
            
            for row in cursor.fetchall():
                if not primary_evidence:
                    primary_evidence = evidence
                linked_case_ids.add(row['case_id'])

        if len(linked_case_ids) < 2:
            return

        cursor.execute(
            "SELECT group_id FROM cases WHERE id = ANY(%s) AND group_id IS NOT NULL",
            (list(linked_case_ids),)
        )
        existing_groups = cursor.fetchall()

        existing_group_id = None
        if existing_groups:
            existing_group_id = existing_groups[0]['group_id']
        else:
            new_group_id = str(uuid.uuid4())
            
            today_str = datetime.date.today().strftime('%Y%m%d')
            like_pattern = f"G%-%{today_str}"
            cursor.execute(
                "SELECT group_number FROM case_groups WHERE group_number LIKE %s ORDER BY group_number DESC LIMIT 1",
                (like_pattern,)
            )
            last_group_row = cursor.fetchone()
            
            new_seq = int(last_group_row['group_number'].split('-')[0].replace('G', '')) + 1 if last_group_row else 1
            new_group_number = f"G{new_seq:03d}-{today_str}"

            group_name = f"กลุ่มคดีเชื่อมโยงโดย '{primary_evidence['evidence_type']}: {primary_evidence['evidence_value']}'" if primary_evidence else f"กลุ่มคดี #{new_group_number}"

            cursor.execute(
                "INSERT INTO case_groups (id, group_number, group_name, created_timestamp) VALUES (%s, %s, %s, %s)",
                (new_group_id, new_group_number, group_name, datetime.datetime.now())
            )
            existing_group_id = new_group_id

        # Update all linked cases
        update_query = "UPDATE cases SET group_id = %s WHERE id = ANY(%s)"
        cursor.execute(update_query, (existing_group_id, list(linked_case_ids)))
        
        conn.commit()
        
        # Trigger summary update for the affected group
        if existing_group_id:
            update_group_summary(existing_group_id)

        print(f"Case linking complete for group {existing_group_id}.")
        
    except Exception as e:
        print(f"Error during case linking: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()