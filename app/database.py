# database.py
import sqlite3

def init_db():
    conn = sqlite3.connect('cyber_cases.db')
    cursor = conn.cursor()
    # สร้างตาราง cases ถ้ายังไม่มี
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS cases (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            priority_score REAL NOT NULL,
            case_type TEXT,
            estimated_financial_damage INTEGER,
            num_victims INTEGER,
            reputational_damage_level TEXT,
            sensitive_data_compromised BOOLEAN,
            ongoing_threat BOOLEAN,
            risk_of_evidence_loss BOOLEAN,
            technical_complexity_level TEXT,
            initial_evidence_clarity TEXT
        )
    ''')
    conn.commit()
    conn.close()
    print("Database initialized successfully.")

if __name__ == '__main__':
    init_db()