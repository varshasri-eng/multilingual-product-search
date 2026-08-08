from datetime import datetime, timezone
from app import db


class SiteSettings(db.Model):
    """
    Single-row table storing site-wide branding & configuration.
    Accessed via GET /api/settings (public) and PUT /api/admin/settings (admin).
    """
    __tablename__ = "site_settings"

    id = db.Column(db.Integer, primary_key=True, default=1)

    # ── Identity ──────────────────────────────────────────
    site_name    = db.Column(db.String(100), default="Store2Home")
    tagline      = db.Column(db.String(255), default="Fresh groceries, delivered to your door")
    logo_url     = db.Column(db.Text, default=None)   # uploaded logo URL
    favicon_url  = db.Column(db.Text, default=None)   # favicon URL

    # ── Brand colors (hex) ────────────────────────────────
    primary_color   = db.Column(db.String(7), default="#e89208")  # brand-500
    secondary_color = db.Column(db.String(7), default="#1f2937")  # gray-800
    accent_color    = db.Column(db.String(7), default="#f59e0b")  # amber-500

    # ── Hero / Landing ────────────────────────────────────
    hero_title    = db.Column(db.String(255), default="Fresh groceries, delivered to your door")
    hero_subtitle = db.Column(db.String(500), default="Shop your favourite Indian groceries in your own language.")
    hero_cta      = db.Column(db.String(100), default="Start shopping")

    # ── Contact ───────────────────────────────────────────
    contact_email = db.Column(db.String(255), default=None)
    contact_phone = db.Column(db.String(30), default=None)
    address       = db.Column(db.Text, default=None)

    # ── Footer ────────────────────────────────────────────
    footer_text   = db.Column(db.String(500), default="© Store2Home. Fresh groceries, delivered.")

    # ── Social ────────────────────────────────────────────
    facebook_url  = db.Column(db.Text, default=None)
    instagram_url = db.Column(db.Text, default=None)
    twitter_url   = db.Column(db.Text, default=None)

    updated_at = db.Column(db.DateTime(timezone=True),
                           default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "site_name": self.site_name,
            "tagline": self.tagline,
            "logo_url": self.logo_url,
            "favicon_url": self.favicon_url,
            "primary_color": self.primary_color,
            "secondary_color": self.secondary_color,
            "accent_color": self.accent_color,
            "hero_title": self.hero_title,
            "hero_subtitle": self.hero_subtitle,
            "hero_cta": self.hero_cta,
            "contact_email": self.contact_email,
            "contact_phone": self.contact_phone,
            "address": self.address,
            "footer_text": self.footer_text,
            "facebook_url": self.facebook_url,
            "instagram_url": self.instagram_url,
            "twitter_url": self.twitter_url,
        }
