class ConfigurationError(Exception):
    """Raised when local environment configuration is invalid."""


class ProviderError(Exception):
    """Raised when the upstream model provider request fails."""

    def __init__(self, status_code, user_message, details=""):
        super().__init__(details or user_message)
        self.status_code = status_code
        self.user_message = user_message
        self.details = details or user_message
