import jwt
import os
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask import request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from db import query

# In production this MUST be a long random secret set via environment
# variable, not the fallback default — the fallback exists only so
# local dev doesn't crash if SECRET_KEY isn't set.
SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-insecure-secret-change-me")
TOKEN_EXPIRY_HOURS = 24 * 7  # 1 week


def create_token(customer_id, email):
    payload = {
        "customer_id": customer_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRY_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")


def decode_token(token):
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def require_auth(f):
    """Decorator for routes that need a logged-in customer.
    Reads 'Authorization: Bearer <token>', attaches the decoded
    payload to request.customer, or returns 401 if missing/invalid."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "missing or invalid Authorization header"}), 401

        token = auth_header.split(" ", 1)[1]
        payload = decode_token(token)
        if payload is None:
            return jsonify({"error": "invalid or expired token"}), 401

        request.customer = payload
        return f(*args, **kwargs)
    return wrapper


def register(name, email, password, phone=None):
    existing = query("SELECT customer_id FROM customers WHERE email = %s", (email,), fetchone=True)
    if existing:
        return None, "email already registered"

    password_hash = generate_password_hash(password)
    row = query(
        """INSERT INTO customers (name, email, password_hash, phone)
           VALUES (%s, %s, %s, %s)
           RETURNING customer_id, name, email, phone""",
        (name, email, password_hash, phone),
        fetchone=True,
    )
    token = create_token(row["customer_id"], row["email"])
    return {"token": token, "customer": row}, None


def login(email, password):
    row = query(
        "SELECT customer_id, name, email, phone, password_hash FROM customers WHERE email = %s",
        (email,),
        fetchone=True,
    )
    if row is None or not check_password_hash(row["password_hash"], password):
        return None, "invalid email or password"

    token = create_token(row["customer_id"], row["email"])
    customer = {k: v for k, v in row.items() if k != "password_hash"}
    return {"token": token, "customer": customer}, None