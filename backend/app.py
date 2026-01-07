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
# CORS CONFIG (FIXED FOR NETLIFY 🚀)
# ===============================
# Humne '*' allow kar diya hai taaki Netlify se connection block na ho
CORS(app, resources={r"/api/*": {"origins": "*"}}) 

# ===============================
# ADMIN SECURITY
# ===============================
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
ADMIN_HASH = generate_password_hash(ADMIN_PASSWORD)

# ===============================
# DATA STORAGE
# ===============================
DATA_FILE = "bond_data.json" # Aapne bataya tha file ka naam bond_data.json hai

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
# ROOT & HEALTH CHECK (No more "Connecting" stuck)
# ===============================
@app.route("/", methods=["GET"])
def home():
    return jsonify({"status": "live", "message": "BondVault API is running"}), 200

@app.route("/api/health", methods=["GET"])
def health_check():
    # Frontend ka admin.js isi ko check karke 'LIVE' dikhayega
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
        # Handling different token formats
        token = auth.split()[-1]
        decoded = base64.b64decode(token).decode("utf-8")

        # Basic check if password matches or hash matches
        if decoded == ADMIN_PASSWORD or check_password_hash(ADMIN_HASH, decoded):
            return jsonify({"status": "authorized"}), 200
        return jsonify({"error": "Invalid Key"}), 403
    except Exception as e:
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
            if search in str(b.get("issuer_name", "")).lower()
            or search in str(b.get("isin", "")).lower()
        ]

    filtered = filtered[::-1] # Newest first
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
        if str(bond.get("id")) == str(bond_id):
            bond.update(request.json)
            save_data()
            return jsonify({"message": "Bond Updated"}), 200
    return jsonify({"error": "Not Found"}), 404

@app.route("/api/bonds/<bond_id>", methods=["DELETE"])
def delete_bond(bond_id):
    global bonds_db
    bonds_db = [b for b in bonds_db if str(b.get("id")) != str(bond_id)]
    save_data()
    return jsonify({"message": "Bond Deleted"}), 200

# ===============================
# RENDER START
# ===============================
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
