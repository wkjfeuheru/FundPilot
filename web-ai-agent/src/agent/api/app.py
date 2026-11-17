"""FastAPI 应用工厂（架构 5.4 api/app.py）。"""

from fastapi import FastAPI

from agent.api.routes_chat import router as chat_router
from agent.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="FundPilot AI Agent", version="0.0.1")
    # routes_chat 内已定义 /chat 前缀，此处不再叠加
    app.include_router(chat_router, tags=["chat"])

    @app.get("/health")
    def health() -> dict:
        # stub_mode：无 DeepSeek Key 时为 True，回复走预设（演示模式）
        return {
            "status": "ok",
            "stub_mode": not settings.deepseek_api_key,
            "tool_api_base": settings.tool_api_base,
        }

    return app
