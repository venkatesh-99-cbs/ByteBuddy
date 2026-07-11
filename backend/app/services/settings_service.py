import base64
import hashlib
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken
from flask import current_app

from backend.app import db
from backend.app.models.models import AppSettings


OPENROUTER_API_KEY_SETTING = "openrouter_api_key"


def _fernet() -> Fernet:
    secret = current_app.config.get("SECRET_KEY") or "dev-key-bytebuddy"
    digest = hashlib.sha256(secret.encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


class SettingsService:
    @staticmethod
    def get_value(key: str) -> Optional[str]:
        setting = AppSettings.query.filter_by(key=key).first()
        return setting.value if setting else None

    @staticmethod
    def set_value(key: str, value: str) -> AppSettings:
        setting = AppSettings.query.filter_by(key=key).first()
        if not setting:
            setting = AppSettings(key=key)
            db.session.add(setting)
        setting.value = value
        db.session.commit()
        return setting

    @staticmethod
    def encrypt_secret(value: str) -> str:
        return _fernet().encrypt(value.encode("utf-8")).decode("utf-8")

    @staticmethod
    def decrypt_secret(value: Optional[str]) -> Optional[str]:
        if not value:
            return None
        try:
            return _fernet().decrypt(value.encode("utf-8")).decode("utf-8")
        except InvalidToken:
            return None

    @classmethod
    def save_openrouter_api_key(cls, api_key: str) -> None:
        cls.set_value(OPENROUTER_API_KEY_SETTING, cls.encrypt_secret(api_key))

    @classmethod
    def get_openrouter_api_key(cls) -> Optional[str]:
        stored = cls.get_value(OPENROUTER_API_KEY_SETTING)
        decrypted = cls.decrypt_secret(stored)
        return decrypted or current_app.config.get("OPENROUTER_API_KEY")

    @classmethod
    def has_openrouter_api_key(cls) -> bool:
        return bool(cls.get_openrouter_api_key())
