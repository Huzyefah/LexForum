from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / ".env", extra="ignore")
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.6-flash"
    data_dir: Path = ROOT / "backend/app/data"
    app_access_token: str = ""


settings = Settings()
