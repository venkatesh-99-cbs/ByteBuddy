from flask import Flask, jsonify, render_template, request

from backend.chat_service import ChatService
from backend.config import load_environment, load_settings
from backend.errors import ConfigurationError, ProviderError
from backend.groq_client import GroqChatClient

load_environment()

app = Flask(__name__)
settings = load_settings()
chat_service = ChatService(settings, GroqChatClient(settings))


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    user_message = (data.get("message") or "").strip()
    mode = (data.get("mode") or "code").strip().lower()
    history = data.get("history") or []

    if not user_message:
        return jsonify({"error": "Please enter a project or coding request."}), 400

    try:
        reply = chat_service.generate_reply(mode, history, user_message)
        return jsonify({"reply": reply})
    except ConfigurationError as exc:
        return jsonify({"error": str(exc)}), 500
    except ProviderError as exc:
        app.logger.warning("Groq API request failed with status %s: %s", exc.status_code, exc.details)
        return jsonify({"error": exc.user_message, "details": exc.details}), exc.status_code
    except Exception as exc:
        app.logger.exception("Error generating response")
        return jsonify(
            {
                "error": (
                    "I hit a problem while generating the build plan. Please try again "
                    "with a clearer app or website request."
                ),
                "details": str(exc),
            }
        ), 500


if __name__ == "__main__":
    app.run(debug=True, use_reloader=False)
