import os
import sys

# Add the backend directory itself to sys.path so all imports use 'app.*' consistently
BACKEND_DIR = os.path.abspath(os.path.dirname(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app import create_app

app = create_app()

if __name__ == "__main__":
    app.run(
        host=os.getenv("FLASK_RUN_HOST", "0.0.0.0"),
        port=int(os.getenv("FLASK_RUN_PORT", 5001)),
        debug=os.getenv("FLASK_DEBUG", "1") == "1",
    )

