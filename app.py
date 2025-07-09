# -*- coding: utf-8 -*-
import sqlite3
from flask import Flask, request, jsonify, render_template_string
import pandas as pd
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, OrdinalEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
# --- CHANGED: Import RandomForestRegressor instead of LinearRegression ---
from sklearn.ensemble import RandomForestRegressor
import uuid
import datetime
import joblib
import os

app = Flask(__name__)

# --- Configuration ---
class Config:
    MODEL_PATH = 'cyber_case_model_rf.joblib' # Using a new model file name
    DEBUG = True
app.config.from_object(Config)


# --- Database Layer (Abstraction) ---
# cases_db = []

# def db_add_case(case_data):
#     cases_db.append(case_data)
#     return case_data

# def db_get_all_cases_sorted():
#     return sorted(cases_db, key=lambda x: x.get('priority_score', 0), reverse=True)


# --- ML Model and Preprocessing Pipeline ---
ml_model_pipeline = None

# Feature definitions remain the same
CATEGORICAL_FEATURES = ['case_type']
ORDINAL_FEATURES = ['reputational_damage_level', 'technical_complexity_level', 'initial_evidence_clarity']
BINARY_FEATURES = ['sensitive_data_compromised', 'ongoing_threat', 'risk_of_evidence_loss']
NUMERICAL_FEATURES = ['estimated_financial_damage', 'num_victims']
TARGET_COLUMN = 'priority_score'

REPUTATIONAL_DAMAGE_ORDER = ['None', 'Low', 'Medium', 'High', 'Critical']
TECHNICAL_COMPLEXITY_ORDER = ['Low', 'Medium', 'High', 'Very High', 'Extreme']
INITIAL_EVIDENCE_ORDER = ['Low', 'Medium', 'High', 'Very High']

# --- Functions to Manage the ML Model ---

def save_model(pipeline, path):
    print(f"Saving model to {path}...")
    joblib.dump(pipeline, path)
    print("Model saved successfully.")

def load_model(path):
    if not os.path.exists(path):
        print(f"Model file not found at {path}. A new model will be trained.")
        return None
    print(f"Loading model from {path}...")
    pipeline = joblib.load(path)
    print("Model loaded successfully.")
    return pipeline

def train_ml_model():
    """
    Trains the ML model pipeline using RandomForestRegressor.
    """
    # Using the same synthetic data
    data = {
        'case_type': ['Hacking', 'Phishing', 'Scam', 'Cyberbullying', 'Illegal Content', 'Other', 'Hacking', 'Phishing', 'Scam', 'Cyberbullying', 'Illegal Content', 'Other', 'Hacking', 'Phishing', 'Scam', 'Cyberbullying', 'Illegal Content'],
        'estimated_financial_damage': [500000, 100000, 20000, 0, 0, 500, 1000000, 250000, 50000, 0, 0, 1000, 1500000, 300000, 75000, 0, 0],
        'num_victims': [1, 50, 5, 20, 10, 2, 2, 100, 10, 50, 15, 3, 3, 150, 20, 100, 20],
        'reputational_damage_level': ['High', 'Medium', 'Low', 'None', 'High', 'None', 'Critical', 'High', 'Medium', 'Low', 'Critical', 'Low', 'Critical', 'High', 'Medium', 'Low', 'High'],
        'sensitive_data_compromised': [True, True, False, False, True, False, True, True, False, False, True, False, True, True, False, False, True],
        'ongoing_threat': [True, False, False, False, False, False, True, False, False, False, True, False, True, False, False, False, True],
        'risk_of_evidence_loss': [True, True, False, False, True, False, True, True, False, False, True, False, True, True, False, False, True],
        'technical_complexity_level': ['Very High', 'Medium', 'Low', 'Low', 'High', 'Medium', 'Extreme', 'High', 'Medium', 'Low', 'Very High', 'Low', 'Extreme', 'Very High', 'Medium', 'Low', 'High'],
        'initial_evidence_clarity': ['High', 'Medium', 'High', 'Low', 'Medium', 'Low', 'Very High', 'High', 'Medium', 'Low', 'Very High', 'Low', 'Very High', 'High', 'Medium', 'Low', 'Very High'],
        'priority_score': [95, 80, 50, 30, 90, 20, 100, 90, 60, 40, 98, 25, 98, 92, 70, 45, 95]
    }
    df_train = pd.DataFrame(data)

    preprocessor = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore'), CATEGORICAL_FEATURES),
            ('ord', OrdinalEncoder(categories=[REPUTATIONAL_DAMAGE_ORDER, TECHNICAL_COMPLEXITY_ORDER, INITIAL_EVIDENCE_ORDER]), ORDINAL_FEATURES),
            ('num', StandardScaler(), NUMERICAL_FEATURES),
            ('bin', 'passthrough', BINARY_FEATURES)
        ],
        remainder='drop'
    )

    # --- CHANGED: Using a more robust RandomForestRegressor model ---
    # n_estimators is the number of trees in the forest. 100 is a good starting point.
    # random_state=42 ensures that we get the same result every time we train the model.
    model = RandomForestRegressor(n_estimators=100, random_state=42)

    pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('regressor', model)
    ])

    X_train = df_train[CATEGORICAL_FEATURES + ORDINAL_FEATURES + NUMERICAL_FEATURES + BINARY_FEATURES]
    y_train = df_train[TARGET_COLUMN]
    pipeline.fit(X_train, y_train)

    print("ML Model (RandomForest) trained successfully.")
    return pipeline


