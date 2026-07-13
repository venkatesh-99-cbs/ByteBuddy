from abc import ABC, abstractmethod
from typing import List, Dict, Any, Generator

class AIProvider(ABC):
    @abstractmethod
    def chat_completion(self, messages: List[Dict[str, str]], **kwargs) -> str:
        pass

    @abstractmethod
    def list_models(self) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def test_connection(self) -> bool:
        pass

