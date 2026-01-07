from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import uuid
import datetime
import json
import os
import csv
import io
import base64

app = Flask(__name__)

# ===============================
# CORS CONFIG (PRODUCTION SAFE)
# ===============================
FRONTEND_URL = os.environ.get("FRONTEND_URL", "*")
CORS(app, resources={r"/api/*": {"origins": FRONTEND_URL}})

# ===============================
# ADMIN SECURITY
# ===============================
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
ADMIN_HASH = generate_password_hash(ADMIN_PASSWORD)

# ===============================
# DATA STORAGE (TEMP on Render)
# ===============================
DATA_FILE = "bondvault_data.json"

def load_data():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r") as f:
                return json.load(f)
        except:
            pass
    return {"bonds": [], "messages": []}

def save_data():
    with open(DATA_FILE, "w") as f:
        json.dump(
            {"bonds": bonds_db, "messages": messages_db},
            f,
            indent=2
        )

db = load_data()
bonds_db = db.get("bonds", [])
messages_db = db.get("messages", [])

# ===============================
# SECURITY HEADERS
# ===============================
@app.after_request
def add_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# ===============================
# ROOT ROUTE (FIX 404 ❗)
# ===============================
@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "✅ BondVault Backend is LIVE",
        "health": "/api/health",
        "bonds": "/api/bonds"
    }), 200

# ===============================
# HEALTH CHECK
# ===============================
@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "online"}), 200

# ===============================
# AUTH
# ===============================
@app.route("/api/admin/verify", methods=["GET"])
def verify_admin():
    auth = request.headers.get("Authorization")
    if not auth:
        return jsonify({"error": "Missing Token"}), 401

    try:
        _, token = auth.split()
        decoded = base64.b64decode(token).decode("utf-8")

        if check_password_hash(ADMIN_HASH, decoded):
            return jsonify({"status": "authorized"}), 200
        return jsonify({"error": "Invalid Key"}), 403
    except:
        return jsonify({"error": "Token Error"}), 401

# ===============================
# BONDS CRUD
# ===============================
@app.route("/api/bonds", methods=["GET"])
def get_bonds():
    search = request.args.get("search", "").lower()
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 50))

    filtered = bonds_db
    if search:
        filtered = [
            b for b in bonds_db
            if search in b.get("issuer_name", "").lower()
            or search in b.get("isin", "").lower()
        ]

    filtered = filtered[::-1]
    start = (page - 1) * limit
    end = start + limit

    return jsonify(filtered[start:end]), 200

@app.route("/api/bonds", methods=["POST"])
def create_bond():
    data = request.json
    data["id"] = str(uuid.uuid4())
    bonds_db.append(data)
    save_data()
    return jsonify({"message": "Bond Created"}), 201

@app.route("/api/bonds/<bond_id>", methods=["PUT"])
def update_bond(bond_id):
    for bond in bonds_db:
        if bond["id"] == bond_id:
            bond.update(request.json)
            save_data()
            return jsonify({"message": "Bond Updated"}), 200
    return jsonify({"error": "Not Found"}), 404

@app.route("/api/bonds/<bond_id>", methods=["DELETE"])
def delete_bond(bond_id):
    global bonds_db
    bonds_db = [b for b in bonds_db if b["id"] != bond_id]
    save_data()
    return jsonify({"message": "Bond Deleted"}), 200

# ===============================
# CSV UPLOAD / EXPORT
# ===============================
@app.route("/api/bonds/upload", methods=["POST"])
def upload_csv():
    if "file" not in request.files:
        return jsonify({"error": "No file"}), 400

    stream = io.StringIO(
        request.files["file"].stream.read().decode("UTF8"),
        newline=None
    )

    reader = csv.DictReader(stream)
    count = 0

    for row in reader:
        row["id"] = row.get("id") or str(uuid.uuid4())
        bonds_db.append(row)
        count += 1

    save_data()
    return jsonify({"message": f"{count} records imported"}), 200

@app.route("/api/bonds/export", methods=["GET"])
def export_bonds():
    if not bonds_db:
        return jsonify({"error": "No data"}), 404

    si = io.StringIO()
    writer = csv.DictWriter(si, fieldnames=bonds_db[0].keys())
    writer.writeheader()
    writer.writerows(bonds_db)

    output = make_response(si.getvalue())
    output.headers["Content-Disposition"] = "attachment; filename=bonds.csv"
    output.headers["Content-Type"] = "text/csv"
    return output

# ===============================
# CONTACT FORM
# ===============================
@app.route("/api/contact", methods=["POST"])
def contact():
    data = request.json
    data["id"] = str(uuid.uuid4())
    data["timestamp"] = datetime.datetime.now().isoformat()
    messages_db.append(data)
    save_data()
    return jsonify({"message": "Message received"}), 200

# ===============================
# RENDER SERVER START (CRITICAL FIX ❗)
# ===============================
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"🚀 Server running on port {port}")
    app.run(host="0.0.0.0", port=port)