# --- API Endpoints (No changes needed here) ---
@app.route('/rank_case', methods=['POST'])
def rank_case():
    if not ml_model_pipeline:
        return jsonify({"error": "Model is not loaded or trained. Please wait and try again."}), 503
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON data"}), 400
    try:
        # Data validation can be improved here
        input_df = pd.DataFrame([data])[CATEGORICAL_FEATURES + ORDINAL_FEATURES + NUMERICAL_FEATURES + BINARY_FEATURES]
        priority_score = ml_model_pipeline.predict(input_df)[0]
        priority_score = max(0, min(100, priority_score))

        new_case_data = {
            'id': str(uuid.uuid4()),
            'timestamp': datetime.datetime.now().isoformat(),
            'priority_score': float(priority_score),
            **data
        }

        conn = sqlite3.connect('cyber_cases.db')
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO cases (id, timestamp, priority_score, case_type, estimated_financial_damage, num_victims, reputational_damage_level, sensitive_data_compromised, ongoing_threat, risk_of_evidence_loss, technical_complexity_level, initial_evidence_clarity)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            new_case_data['id'], new_case_data['timestamp'], new_case_data['priority_score'], new_case_data['case_type'],
            new_case_data['estimated_financial_damage'], new_case_data['num_victims'], new_case_data['reputational_damage_level'],
            new_case_data['sensitive_data_compromised'], new_case_data['ongoing_threat'], new_case_data['risk_of_evidence_loss'],
            new_case_data['technical_complexity_level'], new_case_data['initial_evidence_clarity']
        ))
        conn.commit()
        conn.close()
        
        # ส่งข้อมูลชุดที่บันทึกลง DB กลับไป
        return jsonify(new_case_data), 201
    except Exception as e:
        app.logger.error(f"Prediction failed: {e}")
        return jsonify({"error": "Prediction failed due to server error."}), 500
    
    #     new_case = {'id': str(uuid.uuid4()),'timestamp': datetime.datetime.now().isoformat(),'priority_score': float(priority_score),**data}
    #     # db_add_case(new_case)
    #     new_case_id = str(uuid.uuid4())
    #     new_case_data = {
    #         'id': new_case_id,
    #         'timestamp': datetime.datetime.now().isoformat(),
    #         'priority_score': float(priority_score),
    #         **data
    #     }

    #     conn = sqlite3.connect('cyber_cases.db')
    #     cursor = conn.cursor()
    #     cursor.execute('''
    #         INSERT INTO cases (id, timestamp, priority_score, case_type, estimated_financial_damage, num_victims, reputational_damage_level, sensitive_data_compromised, ongoing_threat, risk_of_evidence_loss, technical_complexity_level, initial_evidence_clarity)
    #         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    #     ''', (
    #         new_case_data['id'], new_case_data['timestamp'], new_case_data['priority_score'], new_case_data['case_type'],
    #         new_case_data['estimated_financial_damage'], new_case_data['num_victims'], new_case_data['reputational_damage_level'],
    #         new_case_data['sensitive_data_compromised'], new_case_data['ongoing_threat'], new_case_data['risk_of_evidence_loss'],
    #         new_case_data['technical_complexity_level'], new_case_data['initial_evidence_clarity']
    #     ))
    #     conn.commit()
    #     conn.close()
    #     return jsonify(new_case), 201
    # except Exception as e:
    #     app.logger.error(f"Prediction failed: {e}")
    #     return jsonify({"error": "Prediction failed due to server error."}), 500

