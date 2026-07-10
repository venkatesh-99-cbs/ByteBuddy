from flask import Blueprint, request, jsonify
from backend.app.repositories.workflow_repository import WorkflowRepository
from backend.app.services.workflow_service import WorkflowService
from backend.app.models.models import STAGE_META, WORKFLOW_STAGES

bp = Blueprint('workflow', __name__, url_prefix='/api')
repo = WorkflowRepository()
service = WorkflowService()


@bp.route('/workflow/stages', methods=['GET'])
def get_stages():
    """Return all workflow stage metadata."""
    return jsonify(service.get_stage_info()), 200


@bp.route('/conversations/<int:conv_id>/workflow', methods=['GET'])
def get_workflow(conv_id):
    """Get workflow state for a conversation."""
    state = repo.get_state(conv_id)
    if not state:
        return jsonify({"error": "Workflow state not found"}), 404
    return jsonify(state.to_dict()), 200


@bp.route('/conversations/<int:conv_id>/workflow', methods=['PATCH'])
def update_workflow(conv_id):
    """Update the active workflow stage."""
    data = request.json or {}
    stage = data.get('current_stage')
    if stage and stage not in WORKFLOW_STAGES:
        return jsonify({"error": f"Invalid stage: {stage}"}), 400

    state = repo.get_state(conv_id)
    if not state:
        return jsonify({"error": "Workflow state not found"}), 404

    if stage:
        state = repo.update_stage(conv_id, stage)

    if data.get('mark_complete'):
        completed_stage = data.get('mark_complete')
        if completed_stage in WORKFLOW_STAGES:
            state = repo.mark_stage_complete(conv_id, completed_stage)

    if data.get('project_name') is not None or data.get('tech_stack') is not None:
        state = repo.update_project_info(
            conv_id,
            project_name=data.get('project_name'),
            tech_stack=data.get('tech_stack'),
        )

    return jsonify(state.to_dict()), 200


@bp.route('/conversations/<int:conv_id>/workflow/complete-stage', methods=['POST'])
def complete_stage(conv_id):
    """Mark the current stage as complete and get next recommendation."""
    state = repo.get_state(conv_id)
    if not state:
        return jsonify({"error": "Workflow state not found"}), 404

    current = state.current_stage
    repo.mark_stage_complete(conv_id, current)

    recommendation = service.get_recommendation(current)
    state = repo.get_state(conv_id)

    return jsonify({
        "workflow": state.to_dict(),
        "recommendation": recommendation,
    }), 200


@bp.route('/conversations/<int:conv_id>/artifacts', methods=['GET'])
def get_artifacts(conv_id):
    """Get all artifacts for a conversation, optionally filtered by stage."""
    stage = request.args.get('stage')
    artifacts = repo.get_artifacts(conv_id, stage=stage)
    return jsonify([a.to_dict() for a in artifacts]), 200
