from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from backend.app.config.config import Config

db = SQLAlchemy()
migrate = Migrate()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    migrate.init_app(app, db)
    CORS(app)

    with app.app_context():
        # Import and register blueprints
        from backend.app.routes import main_routes, conversation_routes, provider_routes
        app.register_blueprint(main_routes.bp)
        app.register_blueprint(conversation_routes.bp)
        app.register_blueprint(provider_routes.bp)

    return app
