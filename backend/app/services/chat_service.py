import json
from typing import List, Dict, Any, Optional
from backend.app.repositories.conversation_repository import ConversationRepository
from backend.app.providers.ollama import OllamaProvider
from backend.app.providers.openrouter import OpenRouterProvider
from flask import current_app

class ChatService:
    def __init__(self):
        self.repo = ConversationRepository()

    def get_provider(self, name: str):
        if name == 'ollama':
            return OllamaProvider(current_app.config['OLLAMA_BASE_URL'])
        elif name == 'openrouter':
            return OpenRouterProvider(current_app.config['OPENROUTER_API_KEY'])
        else:
            raise ValueError(f"Unknown provider: {name}")

    def send_message(self, conversation_id: int, user_content: str):
        conv = self.repo.get_by_id(conversation_id)
        if not conv:
            raise ValueError("Conversation not found")

        # Save user message
        self.repo.add_message(conversation_id, 'user', user_content)

        # Prepare context
        messages = self.repo.get_messages(conversation_id)
        chat_history = [{"role": m.role, "content": m.content} for m in messages]

        # Add system prompt based on explanation mode
        system_prompt = self._get_system_prompt(conv.settings.explanation_mode)
        chat_history.insert(0, {"role": "system", "content": system_prompt})

        # Get AI response
        provider = self.get_provider(conv.settings.provider)
        ai_response = provider.chat_completion(
            chat_history,
            model=conv.settings.model,
            temperature=conv.settings.temperature,
            max_tokens=conv.settings.max_tokens
        )

        # Generate suggestions
        suggestions = self._generate_suggestions(ai_response, conv.settings.provider, conv.settings.model)

        # Save assistant message
        assistant_msg = self.repo.add_message(conversation_id, 'assistant', ai_response, suggestions=suggestions)

        # Auto-generate title if it's the first exchange
        if len(messages) <= 2: # system + user + assistant (already saved)
             new_title = self._generate_title(user_content, ai_response, conv.settings.provider, conv.settings.model)
             if new_title:
                 self.repo.update_title(conversation_id, new_title)

        return assistant_msg

    def _get_system_prompt(self, mode: str) -> str:
        base_prompt = "You are ByteBuddy, an intelligent developer companion. You help with coding, debugging, and software architecture."
        mode_prompts = {
            "Beginner": "Explain concepts using very simple language, analogies, and avoid jargon where possible.",
            "Student": "Focus on educational value, explain the 'why' behind the code, and follow academic best practices.",
            "Junior Developer": "Provide clear, standard solutions with brief explanations of the patterns used.",
            "Senior Developer": "Provide concise, optimized, and scalable solutions. Focus on edge cases and performance.",
            "Tech Lead": "Focus on high-level architecture, long-term maintainability, trade-offs, and team standards."
        }
        return f"{base_prompt} {mode_prompts.get(mode, mode_prompts['Junior Developer'])}"

    def _generate_suggestions(self, last_response: str, provider_name: str, model: str) -> List[str]:
        prompt = f"Based on this AI response, suggest 3 concise follow-up questions or actions a developer might take. Return ONLY a JSON array of strings.\n\nResponse: {last_response[:500]}"
        try:
            provider = self.get_provider(provider_name)
            res = provider.chat_completion([{"role": "user", "content": prompt}], model=model, max_tokens=100)
            # Try to extract JSON array
            import re
            match = re.search(r'\[.*\]', res.replace('\n', ''))
            if match:
                return json.loads(match.group())
            return ["Tell me more", "Show an example", "How do I test this?"]
        except:
            return ["Tell me more", "Show an example", "How do I test this?"]

    def _generate_title(self, user_msg: str, ai_msg: str, provider_name: str, model: str) -> Optional[str]:
        prompt = f"Generate a concise (2-4 words) title for a conversation starting with: '{user_msg[:100]}'. Return ONLY the title, no quotes."
        try:
            provider = self.get_provider(provider_name)
            res = provider.chat_completion([{"role": "user", "content": prompt}], model=model, max_tokens=20)
            return res.strip().strip('"').strip("'")
        except:
            return None

    def generate_summary(self, conversation_id: int):
        conv = self.repo.get_by_id(conversation_id)
        if not conv: return None
        messages = self.repo.get_messages(conversation_id)
        history_text = "\n".join([f"{m.role}: {m.content[:200]}" for m in messages])
        prompt = f"Summarize this developer conversation in 2-3 concise sentences:\n\n{history_text}"
        try:
            provider = self.get_provider(conv.settings.provider)
            summary = provider.chat_completion([{"role": "user", "content": prompt}], model=conv.settings.model, max_tokens=150)
            conv.summary = summary
            db.session.commit()
            return summary
        except:
            return None
