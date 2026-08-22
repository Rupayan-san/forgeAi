from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Forge AI"
    DEBUG: bool = False
    API_V1_STR: str = "/api/v1"

    # Security
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30  # Short-lived; refresh tokens handle persistence
    REFRESH_TOKEN_EXPIRE_DAYS: int = 15   # 15-day refresh token

    # MongoDB
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "forge_ai"

    # Qdrant
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: str | None = None

    # OpenAI
    OPENAI_API_KEY: str = "sk-forge-dev-placeholder"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # GitHub OAuth & Access Tokens
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GITHUB_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/github/callback"
    GITHUB_WEBHOOK_SECRET: str = ""
    GITHUB_TOKEN: str = ""
    GITHUB_PERSONAL_ACCESS_TOKEN: str = ""

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

    # Observability & Telemetry (Step 12)
    TELEMETRY_ENABLED: bool = True
    OTEL_EXPORTER_OTLP_ENDPOINT: str = "http://localhost:4318"
    PROMETHEUS_PORT: int = 9090
    GRAFANA_PORT: int = 3001
    SERVICE_NAME: str = "forge-ai"
    ENVIRONMENT: str = "development"

    # LangSmith & Evaluation (Step 12)
    LANGCHAIN_TRACING_V2: str = "false"
    LANGCHAIN_API_KEY: str = ""
    LANGCHAIN_PROJECT: str = "forge-ai"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
