from typing import List, Optional
from backend.app import db
from backend.app.models.models import WorkflowState, WorkflowArtifact


class WorkflowRepository:
    @staticmethod
    def get_state(conversation_id: int) -> Optional[WorkflowState]:
        return WorkflowState.query.filter_by(conversation_id=conversation_id).first()

    @staticmethod
    def update_stage(conversation_id: int, stage: str) -> Optional[WorkflowState]:
        state = WorkflowState.query.filter_by(conversation_id=conversation_id).first()
        if state:
            state.current_stage = stage
            db.session.commit()
        return state

    @staticmethod
    def mark_stage_complete(conversation_id: int, stage: str) -> Optional[WorkflowState]:
        state = WorkflowState.query.filter_by(conversation_id=conversation_id).first()
        if state:
            state.mark_complete(stage)
            db.session.commit()
        return state

    @staticmethod
    def update_project_info(conversation_id: int, project_name: str = None,
                            tech_stack: str = None) -> Optional[WorkflowState]:
        state = WorkflowState.query.filter_by(conversation_id=conversation_id).first()
        if state:
            if project_name is not None:
                state.project_name = project_name
            if tech_stack is not None:
                state.tech_stack = tech_stack
            db.session.commit()
        return state

    @staticmethod
    def add_artifact(conversation_id: int, stage: str, artifact_type: str,
                     content: str, title: str = None) -> WorkflowArtifact:
        artifact = WorkflowArtifact(
            conversation_id=conversation_id,
            stage=stage,
            artifact_type=artifact_type,
            title=title,
            content=content,
        )
        db.session.add(artifact)
        db.session.commit()
        return artifact

    @staticmethod
    def get_artifacts(conversation_id: int, stage: str = None) -> List[WorkflowArtifact]:
        query = WorkflowArtifact.query.filter_by(conversation_id=conversation_id)
        if stage:
            query = query.filter_by(stage=stage)
        return query.order_by(WorkflowArtifact.created_at.asc()).all()

    @staticmethod
    def get_all_context(conversation_id: int) -> dict:
        """Build a complete context dict of all artifacts grouped by stage."""
        artifacts = WorkflowArtifact.query.filter_by(
            conversation_id=conversation_id
        ).order_by(WorkflowArtifact.created_at.asc()).all()

        context = {}
        for a in artifacts:
            if a.stage not in context:
                context[a.stage] = []
            context[a.stage].append({
                'type': a.artifact_type,
                'title': a.title,
                'content': a.content[:2000],  # Truncate for prompt context
            })
        return context
