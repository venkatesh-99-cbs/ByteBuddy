import os

from flask import Flask, jsonify, render_template, request
import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted
from google.generativeai.types import answer_types

try:
    from dotenv import load_dotenv
except ImportError:
    def load_dotenv():
        return False

app = Flask(__name__)
load_dotenv()

SYSTEM_INSTRUCTION = """
You are denama-jeevtham, an expert AI builder for software projects.

Your role:
- Help with software creation: websites, web apps, mobile apps, games, tools, bots,
  automations, APIs, dashboards, SaaS products, and coding workflows.
- Give direct, practical answers that help the user build fast.
- For build requests, prefer this flow:
  1. Briefly confirm the project idea.
  2. Give the fastest realistic plan.
  3. Give implementation steps in order.
  4. If useful, include starter code or file structure.
- Keep responses clear and readable in markdown.
- Use short headings, bullet lists, numbered steps, and code blocks when helpful.
- Do not add decorative separators like --- unless they are truly necessary.
- If the request is unrelated to software creation, reply briefly that you focus on building software projects.
- Do not claim perfect accuracy. State assumptions or risks when needed.
- When you provide a complete or mostly complete project, always end with a short
  'How to Use' or 'How to Run' section in very simple language.
- The 'How to Use' section should be beginner-friendly and include only the essential
  steps such as install dependencies, run the app, open the browser, or test the script.
"""

MODE_INSTRUCTIONS = {
    "plan": (
        "Focus on planning. Break the project into goals, architecture, milestones, "
        "file structure, risks, and next steps. Keep code minimal unless the user asks."
    ),
    "code": (
        "Focus on implementation. When the user wants a complete project, generate it "
        "section by section. Start with a short overview, then show the file structure, "
        "then provide files one by one using markdown headings like '## File: path' "
        "followed by fenced code blocks. Prefer complete, copyable files. End completed "
        "projects with a simple 'How to Use' section."
    ),
    "fix": (
        "Focus on debugging and repairs. Explain the root cause briefly, then give the "
        "exact code changes or replacement files needed to fix the issue."
    ),
    "refactor": (
        "Focus on improving structure, readability, maintainability, and performance "
        "without changing behavior unless the user asks."
    ),
}

MAX_HISTORY_MESSAGES = 12
MAX_CONTINUATIONS = 3
MAX_OUTPUT_TOKENS = 4096
model = None


def configure_model():
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return None

    genai.configure(api_key=api_key)
    return genai.GenerativeModel(
        "gemini-2.5-flash",
        system_instruction=SYSTEM_INSTRUCTION,
    )


def get_model():
    global model
    if model is None:
        model = configure_model()
    return model


def extract_response_text(response):
    text = getattr(response, "text", "") or ""
    text = text.strip()
    if text:
        return text

    candidates = getattr(response, "candidates", None) or []
    for candidate in candidates:
        content = getattr(candidate, "content", None)
        parts = getattr(content, "parts", None) or []
        collected = []
        for part in parts:
            part_text = getattr(part, "text", "")
            if part_text:
                collected.append(part_text)
        combined = "\n".join(collected).strip()
        if combined:
            return combined

    return (
        "I could not create a complete answer for that request. Try rephrasing the app "
        "or website idea with the target users, core features, and preferred stack."
    )


def get_finish_reason(response):
    candidates = getattr(response, "candidates", None) or []
    if not candidates:
        return None
    return getattr(candidates[0], "finish_reason", None)


def needs_continuation(response):
    return get_finish_reason(response) == answer_types.FinishReason.MAX_TOKENS


def sanitize_history(history):
    if not isinstance(history, list):
        return []

    cleaned = []
    for item in history[-MAX_HISTORY_MESSAGES:]:
        if not isinstance(item, dict):
            continue

        role = item.get("role")
        content = (item.get("content") or "").strip()
        if role not in {"user", "assistant"} or not content:
            continue

        cleaned.append(
            {
                "role": "user" if role == "user" else "model",
                "parts": [{"text": content}],
            }
        )

    return cleaned


def build_contents(mode, history, user_message):
    selected_mode = mode if mode in MODE_INSTRUCTIONS else "code"
    contents = [
        {
            "role": "user",
            "parts": [
                {
                    "text": (
                        f"Active mode: {selected_mode}\n"
                        f"Mode instructions: {MODE_INSTRUCTIONS[selected_mode]}"
                    )
                }
            ],
        },
        {
            "role": "model",
            "parts": [{"text": f"I will respond in {selected_mode} mode."}],
        },
    ]
    contents.extend(sanitize_history(history))
    contents.append({"role": "user", "parts": [{"text": user_message}]})
    return contents


def continue_contents(previous_contents, partial_response):
    updated = list(previous_contents)
    updated.append({"role": "model", "parts": [{"text": partial_response}]})
    updated.append(
        {
            "role": "user",
            "parts": [
                {
                    "text": (
                        "Continue exactly from where you stopped. Do not restart, do not "
                        "repeat earlier sections, and finish any incomplete file or code block."
                    )
                }
            ],
        }
    )
    return updated


def generate_complete_response(active_model, mode, history, user_message):
    contents = build_contents(mode, history, user_message)
    chunks = []

    for _ in range(MAX_CONTINUATIONS + 1):
        response = active_model.generate_content(
            contents,
            generation_config={
                "temperature": 0.35,
                "top_p": 0.9,
                "max_output_tokens": MAX_OUTPUT_TOKENS,
            },
        )

        text = extract_response_text(response).strip()
        if text:
            chunks.append(text)

        if not needs_continuation(response):
            break

        contents = continue_contents(contents, text)

    return "\n\n".join(chunk for chunk in chunks if chunk).strip()


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

    active_model = get_model()
    if active_model is None:
        return jsonify(
            {
                "error": (
                    "Missing Gemini API key. Set GEMINI_API_KEY or GOOGLE_API_KEY in "
                    "your environment and restart the Flask app."
                )
            }
        ), 500

    try:
        reply = generate_complete_response(active_model, mode, history, user_message)
        return jsonify({"reply": reply})
    except ResourceExhausted as exc:
        app.logger.warning("Gemini quota exceeded: %s", exc)
        return jsonify(
            {
                "error": (
                    "The Gemini API quota is exhausted right now. Wait a little and try "
                    "again, or switch to an API key/project with available quota."
                ),
                "details": str(exc),
            }
        ), 429
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
