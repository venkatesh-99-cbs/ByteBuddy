import requests
from typing import List, Dict, Any
from backend.app.providers.base import AIProvider

class OpenRouterProvider(AIProvider):
    def __init__(self, api_key: str, default_model: str = "google/gemini-2.0-flash-001"):
        self.api_key = api_key
        self.default_model = default_model
        self.base_url = "https://openrouter.ai/api/v1"

    def chat_completion(self, messages: List[Dict[str, str]], **kwargs) -> str:
        if not self.api_key:
            raise Exception("OpenRouter API key not configured")

        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://bytebuddy.dev", # Optional
            "X-Title": "ByteBuddy", # Optional
            "Content-Type": "application/json"
        }
        payload = {
            "model": kwargs.get("model") or self.default_model,
            "messages": messages,
            "temperature": kwargs.get("temperature", 0.7),
            "max_tokens": kwargs.get("max_tokens", 2000)
        }
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=60)
            response.raise_for_status()
            return response.json().get("choices", [{}])[0].get("message", {}).get("content", "")
        except Exception as e:
            raise Exception(f"OpenRouter error: {str(e)}")

    def list_models(self) -> List[Dict[str, Any]]:
        url = f"{self.base_url}/models"
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            models = response.json().get("data", [])
            return [{"id": m["id"], "name": m["name"]} for m in models]
        except Exception:
            return []

    def test_connection(self) -> bool:
        if not self.api_key: return False
        url = f"{self.base_url}/models"
        headers = {"Authorization": f"Bearer {self.api_key}"}
        try:
            response = requests.get(url, headers=headers, timeout=5)
            return response.status_code == 200
        except Exception:
            return False
