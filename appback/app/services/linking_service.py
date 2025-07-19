# app/services/linking_service.py

import sqlite3
import uuid
import jellyfish
import re

def get_db_conn():
    conn = sqlite3.connect('cyber_cases.db')
    conn.row_factory = sqlite3.Row
    return conn

def normalize_text(text: str) -> str:
    """A general normalization function."""
    if not text: return ""
    # Remove common titles, special characters, and whitespace
    text = re.sub(r'^(นาย|นาง|นางสาว|ด\.ช\.?|ด\.ญ\.?)', '', text).strip()
    return re.sub(r'[\s\-]', '', text).lower()

def calculate_name_similarity(name1: str, name2: str) -> float:
    """Calculates a weighted similarity score for names."""
    # This is a simplified version. A real implementation would be more complex.
    return jellyfish.jaro_winkler_similarity(normalize_text(name1), normalize_text(name2))

def update_case_links(case_id: str):
    """
    Finds and updates links for a given case based on shared structured evidence.
    """
    conn = get_db_conn()
    cursor = conn.cursor()

    # Get all evidence for the new case
    new_case_evidence = cursor.execute(
        "SELECT evidence_type, evidence_value FROM structured_evidence WHERE case_id = ?", (case_id,)
    ).fetchall()

    if not new_case_evidence:
        conn.close()
        return

    # Find cases that share at least one piece of evidence
    linked_case_ids = {case_id} # Start with the current case ID
    for evidence in new_case_evidence:
        # Normalize value for exact matching of numbers
        norm_value = normalize_text(evidence['evidence_value'])
        
        # Find other cases with the exact same normalized evidence value
        matching_cases = cursor.execute(
            "SELECT case_id FROM structured_evidence WHERE evidence_type = ? AND REPLACE(REPLACE(evidence_value, '-', ''), ' ', '') = ?",
            (evidence['evidence_type'], norm_value)
        ).fetchall()
        
        for row in matching_cases:
            linked_case_ids.add(row['case_id'])

    # Determine the link_group_id
    # Find if any of the linked cases already have a group_id
    existing_group_id = None
    placeholders = ','.join('?' for _ in linked_case_ids)
    existing_groups = cursor.execute(
        f"SELECT link_group_id FROM cases WHERE id IN ({placeholders}) AND link_group_id IS NOT NULL",
        list(linked_case_ids)
    ).fetchall()

    if existing_groups:
        # Use the first existing group ID found
        existing_group_id = existing_groups[0]['link_group_id']
    else:
        # If no group exists, create a new one
        existing_group_id = str(uuid.uuid4())

    # Update all linked cases to have the same group_id
    cursor.executemany(
        f"UPDATE cases SET link_group_id = ? WHERE id = ?",
        [(existing_group_id, cid) for cid in linked_case_ids]
    )
    
    conn.commit()
    conn.close()
    print(f"✅ Case linking complete for group {existing_group_id}. Total linked cases: {len(linked_case_ids)}.")