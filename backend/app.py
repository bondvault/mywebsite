from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import uuid
import datetime
import json
import os
import csv
import io

app = Flask(__name__)

# --- PRODUCTION SECURITY CONFIG ---
# 1. Get Frontend URL from Environment (Default to * for dev, but restrict in prod)
FRONTEND_URL = os.environ.get("FRONTEND_URL", "*")
CORS(app, resources={r"/api/*": {"origins": FRONTEND_URL}})

# 2. Get Admin Password from Environment (Critical for Render Free Tier)
# If not set in Render, it defaults to 'admin123' (Insecure fallback)
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
ADMIN_HASH = generate_password_hash(ADMIN_PASSWORD)

# --- MOCK DATABASE ---
DATA_FILE = "bondvault_data.json"

def load_data():
    # On Render Free Tier, this file resets on every deploy/restart.
    # For permanent storage, connect a real database (PostgreSQL).
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r') as f:
                return json.load(f)
        except:
            pass
    return {"bonds": [], "messages": []}

def save_data():
    with open(DATA_FILE, 'w') as f:
        json.dump({"bonds": bonds_db, "messages": messages_db}, f, indent=2)

db_initial = load_data()
bonds_db = db_initial.get('bonds', [])
messages_db = db_initial.get('messages', [])

# --- SECURITY HEADERS ---
@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    return response

# --- RESTORE SAMPLE DATA (If Database is Empty) ---
if not bonds_db:
    print("Database empty. Restoring sample data...")
    bonds_db = [
        {
            "id": "sample-1",
            "issuer_name": "Power Finance Corporation (PFC)",
            "isin": "INE134E07654",
            "credit_rating": "CRISIL AAA",
            "coupon_rate_pct": "7.50%",
            "face_value_inr": "1000",
            "tenor": "5 Years",
            "instrument_type": "NCD",
            "payment_frequency": "Annual",
            "redemption_date": "15-Apr-2030",
            "issuance_mode": "Public Issue",
            "issue_category": "Retail",
            "issue_size_inr": "500 Cr",
            "allotment_date": "15-Apr-2020",
            "issuer_ownership_type": "PSU"
        }
    ]
    save_data()

# --- AUTHENTICATION ---
@app.route('/api/admin/verify', methods=['GET'])
def verify_admin():
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({"error": "Missing Token"}), 401
    
    # Frontend sends "Bearer base64(key)"
    try:
        token_type, token = auth_header.split()
        import base64
        decoded_key = base64.b64decode(token).decode('utf-8')
        
        if check_password_hash(ADMIN_HASH, decoded_key):
            return jsonify({"status": "authorized"}), 200
        else:
            return jsonify({"error": "Invalid Key"}), 403
    except Exception as e:
        return jsonify({"error": "Token Error"}), 401

@app.route('/api/admin/password', methods=['POST'])
def change_password():
    # Disabled on ephemeral file systems to prevent lockout
    return jsonify({"error": "To change password, update the ADMIN_PASSWORD environment variable in your Render Dashboard."}), 400

@app.route('/api/admin/reset', methods=['POST'])
def reset_data():
    # This requires sending the password explicitly in the body for double safety
    data = request.json
    password = data.get('password')
    
    if not password or not check_password_hash(ADMIN_HASH, password):
        return jsonify({"error": "Invalid Password"}), 403

    global bonds_db, messages_db
    bonds_db = []
    messages_db = []
    save_data()
    return jsonify({"message": "All Data Erased"}), 200

# --- BOND ROUTES ---
@app.route('/api/bonds', methods=['GET'])
def get_bonds():
    search = request.args.get('search', '').lower()
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 50))
    except ValueError:
        page = 1
        limit = 50
    
    # 1. Filter
    if search:
        filtered = [b for b in bonds_db if search in b.get('issuer_name', '').lower() or search in b.get('isin', '').lower()]
    else:
        filtered = bonds_db

    # 2. Sort (Newest First) & Paginate
    filtered_reversed = filtered[::-1]
    
    start = (page - 1) * limit
    end = start + limit
    paginated_data = filtered_reversed[start:end]
    
    return jsonify(paginated_data), 200

