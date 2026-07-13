"""Service for grouping conversations by relative time periods."""
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any
from backend.app.models.models import Conversation


class TimeGroupingService:
    """Groups conversations into intelligent time periods (Today, Yesterday, etc.)."""

    @staticmethod
    def get_time_category(dt: datetime) -> str:
        """
        Determine which time category a datetime falls into.
        
        Categories (in order):
        - Today
        - Yesterday
        - Previous 7 Days
        - Previous 30 Days
        - Older
        
        Args:
            dt: The datetime to categorize
            
        Returns:
            The category name
        """
        if not dt:
            return "Older"

        # Ensure dt is timezone-aware for proper comparison
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        
        now = datetime.now(timezone.utc)
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        dt_date = dt.replace(hour=0, minute=0, second=0, microsecond=0)
        
        days_ago = (today - dt_date).days

        if days_ago == 0:
            return "Today"
        elif days_ago == 1:
            return "Yesterday"
        elif days_ago <= 7:
            return "Previous 7 Days"
        elif days_ago <= 30:
            return "Previous 30 Days"
        else:
            return "Older"

    @staticmethod
    def format_relative_time(dt: datetime) -> str:
        """
        Format a datetime as a relative time string.
        
        Examples:
        - Just now
        - 2 min ago
        - 1 hour ago
        - Yesterday
        - 3 weeks ago
        
        Args:
            dt: The datetime to format
            
        Returns:
            A human-readable relative time string
        """
        if not dt:
            return "Unknown"

        # Ensure dt is timezone-aware
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)

        now = datetime.now(timezone.utc)
        diff = now - dt

        # Handle negative differences (future dates)
        if diff.total_seconds() < 0:
            return "Just now"

        seconds = int(diff.total_seconds())

        if seconds < 60:
            return "Just now"
        elif seconds < 3600:
            minutes = seconds // 60
            return f"{minutes} min ago" if minutes > 1 else "1 min ago"
        elif seconds < 86400:
            hours = seconds // 3600
            return f"{hours} hour ago" if hours == 1 else f"{hours} hours ago"
        elif seconds < 172800:  # 2 days
            return "Yesterday"
        elif seconds < 604800:  # 7 days
            days = seconds // 86400
            return f"{days} day ago" if days == 1 else f"{days} days ago"
        elif seconds < 2592000:  # 30 days
            weeks = seconds // 604800
            return f"{weeks} week ago" if weeks == 1 else f"{weeks} weeks ago"
        else:
            months = seconds // 2592000
            return f"{months} month ago" if months == 1 else f"{months} months ago"

    @staticmethod
    def group_conversations(conversations: List[Conversation]) -> Dict[str, List[Dict[str, Any]]]:
        """
        Group conversations by time category, maintaining sort order within each group.
        
        Conversations are sorted by last_message_at (descending) within each group.
        
        Args:
            conversations: List of Conversation objects
            
        Returns:
            Dictionary with category names as keys and sorted conversation lists as values
        """
        # Define category order
        category_order = [
            "Today",
            "Yesterday",
            "Previous 7 Days",
            "Previous 30 Days",
            "Older"
        ]

        # Initialize groups
        groups = {cat: [] for cat in category_order}

        # Group conversations
        for conv in conversations:
            # Use last_message_at if available, fall back to updated_at
            timestamp = conv.last_message_at or conv.updated_at or conv.created_at
            category = TimeGroupingService.get_time_category(timestamp)

            groups[category].append({
                "id": conv.id,
                "title": conv.title,
                "summary": conv.summary,
                "created_at": conv.created_at.isoformat() if conv.created_at else None,
                "updated_at": conv.updated_at.isoformat() if conv.updated_at else None,
                "last_message_at": conv.last_message_at.isoformat() if conv.last_message_at else None,
                "relative_time": TimeGroupingService.format_relative_time(timestamp),
                "title_ai_generated": conv.title_ai_generated
            })

        # Sort within each group by last_message_at (descending)
        for category in groups:
            groups[category].sort(
                key=lambda x: x["last_message_at"] or x["updated_at"] or x["created_at"],
                reverse=True
            )

        # Remove empty categories
        return {cat: convs for cat, convs in groups.items() if convs}

    @staticmethod
    def move_to_active(conversation_id: int) -> None:
        """
        Mark a conversation as recently active by updating last_message_at.
        
        This is called after each new message, which moves the conversation
        to the "Today" group and to the top of the list.
        
        Args:
            conversation_id: ID of the conversation
        """
        from backend.app import db
        from backend.app.repositories.conversation_repository import ConversationRepository

        repo = ConversationRepository()
        conv = repo.get_by_id(conversation_id)
        if conv:
            conv.last_message_at = datetime.utcnow()
            db.session.commit()
