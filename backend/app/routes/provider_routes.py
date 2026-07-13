from flask import Blueprint, request, jsonify
from app.services.chat_service import ChatService
from app.services.settings_service import SettingsService

bp = Blueprint('providers', __name__, url_prefix='/api/providers')
chat_service = ChatService()

@bp.route('/<name>/models', methods=['GET'])
def list_models(name):
    try:
        provider = chat_service.get_provider(name)
        models = provider.list_models()
        return jsonify(models), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route('/<name>/test', methods=['POST'])
def test_connection(name):
    try:
        # For testing, we might need to override the key if provided in request
        data = request.json or {}
        if name == 'openrouter' and 'api_key' in data:
             from app.providers.openrouter import OpenRouterProvider
             provider = OpenRouterProvider(data['api_key'])
        else:
             provider = chat_service.get_provider(name)

        success = provider.test_connection()
        return jsonify({"success": success}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 200

@bp.route('/openrouter/key/status', methods=['GET'])
def openrouter_key_status():
    return jsonify({"configured": SettingsService.has_openrouter_api_key()}), 200

@bp.route('/openrouter/key', methods=['POST'])
def save_openrouter_key():
    data = request.json or {}
    api_key = (data.get('api_key') or '').strip()
    if not api_key:
        return jsonify({"error": "OpenRouter API key is required"}), 400

    from app.providers.openrouter import OpenRouterProvider
    provider = OpenRouterProvider(api_key)
    if not provider.test_connection():
        return jsonify({"error": "OpenRouter rejected the API key"}), 400

    SettingsService.save_openrouter_api_key(api_key)
    return jsonify({"configured": True}), 200

