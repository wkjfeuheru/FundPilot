"""uvicorn 启动入口：python -m agent.main 或 uvicorn agent.api.app:create_app --factory。"""

import uvicorn

from agent.config import get_settings


def main() -> None:
    settings = get_settings()
    uvicorn.run("agent.api.app:create_app", factory=True, host="0.0.0.0", port=settings.agent_port)


if __name__ == "__main__":
    main()
