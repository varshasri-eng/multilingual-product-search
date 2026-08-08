from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS

db = SQLAlchemy()
migrate = Migrate()


def create_app():
    app = Flask(__name__)
    app.config.from_object("app.config.Config")

    db.init_app(app)
    migrate.init_app(app, db)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # import models so Flask-Migrate sees them
    with app.app_context():
        from app.models import (          # noqa: F401
            Customer, Address, CustomerAddress,
            Household, HouseholdMember,
            Session, OTPVerification,
            Category, Product, DeliveryZone,
            SiteSettings,
        )
        from app.models.order import Order, OrderItem  # noqa: F401

    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.customers import customers_bp
    from app.routes.admin import admin_bp
    from app.routes.staff import staff_bp
    from app.routes.products import products_bp
    from app.routes.orders import orders_bp
    from app.routes.households import households_bp
    from app.routes.settings import settings_bp

    app.register_blueprint(auth_bp,       url_prefix="/api/auth")
    app.register_blueprint(customers_bp,  url_prefix="/api/customers")
    app.register_blueprint(admin_bp,      url_prefix="/api/admin")
    app.register_blueprint(staff_bp,      url_prefix="/api/staff")
    app.register_blueprint(products_bp,   url_prefix="/api/products")
    app.register_blueprint(orders_bp,     url_prefix="/api/orders")
    app.register_blueprint(households_bp, url_prefix="/api/households")
    app.register_blueprint(settings_bp,   url_prefix="/api/settings")

    # create missing tables + seed the catalog (idempotent)
    with app.app_context():
        from app.utils.bootstrap import init_db
        init_db()

    # health check
    @app.route("/api/health")
    def health():
        return {"status": "ok", "service": "store2home-backend"}

    return app
