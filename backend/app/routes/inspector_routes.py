from flask import Blueprint, request, jsonify, current_app
from backend.app.services.inspector_service import InspectorService
from backend.app.services.chat_service import ChatService
from backend.app.repositories.inspection_repository import InspectionRepository

bp = Blueprint('inspector', __name__, url_prefix='/api')
inspector = InspectorService()
chat_service = ChatService()
repo = InspectionRepository()


@bp.route('/conversations/<int:conv_id>/inspect/upload', methods=['POST'])
def upload_files(conv_id):
    """Upload files for code inspection."""
    try:
        conv = chat_service.repo.get_by_id(conv_id)
        if not conv:
            return jsonify({"error": "Conversation not found"}), 404

        # Create or reuse report
        report = repo.get_report(conv_id)
        if not report or report.status == 'completed':
            report = repo.create_report(
                conversation_id=conv_id,
                ai_provider=conv.settings.provider,
                ai_model=conv.settings.model,
            )

        upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')

        files = request.files.getlist('files')
        zip_file = request.files.get('zip')

        processed = []
        if zip_file and zip_file.filename.endswith('.zip'):
            processed = inspector.process_zip(report.id, zip_file, upload_folder)
        elif files:
            processed = inspector.process_uploaded_files(report.id, files, upload_folder)

        return jsonify({
            "report_id": report.id,
            "files": processed,
            "total_files": len(processed),
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route('/conversations/<int:conv_id>/inspect/paste', methods=['POST'])
def paste_code(conv_id):
    """Submit pasted code for inspection."""
    try:
        conv = chat_service.repo.get_by_id(conv_id)
        if not conv:
            return jsonify({"error": "Conversation not found"}), 404

        data = request.json or {}
        code = data.get('code', '')
        filename = data.get('filename', 'pasted_code')
        language = data.get('language')

        if not code.strip():
            return jsonify({"error": "Code is required"}), 400

        report = repo.get_report(conv_id)
        if not report or report.status == 'completed':
            report = repo.create_report(
                conversation_id=conv_id,
                ai_provider=conv.settings.provider,
                ai_model=conv.settings.model,
            )

        result = inspector.process_pasted_code(report.id, code, filename, language)

        return jsonify({
            "report_id": report.id,
            "file": result,
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route('/conversations/<int:conv_id>/inspect/analyze', methods=['POST'])
def analyze(conv_id):
    """Trigger AI analysis on uploaded files."""
    try:
        conv = chat_service.repo.get_by_id(conv_id)
        if not conv:
            return jsonify({"error": "Conversation not found"}), 404

        report = repo.get_report(conv_id)
        if not report:
            return jsonify({"error": "No files uploaded yet"}), 400

        provider = chat_service.get_provider(conv.settings.provider)
        result = inspector.run_analysis(report.id, provider, conv.settings.model)

        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route('/conversations/<int:conv_id>/inspect/report', methods=['GET'])
def get_report(conv_id):
    """Get the latest inspection report."""
    report = repo.get_report(conv_id)
    if not report:
        return jsonify({"error": "No report found"}), 404

    result = report.to_dict()
    result['files'] = [f.to_dict() for f in report.files]
    result['findings'] = [f.to_dict() for f in report.findings]

    return jsonify(result), 200


@bp.route('/conversations/<int:conv_id>/inspect/files', methods=['GET'])
def get_files(conv_id):
    """Get uploaded files list."""
    report = repo.get_report(conv_id)
    if not report:
        return jsonify([]), 200
    return jsonify([f.to_dict() for f in report.files]), 200


@bp.route('/conversations/<int:conv_id>/inspect/files/<int:file_id>', methods=['GET'])
def get_file_content(conv_id, file_id):
    """Get file content by ID."""
    f = repo.get_file_by_id(file_id)
    if not f:
        return jsonify({"error": "File not found"}), 404
    return jsonify({
        **f.to_dict(),
        "content": f.content,
    }), 200


@bp.route('/conversations/<int:conv_id>/inspect/findings/<int:finding_id>/fix', methods=['POST'])
def generate_fix(conv_id, finding_id):
    """Generate an AI fix for a finding."""
    try:
        conv = chat_service.repo.get_by_id(conv_id)
        if not conv:
            return jsonify({"error": "Conversation not found"}), 404

        provider = chat_service.get_provider(conv.settings.provider)
        fix = inspector.generate_fix(finding_id, provider, conv.settings.model)

        return jsonify({"fix": fix}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route('/conversations/<int:conv_id>/inspect/findings/<int:finding_id>', methods=['PATCH'])
def update_finding(conv_id, finding_id):
    """Update finding status (resolved, ignored)."""
    data = request.json or {}
    status = data.get('status')
    if status not in ('open', 'resolved', 'ignored'):
        return jsonify({"error": "Invalid status"}), 400

    finding = repo.update_finding_status(finding_id, status)
    if not finding:
        return jsonify({"error": "Finding not found"}), 404

    return jsonify(finding.to_dict()), 200
