import os
from dotenv import load_dotenv

load_dotenv()

BASEDIR = os.path.abspath(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))

def get_database_uri():
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        return 'sqlite:///' + os.path.join(BASEDIR, 'instance', 'bytebuddy.db')

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
    UPLOAD_FOLDER = 'backend/uploads'
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB
