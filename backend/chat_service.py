from backend.messages import build_messages, continue_messages
from backend.prompts import FALLBACK_REPLY


class ChatService:
    def __init__(self, settings, groq_client):
        self.settings = settings
        self.groq_client = groq_client

    def generate_reply(self, mode, history, user_message):
        messages = build_messages(
            mode,
            history,
            user_message,
            self.settings.max_history_messages,
        )
        chunks = []

        for _ in range(self.settings.max_continuations + 1):
            response_json = self.groq_client.complete(messages)
            text = self._extract_response_text(response_json)
            if text:
                chunks.append(text)

            if not self._needs_continuation(response_json):
                break

            messages = continue_messages(messages, text)

        final_reply = "\n\n".join(chunk for chunk in chunks if chunk).strip()
        return final_reply or FALLBACK_REPLY

    def _extract_response_text(self, response_json):
        choices = response_json.get("choices") or []
        if not choices:
            return ""

        message = choices[0].get("message") or {}
        content = message.get("content", "")

        if isinstance(content, str):
            return content.strip()

        if isinstance(content, list):
            collected = []
            for item in content:
                if isinstance(item, dict) and item.get("type") == "text" and item.get("text"):
                    collected.append(item["text"])
            return "\n".join(collected).strip()

        return str(content).strip() if content else ""

    def _needs_continuation(self, response_json):
        choices = response_json.get("choices") or []
        if not choices:
            return False

        finish_reason = choices[0].get("finish_reason")
        if finish_reason is None:
            return False

        normalized = str(finish_reason).strip().lower()
        return normalized in {"length", "max_tokens"} or "length" in normalized
