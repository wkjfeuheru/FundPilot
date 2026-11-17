"""环境配置：从 .env / 环境变量读取（架构 5.4 config.py）。"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class AgentSettings(BaseSettings):
    """AI 服务配置。DEEPSEEK_API_KEY 为空时 llm 层自动切换 Stub 演示模式。"""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_model: str = "deepseek-chat"

    # Java 后端只读 tool API（AI 不直连业务库，AD-04）
    tool_api_base: str = "http://localhost:8080/api/v1"

    # LLM 超时阈值（秒），超时触发关键词路由降级
    llm_timeout_seconds: int = 10

    # 内部调用鉴权（web-ai-tougu agent 模块 → 本服务）
    internal_token: str = "dev-internal-token"

    agent_port: int = 8000


def get_settings() -> AgentSettings:
    return AgentSettings()
