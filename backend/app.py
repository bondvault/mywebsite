from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import check_password_hash
import json
import os
import base64

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ===============================
# CONFIG (DO NOT REHASH PASSWORD)
# ===============================

# SET THIS IN RENDER ENVIRONMENT
# ADMIN_PASSWORD=your_secret_key
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")

DATA_FILE = "bond_data.json"

# ===============================
# DATA LOADING
# ===============================

def load_data():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r") as f:
                data = json.load(f)
                if isinstance(data, list):
                    return data
                if isinstance(data, dict) and "bonds" in data:
                    return data["bonds"]
        except:
            pass
    return []

bonds_db = load_data()

# ===============================
# HEALTH CHECK
# ===============================

@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "message": "✅ BondVault Backend is LIVE",
        "bonds": "/api/bonds",
        "health": "/api/health"
    }), 200

# ===============================
# ADMIN VERIFY (FIXED)
# ===============================

@app.route("/api/admin/verify", methods=["GET"])
def verify_admin():
    auth = request.headers.get("Authorization")

    if not auth:
        return jsonify({"error": "Missing Authorization"}), 401

    try:
        # Frontend sends: Bearer base64(password)
        token = auth.replace("Bearer", "").strip()
        decoded = base64.b64decode(token).decode("utf-8")

        if decoded == ADMIN_PASSWORD:
            return jsonify({"status": "authorized"}), 200

        return jsonify({"error": "Invalid Key"}), 403

    except Exception as e:
        return jsonify({"error": "Token Error"}), 401

# ===============================
# GET BONDS
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
        ]

    start = (page - 1) * limit
    end = start + limit

    return jsonify(filtered[start:end]), 200

# ===============================
# RUN
# ===============================

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
