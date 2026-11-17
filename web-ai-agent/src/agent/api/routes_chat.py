"""AI 对话 SSE 路由（架构 5.4 api/routes_chat.py）。

骨架阶段直接走 Stub 流式；业务期由 graph 编排接管（意图识别→工具→生成→降级）。
"""

from collections.abc import AsyncIterator

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from agent.config import get_settings
from agent.llm import stub

router = APIRouter()


class ChatRequest(BaseModel):
    """对话请求（7.3：Java agent 模块组装上下文后调用）。"""

    question: str
    mode: str = "investor"  # investor | advisor


@router.post("/chat")
async def chat(
    request: ChatRequest,
    x_internal_token: str | None = Header(default=None),
) -> EventSourceResponse:
    """SSE 流式对话：仅接受 web-ai-tougu 内部调用（internal token 校验）。"""
    settings = get_settings()
    if settings.internal_token and x_internal_token != settings.internal_token:
        raise HTTPException(status_code=401, detail="invalid internal token")

    async def event_stream() -> AsyncIterator[dict]:
        async for char in stub.stream_reply(request.question):
            yield {"event": "message", "data": char}
        yield {"event": "message", "data": "[DONE]"}

    return EventSourceResponse(event_stream())
