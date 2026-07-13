import os
from dotenv import load_dotenv

load_dotenv()

# -----------------------------------------------------------------------
# BASEDIR resolution — works in both local and Docker setups
# -----------------------------------------------------------------------
# In Docker: WORKDIR=/app, run.py is at /app/run.py
#   → config.py is at /app/app/config/config.py
#   → project root should be /app
# Locally: project root is ByteBuddy/
#   → config.py is at ByteBuddy/backend/app/config/config.py
#   → three levels up = ByteBuddy/backend/ (which is where run.py runs from)
#
# We use an env var DATABASE_URL for explicit path control in Docker.
# -----------------------------------------------------------------------

# Directory where run.py lives (backend/ locally, /app in Docker)
_this_file = os.path.abspath(__file__)                         # .../config/config.py
_config_dir = os.path.dirname(_this_file)                      # .../config/
_app_dir = os.path.dirname(_config_dir)                        # .../app/
BASEDIR = os.path.dirname(_app_dir)                            # backend/ locally, /app in Docker


def get_database_uri():
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        # Default: instance/bytebuddy.db relative to BASEDIR
        db_path = os.path.join(BASEDIR, 'instance', 'bytebuddy.db')
        return 'sqlite:///' + db_path

    sqlite_prefix = 'sqlite:///'
    if database_url.startswith(sqlite_prefix) and not database_url.startswith('sqlite:////'):
        db_path = database_url[len(sqlite_prefix):]
        if db_path != ':memory:' and not os.path.isabs(db_path):
            return sqlite_prefix + os.path.join(BASEDIR, db_path)

    return database_url


class Config:
    basedir = BASEDIR
    SQLALCHEMY_DATABASE_URI = get_database_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-key-bytebuddy')
    OLLAMA_BASE_URL = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')
    OLLAMA_MODEL = os.getenv('OLLAMA_MODEL')
    OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')
    OPENROUTER_MODEL = os.getenv('OPENROUTER_MODEL', 'google/gemini-2.0-flash-001')
    UPLOAD_FOLDER = 'uploads'
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB
