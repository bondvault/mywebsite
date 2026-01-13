import os
import sqlite3
import jwt
import datetime
from functools import wraps
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)

# ================= CONFIG =================

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret")
ADMIN_USER = os.environ.get("ADMIN_USER", "admin")
ADMIN_PASS = os.environ.get("ADMIN_PASS", "password")

# Allow frontend access (local + Netlify)
CORS(app, resources={r"/api/*": {"origins": "*"}})

DB_FILE = "bonds.db"

# ================= DATABASE =================

def get_db():
    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    db = get_db()
    db.execute("""
        CREATE TABLE IF NOT EXISTS bonds (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            issuer_name TEXT,
            isin TEXT
        )
    """)
    db.commit()

init_db()

# ================= AUTH =================

def token_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        if not token:
            return jsonify({"error": "Token missing"}), 401
        try:
            jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        return fn(*args, **kwargs)
    return wrapper

# ================= ROUTES =================

@app.route("/api/health")
def health():
    return jsonify({"status": "ok"})

@app.route("/api/admin/verify", methods=["POST"])
def verify_admin():
    data = request.json or {}

    if data.get("username") != ADMIN_USER or data.get("password") != ADMIN_PASS:
        return jsonify({"error": "Invalid credentials"}), 401

    token = jwt.encode(
        {
            "user": ADMIN_USER,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=2)
        },
        JWT_SECRET,
        algorithm="HS256"
    )

    return jsonify({"token": token})

@app.route("/api/bonds", methods=["GET"])
@token_required
def get_bonds():
    db = get_db()
    rows = db.execute("SELECT issuer_name, isin FROM bonds").fetchall()
    return jsonify([dict(r) for r in rows])

@app.route("/api/bonds", methods=["POST"])
@token_required
def add_bond():
    data = request.json or {}
    db = get_db()
    db.execute(
        "INSERT INTO bonds (issuer_name, isin) VALUES (?, ?)",
        (data.get("issuer_name"), data.get("isin"))
    )
    db.commit()
    return jsonify({"status": "added"})

# ================= RUN =================

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
