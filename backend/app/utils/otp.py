"""
OTP Utility — Phase 1 (Mock / Email)

Phase 1: Generate a 6-digit OTP, log it to console, optionally send via email.
Phase 2: Replace send_otp() with WhatsApp Business API or Twilio SMS.
"""

import random
import string
from datetime import datetime, timedelta, timezone
from app import db
from app.models.session import OTPVerification


def generate_otp(length=6):
    return "".join(random.choices(string.digits, k=length))


def create_otp(identifier: str, expiry_minutes: int = 10) -> str:
    """
    Create and store a new OTP for the given identifier (email or phone).
    Invalidates any previous unused OTPs for the same identifier.
    """
    # invalidate old OTPs
    OTPVerification.query.filter_by(
        identifier=identifier, is_used=False
    ).update({"is_used": True})
    db.session.commit()

    code = generate_otp()
    otp = OTPVerification(
        identifier=identifier,
        otp_code=code,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=expiry_minutes),
    )
    db.session.add(otp)
    db.session.commit()
    return code


def verify_otp(identifier: str, code: str) -> bool:
    """Verify the OTP. Returns True if valid, marks it as used."""
    otp = OTPVerification.query.filter_by(
        identifier=identifier,
        otp_code=code,
        is_used=False,
    ).order_by(OTPVerification.created_at.desc()).first()

    if not otp:
        return False
    if otp.expires_at < datetime.now(timezone.utc):
        return False

    otp.is_used = True
    db.session.commit()
    return True


def send_otp(identifier: str, code: str, channel: str = "email"):
    """
    Phase 1: Print OTP to console (mock).
    Phase 2: Integrate WhatsApp or SMS here.
    """
    print(f"\n{'='*40}", flush=True)
    print(f"  OTP for {identifier}: {code}", flush=True)
    print(f"  Channel: {channel} (mock — Phase 1)", flush=True)
    print(f"{'='*40}\n", flush=True)
    # TODO Phase 2: send via WhatsApp Business API or Twilio
