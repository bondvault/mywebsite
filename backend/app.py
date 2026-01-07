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
CORS(app, resources={r"/api/*": {"origins": "*"}})

ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
ADMIN_HASH = generate_password_hash(ADMIN_PASSWORD)
DATA_FILE = "bond_data.json"

# ===============================
# DATA LOADING (FIXED FOR LIST)
# ===============================
def load_data():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r") as f:
                data = json.load(f)
                # Agar file seedha list hai [{}, {}]
                if isinstance(data, list):
                    return {"bonds": data, "messages": []}
                # Agar file dictionary hai {"bonds": []}
                return data
        except:
            pass
    return {"bonds": [], "messages": []}

def save_data():
    with open(DATA_FILE, "w") as f:
        json.dump({"bonds": bonds_db, "messages": messages_db}, f, indent=2)

db = load_data()
bonds_db = db.get("bonds", [])
messages_db = db.get("messages", [])

# --- Baaki ka code waisa hi rahega ---

@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "online"}), 200

@app.route("/api/admin/verify", methods=["GET"])
def verify_admin():
    auth = request.headers.get("Authorization")
    if not auth: return jsonify({"error": "Missing Token"}), 401
    try:
        parts = auth.split()
        token = parts[1] if len(parts) > 1 else parts[0]
        decoded = base64.b64decode(token).decode("utf-8")
        if check_password_hash(ADMIN_HASH, decoded) or decoded == ADMIN_PASSWORD:
            return jsonify({"status": "authorized"}), 200
        return jsonify({"error": "Invalid Key"}), 403
    except:
        return jsonify({"error": "Token Error"}), 401

@app.route("/api/bonds", methods=["GET"])
def get_bonds():
    search = request.args.get("search", "").lower()
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 50))
    filtered = bonds_db
    if search:
        filtered = [b for b in bonds_db if search in str(b.get("issuer_name", "")).lower()]
    start = (page - 1) * limit
    end = start + limit
    return jsonify(filtered[start:end]), 200

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
                    
