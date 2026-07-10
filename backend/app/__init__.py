from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
import os
from backend.app.config.config import Config

db = SQLAlchemy()
migrate = Migrate()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    os.makedirs(app.instance_path, exist_ok=True)
    os.makedirs(os.path.join(app.config.get('BASEDIR', os.path.dirname(app.instance_path)), app.config['UPLOAD_FOLDER']), exist_ok=True)

    db.init_app(app)
    migrate.init_app(app, db)
    CORS(app)

    with app.app_context():
        # Import and register blueprints
        from backend.app.models import models
        from backend.app.routes import main_routes, conversation_routes, provider_routes, workflow_routes, inspector_routes
        app.register_blueprint(main_routes.bp)
        app.register_blueprint(conversation_routes.bp)
        app.register_blueprint(provider_routes.bp)
        app.register_blueprint(workflow_routes.bp)
        app.register_blueprint(inspector_routes.bp)
        db.create_all()

    return app
