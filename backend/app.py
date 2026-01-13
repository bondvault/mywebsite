from flask import Flask, request, jsonify
from flask_cors import CORS
import jwt
import datetime
import os
from functools import wraps

app = Flask(__name__)

# ==================================================
# REQUIRED ENVIRONMENT VARIABLES
# ==================================================
JWT_SECRET = os.environ.get("JWT_SECRET")
ADMIN_USER = os.environ.get("ADMIN_USER")
ADMIN_PASS = os.environ.get("ADMIN_PASS")

if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET environment variable is required")

if not ADMIN_USER or not ADMIN_PASS:
    raise RuntimeError("ADMIN_USER and ADMIN_PASS are required")

# ==================================================
# CORS (UNCHANGED BEHAVIOR)
# ==================================================
CORS(app)

# ==================================================
# JWT AUTH MIDDLEWARE (ADMIN ONLY)
# ==================================================
def token_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Unauthorized"}), 401

        token = auth_header.replace("Bearer ", "")

        try:
            decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])

            if decoded.get("role") != "admin":
                return jsonify({"error": "Forbidden"}), 403

        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401

        return fn(*args, **kwargs)
    return wrapper

# ==================================================
# ADMIN LOGIN API
# ==================================================
@app.route("/admin/login", methods=["POST"])
def admin_login():
    data = request.get_json() or {}

    username = data.get("username")
    password = data.get("password")

    if username != ADMIN_USER or password != ADMIN_PASS:
        return jsonify({"error": "Invalid credentials"}), 401

    token = jwt.encode(
        {
            "user": ADMIN_USER,
            "role": "admin",
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=8)
        },
        JWT_SECRET,
        algorithm="HS256"
    )

    return jsonify({"token": token})

# ==================================================
# PROTECTED ADMIN ROUTE
# ==================================================
@app.route("/admin/dashboard", methods=["GET"])
@token_required
def admin_dashboard():
    return jsonify({"message": "Admin authenticated successfully"})

# ==================================================
# APP RUN
# ==================================================
if __name__ == "__main__":
    app.run(debug=True)
