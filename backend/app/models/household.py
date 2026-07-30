from datetime import datetime, timezone
from app import db


class Household(db.Model):
    __tablename__ = "households"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)          # e.g. "Reddy Family"
    created_by = db.Column(db.Integer, db.ForeignKey("customers.id"), nullable=False)
    invite_code = db.Column(db.String(20), unique=True)       # shareable join code
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # relationships
    members = db.relationship("HouseholdMember", backref="household", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "invite_code": self.invite_code,
            "created_at": self.created_at.isoformat(),
        }


class HouseholdMember(db.Model):
    __tablename__ = "household_members"

    id = db.Column(db.Integer, primary_key=True)
    household_id = db.Column(db.Integer, db.ForeignKey("households.id"), nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey("customers.id"), nullable=False)
    role = db.Column(db.String(20), default="member")         # head | member
    joined_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "household_id": self.household_id,
            "customer_id": self.customer_id,
            "role": self.role,
            "joined_at": self.joined_at.isoformat(),
        }
