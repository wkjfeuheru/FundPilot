"""LLM 演示 Stub（架构 5.4 llm/stub.py）。

DEEPSEEK_API_KEY 未配置时的预设回复模式（需求 2.5 范围外⑤、7.3）。
约定：回复为纯文本，清理 Markdown 符号（#、**、反引号等），保留换行（NFR-S6）。
"""

from collections.abc import AsyncIterator

# 双端路由表的关键词兜底回复（需求 7.3），业务期迁移到 routes/ 集中配置
_PRESET_REPLIES: dict[str, str] = {
    "持仓": "您可以点击“我的持仓”查看当前持有的基金明细，包括份额、成本与市值。",
    "资产": "资产总览页展示了现金与持仓市值合计，数据每日更新。",
    "建议": "投顾的调仓建议请在“调仓建议”页查看，确认跟调前请核对风险等级匹配情况。",
    "风险": "风险画像反映了您的风险承受能力，可通过风险测评问卷更新。",
    "客户": "您可以在客户 360 页查看名下客户的资产、持仓与风险画像概要。",
}

_FALLBACK_REPLY = "抱歉，我暂时无法理解您的问题。您可以尝试询问持仓、资产、调仓建议等话题。"


def pick_reply(question: str) -> str:
    """按关键词匹配预设回复，未命中走兜底（确定性降级链路的雏形）。"""
    for keyword, reply in _PRESET_REPLIES.items():
        if keyword in question:
            return reply
    return _FALLBACK_REPLY


async def stream_reply(question: str) -> AsyncIterator[str]:
    """逐字产出预设回复，模拟流式生成（打字机前端消费 SSE）。"""
    reply = pick_reply(question)
    for char in reply:
        yield char
