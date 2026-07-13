from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
import os
from datetime import datetime, timezone
from app.config.config import Config

db = SQLAlchemy()
migrate = Migrate()


def utc_isoformat(dt: datetime) -> str:
    """Return a timezone-aware ISO 8601 string (always UTC).

    Handles naive datetimes (assumed UTC) and aware datetimes alike.
    Output always ends with '+00:00' so the browser parses as UTC.
    """
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    os.makedirs(app.instance_path, exist_ok=True)
    upload_dir = os.path.join(
        app.config.get('BASEDIR', os.path.dirname(app.instance_path)),
        app.config['UPLOAD_FOLDER']
    )
    os.makedirs(upload_dir, exist_ok=True)

    db.init_app(app)
    migrate.init_app(app, db)
    CORS(app)

    with app.app_context():
        # Import and register blueprints
        from app.models import models
        from app.routes import main_routes, conversation_routes, provider_routes, workflow_routes, inspector_routes
        app.register_blueprint(main_routes.bp)
        app.register_blueprint(conversation_routes.bp)
        app.register_blueprint(provider_routes.bp)
        app.register_blueprint(workflow_routes.bp)
        app.register_blueprint(inspector_routes.bp)
        db.create_all()

    return app