@app.route('/api/bonds', methods=['POST'])
def create_bond():
    data = request.json
    data['id'] = str(uuid.uuid4())
    bonds_db.append(data)
    save_data()
    return jsonify({"message": "Bond Created", "id": data['id']}), 201

@app.route('/api/bonds/<bond_id>', methods=['PUT'])
def update_bond(bond_id):
    data = request.json
    for bond in bonds_db:
        if bond['id'] == bond_id:
            bond.update(data)
            save_data()
            return jsonify({"message": "Bond Updated"}), 200
    return jsonify({"error": "Bond not found"}), 404

@app.route('/api/bonds/<bond_id>', methods=['DELETE'])
def delete_bond(bond_id):
    global bonds_db
    bonds_db = [b for b in bonds_db if b['id'] != bond_id]
    save_data()
    return jsonify({"message": "Bond Deleted"}), 200

@app.route('/api/bonds/upload', methods=['POST'])
def upload_csv():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    try:
        # Read the CSV file
        stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
        csv_input = csv.DictReader(stream)
        
        count = 0
        for row in csv_input:
            # Clean whitespace and add ID
            data = {k.strip(): v.strip() for k, v in row.items() if k}
            if 'id' not in data or not data['id']:
                data['id'] = str(uuid.uuid4())
            
            bonds_db.append(data)
            count += 1
            
        save_data()
        return jsonify({"message": f"Success! Imported {count} records."}), 200
    except Exception as e:
        return jsonify({"error": f"CSV Error: {str(e)}"}), 500

@app.route('/api/bonds/export', methods=['GET'])
def export_bonds():
    if not bonds_db:
        return jsonify({"error": "No data"}), 404
    
    si = io.StringIO()
    # Get all keys from the first bond, or a default set
    keys = bonds_db[0].keys()
    cw = csv.DictWriter(si, fieldnames=keys)
    cw.writeheader()
    cw.writerows(bonds_db)
    
    output = make_response(si.getvalue())
    output.headers["Content-Disposition"] = "attachment; filename=bondvault_backup.csv"
    output.headers["Content-type"] = "text/csv"
    return output

# --- ADMIN UTILS ---
@app.route('/api/health', methods=['GET'])
def health_check():
    print(f"Health check ping at {datetime.datetime.now()}", flush=True)
    return jsonify({"status": "online"}), 200

@app.route('/api/admin/stats', methods=['GET'])
def get_stats():
    return jsonify({"bond_count": len(bonds_db)}), 200

@app.route('/api/admin/messages', methods=['GET'])
def get_messages():
    return jsonify(messages_db), 200

@app.route('/api/admin/messages/<msg_id>', methods=['DELETE'])
def delete_message(msg_id):
    global messages_db
    messages_db = [m for m in messages_db if m['id'] != msg_id]
    save_data()
    return jsonify({"message": "Message Deleted"}), 200

@app.route('/api/admin/messages/export', methods=['GET'])
def export_messages():
    if not messages_db:
        return jsonify({"error": "No messages"}), 404
    
    si = io.StringIO()
    keys = messages_db[0].keys()
    cw = csv.DictWriter(si, fieldnames=keys)
    cw.writeheader()
    cw.writerows(messages_db)
    
    output = make_response(si.getvalue())
    output.headers["Content-Disposition"] = "attachment; filename=inquiries.csv"
    output.headers["Content-type"] = "text/csv"
    return output

@app.route('/api/contact', methods=['POST'])
def contact_form():
    data = request.json
    data['id'] = str(uuid.uuid4())
    data['timestamp'] = datetime.datetime.now().isoformat()
    messages_db.append(data)
    save_data()
    return jsonify({"message": "Message Received"}), 200

# --- RUN SERVER ---
if __name__ == '__main__':
    # This runs the server on Port 5000
    print("Starting BondVault API on http://127.0.0.1:5000")
    app.run(debug=False, port=5000)