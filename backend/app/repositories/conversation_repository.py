from typing import List, Optional
from datetime import datetime, timezone
from app import db
from app.models.models import (
    Conversation, Message, ConversationSettings,
    WorkflowState, WorkflowArtifact
)


class ConversationRepository:
    @staticmethod
    def create(title: str = "New Conversation", workflow_stage: str = 'planning') -> Conversation:
        conv = Conversation(title=title)
        db.session.add(conv)
        db.session.commit()
        # Initialize default settings
        settings = ConversationSettings(conversation_id=conv.id, workflow_mode=workflow_stage)
        db.session.add(settings)
        # Initialize workflow state
        workflow = WorkflowState(conversation_id=conv.id, current_stage=workflow_stage)
        db.session.add(workflow)
        db.session.commit()
        return conv

    @staticmethod
    def get_all() -> List[Conversation]:
        return Conversation.query.order_by(Conversation.updated_at.desc()).all()

    @staticmethod
    def get_by_id(conv_id: int) -> Optional[Conversation]:
        return Conversation.query.get(conv_id)

    @staticmethod
    def delete(conv_id: int) -> bool:
        conv = Conversation.query.get(conv_id)
        if conv:
            db.session.delete(conv)
            db.session.commit()
            return True
        return False

    @staticmethod
    def update_title(conv_id: int, title: str) -> Optional[Conversation]:
        conv = Conversation.query.get(conv_id)
        if conv:
            conv.title = title
            conv.title_ai_generated = True
            db.session.commit()
        return conv

    @staticmethod
    def add_message(conv_id: int, role: str, content: str,
                    suggestions: Optional[List[str]] = None,
                    workflow_stage: Optional[str] = None) -> Message:
        now = datetime.now(timezone.utc)
        msg = Message(
            conversation_id=conv_id,
            role=role,
            content=content,
            suggestions=suggestions,
            workflow_stage=workflow_stage,
        )
        db.session.add(msg)
        # Update conversation timestamps — both updated_at and last_message_at
        conv = Conversation.query.get(conv_id)
        if conv:
            conv.updated_at = now
            conv.last_message_at = now
        db.session.commit()
        return msg

    @staticmethod
    def get_message(message_id: int) -> Optional[Message]:
        return Message.query.get(message_id)

    @staticmethod
    def delete_message(message_id: int) -> bool:
        msg = Message.query.get(message_id)
        if msg:
            db.session.delete(msg)
            db.session.commit()
            return True
        return False

    @staticmethod
    def get_messages(conv_id: int) -> List[Message]:
        return Message.query.filter_by(conversation_id=conv_id).order_by(Message.created_at.asc()).all()

    @staticmethod
    def pin_message(message_id: int, pin: bool = True) -> Optional[Message]:
        msg = Message.query.get(message_id)
        if msg:
            msg.is_pinned = pin
            db.session.commit()
        return msg

    @staticmethod
    def get_pinned_messages() -> List[Message]:
        return Message.query.filter_by(is_pinned=True).order_by(Message.created_at.desc()).all()
