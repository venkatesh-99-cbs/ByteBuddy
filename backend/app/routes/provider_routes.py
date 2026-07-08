from flask import Blueprint, request, jsonify
from backend.app.services.chat_service import ChatService

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
             from backend.app.providers.openrouter import OpenRouterProvider
             provider = OpenRouterProvider(data['api_key'])
        else:
             provider = chat_service.get_provider(name)

        success = provider.test_connection()
        return jsonify({"success": success}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 200
