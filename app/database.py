# database.py
import sqlite3

def init_db():
    conn = sqlite3.connect('cyber_cases.db')
    cursor = conn.cursor()
    # สร้างตาราง cases ถ้ายังไม่มี
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS cases (
            id TEXT PRIMARY KEY,
            case_number TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            priority_score REAL NOT NULL,
            case_type TEXT,
            description TEXT NOT NULL,
            estimated_financial_damage INTEGER,
            num_victims INTEGER,
            reputational_damage_level TEXT,
            sensitive_data_compromised BOOLEAN,
            ongoing_threat BOOLEAN,
            risk_of_evidence_loss BOOLEAN,
            technical_complexity_level TEXT,
            initial_evidence_clarity TEXT,
                   
            reporter_id TEXT,
            FOREIGN KEY (reporter_id) REFERENCES reporters(id),
                   
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS reporters (
            id TEXT PRIMARY KEY NOT NULL,  
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            phone_number TEXT NOT NULL,
            email TEXT,
            address TEXT NOT NULL,
            province TEXT NOT NULL,
            district TEXT NOT NULL,
            subdistrict TEXT NOT NULL,
            zipcode TEXT NOT NULL
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS officers (
            id TEXT PRIMARY KEY NOT NULL,  
            position TEXT NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            team TEXT,
            phone_number TEXT NOT NULL,
            email TEXT,
            address TEXT NOT NULL,
            province TEXT NOT NULL,
            district TEXT NOT NULL,
            subdistrict TEXT NOT NULL,
            zipcode TEXT NOT NULL
        )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS case_officers (
        case_id TEXT,
        officer_id TEXT,
        PRIMARY KEY (case_id, officer_id),
        FOREIGN KEY (case_id) REFERENCES cases(id),
        FOREIGN KEY (officer_id) REFERENCES officers(id)
    )
''')

    conn.commit()
    conn.close()
    print("Database initialized successfully.")

if __name__ == '__main__':
    init_db()