# @app.route('/cases', methods=['GET'])
# def get_ranked_cases():
#     sorted_cases = db_get_all_cases_sorted()
#     return jsonify(sorted_cases), 200

@app.route('/cases', methods=['GET'])
def get_ranked_cases():
    conn = sqlite3.connect('cyber_cases.db')
    conn.row_factory = sqlite3.Row # ทำให้เข้าถึงข้อมูลแบบ dict ได้
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM cases ORDER BY priority_score DESC")
    cases_from_db = cursor.fetchall()
    conn.close()

    # แปลงข้อมูลให้อยู่ในรูปแบบ list of dicts
    sorted_cases = [dict(row) for row in cases_from_db]
    return jsonify(sorted_cases), 200

@app.route('/retrain_model', methods=['POST'])
def retrain_model():
    global ml_model_pipeline
    try:
        # 1. ดึงข้อมูลทั้งหมดจากฐานข้อมูล
        conn = sqlite3.connect('cyber_cases.db')
        # ใช้ pandas อ่านข้อมูลจาก SQL query โดยตรง
        df_train = pd.read_sql_query("SELECT * FROM cases", conn)
        conn.close()

        # ตรวจสอบว่ามีข้อมูลเพียงพอหรือไม่
        if len(df_train) < 10: # กำหนดขั้นต่ำ เช่น 10 cases
            return jsonify({"error": "Not enough data to retrain model."}), 400

        # 2. เทรนโมเดล (นำโค้ดจากฟังก์ชัน train_ml_model เดิมมาปรับใช้)
        # ... (ส่วนของ Preprocessor และ Pipeline) ...

        X_train = df_train[CATEGORICAL_FEATURES + ORDINAL_FEATURES + NUMERICAL_FEATURES + BINARY_FEATURES]
        y_train = df_train[TARGET_COLUMN]

        ml_model_pipeline.fit(X_train, y_train)

        # 3. บันทึกโมเดลที่เทรนใหม่
        save_model(ml_model_pipeline, app.config['MODEL_PATH'])

        return jsonify({"message": "Model retrained successfully."}), 200

    except Exception as e:
        app.logger.error(f"Model retraining failed: {e}")
        return jsonify({"error": "Model retraining failed."}), 500
    
@app.route('/cases/<string:case_id>', methods=['DELETE'])
def delete_case(case_id):
    try:
        conn = sqlite3.connect('cyber_cases.db')
        cursor = conn.cursor()

        # ตรวจสอบก่อนว่า case_id ที่ต้องการลบมีอยู่จริงหรือไม่
        cursor.execute("SELECT id FROM cases WHERE id = ?", (case_id,))
        case_to_delete = cursor.fetchone()

        # ถ้าไม่พบ case_id นั้นในฐานข้อมูล
        if case_to_delete is None:
            conn.close()
            return jsonify({"error": "Case not found"}), 404

        # ถ้าพบ ให้ทำการลบ
        cursor.execute("DELETE FROM cases WHERE id = ?", (case_id,))
        conn.commit()
        conn.close()
        
        return jsonify({"message": f"Case with ID {case_id} was deleted successfully."}), 200

    except Exception as e:
        app.logger.error(f"Failed to delete case {case_id}: {e}")
        return jsonify({"error": "Failed to delete case due to a server error."}), 500

