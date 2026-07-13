import requests
from typing import List, Dict, Any, Generator
from app.providers.base import AIProvider

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
            "HTTP-Referer": "https://bytebuddy.dev",
            "X-Title": "ByteBuddy",
            "Content-Type": "application/json"
        }
        payload = {
            "model": kwargs.get("model") or self.default_model,
            "messages": messages,
            "temperature": kwargs.get("temperature", 0.7),
            "max_tokens": kwargs.get("max_tokens", 2000),
            "stream": False
        }
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=300)
            response.raise_for_status()
            content = response.json().get("choices", [{}])[0].get("message", {}).get("content", "")
            if not content:
                raise Exception("No content in response")
            return content
        except requests.exceptions.Timeout:
            raise Exception("OpenRouter request timed out. Response may be incomplete.")
        except Exception as e:
            raise Exception(f"OpenRouter error: {str(e)}")

    def chat_completion_stream(self, messages: List[Dict[str, str]], **kwargs) -> Generator[str, None, None]:
        """Stream chat completion for long responses."""
        if not self.api_key:
            raise Exception("OpenRouter API key not configured")

        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://bytebuddy.dev",
            "X-Title": "ByteBuddy",
            "Content-Type": "application/json"
        }
        payload = {
            "model": kwargs.get("model") or self.default_model,
            "messages": messages,
            "temperature": kwargs.get("temperature", 0.7),
            "max_tokens": kwargs.get("max_tokens", 2000),
            "stream": True
        }
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=300, stream=True)
            response.raise_for_status()
            for line in response.iter_lines():
                if line:
                    line_str = line.decode('utf-8') if isinstance(line, bytes) else line
                    if line_str.startswith('data: '):
                        data_str = line_str[6:]
                        if data_str == '[DONE]':
                            break
                        try:
                            import json
                            data = json.loads(data_str)
                            delta = data.get("choices", [{}])[0].get("delta", {})
                            chunk = delta.get("content", "")
                            if chunk:
                                yield chunk
                        except:
                            pass
        except requests.exceptions.Timeout:
            raise Exception("OpenRouter stream timed out. Response may be incomplete.")
        except Exception as e:
            raise Exception(f"OpenRouter stream error: {str(e)}")

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

