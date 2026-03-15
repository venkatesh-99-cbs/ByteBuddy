import requests

from backend.errors import ConfigurationError, ProviderError


class GroqChatClient:
    def __init__(self, settings, session=None):
        self.settings = settings
        self.session = session or requests.Session()

    def complete(self, messages):
        api_key = self.settings.groq_api_key
        if not api_key:
            raise ConfigurationError(
                "Missing Groq API key. Set GROQ_API_KEY in your environment or .env "
                "file and restart the Flask app."
            )

        try:
            response = self.session.post(
                f"{self.settings.groq_base_url}/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                },
                json=self._build_payload(messages),
                timeout=self.settings.groq_timeout_seconds,
            )
        except requests.Timeout as exc:
            raise ProviderError(
                504,
                (
                    "The Groq API took too long to respond. Try again, or increase "
                    "GROQ_TIMEOUT_SECONDS for slower models."
                ),
                str(exc),
            ) from exc
        except requests.ConnectionError as exc:
            raise ProviderError(
                502,
                (
                    "The app could not reach the Groq API. Check your internet "
                    "connection and GROQ_BASE_URL, then try again."
                ),
                str(exc),
            ) from exc

        response_json = self._safe_json(response)
        if response.ok:
            return response_json

        raise self._build_provider_error(response.status_code, response_json, response.text)

    def _build_payload(self, messages):
        payload = {
            "messages": messages,
            "model": self.settings.groq_model,
            "stream": False,
            "temperature": self.settings.groq_temperature,
            "max_completion_tokens": self.settings.groq_max_completion_tokens,
        }

        reasoning_effort = self.settings.groq_reasoning_effort
        if reasoning_effort:
            payload["reasoning_effort"] = reasoning_effort

        service_tier = self.settings.groq_service_tier
        if service_tier:
            payload["service_tier"] = service_tier

        return payload

    def _safe_json(self, response):
        try:
            return response.json()
        except ValueError:
            return {}

    def _extract_error_details(self, response_json, response_text):
        if isinstance(response_json, dict):
            error_block = response_json.get("error")
            if isinstance(error_block, dict):
                error_message = (error_block.get("message") or "").strip()
                error_type = (error_block.get("type") or "").strip()
                if error_message and error_type:
                    return f"{error_message} ({error_type})"
                if error_message:
                    return error_message
            if response_json.get("message"):
                return str(response_json["message"]).strip()

        return (response_text or "").strip() or "Groq API request failed"

    def _build_provider_error(self, status_code, response_json, response_text):
        details = self._extract_error_details(response_json, response_text)

        if status_code == 400:
            user_message = (
                "The Groq API request was rejected. Check GROQ_MODEL, "
                "GROQ_MAX_COMPLETION_TOKENS, and reasoning settings, then try again."
            )
        elif status_code == 401:
            user_message = "Groq authentication failed. Check GROQ_API_KEY and restart the Flask app."
        elif status_code == 403:
            user_message = "Groq rejected this request due to permission or project restrictions."
        elif status_code == 404:
            user_message = "The requested Groq model or endpoint was not found. Check GROQ_MODEL and GROQ_BASE_URL."
        elif status_code == 429:
            user_message = "The Groq API rate limit is reached right now. Wait a little and try again."
        elif status_code in {500, 502, 503}:
            user_message = "Groq is having a temporary server issue. Try again in a moment."
        else:
            user_message = "I hit a problem while generating the build plan. Please try again."

        return ProviderError(status_code or 500, user_message, details)