# --- Frontend HTML (No changes needed here) ---
HTML_TEMPLATE = """
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Cyber Case Prioritizer (ML-Powered)</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;margin:20px;background-color:#f0f2f5;color:#333}.container{background-color:#fff;padding:25px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.1);max-width:1200px;margin:auto}h1,h2{color:#0056b3}form div{margin-bottom:15px}label{display:block;margin-bottom:5px;font-weight:600;font-size:.9em}input[type=text],input[type=number],select{width:100%;box-sizing:border-box;padding:10px;border:1px solid #ccc;border-radius:4px;transition:border-color .2s}input:focus,select:focus{border-color:#007bff;outline:0}.checkbox-group label{display:inline-block;margin-left:5px;font-weight:400}button{background-image:linear-gradient(to right,#007bff,#0056b3);color:#fff;padding:12px 20px;border:none;border-radius:4px;cursor:pointer;font-size:16px;font-weight:700;transition:opacity .2s}button:hover{opacity:.9}button:disabled{background:#aaa;cursor:not-allowed}table{width:100%;border-collapse:collapse;margin-top:25px;font-size:.9em}th,td{border:1px solid #ddd;padding:10px;text-align:left}th{background-color:#f8f9fa;font-weight:600}.loading{font-style:italic;color:#666}.notification{position:fixed;top:20px;right:20px;background-color:#28a745;color:#fff;padding:15px;border-radius:5px;box-shadow:0 0 10px rgba(0,0,0,.2);z-index:1000;display:none}.notification.error{background-color:#dc3545}</style></head><body><div class="container"><h1>Cyber Case Prioritizer (ML-Powered)</h1><p>This system uses a machine learning model to automatically assign a priority score to incoming cybercrime cases, helping teams focus on the most critical issues first.</p><h2>Add New Case</h2><form id="caseForm"><div><label for="case_type">Case Type:</label><select id="case_type" name="case_type" required><option value="Phishing">Phishing</option><option value="Scam">Scam</option><option value="Hacking">Hacking</option><option value="Cyberbullying">Cyberbullying</option><option value="Illegal Content">Illegal Content</option><option value="Other">Other</option></select></div><div><label for="estimated_financial_damage">Estimated Financial Damage (฿):</label><input type="number" id="estimated_financial_damage" name="estimated_financial_damage" value="0" min="0" required></div><div><label for="num_victims">Number of Victims:</label><input type="number" id="num_victims" name="num_victims" value="1" min="1" required></div><div><label for="reputational_damage_level">Reputational Damage Level:</label><select id="reputational_damage_level" name="reputational_damage_level" required><option value="None">None</option><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Critical">Critical</option></select></div><div class="checkbox-group"><input type="checkbox" id="sensitive_data_compromised" name="sensitive_data_compromised"><label for="sensitive_data_compromised">Sensitive Data Compromised</label></div><div class="checkbox-group"><input type="checkbox" id="ongoing_threat" name="ongoing_threat"><label for="ongoing_threat">Ongoing Threat</label></div><div class="checkbox-group"><input type="checkbox" id="risk_of_evidence_loss" name="risk_of_evidence_loss"><label for="risk_of_evidence_loss">Risk of Evidence Loss</label></div><div><label for="technical_complexity_level">Technical Complexity Level:</label><select id="technical_complexity_level" name="technical_complexity_level" required><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Very High">Very High</option><option value="Extreme">Extreme</option></select></div><div><label for="initial_evidence_clarity">Initial Evidence Clarity:</label><select id="initial_evidence_clarity" name="initial_evidence_clarity" required><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Very High">Very High</option></select></div><button type="submit" id="submitButton">Rank Case</button></form><h2>Ranked Cases</h2><p class="loading" id="loadingMessage">Loading cases...</p><table id="casesTable"><thead><tr><th>Rank</th><th>ID</th><th>Timestamp</th><th>Type</th><th>Damage (฿)</th><th>Victims</th><th>Rep. Damage</th><th>Sensitive Data</th><th>Ongoing Threat</th><th>Evidence Risk</th><th>Tech. Comp.</th><th>Evid. Clarity</th><th>Priority Score</th></tr></thead><tbody></tbody></table></div><div id="notification" class="notification"></div><script>const caseForm=document.getElementById("caseForm"),casesTableBody=document.querySelector("#casesTable tbody"),loadingMessage=document.getElementById("loadingMessage"),submitButton=document.getElementById("submitButton"),notification=document.getElementById("notification");function showNotification(e,t=!1){notification.textContent=e,notification.className="notification",t&&notification.classList.add("error"),notification.style.display="block",setTimeout(()=>{notification.style.display="none"},4e3)}async function fetchCases(){loadingMessage.style.display="block";try{const e=await fetch("/cases"),t=await e.json();if(casesTableBody.innerHTML="",0===t.length)casesTableBody.innerHTML='<tr><td colspan="13">No cases to display yet. Add a new case above.</td></tr>';else for(const[a,n]of t.entries()){const e=casesTableBody.insertRow();e.innerHTML=`\n                            <td>${a+1}</td>\n                            <td>${n.id.substring(0,8)}...</td>\n                            <td>${new Date(n.timestamp).toLocaleString()}</td>\n                            <td>${n.case_type}</td>\n                            <td>${n.estimated_financial_damage.toLocaleString()}</td>\n                            <td>${n.num_victims}</td>\n                            <td>${n.reputational_damage_level}</td>\n                            <td>${n.sensitive_data_compromised?"Yes":"No"}</td>\n                            <td>${n.ongoing_threat?"Yes":"No"}</td>\n                            <td>${n.risk_of_evidence_loss?"Yes":"No"}</td>\n                            <td>${n.technical_complexity_level}</td>\n                            <td>${n.initial_evidence_clarity}</td>\n                            <td><strong>${n.priority_score.toFixed(2)}</strong></td>\n                        `}}catch(e){console.error("Error fetching cases:",e),casesTableBody.innerHTML='<tr><td colspan="13" style="color: red;">Error loading cases. Please try again.</td></tr>'}finally{loadingMessage.style.display="none"}}caseForm.addEventListener("submit",async e=>{e.preventDefault(),submitButton.disabled=!0,submitButton.textContent="Ranking...";const t={case_type:document.getElementById("case_type").value,estimated_financial_damage:parseFloat(document.getElementById("estimated_financial_damage").value),num_victims:parseInt(document.getElementById("num_victims").value),reputational_damage_level:document.getElementById("reputational_damage_level").value,sensitive_data_compromised:document.getElementById("sensitive_data_compromised").checked,ongoing_threat:document.getElementById("ongoing_threat").checked,risk_of_evidence_loss:document.getElementById("risk_of_evidence_loss").checked,technical_complexity_level:document.getElementById("technical_complexity_level").value,initial_evidence_clarity:document.getElementById("initial_evidence_clarity").value};try{const e=await fetch("/rank_case",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)});if(!e.ok){const t=await e.json();throw new Error(t.error||"An unknown error occurred.")}const a=await e.json();showNotification(`Case added with Priority Score: ${a.priority_score.toFixed(2)}`),caseForm.reset(),fetchCases()}catch(e){console.error("Error ranking case:",e),showNotification("Failed to rank case: "+e.message,!0)}finally{submitButton.disabled=!1,submitButton.textContent="Rank Case"}}),fetchCases();</script></body></html>
"""
@app.route('/')
def index():
    return render_template_string(HTML_TEMPLATE)

# --- Application Startup ---
def initialize_app(app):
    global ml_model_pipeline
    model_path = app.config['MODEL_PATH']
    ml_model_pipeline = load_model(model_path)
    if ml_model_pipeline is None:
        ml_model_pipeline = train_ml_model()
        save_model(ml_model_pipeline, model_path)

if __name__ == '__main__':
    initialize_app(app)
    # Running on port 5001 to avoid conflicts
    app.run(debug=app.config['DEBUG'], port=5001)
