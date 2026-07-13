import requests
from typing import List, Dict, Any, Generator
from urllib.parse import urlparse, urlunparse
from app.providers.base import AIProvider

class OllamaProvider(AIProvider):
    def __init__(self, base_url: str, default_model: str | None = None):
        self.base_url = base_url.rstrip('/')
        self.default_model = default_model

    def _candidate_base_urls(self) -> List[str]:
        urls = [self.base_url]
        parsed = urlparse(self.base_url)
        if parsed.hostname == 'localhost':
            fallback = parsed._replace(netloc=parsed.netloc.replace('localhost', '127.0.0.1', 1))
            urls.append(urlunparse(fallback).rstrip('/'))
        return list(dict.fromkeys(urls))

    def _resolve_model(self, requested_model: str | None) -> str:
        if requested_model:
            return requested_model
        if self.default_model:
            return self.default_model

        models = self.list_models()
        if models:
            return models[0]["id"]

        raise Exception(
            "Ollama is connected but no models were found. Install one with `ollama pull llama3.1` "
            "or select an installed model in settings."
        )

    def chat_completion(self, messages: List[Dict[str, str]], **kwargs) -> str:
        model = self._resolve_model(kwargs.get("model"))
        payload = {
            "model": model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": kwargs.get("temperature", 0.7),
                "num_predict": kwargs.get("max_tokens", 2000)
            }
        }
        last_error = None
        for base_url in self._candidate_base_urls():
            try:
                response = requests.post(f"{base_url}/api/chat", json=payload, timeout=300)
                response.raise_for_status()
                content = response.json().get("message", {}).get("content", "")
                if not content:
                    raise Exception("No content in response")
                return content
            except requests.exceptions.Timeout:
                last_error = (
                    "Ollama took too long to respond. The selected local model may still be loading "
                    "or the request is too large. Try a smaller model, reduce max tokens, or switch to OpenRouter."
                )
            except requests.exceptions.RequestException as exc:
                last_error = exc
        raise Exception(f"Ollama error: {last_error}")

    def chat_completion_stream(self, messages: List[Dict[str, str]], **kwargs) -> Generator[str, None, None]:
        """Stream chat completion for long responses."""
        model = self._resolve_model(kwargs.get("model"))
        payload = {
            "model": model,
            "messages": messages,
            "stream": True,
            "options": {
                "temperature": kwargs.get("temperature", 0.7),
                "num_predict": kwargs.get("max_tokens", 2000)
            }
        }
        last_error = None
        for base_url in self._candidate_base_urls():
            try:
                response = requests.post(f"{base_url}/api/chat", json=payload, timeout=300, stream=True)
                response.raise_for_status()
                import json
                for line in response.iter_lines():
                    if line:
                        try:
                            data = json.loads(line)
                            chunk = data.get("message", {}).get("content", "")
                            if chunk:
                                yield chunk
                            if data.get("done", False):
                                break
                        except:
                            pass
                return
            except requests.exceptions.Timeout:
                last_error = (
                    "Ollama stream took too long. Try a smaller model or reduce max tokens."
                )
            except requests.exceptions.RequestException as exc:
                last_error = exc
        raise Exception(f"Ollama stream error: {last_error}")

    def list_models(self) -> List[Dict[str, Any]]:
        last_error = None
        for base_url in self._candidate_base_urls():
            try:
                response = requests.get(f"{base_url}/api/tags", timeout=10)
                response.raise_for_status()
                models = response.json().get("models", [])
                return [
                    {
                        "id": m.get("name") or m.get("model"),
                        "name": m.get("name") or m.get("model"),
                    }
                    for m in models
                    if m.get("name") or m.get("model")
                ]
            except requests.exceptions.RequestException as exc:
                last_error = exc
        raise Exception(
            f"Could not connect to Ollama at {self.base_url}. Start Ollama with `ollama serve` "
            f"and make sure OLLAMA_BASE_URL is correct. Details: {last_error}"
        )

    def test_connection(self) -> bool:
        try:
            self.list_models()
            return True
        except Exception:
            return False

