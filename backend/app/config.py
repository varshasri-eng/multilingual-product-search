import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "dev-secret-key")
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "postgresql://store2home:store2home_dev_2024@localhost:5433/store2home"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET = os.getenv("FLASK_SECRET_KEY", "dev-secret-key")
    OTP_EXPIRY_MINUTES = 10
    SESSION_EXPIRY_DAYS = 30
    RESET_TOKEN_EXPIRY_MINUTES = 60
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
