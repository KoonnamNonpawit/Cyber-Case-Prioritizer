# database.py
import sqlite3

def init_db():
    conn = sqlite3.connect('cyber_cases.db')
    cursor = conn.cursor()

    # 1. ตารางผู้แจ้งความ (Complainants)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS complainants (
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

    # 2. ตารางเจ้าหน้าที่ (Officers)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS officers (
            id TEXT PRIMARY KEY NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            phone_number TEXT NOT NULL,
            email TEXT
        )
    ''')

    # 3. ตารางคดี (Cases)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS cases (
            id TEXT PRIMARY KEY,
            case_number TEXT NOT NULL,
            case_name TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            last_updated TEXT, 
            date_closed TEXT,
            status TEXT DEFAULT 'รับเรื่อง',
            priority_score REAL NOT NULL,
            case_type TEXT NOT NULL,
            description TEXT,
            estimated_financial_damage INTEGER,
            num_victims INTEGER,
            reputational_damage_level TEXT,
            sensitive_data_compromised BOOLEAN,
            ongoing_threat BOOLEAN,
            risk_of_evidence_loss BOOLEAN,
            technical_complexity_level TEXT,
            initial_evidence_clarity TEXT,
            complainant_id TEXT,
            FOREIGN KEY (complainant_id) REFERENCES complainants(id)
        )
    ''')
    
    # 4. ตารางสำหรับเชื่อม "คดี" กับ "เจ้าหน้าที่" (Many-to-Many)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS case_officers (
            case_id TEXT NOT NULL,
            officer_id TEXT NOT NULL,
            PRIMARY KEY (case_id, officer_id),
            FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
            FOREIGN KEY (officer_id) REFERENCES officers(id) ON DELETE CASCADE
        )
    ''')
    # 5. ตารางไฟล์หลักฐาน (Evidence Files)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS evidence_files (
            id TEXT PRIMARY KEY,
            case_id TEXT NOT NULL,
            original_filename TEXT NOT NULL,
            stored_filename TEXT NOT NULL UNIQUE,
            file_path TEXT NOT NULL,
            upload_timestamp TEXT NOT NULL,
            FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
        )
    ''')
    #6.ทำงานกับหน่วยงานอื่นๆ
    conn.commit()
    conn.close()
    print("Database with new schema initialized successfully.")

if __name__ == '__main__':
    init_db()