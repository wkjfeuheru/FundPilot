"""冒烟测试：/health 与 /chat SSE stub。

环境隔离：系统环境可能预置 DEEPSEEK_API_KEY（用户本机全局变量），
fixture 显式清除，保证测试固定走 Stub 演示模式。
"""

import pytest
from fastapi.testclient import TestClient

from agent.api.app import create_app


@pytest.fixture
def client(monkeypatch):
    monkeypatch.delenv("DEEPSEEK_API_KEY", raising=False)
    return TestClient(create_app())


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["stub_mode"] is True


def test_chat_requires_internal_token(client):
    resp = client.post("/chat", json={"question": "我的持仓怎么样"})
    assert resp.status_code == 401


def test_chat_stream_ends_with_done(client):
    resp = client.post(
        "/chat",
        json={"question": "我的持仓怎么样", "mode": "investor"},
        headers={"X-Internal-Token": "dev-internal-token"},
    )
    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers["content-type"]
    # SSE 逐字分帧，原文不可能连续出现；解析 data 帧拼接后断言
    data = "".join(
        line[6:] for line in resp.text.splitlines() if line.startswith("data: ")
    )
    assert "[DONE]" in data
    # 预设回复按关键词命中“持仓”
    assert "持仓" in data
