from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Forge AI"
    DEBUG: bool = False
    API_V1_STR: str = "/api/v1"

    # Security
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # MongoDB
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "forge_ai"

    # Qdrant
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: str | None = None

    # OpenAI
    OPENAI_API_KEY: str = ""

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # GitHub OAuth
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GITHUB_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/github/callback"
    GITHUB_WEBHOOK_SECRET: str = ""

    # Agora
    AGORA_APP_ID: str = ""
    AGORA_APP_CERTIFICATE: str = ""
    AGORA_CUSTOMER_ID: str = ""
    AGORA_CUSTOMER_SECRET: str = ""

    # Discord
    DISCORD_BOT_TOKEN: str = ""

    # Groq
    GROQ_API_KEY: str = ""

    # Frontend
    FRONTEND_URL: str = "http://localhost:3000"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
