"""Service for generating AI-powered conversation titles."""
import re
from typing import Optional
from backend.app.repositories.conversation_repository import ConversationRepository
from backend.app import db


class TitleService:
    """Handles generation of conversation titles using the first message context."""

    def __init__(self):
        self.repo = ConversationRepository()

    def generate_title(self, user_msg: str, ai_msg: str) -> Optional[str]:
        """
        Generate a readable title from the user's first message without an extra AI call.
        
        This method extracts meaningful content from the user message to create a concise,
        professional title (3-6 words, max 80 chars) without punctuation or prefixes.
        
        Args:
            user_msg: The user's first message
            ai_msg: The AI's response (not used in this implementation but available for future use)
            
        Returns:
            A generated title (3-6 words) or None if generation fails
        """
        user_snippet = re.sub(r'\s+', ' ', (user_msg or '')[:240]).strip()
        if not user_snippet:
            return None

        # Extract first sentence/phrase
        sentences = re.split(r'[.!?\n]', user_snippet)
        first_phrase = sentences[0].strip() if sentences else ""
        
        # Remove markdown and special characters
        first_phrase = re.sub(r'[`*_#>\[\]{}()]+', '', first_phrase)
        
        # Remove URLs
        first_phrase = re.sub(r'\bhttps?://\S+', '', first_phrase).strip(' :-,')

        if first_phrase:
            words = first_phrase.split()
            # Filter out common question/filler words
            stop_words = {
                'what', 'how', 'why', 'when', 'where', 'can', 'you', 'help',
                'please', 'these', 'this', 'that', 'would', 'could', 'should',
                'does', 'is', 'are', 'be', 'have', 'has', 'do'
            }
            meaningful_words = [
                w for w in words 
                if len(w) > 2 and w.lower() not in stop_words
            ]

            if meaningful_words:
                # Limit to 6 words (with min 3 for safety)
                title = ' '.join(meaningful_words[:min(6, len(meaningful_words))]).strip(' :-,')
                
                # Enforce length constraints (3-80 chars)
                if 3 < len(title) <= 80:
                    return title[:1].upper() + title[1:]

        return None

    def generate_title_with_ai(self, user_msg: str, ai_msg: str, provider) -> Optional[str]:
        """
        Generate title using AI provider.
        
        This is an advanced version that calls the AI provider to generate a more
        semantically accurate title. Used as fallback if needed.
        
        Args:
            user_msg: User's first message
            ai_msg: AI's response
            provider: AI provider instance
            
        Returns:
            Generated title or None if AI call fails
        """
        prompt = (
            f"Generate a concise conversation title in 3-6 words based on this user request:\n\n"
            f"{user_msg}\n\n"
            f"Rules:\n"
            f"- Maximum 6 words\n"
            f"- No punctuation unless necessary\n"
            f"- No quotation marks\n"
            f"- Professional wording\n"
            f"- Summarize the main topic\n"
            f"- Return only the title, nothing else"
        )
        
        try:
            title = provider.chat_completion(
                [{"role": "user", "content": prompt}],
                model="auto",
                max_tokens=50
            )
            
            # Clean response
            title = title.strip().strip('"\'').strip()
            
            # Validate length
            if 3 < len(title) <= 80 and not '\n' in title:
                return title
            return None
        except Exception:
            return None

    def set_title(self, conversation_id: int, title: str, ai_generated: bool = False) -> None:
        """
        Set the title for a conversation.
        
        Args:
            conversation_id: ID of the conversation
            title: The title to set
            ai_generated: Whether this is an AI-generated title
        """
        conv = self.repo.get_by_id(conversation_id)
        if conv:
            conv.title = title
            conv.title_ai_generated = ai_generated
            db.session.commit()

    def rename_conversation(self, conversation_id: int, title: str) -> None:
        """
        Manually rename a conversation (marks it as user-renamed, overrides AI title).
        
        Args:
            conversation_id: ID of the conversation
            title: The new title
        """
        conv = self.repo.get_by_id(conversation_id)
        if conv:
            conv.title = title
            conv.title_ai_generated = False  # Mark as manual
            db.session.commit()

    def should_generate_title(self, conversation_id: int) -> bool:
        """
        Check if a title should be generated for this conversation.
        
        A title should be generated if:
        - The conversation has the default title
        - It hasn't already been AI-generated
        - It hasn't been manually renamed
        
        Args:
            conversation_id: ID of the conversation
            
        Returns:
            True if title generation is recommended
        """
        conv = self.repo.get_by_id(conversation_id)
        if not conv:
            return False
        
        # Only generate if still has default title and not manually renamed
        return conv.title == 'New Conversation' and not conv.title_ai_generated
