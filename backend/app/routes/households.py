"""
Household (Family Group) Routes
-------------------------------
GET  /api/households/mine   - current customer's household + members
POST /api/households        - create a new household (becomes head)
POST /api/households/join   - join an existing household via invite code
POST /api/households/leave  - leave the current household
"""

import secrets
import string

from flask import Blueprint, request, jsonify
from app import db
from app.models.customer import Customer
from app.models.household import Household, HouseholdMember
from app.utils.auth import login_required

households_bp = Blueprint("households", __name__)

INVITE_ALPHABET = string.ascii_uppercase + string.digits


def _new_invite_code():
    for _ in range(20):
        code = "".join(secrets.choice(INVITE_ALPHABET) for _ in range(6))
        if not Household.query.filter_by(invite_code=code).first():
            return code
    raise RuntimeError("Could not generate a unique invite code.")


def _household_payload(household):
    members = (
        db.session.query(Customer, HouseholdMember)
        .join(HouseholdMember, HouseholdMember.customer_id == Customer.id)
        .filter(HouseholdMember.household_id == household.id)
        .all()
    )
    return {
        "id": household.id,
        "name": household.name,
        "invite_code": household.invite_code,
        "created_at": household.created_at.isoformat() if household.created_at else None,
        "members": [
            {
                "customer_id": c.id,
                "name": c.name,
                "phone": c.phone,
                "email": c.email,
                "role": m.role,
                "joined_at": m.joined_at.isoformat() if m.joined_at else None,
            }
            for c, m in members
        ],
    }


@households_bp.route("/mine", methods=["GET"])
@login_required
def my_household(customer):
    if not customer.household_id:
        return jsonify({"household": None}), 200

    household = Household.query.get(customer.household_id)
    if not household:
        return jsonify({"household": None}), 200

    return jsonify({"household": _household_payload(household)}), 200


@households_bp.route("", methods=["POST"])
@login_required
def create_household(customer):
    if customer.household_id:
        return jsonify({"error": "You are already in a family group."}), 409

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Give your group a name."}), 400

    household = Household(
        name=name,
        created_by=customer.id,
        invite_code=_new_invite_code(),
    )
    db.session.add(household)
    db.session.flush()

    db.session.add(HouseholdMember(
        household_id=household.id,
        customer_id=customer.id,
        role="head",
    ))

    customer.household_id = household.id
    db.session.commit()

    return jsonify({
        "message": "Family group created.",
        "household": _household_payload(household),
    }), 201


@households_bp.route("/join", methods=["POST"])
@login_required
def join_household(customer):
    if customer.household_id:
        return jsonify({"error": "You are already in a family group."}), 409

    data = request.get_json(silent=True) or {}
    invite_code = (data.get("invite_code") or "").strip().upper()
    if not invite_code:
        return jsonify({"error": "Enter the invite code."}), 400

    household = Household.query.filter_by(invite_code=invite_code).first()
    if not household:
        return jsonify({"error": "Invalid invite code."}), 404

    existing = HouseholdMember.query.filter_by(
        household_id=household.id, customer_id=customer.id
    ).first()
    if existing:
        return jsonify({"error": "You are already a member of this group."}), 409

    db.session.add(HouseholdMember(
        household_id=household.id,
        customer_id=customer.id,
        role="member",
    ))
    customer.household_id = household.id
    db.session.commit()

    return jsonify({
        "message": f"You joined {household.name}.",
        "household": _household_payload(household),
    }), 200


@households_bp.route("/leave", methods=["POST"])
@login_required
def leave_household(customer):
    if not customer.household_id:
        return jsonify({"error": "You are not in a family group."}), 400

    household_id = customer.household_id
    HouseholdMember.query.filter_by(
        household_id=household_id, customer_id=customer.id
    ).delete()
    customer.household_id = None
    db.session.commit()

    return jsonify({"message": "You left the family group."}), 200
