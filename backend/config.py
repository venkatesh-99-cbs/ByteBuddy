import os
from dataclasses import dataclass

try:
    from dotenv import load_dotenv
except ImportError:
    def load_dotenv():
        return False

DEFAULT_GROQ_BASE_URL = "https://api.groq.com/openai/v1"
DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b"
DEFAULT_GROQ_TEMPERATURE = 0.2
DEFAULT_GROQ_TIMEOUT_SECONDS = 60
DEFAULT_GROQ_MAX_COMPLETION_TOKENS = 4000
MAX_COMPLETION_TOKENS_LIMIT = 65536
DEFAULT_REASONING_EFFORT = ""
VALID_REASONING_EFFORTS = {"none", "default", "low", "medium", "high"}
VALID_SERVICE_TIERS = {"auto", "on_demand", "flex", "performance"}
MAX_HISTORY_MESSAGES = 12
MAX_CONTINUATIONS = 3


def load_environment():
    load_dotenv()


def _clamp_int(raw_value, default_value, minimum, maximum):
    raw_value = (raw_value or "").strip()
    if not raw_value:
        return default_value

    try:
        parsed_value = int(raw_value)
    except ValueError:
        return default_value

    return max(minimum, min(parsed_value, maximum))


def _clamp_float(raw_value, default_value, minimum, maximum):
    raw_value = (raw_value or "").strip()
    if not raw_value:
        return default_value

    try:
        parsed_value = float(raw_value)
    except ValueError:
        return default_value

    return max(minimum, min(parsed_value, maximum))


def _clean_choice(raw_value, default_value, valid_values):
    value = (raw_value or "").strip().lower()
    if not value:
        return default_value
    return value if value in valid_values else default_value


@dataclass(frozen=True)
class Settings:
    groq_api_key: str
    groq_base_url: str
    groq_model: str
    groq_temperature: float
    groq_timeout_seconds: int
    groq_max_completion_tokens: int
    groq_reasoning_effort: str
    groq_service_tier: str
    max_history_messages: int = MAX_HISTORY_MESSAGES
    max_continuations: int = MAX_CONTINUATIONS


def load_settings():
    return Settings(
        groq_api_key=(os.getenv("GROQ_API_KEY") or "").strip(),
        groq_base_url=((os.getenv("GROQ_BASE_URL") or DEFAULT_GROQ_BASE_URL).strip().rstrip("/") or DEFAULT_GROQ_BASE_URL),
        groq_model=(os.getenv("GROQ_MODEL") or DEFAULT_GROQ_MODEL).strip() or DEFAULT_GROQ_MODEL,
        groq_temperature=_clamp_float(
            os.getenv("GROQ_TEMPERATURE"),
            DEFAULT_GROQ_TEMPERATURE,
            0.0,
            2.0,
        ),
        groq_timeout_seconds=_clamp_int(
            os.getenv("GROQ_TIMEOUT_SECONDS"),
            DEFAULT_GROQ_TIMEOUT_SECONDS,
            5,
            300,
        ),
        groq_max_completion_tokens=_clamp_int(
            os.getenv("GROQ_MAX_COMPLETION_TOKENS"),
            DEFAULT_GROQ_MAX_COMPLETION_TOKENS,
            1,
            MAX_COMPLETION_TOKENS_LIMIT,
        ),
        groq_reasoning_effort=_clean_choice(
            os.getenv("GROQ_REASONING_EFFORT"),
            DEFAULT_REASONING_EFFORT,
            VALID_REASONING_EFFORTS,
        ),
        groq_service_tier=_clean_choice(
            os.getenv("GROQ_SERVICE_TIER"),
            "",
            VALID_SERVICE_TIERS,
        ),
    )
