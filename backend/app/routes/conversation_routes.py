from flask import Blueprint, request, jsonify
from backend.app.services.chat_service import ChatService
from backend.app.repositories.conversation_repository import ConversationRepository
from backend.app import db
from flask import Blueprint, request, jsonify
from backend.app.services.chat_service import ChatService
from backend.app.repositories.conversation_repository import ConversationRepository
from backend.app import db
from backend.app.models.models import ConversationSettings

bp = Blueprint('conversations', __name__, url_prefix='/api')
chat_service = ChatService()
repo = ConversationRepository()

@bp.route('/conversations', methods=['POST'])
def create_conversation():
    data = request.json or {}
    title = data.get('title', 'New Conversation')
    workflow_stage = data.get('workflow_stage', 'planning')
    conv = repo.create(title, workflow_stage=workflow_stage)
    return jsonify({
        "id": conv.id,
        "title": conv.title,
        "created_at": conv.created_at.isoformat()
    }), 201

@bp.route('/conversations', methods=['GET'])
def get_conversations():
    conversations = repo.get_all()
    return jsonify([{
        "id": c.id,
        "title": c.title,
        "summary": c.summary,
        "created_at": c.created_at.isoformat(),
        "updated_at": c.updated_at.isoformat()
    } for c in conversations]), 200

@bp.route('/conversations/<int:conv_id>', methods=['DELETE'])
def delete_conversation(conv_id):
    success = repo.delete(conv_id)
    return jsonify({"success": success}), 200 if success else 404

@bp.route('/conversations/<int:conv_id>', methods=['PATCH'])
def rename_conversation(conv_id):
    data = request.json or {}
    title = data.get('title')
    if not title:
        return jsonify({"error": "Title is required"}), 400
    conv = repo.update_title(conv_id, title)
    return jsonify({"id": conv.id, "title": conv.title}) if conv else (jsonify({"error": "Not found"}), 404)

@bp.route('/conversations/<int:conv_id>/messages', methods=['POST'])
def send_message(conv_id):
    display_content = None
    if request.content_type and request.content_type.startswith('multipart/form-data'):
        content = (request.form.get('content') or '').strip()
        display_content = content
        files = request.files.getlist('files')
        attachment_context = _build_attachment_context(files)
        if attachment_context:
            content = f"{content}\n\n{attachment_context}".strip()
            display_content = _build_display_attachment_summary(display_content, files)
    else:
        data = request.json or {}
        content = (data.get('content') or '').strip()

    if not content:
        return jsonify({"error": "Content is required"}), 400
    try:
        msg = chat_service.send_message(conv_id, content, display_content=display_content)
        return jsonify({
            "id": msg.id,
            "conversation_id": msg.conversation_id,
            "role": msg.role,
            "content": msg.content,
            "is_pinned": msg.is_pinned,
            "suggestions": msg.suggestions,
            "workflow_stage": msg.workflow_stage,
            "created_at": msg.created_at.isoformat()
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def _build_attachment_context(files):
    if not files:
        return ""

    parts = ["## User attachments"]
    max_text_bytes = 250_000
    max_total_chars = 24_000
    total_chars = 0

    for file in files[:8]:
        filename = file.filename or "attachment"
        mimetype = file.mimetype or "application/octet-stream"
        raw = file.read()
        size = len(raw)

        if mimetype.startswith("image/"):
            parts.append(
                f"\n### Image: {filename}\n"
                f"- Type: {mimetype}\n"
                f"- Size: {size} bytes\n"
                "- Note: The current backend records image metadata for context. "
                "If visual analysis is needed, ask the user to describe the image or enable a vision-capable provider payload."
            )
            continue

        if size > max_text_bytes:
            parts.append(
                f"\n### File: {filename}\n"
                f"- Type: {mimetype}\n"
                f"- Size: {size} bytes\n"
                "- Content omitted because the file is too large for chat context."
            )
            continue

        text = raw.decode("utf-8", errors="replace")
        remaining = max_total_chars - total_chars
        if remaining <= 0:
            parts.append(f"\n### File: {filename}\n- Content omitted because attachment context limit was reached.")
            continue

        snippet = text[:remaining]
        total_chars += len(snippet)
        parts.append(
            f"\n### File: {filename}\n"
            f"- Type: {mimetype}\n"
            f"- Size: {size} bytes\n\n"
            "```text\n"
            f"{snippet}\n"
            "```"
        )

    return "\n".join(parts)


def _build_display_attachment_summary(content, files):
    names = [file.filename or "attachment" for file in files[:8]]
    attachment_lines = "\n".join(f"- {name}" for name in names)
    label = "Attached file" if len(names) == 1 else "Attached files"
    summary = f"{content or 'Please review the attached files.'}\n\n{label}:\n{attachment_lines}"
    return summary.strip()

@bp.route('/conversations/<int:conv_id>/messages', methods=['GET'])
def get_messages(conv_id):
    messages = repo.get_messages(conv_id)
    return jsonify([{
        "id": m.id,
        "conversation_id": m.conversation_id,
        "role": m.role,
        "content": m.content,
        "is_pinned": m.is_pinned,
        "suggestions": m.suggestions,
        "workflow_stage": m.workflow_stage,
        "created_at": m.created_at.isoformat()
    } for m in messages]), 200

@bp.route('/conversations/<int:conv_id>/messages/<int:msg_id>/regenerate', methods=['POST'])
def regenerate_message(conv_id, msg_id):
    try:
        msg = chat_service.regenerate_message(conv_id, msg_id)
        return jsonify({
            "id": msg.id,
            "conversation_id": msg.conversation_id,
            "role": msg.role,
            "content": msg.content,
            "is_pinned": msg.is_pinned,
            "suggestions": msg.suggestions,
            "created_at": msg.created_at.isoformat()
        }), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route('/messages/<int:msg_id>/pin', methods=['POST'])
def pin_message(msg_id):
    data = request.json or {}
    pin = data.get('pin', True)
    msg = repo.pin_message(msg_id, pin)
    return jsonify({"id": msg.id, "is_pinned": msg.is_pinned}) if msg else (jsonify({"error": "Not found"}), 404)

@bp.route('/conversations/pinned', methods=['GET'])
def get_pinned_messages():
    messages = repo.get_pinned_messages()
    return jsonify([{
        "id": m.id,
        "conversation_id": m.conversation_id,
        "content": m.content,
        "created_at": m.created_at.isoformat()
    } for m in messages]), 200

@bp.route('/conversations/<int:conv_id>/summary', methods=['POST'])
def generate_summary(conv_id):
    summary = chat_service.generate_summary(conv_id)
    return jsonify({"summary": summary}) if summary else (jsonify({"error": "Failed to generate summary"}), 500)

@bp.route('/conversations/<int:conv_id>/settings', methods=['GET', 'PATCH'])
def conversation_settings(conv_id):
    conv = repo.get_by_id(conv_id)
    if not conv: return jsonify({"error": "Not found"}), 404

    if request.method == 'PATCH':
        data = request.json or {}
        settings = conv.settings
        if 'provider' in data: settings.provider = data['provider']
        if 'model' in data: settings.model = data['model']
        if 'temperature' in data: settings.temperature = data['temperature']
        if 'max_tokens' in data: settings.max_tokens = data['max_tokens']
        if 'workflow_mode' in data: settings.workflow_mode = data['workflow_mode']
        db.session.commit()

    return jsonify({
        "provider": conv.settings.provider,
        "model": conv.settings.model,
        "temperature": conv.settings.temperature,
        "max_tokens": conv.settings.max_tokens,
        "workflow_mode": conv.settings.workflow_mode
    }), 200
