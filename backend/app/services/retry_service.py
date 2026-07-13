"""Service for handling failed message retries with persistence and analytics."""
import json
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from app.repositories.conversation_repository import ConversationRepository
from app import db


class RetryService:
    """Manages retry logic for failed AI responses."""

    MAX_RETRIES = 2  # Maximum automatic retries before allowing only manual retries

    def __init__(self):
        self.repo = ConversationRepository()

    def mark_response_failed(
        self,
        message_id: int,
        error_message: str,
        retry_context: Dict[str, Any]
    ) -> None:
        """
        Mark an assistant message as failed and store retry context.
        
        Args:
            message_id: ID of the failed message
            error_message: Error description
            retry_context: Context needed to retry (provider, model, temperature, etc.)
        """
        msg = self.repo.get_message(message_id)
        if msg:
            msg.failed = True
            msg.error_message = error_message
            msg.failed_context = retry_context
            msg.retry_count = 0
            db.session.commit()

    def get_failed_message(self, message_id: int) -> Optional[Dict[str, Any]]:
        """
        Retrieve a failed message and its retry context.
        
        Args:
            message_id: ID of the message
            
        Returns:
            Dict with message details and retry context, or None
        """
        msg = self.repo.get_message(message_id)
        if not msg or not msg.failed:
            return None

        return {
            "id": msg.id,
            "content": msg.content,
            "error_message": msg.error_message,
            "retry_count": msg.retry_count,
            "can_retry": msg.retry_count < self.MAX_RETRIES,
            "max_retries_reached": msg.retry_count >= self.MAX_RETRIES,
            "context": msg.failed_context or {}
        }

    def increment_retry_count(self, message_id: int) -> int:
        """
        Increment the retry count for a message.
        
        Args:
            message_id: ID of the message
            
        Returns:
            The new retry count
        """
        msg = self.repo.get_message(message_id)
        if msg:
            msg.retry_count = (msg.retry_count or 0) + 1
            db.session.commit()
            return msg.retry_count
        return 0

    def mark_response_succeeded(self, message_id: int, content: str) -> None:
        """
        Mark a previously failed message as succeeded after retry.
        
        Args:
            message_id: ID of the message
            content: The successful response content
        """
        msg = self.repo.get_message(message_id)
        if msg:
            msg.failed = False
            msg.error_message = None
            msg.failed_context = None
            msg.content = content
            db.session.commit()

    def get_retry_context(self, message_id: int) -> Optional[Dict[str, Any]]:
        """
        Get the stored context for retrying a message.
        
        Args:
            message_id: ID of the message
            
        Returns:
            The retry context dict or None
        """
        msg = self.repo.get_message(message_id)
        if msg and msg.failed_context:
            return msg.failed_context
        return None

    def can_retry(self, message_id: int) -> bool:
        """
        Check if a message can be retried.
        
        Args:
            message_id: ID of the message
            
        Returns:
            True if message can be retried (within retry limit and is failed)
        """
        msg = self.repo.get_message(message_id)
        if not msg or not msg.failed:
            return False

        # Allow manual retries indefinitely, but show different UI
        return True

    def should_allow_automatic_retry(self, message_id: int) -> bool:
        """
        Check if a message should be automatically retried (before manual intervention).
        
        Args:
            message_id: ID of the message
            
        Returns:
            True if automatic retry should be attempted
        """
        msg = self.repo.get_message(message_id)
        if not msg or not msg.failed:
            return False

        return msg.retry_count < self.MAX_RETRIES

    def log_retry_analytics(
        self,
        message_id: int,
        failure_reason: str,
        provider: str,
        model: str,
        latency: float,
        retry_count: int,
        success: bool
    ) -> None:
        """
        Log analytics about a retry attempt (for future debugging and monitoring).
        
        This method can be extended to send analytics to a monitoring service.
        
        Args:
            message_id: ID of the failed message
            failure_reason: Why the response failed
            provider: AI provider used
            model: Model that was used
            latency: Response time in milliseconds
            retry_count: Current retry attempt number
            success: Whether the retry succeeded
        """
        # Future: Send to analytics service or log to monitoring system
        # For now, we just store the analytics in a structured way
        analytics = {
            "message_id": message_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "failure_reason": failure_reason,
            "provider": provider,
            "model": model,
            "latency_ms": latency,
            "retry_count": retry_count,
            "success": success
        }

        # This could be logged to a file, sent to a service, etc.
        # For now, we're just storing it in the failed_context
        msg = self.repo.get_message(message_id)
        if msg:
            if msg.failed_context is None:
                msg.failed_context = {}
            
            if "analytics" not in msg.failed_context:
                msg.failed_context["analytics"] = []
            
            msg.failed_context["analytics"].append(analytics)
            db.session.commit()

    def get_persistence_key(self, conversation_id: int, message_id: int) -> str:
        """
        Generate a persistence key for a failed message (for page refresh recovery).
        
        Args:
            conversation_id: ID of the conversation
            message_id: ID of the message
            
        Returns:
            A unique persistence key
        """
        return f"retry_{conversation_id}_{message_id}"

    def is_session_persistent(self, message_id: int) -> bool:
        """
        Check if a retry is still available after page refresh.
        
        Args:
            message_id: ID of the message
            
        Returns:
            True if the retry context is still valid
        """
        return self.get_retry_context(message_id) is not None

