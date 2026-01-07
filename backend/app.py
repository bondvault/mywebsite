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

# ================= CONFIG =================

ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
DATA_FILE = "bond_data.json"

# ===============================
# DATA LOADING (FIXED FOR LIST)
# ===============================

def load_data():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r") as f:
                data = json.load(f)
                if isinstance(data, list):
                    return {"bonds": data, "messages": []}
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

# ================= HEALTH =================

@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "online"}), 200

# ================= ADMIN VERIFY (FIXED) =================

@app.route("/api/admin/verify", methods=["GET"])
def verify_admin():
    auth = request.headers.get("Authorization")
    if not auth:
        return jsonify({"error": "Missing Token"}), 401

    try:
        token = auth.replace("Bearer ", "")
        decoded = base64.b64decode(token).decode("utf-8")

        # ✅ DIRECT PASSWORD MATCH (STABLE)
        if decoded == ADMIN_PASSWORD:
            return jsonify({"status": "authorized"}), 200

        return jsonify({"error": "Invalid Key"}), 403

    except Exception:
        return jsonify({"error": "Token Error"}), 401

# ================= BONDS =================

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
        ]

    start = (page - 1) * limit
    end = start + limit
    return jsonify(filtered[start:end]), 200

# ================= RUN =================

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
