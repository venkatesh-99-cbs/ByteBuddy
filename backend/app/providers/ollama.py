import requests
from typing import List, Dict, Any
from backend.app.providers.base import AIProvider

class OllamaProvider(AIProvider):
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')

    def chat_completion(self, messages: List[Dict[str, str]], **kwargs) -> str:
        url = f"{self.base_url}/api/chat"
        payload = {
            "model": kwargs.get("model", "llama3"),
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": kwargs.get("temperature", 0.7),
                "num_predict": kwargs.get("max_tokens", 2000)
            }
        }
        try:
            response = requests.post(url, json=payload, timeout=60)
            response.raise_for_status()
            return response.json().get("message", {}).get("content", "")
        except Exception as e:
            raise Exception(f"Ollama error: {str(e)}")

    def list_models(self) -> List[Dict[str, Any]]:
        url = f"{self.base_url}/api/tags"
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            models = response.json().get("models", [])
            return [{"id": m["name"], "name": m["name"]} for m in models]
        except Exception:
            return []

    def test_connection(self) -> bool:
        url = f"{self.base_url}/api/tags"
        try:
            response = requests.get(url, timeout=5)
            return response.status_code == 200
        except Exception:
            return False
