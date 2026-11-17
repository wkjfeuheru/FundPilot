/* ============================================================
   FundPilot 原型 · 共享运行时
   负责：壳层渲染、页面交互、抽屉/弹窗、通知、AI 对话、SVG 图表
   ============================================================ */
(() => {
  'use strict';

  const DATA = window.FP_DATA || { funds: [], holdings: [], clients: [], risks: [], notifications: { investor: [], advisor: [] }, transactions: [], portfolios: [], approvals: [] };
  const IS_ADVISOR = document.body.dataset.mode === 'advisor';
  const MODE = IS_ADVISOR ? 'advisor' : 'investor';
  const PAGE = document.body.dataset.page || 'overview';
  const IS_DEMO_TOOL = document.body.dataset.demo === 'ta';

  /* ----------------------------- 导航配置 ----------------------------- */
  const NAV = IS_ADVISOR
    ? [
        ['overview', '工作台总览', 'layout-dashboard'],
        ['clients', '客户 360', 'users'],
        ['strategy', '策略库', 'layers'],
        ['portfolios', '组合管理', 'briefcase-business'],
        ['risks', '风险监控', 'shield-alert'],
        ['reports', '投顾报告', 'file-text'],
        ['ai', 'AI 研究助手', 'sparkles'],
        ['compliance', '审批与合规', 'clipboard-check']
      ]
    : [
        ['overview', '资产总览', 'layout-dashboard'],
        ['funds', '基金超市', 'search'],
        ['plan', '调仓建议', 'refresh-cw'],
        ['holdings', '我的持仓', 'wallet'],
        ['transactions', '交易记录', 'arrow-left-right'],
        ['ai', 'AI 理财助手', 'sparkles'],
        ['profile', '风险画像与账户', 'shield-check']
      ];

  /* ----------------------------- 图标 ----------------------------- */
  const ICONS = {
    'layout-dashboard': '<rect x="3" y="3" width="7" height="9" rx="1.4"/><rect x="14" y="3" width="7" height="5" rx="1.4"/><rect x="14" y="12" width="7" height="9" rx="1.4"/><rect x="3" y="16" width="7" height="5" rx="1.4"/>',
    'search': '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    'pie-chart': '<path d="M21 12A9 9 0 1 1 12 3v9z"/><path d="M12 3a9 9 0 0 1 9 9h-9z"/>',
    'wallet': '<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18M16 14h2"/>',
    'arrow-left-right': '<path d="M8 3 4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4"/>',
    'bot': '<rect x="4" y="7" width="16" height="13" rx="4"/><path d="M12 3v4M9 3h6M9 13h.01M15 13h.01M9 17h6"/>',
    'shield-check': '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
    'shield-alert': '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="M12 8v5m0 3h.01"/>',
    'users': '<path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 4a4 4 0 0 1 0 8M22 20v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="8" r="4"/>',
    'briefcase-business': '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M2 12a20 20 0 0 0 20 0"/>',
    'file-text': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>',
    'clipboard-check': '<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 4.5V3h6v1.5M8 14l2 2 5-5"/>',
    'settings': '<path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.2 2.2m8.4 8.4 2.2 2.2M18.4 5.6l-2.2 2.2m-8.4 8.4-2.2 2.2"/><circle cx="12" cy="12" r="4"/>',
    'bell': '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    'sparkles': '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3ZM19 17l.7 1.3L21 19l-1.3.7L19 21l-.7-1.3L17 19l1.3-.7L19 17Z"/>',
    'arrow-up-right': '<path d="M7 17 17 7M7 7h10v10"/>',
    'chevron-right': '<path d="m9 18 6-6-6-6"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    'plus': '<path d="M12 5v14M5 12h14"/>',
    'download': '<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
    'circle-check': '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    'circle-alert': '<circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 4h.01"/>',
    'clock': '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
    'refresh-cw': '<path d="M20 7v5h-5M4 17v-5h5M5.5 9A7 7 0 0 1 19 7l1 5M4 12l1 5a7 7 0 0 0 13-2"/>',
    'send': '<path d="m22 2-7 20-4-9-9-4 20-7ZM11 13 22 2"/>',
    'x': '<path d="M18 6 6 18M6 6l12 12"/>',
    'filter': '<path d="M4 7h16M7 12h10M10 17h4"/>',
    'more-horizontal': '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    'chart-no-axes-combined': '<path d="M3 3v18h18M7 16l5-5 4 2 5-7"/>',
    'target': '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    'layers': '<path d="m12 2 9 5-9 5-9-5 9-5Zm-9 10 9 5 9-5M3 17l9 5 9-5"/>',
    'lock': '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    'message-circle': '<path d="M21 11a8 8 0 0 1-8 8 9 9 0 0 1-4-.8L3 21l2-5a9 9 0 0 1-1-5 8 8 0 0 1 8-8 9 9 0 0 1 9 8Z"/>',
    'calendar': '<rect x="3" y="5" width="18" height="17" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>'
  };

  const icon = (name, size = 17) =>
    `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS['circle-check']}</svg>`;

  /* ----------------------------- 通用工具 ----------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const safe = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = (value) => Number(value) || 0;

  /* ----------------------------- 演示状态（跨页面保留） ----------------------------- */
  const STORAGE_KEY = 'fundpilot:demo-state';
  let saved = {};
  try { saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}'); } catch (_) { saved = {}; }

  const state = Object.assign({
    favorites: ['110027'],
    chat: [],
    resolvedRisks: [],
    approved: [],
    readNotices: [],
    risk: 3,
    years: 5,
    planGenerated: false,
    scenario: '均衡配置',
    optimized: false,
    selectedPortfolio: '稳健增值 03 号',
    reportType: '客户配置建议书',
    reportClient: '',
    reportGenerated: false,
    planAmount: 5000,
    planDay: 8,
    planFunds: 2,
    holdings: null,
    transactions: null,
    adviceStatus: {},
    cash: 50000
  }, saved);

  const persist = () => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { /* 忽略存储异常 */ }
  };

  const pendingRisks = () => DATA.risks.filter((r) => !state.resolvedRisks.includes(r.id));
  const unreadNotices = () => (DATA.notifications[MODE] || []).filter((n) => !state.readNotices.includes(n.id));
  const navTitle = (key) => (NAV.find((n) => n[0] === key) || [null, '工作台'])[1];

  /* ----------------------------- 金额与持仓/交易状态 ----------------------------- */
  const formatMoney = (value) => `¥${Math.round(value).toLocaleString('zh-CN')}`;
  const parseMoney = (text) => Number(String(text).replace(/[^\d.-]/g, '')) || 0;
  const nowClock = () => {
    const date = new Date();
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  function ensureHoldings() {
    if (!Array.isArray(state.holdings)) {
      state.holdings = DATA.holdings.map((item) => ({
        code: item.code,
        name: item.name,
        type: item.type,
        value: parseMoney(item.value),
        pnl: item.pnl,
        ret: item.ret
      }));
      persist();
    }
    return state.holdings;
  }

  function totalHoldingValue() {
    return ensureHoldings().reduce((sum, item) => sum + item.value, 0);
  }

  function holdingShare(value) {
    const total = totalHoldingValue();
    return total ? `${((value / total) * 100).toFixed(1)}%` : '0.0%';
  }

  function upsertHolding(code, delta, fallbackName) {
    const holdings = ensureHoldings();
    const existing = holdings.find((item) => item.code === code);
    if (existing) {
      existing.value += delta;
      if (existing.value <= 1) holdings.splice(holdings.indexOf(existing), 1);
      return;
    }
    if (delta <= 0) return;
    const fund = fundByCode(code);
    holdings.push({
      code,
      name: fund ? fund.name : (fallbackName || code),
      type: fund ? fund.type : '权益',
      value: delta,
      pnl: '+¥0',
      ret: '0.00%'
    });
  }

  function applyTradeEffect(effect) {
    if (!effect) return;
    if (effect.kind === 'purchase') {
      state.cash = ensureCash() - effect.amount;
      upsertHolding(effect.code, effect.amount - (effect.fee || 0));
    }
    if (effect.kind === 'redeem') {
      state.cash = ensureCash() + effect.amount - (effect.fee || 0);
      upsertHolding(effect.code, -effect.amount);
    }
    if (effect.kind === 'rebalance') {
      (effect.items || []).forEach((item) => upsertHolding(item.code, item.amount, item.name));
      state.cash = ensureCash() - (effect.fee || 0);
    }
    persist();
  }

  function ensureCash() {
    if (typeof state.cash !== 'number') {
      state.cash = 50000;
      persist();
    }
    return state.cash;
  }

  const pendingPurchaseAmount = () => ensureTransactions()
    .filter((tx) => tx.status === '待登记确认' && tx.effect && tx.effect.kind === 'purchase')
    .reduce((sum, tx) => sum + tx.effect.amount, 0);

  const availableCash = () => Math.max(ensureCash() - pendingPurchaseAmount(), 0);

  function taConfirmDate() {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
  }

  const makeTaNo = () => `TA${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(Date.now()).slice(-4)}`;

  function refreshCashSummary() {
    const pending = pendingPurchaseAmount();
    const cashSummary = $('#cashSummary');
    if (cashSummary) {
      cashSummary.innerHTML = `
        <div class="profile-item"><span>可用现金</span><strong>${formatMoney(availableCash())}</strong></div>
        <div class="profile-item"><span>现金余额</span><strong>${formatMoney(ensureCash())}</strong></div>
        <div class="profile-item"><span>冻结待登记申购</span><strong class="neutral">${formatMoney(pending)}</strong></div>`;
    }
    const cashValue = $('#cashValue');
    if (cashValue) cashValue.textContent = formatMoney(ensureCash());
    const cashBottom = $('#cashBottom');
    if (cashBottom) cashBottom.textContent = `冻结待登记申购 ${formatMoney(pending)}`;
    const totalValue = $('#totalAssetValue');
    if (totalValue) totalValue.textContent = formatMoney(totalHoldingValue() + ensureCash());
    const totalBottom = $('#totalAssetBottom');
    if (totalBottom) totalBottom.innerHTML = `含可用现金 ${formatMoney(ensureCash())} · 较上月 <span class="positive">↑ 1.82%</span>`;
  }

  function ensureTransactions() {
    if (!Array.isArray(state.transactions)) {
      state.transactions = DATA.transactions.map((tx, index) => ({
        id: `T-BASE-${index + 1}`,
        type: tx.type,
        fundName: tx.fund,
        time: tx.time,
        amount: tx.amount,
        status: tx.status,
        receipt: tx.receipt || null,
        detail: tx.type === '基金定投' ? '定投计划自动执行' : '模拟交易流水',
        effect: null
      }));
      persist();
    }
    // 兼容旧会话中的两态数据
    state.transactions.forEach((tx) => {
      if (tx.status === '待确认') tx.status = '待登记确认';
      if (tx.status === '已完成') tx.status = '确认成功';
      if (!('receipt' in tx)) tx.receipt = null;
    });
    return state.transactions;
  }

  const pendingTransactionCount = () => ensureTransactions().filter((tx) => tx.status === '待登记确认').length;

  function createTransaction(transaction) {
    const list = ensureTransactions();
    list.unshift(Object.assign({
      id: `T-${Date.now()}`,
      time: `11月16日 ${nowClock()}`,
      status: '待登记确认',
      receipt: null,
      detail: '交易申请已报送 TA，等待登记确认'
    }, transaction));
    persist();
  }

  /* ----------------------------- SVG 图表 ----------------------------- */
  function lineShape(values, width, height, pad) {
    const low = Math.min(...values);
    const high = Math.max(...values);
    const points = values.map((v, i) => [
      pad + ((width - pad * 2) * i) / (values.length - 1),
      height - pad - ((v - low) / (high - low || 1)) * (height - pad * 2)
    ]);
    const line = points.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');
    return { line, area: `${line} L${width - pad},${height} L${pad},${height} Z` };
  }

  function lineChart(values, options = {}) {
    const width = 750;
    const height = 200;
    const gradientId = `grad-${options.id || 'main'}`;
    const stroke = options.color || '#4c7ce2';
    const shape = lineShape(values, width, height, 16);
    return `<svg class="chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="height:${options.height || 180}px" role="img" aria-label="${safe(options.label || '收益走势示意图')}">
      <defs><linearGradient id="${gradientId}" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="${stroke}" stop-opacity=".18"/><stop offset="100%" stop-color="${stroke}" stop-opacity="0"/>
      </linearGradient></defs>
      ${[50, 95, 140, 185].map((y) => `<line x1="0" y1="${y}" x2="750" y2="${y}" stroke="#eaf0f7" stroke-dasharray="5 5"/>`).join('')}
      <path d="${shape.area}" fill="url(#${gradientId})"/>
      <path d="${shape.line}" stroke="${stroke}" stroke-width="2.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  function sparkPath(values) {
    return lineShape(values, 80, 32, 2).line;
  }

  function donutGradient(spec) {
    let cursor = 0;
    const stops = spec.split(',').map((pair) => {
      const [value, color] = pair.split(':');
      const start = cursor;
      cursor += num(value);
      return `${color} ${start}% ${cursor}%`;
    });
    return `conic-gradient(${stops.join(',')})`;
  }

  /** 把 HTML 中的 data-* 占位符替换为图标 / 迷你趋势 / 环形图 */
  function hydrate(root = document) {
    $$('[data-icon]', root).forEach((el) => {
      el.innerHTML = icon(el.dataset.icon, num(el.dataset.iconSize) || 17);
    });
    $$('[data-spark]', root).forEach((svg) => {
      const values = svg.dataset.spark.split(',').map(Number);
      svg.innerHTML = `<path d="${sparkPath(values)}" stroke="${svg.dataset.sparkColor || '#18ab92'}" fill="none" stroke-width="2" stroke-linecap="round"/>`;
    });
    $$('[data-donut]', root).forEach((el) => {
      el.style.background = donutGradient(el.dataset.donut);
    });
  }

  /* ----------------------------- Toast ----------------------------- */
  let toastTimer = null;
  function toast(message) {
    let el = $('#fpToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'fpToast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.innerHTML = `${icon('circle-check', 16)}<span>${safe(message)}</span>`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.remove(), 2800);
  }

  /* ----------------------------- 壳层 ----------------------------- */
  function sidebarHTML() {
    const pending = pendingRisks().length;
    return `
      <div class="brand">
        <div class="brand-logo">${icon('chart-no-axes-combined', 23)}</div>
        <div>
          <div class="brand-name">FundPilot${IS_ADVISOR ? '<span style="font-size:11px;color:#62dfc5"> PRO</span>' : ''}</div>
          <div class="brand-sub">${IS_ADVISOR ? 'ADVISOR WORKSPACE' : 'INTELLIGENT WEALTH'}</div>
        </div>
      </div>
      <div class="side-label">${IS_ADVISOR ? '投顾业务' : '我的财富'}</div>
      <div class="nav-container">
        ${NAV.map(([key, label, ico]) => `
          <a href="${key}.html" class="nav-item ${PAGE === key ? 'active' : ''}">
            ${icon(ico, 18)}<span class="nav-label">${label}</span>
            ${IS_ADVISOR && key === 'risks' ? `<span class="nav-pill" id="riskNavPill" ${pending ? '' : 'hidden'}>${pending}</span>` : ''}
          </a>`).join('')}
      </div>
      <div class="side-bottom">
        <div class="side-help">
          <div class="side-help-title">${icon('sparkles', 17)} AI 助手已就绪</div>
          <p>${IS_ADVISOR ? '根据客户、行情与组合数据生成投研建议，关键操作需人工复核。' : '随时查询你的持仓、配置与风险，所有回复均为原型演示。'}</p>
          <button type="button" data-chat>开启 AI 对话 ${icon('chevron-right', 12)}</button>
        </div>
        <div class="account">
          <div class="avatar">${IS_ADVISOR ? '林' : '陈'}</div>
          <div>
            <div class="account-name">${IS_ADVISOR ? '林予安 · 高级投顾' : '陈女士 · 财富账户'}</div>
            <div class="account-role">${IS_ADVISOR ? '投顾业务演示账号' : `${RISK_NAMES[state.risk] || '平衡型'}投资者 / R${state.risk}`}</div>
          </div>
        </div>
      </div>`;
  }

  function topbarHTML() {
    const unread = unreadNotices().length;
    return `
      <div class="topbar">
        <div class="breadcrumbs">
          <span>${IS_ADVISOR ? '投顾业务平台' : '财富管理中心'}</span>
          ${icon('chevron-right', 12)}<b>${navTitle(PAGE)}</b>
        </div>
        <div class="top-actions">
          <span class="demo-tag">● 演示环境 · 非真实交易</span>
          <span class="date-text">2026年11月13日 · 周五</span>
          <button class="round-icon" data-open-notices title="通知" type="button">
            ${icon('bell', 18)}<i class="notice-dot" ${unread ? '' : 'hidden'}></i>
          </button>
          <div class="avatar" style="width:29px;height:29px;font-size:11px">${IS_ADVISOR ? '林' : '陈'}</div>
        </div>
      </div>`;
  }

  function renderShell() {
    const sidebar = $('#sidebar');
    if (sidebar) sidebar.innerHTML = sidebarHTML();
    const topbar = $('#topbar');
    if (topbar) topbar.innerHTML = topbarHTML();

    const chatButton = document.createElement('button');
    chatButton.className = 'chat-floating';
    chatButton.type = 'button';
    chatButton.title = '打开 AI 助手';
    chatButton.setAttribute('data-chat', '');
    chatButton.innerHTML = icon('bot', 25);
    document.body.appendChild(chatButton);

    if (!$('#drawerRoot')) {
      const drawerRoot = document.createElement('div');
      drawerRoot.id = 'drawerRoot';
      document.body.appendChild(drawerRoot);
    }
    if (!$('#modalRoot')) {
      const modalRoot = document.createElement('div');
      modalRoot.id = 'modalRoot';
      document.body.appendChild(modalRoot);
    }
    hydrate();
  }

  function refreshNoticeDot() {
    const dot = $('.notice-dot');
    if (dot) dot.hidden = unreadNotices().length === 0;
  }

  function refreshRiskPill() {
    const pill = $('#riskNavPill');
    if (!pill) return;
    const count = pendingRisks().length;
    pill.textContent = count;
    pill.hidden = count === 0;
  }

  /* ----------------------------- 抽屉 ----------------------------- */
  function closeDrawer() {
    const root = $('#drawerRoot');
    if (root) root.innerHTML = '';
  }

  function openDrawer(html, large) {
    const root = $('#drawerRoot');
    root.innerHTML = `<div class="overlay" data-overlay><div class="drawer ${large ? 'large' : ''}">${html}</div></div>`;
    const overlay = $('[data-overlay]', root);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) closeDrawer();
    });
  }

  /* ----------------------------- 通知抽屉 ----------------------------- */
  function noticeIcon(type) {
    if (type === 'risk') return 'shield-alert';
    if (type === 'approval') return 'clipboard-check';
    if (type === 'report') return 'file-text';
    if (type === 'cashflow') return 'arrow-left-right';
    return 'bell';
  }

  function openNotices() {
    const list = DATA.notifications[MODE] || [];
    openDrawer(`
      <div class="drawer-top">
        <div>
          <div class="drawer-title">通知中心</div>
          <div class="drawer-sub">${IS_ADVISOR ? '风险告警 / 待审批方案 / 报告复核' : '组合体检与定投等运营通知'} · 未读 ${unreadNotices().length} 条</div>
        </div>
        <button class="x-btn" type="button" data-close>${icon('x', 18)}</button>
      </div>
      <div class="drawer-body">
        ${list.length ? list.map((n) => `
          <div class="notice-item" data-notice="${n.id}" data-href="${n.href}">
            <div class="notice-icon">${icon(noticeIcon(n.type), 17)}</div>
            <div class="notice-main">
              <div class="notice-title">${state.readNotices.includes(n.id) ? '' : '<i class="unread-mark"></i>'}${safe(n.title)}</div>
              <div class="notice-desc">${safe(n.desc)}</div>
              <div class="notice-time">${safe(n.time)} · 点击查看对应页面</div>
            </div>
            ${icon('chevron-right', 14)}
          </div>`).join('') : '<div class="notice-empty">暂无通知</div>'}
        <div class="footnote">原型通知仅用于演示未读提示与跳转，不连接真实消息服务。</div>
      </div>`);
  }

  /* ----------------------------- AI 对话 ----------------------------- */
  const QUICK_PROMPTS = IS_ADVISOR
    ? ['总结今日客户风险', '诊断陈悦的客户组合', '解释SAA与TAA的偏离', '生成客户报告提纲']
    : ['帮我诊断当前组合', '我的风险等级适合什么基金？', '解释这份调仓建议', '如何做基金定投？'];

  function chatMessagesHTML() {
    return state.chat.map((m) => `<div class="chat-bubble ${m.who}">${safe(m.text)}</div>`).join('');
  }

  function scrollChat() {
    const box = $('#chatScroll');
    if (box) box.scrollTop = box.scrollHeight;
    const input = $('#chatInput');
    if (input) input.focus();
  }

  function renderChatMessages() {
    const box = $('#chatMessages');
    if (box) box.innerHTML = chatMessagesHTML();
    scrollChat();
  }

  function chatDrawer() {
    openDrawer(`
      <div class="drawer-top">
        <div>
          <div class="drawer-title" style="display:flex;align-items:center;gap:8px">${icon('sparkles', 20)} ${IS_ADVISOR ? '投顾 Copilot' : 'AI 理财助手'}</div>
          <div class="drawer-sub">原型演示 · 模拟数据与预设回复</div>
        </div>
        <button class="x-btn" type="button" data-close>${icon('x', 18)}</button>
      </div>
      <div class="drawer-body" id="chatScroll">
        <div class="chat-intro">
          <div class="assistant-mark">${icon('bot', 21)}</div>
          <h3>${IS_ADVISOR ? '你好，我是你的投顾 AI 助手' : '你好，我是你的 AI 理财研究伙伴'}</h3>
          <p>${IS_ADVISOR ? '我可以解释组合风险、准备客户沟通要点、辅助生成投资方案草稿。' : '我可以帮助解读你的基金持仓、风险承受能力和资产配置方案。'}</p>
        </div>
        <div class="quick-prompts">
          ${QUICK_PROMPTS.map((p) => `<button type="button" data-chat="${safe(p)}">${safe(p)}</button>`).join('')}
        </div>
        <div id="chatMessages">${chatMessagesHTML()}</div>
      </div>
      <div class="chat-bottom">
        <form class="chat-form" id="chatForm">
          <input id="chatInput" autocomplete="off" placeholder="输入你的问题，按 Enter 发送..." maxlength="300"/>
          <button type="submit" aria-label="发送消息">${icon('send', 18)}</button>
        </form>
        <div class="chat-disclaimer">演示型预设回复 · 无实时模型连接 · 不构成投资建议</div>
      </div>`);
    scrollChat();
  }

  function replyFor(question) {
    if (IS_ADVISOR) {
      if (/SAA|TAA|战略|战术|偏离/.test(question)) {
        return '【SAA / TAA 双层配置 · 演示】\nSAA（战略资产配置）定义长期基准权重与区间带，是组合的"锚"；TAA（战术资产配置）在区间带内做阶段性超低配。\n示例：均衡增长 01 号 SAA 权益 40%（区间 32%–48%），当前 TAA 权益 43%（+3pp）；若偏离超过 ±3pp 需提交 TAA 调整审批。\n最终组合从公募基金池按风格、费率、流动性与集中度约束构建，单基金 ≤25%、单管理人 ≤35%。';
      }
      if (/陈悦|客户组合|诊断/.test(question)) {
        return '【客户组合诊断 · 演示】\n客户：陈悦（R2 稳健型，期限 4 年，流动性中）\n1. 当前引用「均衡增长 01 号」（R3），风险等级高于客户画像，KYC 硬约束不通过，需重新匹配策略。\n2. 组合实际权益 44%，位于 SAA 区间 32%–48% 内，但相对基准偏离 +4pp，TAA 需评估。\n3. 建议：策略库重新匹配 → 生成 SAA/TAA 草案 → 基金层调整 → 投顾复核 → 合规审批。';
      }
      if (/今日|风险|告警|待办/.test(question)) {
        return '【今日投顾简报 · 演示】\n在管客户：286 人；待处理风险：6 项（含 2 项 KYC 适配）；待审方案：7 份。\n优先级一：陈悦策略风险等级不匹配。\n优先级二：赵明远 SAA 权益权重越界。\n优先级三：积极成长 02 号 TAA 偏离超限。\n所有事项均应保留数据来源、审阅人员及操作记录。';
      }
      if (/策略|均值方差|风险平价|优化|配置|匹配/.test(question)) {
        return '【策略匹配与双层配置 · 演示】\n1. 先按 KYC 硬约束过滤（风险等级、期限、流动性、起投金额），再按目标契合度、回撤、夏普、稳定性加权评分排序。\n2. SAA 定大类基准与区间带，TAA 在区间内做战术偏离，偏离阈值与跟踪误差需人工复核。\n3. 基金层从公募基金池按风格、费率、流动性与集中度约束构建，单基金 ≤25%、单管理人 ≤35%。';
      }
      if (/报告|沟通|提纲/.test(question)) {
        return '【报告草案提纲 · 演示】\n一、客户目标、风险测评与适当性\n二、现有持仓与投资表现\n三、风险分析、集中度与配置偏离\n四、策略建议及情景比较\n五、费用、风险提示与数据来源\n六、投顾复核和合规审批记录。';
      }
      return '【投顾 AI 示例回复】\n我可以将该问题拆解为：客户画像 → 数据校验 → 量化计算 → 风险规则检查 → 解释及报告。当前原型未连接实时行情、模型推理或交易系统，可点击相关模块进一步查看模拟流程。';
    }
    if (/调仓|跟调|建议|调出|调入/.test(question)) {
      return '【调仓建议解读 · 演示】\n本次建议由投顾基于你的 R3 画像与最新持仓生成：\n1. 调出部分债券与权益基金，降低单只基金集中度。\n2. 调入短债、宽基指数与黄金基金，提升分散度。\n3. 调仓不会自动执行：需你核对后在「调仓建议」页点击"确认跟调"；确认后交易报送 TA，TA 登记确认后才更新持仓。若你不操作，持仓保持不变。';
    }
    if (/最大回撤|波动率|风险/.test(question)) {
      return '【风险指标解读 · 演示】\n波动率衡量收益上下波动的幅度；最大回撤衡量区间高点至低点的最大损失幅度。两者不能互相替代。\n你的示例画像为 R3 平衡型，选择基金还应关注持有期、产品风险等级及资金需求。';
    }
    if (/诊断|持仓|组合/.test(question)) {
      return '【你的组合诊断 · 演示】\n1. 资产结构：权益约 42%，债券约 34%，货币约 15%，黄金约 9%。\n2. 目前需复核债券基金集中度与宽基指数配置不足。\n3. 可在"调仓建议"中查看投顾推送方案，确认跟调后才会创建调仓交易。\n这不是自动调仓指令，交易应由你主动确认。';
    }
    if (/债券|筛选|基金/.test(question)) {
      return '【基金筛选思路 · 演示】\n先依据风险承受能力确定可投类型，再核对基金费率、投资范围、久期、历史回撤、管理团队、流动性和持有期限。\n过往收益不代表未来表现，建议通过"基金超市"对比候选产品，而不是只按收益率排序。';
    }
    if (/定投/.test(question)) {
      return '【定投知识 · 演示】\n定投是按固定节奏投入资金，有助于形成纪律，但不能消除市场风险，也不能保证盈利。需要提前确定资金安排、可接受亏损、产品适当性和退出条件。';
    }
    if (/配置|解释|权重/.test(question)) {
      return '【配置逻辑 · 演示】\n权益类有较高波动，债券类侧重稳定性，货币类改善流动性，黄金类可提供一定的多元化作用但同样可能波动。\n示例比例由 R3 规则演示生成，正式配置需经风险测评、约束优化和产品适当性校验。';
    }
    return '【AI 理财助手 · 演示】\n我可以解释基金产品、组合配置、波动和回撤等概念，也能说明当前持仓的模拟风险信号。请告诉我你希望了解的基金类型、投资期限或风险问题。';
  }

  function sendChat(text) {
    const question = String(text || '').trim();
    if (!question) return;
    if (!$('#chatForm')) chatDrawer();

    state.chat.push({ who: 'user', text: question });
    persist();
    renderChatMessages();

    const box = $('#chatMessages');
    if (box) {
      box.insertAdjacentHTML('beforeend', '<div class="chat-bubble assistant" id="typingBubble"><span class="typing"><i></i><i></i><i></i></span></div>');
    }
    scrollChat();

    setTimeout(() => {
      state.chat.push({ who: 'assistant', text: replyFor(question) });
      persist();
      if ($('#chatMessages')) renderChatMessages();
    }, 380);
  }

  function openChat(prompt) {
    if (!$('#chatForm')) chatDrawer();
    if (prompt) sendChat(prompt);
    else scrollChat();
  }

  /* ----------------------------- 弹窗 ----------------------------- */
  function closeModal() {
    const root = $('#modalRoot');
    if (root) root.innerHTML = '';
  }

  function openModal({ title, sub = '', body = '', footer = '' }) {
    const root = $('#modalRoot');
    root.innerHTML = `
      <div class="modal-overlay" data-modal-overlay>
        <div class="modal">
          <div class="modal-head">
            <div>
              <div class="modal-title">${safe(title)}</div>
              ${sub ? `<div class="modal-sub">${safe(sub)}</div>` : ''}
            </div>
            <button class="x-btn" type="button" data-modal-close>${icon('x', 18)}</button>
          </div>
          <div class="modal-body">${body}</div>
          <div class="modal-foot">${footer}</div>
        </div>
      </div>`;
    const overlay = $('[data-modal-overlay]', root);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) closeModal();
    });
  }

  /* ----------------------------- 全局事件 ----------------------------- */
  document.addEventListener('click', (event) => {
    const closeBtn = event.target.closest('[data-close]');
    if (closeBtn) { closeDrawer(); return; }

    const modalClose = event.target.closest('[data-modal-close]');
    if (modalClose) { closeModal(); return; }

    const chatBtn = event.target.closest('[data-chat]');
    if (chatBtn) { openChat(chatBtn.dataset.chat); return; }

    const noticeBtn = event.target.closest('[data-open-notices]');
    if (noticeBtn) { openNotices(); return; }

    const fundDetail = event.target.closest('[data-fund-detail]');
    if (fundDetail) { openFundDrawer(fundDetail.dataset.fundDetail); return; }

    const buyBtn = event.target.closest('[data-buy]');
    if (buyBtn) { openPurchaseModal(buyBtn.dataset.buy); return; }

    const redeemBtn = event.target.closest('[data-redeem]');
    if (redeemBtn) { openRedeemModal(redeemBtn.dataset.redeem); return; }

    const pushAdviceBtn = event.target.closest('[data-push-advice]');
    if (pushAdviceBtn) {
      toast(`已向 ${pushAdviceBtn.dataset.pushAdvice} 推送调仓建议，有效期 3 个交易日（演示）`);
      return;
    }

    const favBtn = event.target.closest('[data-fav]');
    if (favBtn) {
      const code = favBtn.dataset.fav;
      const wasFavorite = state.favorites.includes(code);
      state.favorites = wasFavorite ? state.favorites.filter((c) => c !== code) : [...state.favorites, code];
      persist();
      if (favBtn.closest('#drawerRoot')) openFundDrawer(code);
      else if ($('#fundGrid')) renderFunds();
      toast('自选基金已更新（仅演示）');
      return;
    }

    const strategyDetail = event.target.closest('[data-strategy-detail]');
    if (strategyDetail) { openStrategyDrawer(strategyDetail.dataset.strategyDetail); return; }

    const strategyUse = event.target.closest('[data-strategy-use]');
    if (strategyUse) {
      const strategy = strategyById(strategyUse.dataset.strategyUse);
      if (strategy) {
        strategyState.strategyId = strategy.id;
        strategyState.taa = [...strategy.taa];
        closeDrawer();
        setStrategyTab('config');
        renderKyc();
        toast(`已选择「${strategy.name}」，进入客户配置（演示）`);
      }
      return;
    }

    const clientBtn = event.target.closest('[data-client]');
    if (clientBtn) { openClientDrawer(clientBtn.dataset.client); return; }

    const noticeItem = event.target.closest('[data-notice]');
    if (noticeItem) {
      const id = noticeItem.dataset.notice;
      if (!state.readNotices.includes(id)) {
        state.readNotices.push(id);
        persist();
        refreshNoticeDot();
      }
      if (noticeItem.dataset.href) location.href = noticeItem.dataset.href;
      return;
    }

    const toastBtn = event.target.closest('[data-toast]');
    if (toastBtn) { toast(toastBtn.dataset.toast); return; }
  });

  document.addEventListener('submit', (event) => {
    if (event.target.id !== 'chatForm') return;
    event.preventDefault();
    const input = $('#chatInput');
    const value = input ? input.value : '';
    if (!value.trim()) { if (input) input.focus(); return; }
    input.value = '';
    sendChat(value);
  });

  /* ----------------------------- 用户端页面 ----------------------------- */
  const TRENDS = {
    '1M': { values: [16, 20, 19, 22, 21, 26, 29, 24, 28, 31, 34, 34, 38], ret: '+1.82%' },
    '3M': { values: [8, 10, 12, 11, 15, 14, 21, 24, 20, 27, 26, 30, 31, 29, 33, 36, 40, 39, 44], ret: '+6.42%' },
    '6M': { values: [5, 11, 8, 12, 20, 16, 22, 26, 21, 32, 36, 33, 39, 43, 42, 51], ret: '+8.11%' },
    '1Y': { values: [6, 8, 12, 16, 15, 22, 25, 28, 26, 29, 36, 32, 39, 44, 42, 50], ret: '+7.20%' }
  };

  function renderTrend(range) {
    const trend = TRENDS[range] || TRENDS['3M'];
    const chart = $('#trendChart');
    if (!chart) return;
    chart.innerHTML = lineChart(trend.values, { id: 'investor', label: '资产收益趋势' });
    const ret = $('#trendReturn');
    if (ret) ret.textContent = trend.ret;
    $$('#rangeChoice button').forEach((btn) => btn.classList.toggle('active', btn.dataset.range === range));
  }

  function initOverview() {
    if ($('#rangeChoice')) {
      $$('#rangeChoice button').forEach((btn) => {
        btn.addEventListener('click', () => renderTrend(btn.dataset.range));
      });
      renderTrend('3M');
    }
    const advisorChart = $('#advisorTrendChart');
    if (advisorChart) {
      advisorChart.innerHTML = lineChart([10, 13, 12, 16, 18, 17, 20, 22, 20, 25, 27, 26, 29, 34, 31, 37], {
        id: 'advisor', color: '#0da59b', label: '管理资产趋势'
      });
    }
    refreshCashSummary();
  }

  /* ----------------------------- 基金超市 ----------------------------- */
  let fundKeyword = '';
  let fundType = '全部';

  function fundTagClass(type) {
    if (type === '权益') return 'blue';
    if (type === '债券') return 'green';
    if (type === '黄金') return 'gold';
    return '';
  }

  function fundCard(fund) {
    const favorite = state.favorites.includes(fund.code);
    return `
      <div class="fund-card">
        <div class="fund-card-top">
          <span class="tag ${fundTagClass(fund.type)}">${fund.type}基金</span>
          <span class="tag">${fund.risk}</span>
        </div>
        <h3 data-fund-detail="${fund.code}" style="cursor:pointer">${safe(fund.name)}</h3>
        <div class="fund-code">${fund.code} · ${fund.unit}</div>
        <div class="fund-return">${fund.ret}</div>
        <div class="small-muted">近一年收益率 · 模拟</div>
        <div class="fund-card-footer">
          <span class="small-muted">模拟单位净值 ${fund.net}</span>
          <span class="inline-actions">
            <button class="btn btn-sm btn-primary" type="button" data-buy="${fund.code}">申购</button>
            <button class="btn btn-sm btn-outline" type="button" data-fund-detail="${fund.code}">详情</button>
            <button class="btn btn-sm ${favorite ? 'btn-light' : 'btn-outline'}" type="button" data-fav="${fund.code}">${favorite ? '✓ 已自选' : '+ 自选'}</button>
          </span>
        </div>
      </div>`;
  }

  function renderFunds() {
    const grid = $('#fundGrid');
    if (!grid) return;
    const keyword = fundKeyword.trim().toLowerCase();
    const found = DATA.funds.filter((f) => !f.poolOnly && (fundType === '全部' || f.type === fundType) && `${f.name}${f.code}`.toLowerCase().includes(keyword));
    grid.innerHTML = found.length ? found.map(fundCard).join('') : '<div class="empty">没有找到匹配的基金产品</div>';
    const empty = grid.querySelector('.empty');
    if (empty) empty.style.gridColumn = '1 / -1';
  }

  function openFundDrawer(code) {
    const fund = DATA.funds.find((f) => f.code === code);
    if (!fund) return;
    openDrawer(`
      <div class="drawer-top">
        <div>
          <div class="drawer-title">基金详情</div>
          <div class="drawer-sub">${fund.code} · 模拟产品数据</div>
        </div>
        <button class="x-btn" type="button" data-close>${icon('x', 18)}</button>
      </div>
      <div class="drawer-body">
        <div class="fund-detail-head">
          <div class="fund-icon" style="width:42px;height:42px;font-size:14px">${fund.type[0]}</div>
          <div>
            <h3>${safe(fund.name)}</h3>
            <span class="tag ${fundTagClass(fund.type)}">${fund.type}基金</span>
            <span class="tag" style="margin-left:5px">${fund.risk}</span>
          </div>
        </div>
        <div class="kv-grid">
          <div><label>近一年收益率</label><b class="positive">${fund.ret}</b></div>
          <div><label>模拟单位净值</label><b>${fund.net}</b></div>
          <div><label>年化波动率</label><b>${fund.vol}</b></div>
          <div><label>最大回撤（模拟）</label><b class="negative">${fund.drawdown}</b></div>
        </div>
        <div class="subsection">产品说明</div>
        <p class="section-subtext" style="margin-top:0">${safe(fund.desc)}</p>
        <div class="subsection">费率表</div>
        <div style="border:1px solid #edf1f7;border-radius:11px;padding:4px 14px">
          <div class="fee-row"><span>申购费</span><strong>${fund.fee.buy}</strong></div>
          <div class="fee-row"><span>赎回费</span><strong>${fund.fee.redeem}</strong></div>
          <div class="fee-row"><span>管理费（年）</span><strong>${fund.fee.manage}</strong></div>
        </div>
        <div class="subsection">历史净值走势（模拟）</div>
        ${lineChart(fund.navs, { id: `fund-${fund.code}`, height: 140, label: `${fund.name} 净值走势` })}
        <div class="row" style="display:flex;gap:9px;margin-top:15px;flex-wrap:wrap">
          <button class="btn btn-primary" type="button" data-buy="${fund.code}">${icon('plus', 15)} 申购该基金</button>
          <button class="btn btn-outline" type="button" data-chat="请解读 ${safe(fund.name)} 的风险收益特征">${icon('sparkles', 15)} AI 解读该基金</button>
          <button class="btn btn-outline" type="button" data-fav="${fund.code}">${state.favorites.includes(fund.code) ? '✓ 已自选' : '+ 加入自选'}</button>
        </div>
        <div class="footnote">以上净值、费率与风险指标均为演示数据，不构成任何投资建议。</div>
      </div>`, false);
  }

  function initFunds() {
    const search = $('#fundSearch');
    if (search) {
      search.addEventListener('input', (event) => {
        fundKeyword = event.target.value;
        renderFunds();
        event.target.focus();
      });
    }
    $$('#fundTypeChoice button').forEach((btn) => {
      btn.addEventListener('click', () => {
        fundType = btn.dataset.type;
        $$('#fundTypeChoice button').forEach((b) => b.classList.toggle('active', b === btn));
        renderFunds();
      });
    });
    const riskTag = $('#fundRiskTag');
    if (riskTag) riskTag.textContent = `当前风险评级：R${state.risk}`;
    renderFunds();
  }

  /* ----------------------------- 投顾调仓建议 ----------------------------- */
  const RISK_LABELS = { 1: 'R1 保守', 2: 'R2 稳健', 3: 'R3 平衡', 4: 'R4 成长', 5: 'R5 进取' };

  function isAdviceExpired(advice) {
    if (!advice.validUntil) return false;
    const end = new Date(`${advice.validUntil.replace(/\//g, '-')}T23:59:59`);
    if (Number.isNaN(end.getTime())) return false;
    return end.getTime() < new Date('2026-11-15T23:59:59').getTime();
  }

  function adviceStatusOf(advice) {
    const override = state.adviceStatus[advice.id];
    if (override) return override;
    if (advice.status === 'PENDING' && isAdviceExpired(advice)) return 'EXPIRED';
    return advice.status;
  }

  function adviceDisplayStatus(advice) {
    const status = adviceStatusOf(advice);
    if (status === 'CONFIRMED') {
      const transaction = ensureTransactions().find((tx) => tx.adviceId === advice.id);
      if (!transaction) return 'DONE';
      return transaction.status === '确认成功' ? 'DONE' : 'CONFIRMED';
    }
    return status;
  }

  const ADVICE_STATUS_META = {
    PENDING: ['待确认', 'gold'],
    CONFIRMED: ['已确认 · 交易待确认', 'blue'],
    DONE: ['已跟调完成', 'green'],
    FAILED: ['TA 确认失败', 'red'],
    REJECTED: ['已暂不跟调', ''],
    EXPIRED: ['已过期', '']
  };

  function currentAdvice() {
    return DATA.rebalanceAdvices.find((advice) => {
      const status = adviceDisplayStatus(advice);
      if (status === 'PENDING') return true;
      return status === 'CONFIRMED' && state.adviceStatus[advice.id] === 'CONFIRMED';
    });
  }

  function renderAdvice() {
    const content = $('#adviceContent');
    const empty = $('#adviceEmpty');
    if (!content || !empty) return;
    const active = currentAdvice();
    if (!active) {
      content.hidden = true;
      empty.hidden = false;
      renderAdviceHistory();
      return;
    }
    content.hidden = false;
    empty.hidden = true;

    const status = adviceDisplayStatus(active);
    const meta = ADVICE_STATUS_META[status] || ADVICE_STATUS_META.PENDING;
    const statusTag = $('#adviceStatusTag');
    if (statusTag) {
      statusTag.textContent = meta[0];
      statusTag.className = `tag ${meta[1]}`;
    }
    const setText = (id, value) => { const el = $(id); if (el) el.textContent = value; };
    setText('#adviceId', active.id);
    setText('#adviceAdvisor', active.advisor);
    setText('#advicePushedAt', active.pushedAt);
    setText('#adviceValid', active.validUntil);
    setText('#adviceReason', active.reason);
    setText('#adviceBasis', active.basis);

    const totals = $('#adviceTotals');
    if (totals) {
      totals.innerHTML = `
        <span class="tag red">调出 ${formatMoney(active.summary.sell)}</span>
        <span class="tag green">调入 ${formatMoney(active.summary.buy)}</span>
        <span class="tag blue">预计费用 ${formatMoney(active.summary.fee)}</span>
        <span class="tag gold">换手率 ${active.summary.turnover}</span>`;
    }

    const body = $('#adviceItemsBody');
    if (body) {
      body.innerHTML = active.items.map((item) => {
        const delta = item.toWeight - item.fromWeight;
        const actionClass = item.action === '调出' ? 'red' : item.action === '调入' ? 'green' : 'blue';
        const amountText = item.amount >= 0 ? `+${formatMoney(item.amount)}` : `-${formatMoney(Math.abs(item.amount))}`;
        return `<tr>
          <td><strong>${safe(item.name)}</strong><div class="small-muted" style="margin-top:4px">${item.code}</div></td>
          <td><span class="tag">${item.type}</span></td>
          <td><span class="tag ${actionClass}">${item.action}</span></td>
          <td>${item.fromWeight.toFixed(1)}%</td>
          <td><strong>${item.toWeight.toFixed(1)}%</strong></td>
          <td class="${delta >= 0 ? 'positive' : 'negative'}">${delta >= 0 ? '+' : ''}${delta.toFixed(1)}pp</td>
          <td class="${item.amount >= 0 ? 'positive' : 'negative'}">${amountText}</td>
        </tr>`;
      }).join('');
    }

    const assetRows = $('#adviceAssetRows');
    if (assetRows) {
      assetRows.innerHTML = ['权益', '债券', '货币', '黄金'].map((label, index) => {
        const delta = active.toAssets[index] - active.fromAssets[index];
        return `<div class="rebal-row">
          <span>${label}</span>
          <b>${active.fromAssets[index]}% → ${active.toAssets[index]}%</b>
          <span class="tag ${delta > 0 ? 'green' : delta < 0 ? 'red' : ''}">${delta >= 0 ? '+' : ''}${delta.toFixed(1)}pp</span>
        </div>`;
      }).join('');
    }

    const pending = pendingTransactionCount();
    const blocked = $('#adviceBlocked');
    if (blocked) {
      blocked.hidden = !(status === 'PENDING' && pending > 0);
      blocked.textContent = `您有 ${pending} 笔待登记确认交易，为避免资金重复占用，请先在交易记录中完成 TA 确认后再跟调。`;
    }
    const confirm = $('#confirmFollow');
    if (confirm) {
      confirm.disabled = status !== 'PENDING' || pending > 0;
      confirm.textContent = status === 'CONFIRMED' ? '已确认跟调' : '确认跟调';
    }
    const defer = $('#deferAdvice');
    if (defer) defer.disabled = status !== 'PENDING';
    const confirmedHint = $('#adviceConfirmedHint');
    if (confirmedHint) {
      confirmedHint.hidden = status !== 'CONFIRMED';
      confirmedHint.textContent = '已确认跟调，调仓交易已报送 TA 并处于待登记确认状态；TA 确认后持仓才会更新。';
    }
    renderAdviceHistory();
  }

  function renderAdviceHistory() {
    const body = $('#adviceHistoryBody');
    if (!body) return;
    const active = currentAdvice();
    const rows = DATA.rebalanceAdvices
      .filter((advice) => !active || advice.id !== active.id)
      .map((advice) => {
        const status = adviceDisplayStatus(advice);
        const meta = ADVICE_STATUS_META[status] || ADVICE_STATUS_META.EXPIRED;
        return `<tr>
          <td><strong>${advice.id}</strong></td>
          <td>${advice.pushedAt}</td>
          <td>${safe(advice.reason)}</td>
          <td>${formatMoney(advice.summary.sell)}</td>
          <td><span class="tag ${meta[1]}">${meta[0]}</span></td>
        </tr>`;
      });
    body.innerHTML = rows.length ? rows.join('') : '<tr><td colspan="5"><div class="empty">暂无历史建议</div></td></tr>';
  }

  function openAdviceConfirm(advice) {
    openModal({
      title: '确认跟调',
      sub: `建议 ${advice.id} · 有效期至 ${advice.validUntil}`,
      body: `
        <div class="summary-box">
          <div class="summary-top">本次调仓摘要</div>
          <div class="profile-item"><span>调出金额</span><strong class="negative">-${formatMoney(advice.summary.sell)}</strong></div>
          <div class="profile-item"><span>调入金额</span><strong class="positive">+${formatMoney(advice.summary.buy)}</strong></div>
          <div class="profile-item"><span>预计费用</span><strong>${formatMoney(advice.summary.fee)}</strong></div>
          <div class="profile-item"><span>换手率</span><strong>${advice.summary.turnover}</strong></div>
        </div>
        <div class="role-banner">确认后系统将创建调仓交易并报送 TA（待登记确认）；TA 确认前持仓保持不变。您也可以暂不跟调，持仓不会发生任何变化。</div>`,
      footer: `<button class="btn btn-outline" type="button" data-modal-close>再想想</button><button class="btn btn-primary" type="button" id="adviceConfirmFinal">确认跟调</button>`
    });
    $('#adviceConfirmFinal').addEventListener('click', () => {
      state.adviceStatus[advice.id] = 'CONFIRMED';
      persist();
      createTransaction({
        type: '基金调仓',
        fundName: `组合调仓 · ${advice.items.length} 只基金`,
        amount: '—',
        detail: `调出 ${formatMoney(advice.summary.sell)} · 调入 ${formatMoney(advice.summary.buy)} · 已报送 TA`,
        effect: { kind: 'rebalance', items: advice.items, fee: advice.summary.fee },
        adviceId: advice.id
      });
      closeModal();
      renderAdvice();
      toast('已确认跟调，调仓交易已报送 TA，等待登记确认（演示）');
    });
  }

  function initRebalanceAdvice() {
    renderAdvice();
    const confirm = $('#confirmFollow');
    if (confirm) {
      confirm.addEventListener('click', () => {
        const active = currentAdvice();
        if (active && adviceDisplayStatus(active) === 'PENDING') openAdviceConfirm(active);
      });
    }
    const defer = $('#deferAdvice');
    if (defer) {
      defer.addEventListener('click', () => {
        const active = currentAdvice();
        if (!active) return;
        state.adviceStatus[active.id] = 'REJECTED';
        persist();
        renderAdvice();
        toast('已暂不跟调，当前持仓保持不变');
      });
    }
    const ask = $('#askAdvisor');
    if (ask) {
      ask.addEventListener('click', () => openChat('我想咨询投顾推送的这份调仓建议，请解释调出调入理由和风险'));
    }
    const askEmpty = $('#askAdvisorEmpty');
    if (askEmpty) askEmpty.addEventListener('click', () => openChat('我想了解当前是否有新的调仓建议'));
  }

  /* ----------------------------- 持仓 ----------------------------- */
  function initHoldings() {
    const table = $('#holdingsBody');
    if (!table) return;
    const holdings = ensureHoldings();
    table.innerHTML = holdings.length ? holdings.map((holding) => `
      <tr>
        <td>
          <div class="fund-name">
            <div class="fund-icon">${holding.type[0]}</div>
            <div><strong>${safe(holding.name)}</strong><div class="small-muted" style="margin-top:4px">${holding.code}</div></div>
          </div>
        </td>
        <td><span class="tag">${holding.type}</span></td>
        <td><strong>${formatMoney(holding.value)}</strong></td>
        <td class="${String(holding.pnl).startsWith('-') ? 'negative' : 'positive'}">${holding.pnl}<div class="small-muted" style="margin-top:4px">${holding.ret}</div></td>
        <td>${holdingShare(holding.value)}</td>
        <td>
          <button class="mini-link" type="button" data-redeem="${holding.code}">赎回</button>
          <button class="icon-button" type="button" data-fund-detail="${holding.code}">${icon('chevron-right', 16)}</button>
        </td>
      </tr>`).join('') : '<tr><td colspan="6"><div class="empty">暂无持仓</div></td></tr>';
    refreshCashSummary();
  }

  /* ----------------------------- 交易记录 ----------------------------- */
  function refreshPlanSummary() {
    const amount = $('#planAmount');
    if (amount) amount.textContent = `¥${state.planAmount.toLocaleString('zh-CN')}`;
    const day = $('#planDay');
    if (day) day.textContent = `每月 ${state.planDay} 日`;
    const funds = $('#planFunds');
    if (funds) funds.textContent = `${state.planFunds} 只`;
    const nextRun = $('#planNextRun');
    if (nextRun) nextRun.textContent = `2026年12月${state.planDay}日`;
    const tip = $('#planTip');
    if (tip) tip.textContent = `下次执行：2026年12月${state.planDay}日 · 模拟口径，不触发真实扣款`;
  }

  function openPlanEditor(initial) {
    const current = initial || { amount: state.planAmount, day: state.planDay, funds: state.planFunds };
    openModal({
      title: '调整定投计划',
      sub: '修改后将进行二次确认，并写入操作留痕（模拟）',
      body: `
        <div class="field">
          <label for="editAmount">每月定投金额（元）</label>
          <input id="editAmount" type="number" min="100" step="100" value="${current.amount}">
          <div class="hint">演示口径：仅更新界面，不触发真实扣款</div>
        </div>
        <div class="field">
          <label for="editDay">执行日</label>
          <select id="editDay">${Array.from({ length: 28 }, (_, i) => i + 1).map((d) => `<option value="${d}" ${d === current.day ? 'selected' : ''}>每月 ${d} 日</option>`).join('')}</select>
        </div>
        <div class="field">
          <label for="editFunds">定投基金数</label>
          <select id="editFunds">${[1, 2, 3, 4, 5].map((n) => `<option value="${n}" ${n === current.funds ? 'selected' : ''}>${n} 只</option>`).join('')}</select>
        </div>`,
      footer: `<button class="btn btn-outline" type="button" data-modal-close>取消</button><button class="btn btn-primary" type="button" id="planNext">下一步：确认变更</button>`
    });
    $('#planNext').addEventListener('click', () => {
      const amount = num($('#editAmount').value);
      const day = num($('#editDay').value);
      const funds = num($('#editFunds').value);
      if (amount < 100) { toast('每月定投金额需不少于 ¥100'); return; }
      openPlanConfirm({ amount, day, funds });
    });
  }

  function openPlanConfirm(next) {
    openModal({
      title: '确认调整定投计划',
      sub: '请再次确认变更内容',
      body: `
        <div class="summary-box">
          <div class="summary-top">变更摘要</div>
          <div class="profile-item"><span>每月定投金额</span><strong>¥${next.amount.toLocaleString('zh-CN')}</strong></div>
          <div class="profile-item"><span>执行日</span><strong>每月 ${next.day} 日</strong></div>
          <div class="profile-item"><span>定投基金数</span><strong>${next.funds} 只</strong></div>
        </div>
        <div class="role-banner">确认后仅更新演示界面并写入操作留痕，不会发起真实申购或扣款。</div>`,
      footer: `<button class="btn btn-outline" type="button" id="planBack">返回修改</button><button class="btn btn-primary" type="button" id="planConfirm">确认提交</button>`
    });
    $('#planBack').addEventListener('click', () => openPlanEditor(next));
    $('#planConfirm').addEventListener('click', () => {
      state.planAmount = next.amount;
      state.planDay = next.day;
      state.planFunds = next.funds;
      persist();
      refreshPlanSummary();
      closeModal();
      toast('定投计划已更新（模拟），本次操作已留痕');
    });
  }

  function renderTransactions() {
    const box = $('#transactionList');
    if (!box) return;
    const list = ensureTransactions();
    box.innerHTML = list.map((tx) => {
      const pending = tx.status === '待登记确认';
      const negative = String(tx.amount).startsWith('-');
      const tagClass = pending ? 'gold' : tx.status === '确认失败' ? 'red' : 'green';
      const iconName = tx.type === '基金赎回' || tx.type === '基金分红'
        ? 'arrow-left-right'
        : tx.type === '基金调仓' ? 'refresh-cw' : 'plus';
      const receiptText = tx.receipt
        ? (tx.receipt.result === 'failure'
          ? ` · TA ${tx.receipt.no} 确认失败：${tx.receipt.failReason}`
          : ` · TA ${tx.receipt.no} · 确认日 ${tx.receipt.date}`)
        : '';
      return `<div class="activity">
        <div class="activity-icon">${icon(iconName, 17)}</div>
        <div class="activity-detail">
          <b>${tx.type} · ${safe(tx.fundName)}</b>
          <p>${tx.time} · ${safe(tx.detail)}${receiptText}</p>
        </div>
        <div class="activity-right">
          <div class="${negative ? '' : 'positive'}">${safe(tx.amount)}</div>
          <div style="margin-top:5px;display:flex;align-items:center;gap:6px;justify-content:flex-end">
            <span class="tag ${tagClass}">${tx.status}</span>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  function buildTaReceipt(transaction) {
    const effect = transaction.effect || {};
    const fund = effect.code ? fundByCode(effect.code) : null;
    const isPurchase = effect.kind === 'purchase';
    const isRedeem = effect.kind === 'redeem';
    const isRebalance = effect.kind === 'rebalance';
    const nav = effect.nav || (fund ? Number(fund.net) : 0);
    const fee = effect.fee || 0;
    const buyTotal = isRebalance
      ? (effect.items || []).filter((item) => item.amount > 0).reduce((sum, item) => sum + item.amount, 0)
      : 0;
    const confirmedShares = isPurchase && nav ? (effect.amount - fee) / nav : (isRedeem ? effect.shares : null);
    const confirmedAmount = isPurchase ? effect.amount - fee : (isRedeem ? effect.amount - fee : buyTotal - fee);
    const reasonOptions = isPurchase
      ? ['基金暂停申购', '基金限购', '基金交易状态异常']
      : isRedeem
        ? ['基金暂停赎回', '赎回受限', '基金交易状态异常']
        : ['基金暂停申购', '基金暂停赎回', '基金交易状态异常'];
    return {
      no: makeTaNo(),
      date: taConfirmDate(),
      navLabel: isRebalance ? '多基金' : nav.toFixed(4),
      sharesLabel: confirmedShares ? confirmedShares.toFixed(2) : '',
      amountLabel: formatMoney(confirmedAmount),
      feeLabel: formatMoney(fee),
      navValue: nav,
      feeValue: fee,
      confirmedShares,
      confirmedAmount,
      isPurchase,
      isRedeem,
      isRebalance,
      reasonOptions
    };
  }

  function applyTaReceipt(transactionId, result, failReason, receipt) {
    const transaction = ensureTransactions().find((tx) => tx.id === transactionId);
    if (!transaction || transaction.status !== '待登记确认') return false;
    transaction.status = result === 'success' ? '确认成功' : '确认失败';
    transaction.receipt = {
      no: receipt.no,
      date: receipt.date,
      nav: receipt.navLabel,
      shares: receipt.sharesLabel,
      amount: receipt.amountLabel,
      fee: receipt.feeLabel,
      result,
      failReason: failReason || ''
    };
    if (result === 'success') applyTradeEffect(transaction.effect);
    if (result === 'failure' && transaction.adviceId) {
      state.adviceStatus[transaction.adviceId] = 'FAILED';
    }
    persist();
    renderTransactions();
    refreshCashSummary();
    window.dispatchEvent(new CustomEvent('fundpilot:ta-receipt', {
      detail: { id: transactionId, status: transaction.status }
    }));
    return true;
  }

  function openTaReceiptModal(transactionId) {
    const transaction = ensureTransactions().find((tx) => tx.id === transactionId);
    if (!transaction || transaction.status !== '待登记确认') return;
    const receipt = buildTaReceipt(transaction);
    openModal({
      title: '模拟 TA 回执',
      sub: '第三方基金注册登记机构确认（演示工具）',
      body: `
        <div class="summary-box" style="margin-bottom:14px">
          <div class="summary-top">订单信息</div>
          <div class="profile-item"><span>交易类型</span><strong>${transaction.type}</strong></div>
          <div class="profile-item"><span>基金 / 组合</span><strong>${safe(transaction.fundName)}</strong></div>
          <div class="profile-item"><span>申请金额 / 份额</span><strong>${safe(transaction.amount)}</strong></div>
        </div>
        <div class="kv-grid" style="margin-top:0">
          <div><label>TA 确认编号</label><b>${receipt.no}</b></div>
          <div><label>确认日期（T+1）</label><b>${receipt.date}</b></div>
          <div><label>确认净值（T 日）</label><b>${receipt.navLabel}</b></div>
          <div><label>确认${receipt.isPurchase ? '份额' : '金额'}</label><b>${receipt.isPurchase ? `${receipt.sharesLabel} 份` : receipt.amountLabel}</b></div>
          <div><label>手续费</label><b>${receipt.feeLabel}</b></div>
          <div><label>当前状态</label><b>待登记确认</b></div>
        </div>
        <div class="field">
          <label>TA 回执结果</label>
          <div class="choice" id="taResultChoice">
            <button type="button" data-ta-result="success" class="active">确认成功</button>
            <button type="button" data-ta-result="failure">确认失败</button>
          </div>
        </div>
        <div class="field" id="taFailWrap" hidden>
          <label for="taFailReason">失败原因</label>
          <select id="taFailReason">${receipt.reasonOptions.map((reason) => `<option value="${reason}">${reason}</option>`).join('')}</select>
        </div>
        <div class="role-banner">模拟第三方 TA 回执：确认成功后更新持仓与现金；确认失败则保持原状并展示失败原因。</div>`,
      footer: `<button class="btn btn-outline" type="button" data-modal-close>取消</button><button class="btn btn-primary" type="button" id="taSubmit">提交回执</button>`
    });

    let result = 'success';
    $$('#taResultChoice button').forEach((button) => {
      button.addEventListener('click', () => {
        result = button.dataset.taResult;
        $$('#taResultChoice button').forEach((item) => item.classList.toggle('active', item === button));
        const failWrap = $('#taFailWrap');
        if (failWrap) failWrap.hidden = result !== 'failure';
      });
    });

    $('#taSubmit').addEventListener('click', () => {
      const failReason = result === 'failure' ? $('#taFailReason').value : '';
      const applied = applyTaReceipt(transaction.id, result, failReason, receipt);
      if (!applied) return;
      closeModal();
      toast(result === 'success'
        ? 'TA 回执确认成功，持仓与现金已更新（演示）'
        : `TA 回执确认失败：${failReason}，持仓保持不变`);
    });
  }

  function initTransactions() {
    renderTransactions();
    refreshCashSummary();
    const edit = $('#editPlan');
    if (edit) edit.addEventListener('click', () => openPlanEditor());
    refreshPlanSummary();
  }

  /* ----------------------------- 申购 / 赎回 ----------------------------- */
  function openPurchaseModal(code) {
    const fund = fundByCode(code);
    if (!fund) return;
    closeDrawer();
    const highRisk = Number(String(fund.risk).replace('R', '')) > state.risk;
    openModal({
      title: '基金申购',
      sub: `${fund.name} · ${fund.code}`,
      body: `
        <div class="summary-box" style="margin-bottom:14px">
          <div class="summary-top">产品信息</div>
          <div class="profile-item"><span>风险等级</span><strong>${fund.risk}</strong></div>
          <div class="profile-item"><span>申购费率</span><strong>${fund.fee.buy}</strong></div>
          <div class="profile-item"><span>模拟净值（T 日）</span><strong>${fund.net}</strong></div>
          <div class="profile-item"><span>可用现金</span><strong>${formatMoney(availableCash())}</strong></div>
          <div class="profile-item"><span>交易状态</span><strong>${fund.liquidity || '开放申购'}</strong></div>
        </div>
        ${fund.liquidity && fund.liquidity !== '开放申购'
          ? `<div class="role-banner" style="margin-bottom:12px">该基金当前为「${fund.liquidity}」状态，销售端可受理申请，但 TA 可能确认失败（演示）。</div>`
          : ''}
        <div class="field">
          <label for="buyAmount">申购金额（元）</label>
          <input id="buyAmount" type="number" min="100" step="100" value="10000">
          <div class="hint">单笔最低 ¥100；申请后 T+1 由 TA 确认份额；可用现金 ${formatMoney(availableCash())}（已冻结待登记申购 ${formatMoney(pendingPurchaseAmount())}）</div>
        </div>
        ${highRisk ? `<div class="role-banner" style="margin-bottom:12px">该基金风险等级 ${fund.risk} 高于您当前画像 R${state.risk}，请确认已了解产品风险。</div>
          <label style="display:flex;gap:8px;align-items:flex-start;font-size:11px;color:#7f8da1;margin-bottom:8px">
            <input type="checkbox" id="buyRiskConfirm" style="margin-top:2px"> 本人已知晓风险，继续申购
          </label>` : ''}
        <div class="summary-box" style="margin:0">
          <div class="summary-top">预计结果 <span class="tag blue">模拟</span></div>
          <div class="profile-item"><span>预计份额</span><strong id="buyShares">—</strong></div>
          <div class="profile-item"><span>预计手续费</span><strong id="buyFee">—</strong></div>
        </div>`,
      footer: `<button class="btn btn-outline" type="button" data-modal-close>取消</button><button class="btn btn-primary" type="button" id="buySubmit">提交申购</button>`
    });
    const update = () => {
      const amount = num($('#buyAmount').value);
      const feeRate = (parseFloat(fund.fee.buy) || 0) / 100;
      const netAmount = amount - amount * feeRate;
      const shares = Number(fund.net) ? netAmount / Number(fund.net) : 0;
      $('#buyShares').textContent = `${shares.toFixed(2)} 份`;
      $('#buyFee').textContent = formatMoney(amount * feeRate);
    };
    $('#buyAmount').addEventListener('input', update);
    update();
    $('#buySubmit').addEventListener('click', () => {
      const amount = num($('#buyAmount').value);
      if (amount < 100) { toast('申购金额需不少于 ¥100'); return; }
      if (amount > availableCash()) {
        toast(`可用现金不足：当前可用 ${formatMoney(availableCash())}（含冻结待登记申购）`);
        return;
      }
      if (highRisk && !$('#buyRiskConfirm').checked) { toast('请先确认已知晓产品风险'); return; }
      const feeRate = (parseFloat(fund.fee.buy) || 0) / 100;
      const fee = amount * feeRate;
      createTransaction({
        type: '基金申购',
        fundName: fund.name,
        amount: `-${formatMoney(amount)}`,
        detail: `申购申请已报送 TA · 待登记确认 · 确认日 ${taConfirmDate()}`,
        effect: {
          kind: 'purchase',
          code: fund.code,
          amount,
          fee,
          nav: Number(fund.net),
          shares: Number(fund.net) ? (amount - fee) / Number(fund.net) : 0
        }
      });
      closeModal();
      toast('申购申请已提交，等待 TA 登记确认；可用现金已冻结该笔金额');
    });
  }

  function openRedeemModal(code) {
    const holding = ensureHoldings().find((item) => item.code === code);
    if (!holding) return;
    const fund = fundByCode(code);
    const net = fund ? Number(fund.net) : 0;
    const maxShares = net ? holding.value / net : 0;
    const feeRate = fund ? (parseFloat(fund.fee.redeem) || 0) / 100 : 0;
    closeDrawer();
    openModal({
      title: '基金赎回',
      sub: `${holding.name} · ${holding.code}`,
      body: `
        <div class="summary-box" style="margin-bottom:14px">
          <div class="summary-top">持仓信息</div>
          <div class="profile-item"><span>持仓市值</span><strong>${formatMoney(holding.value)}</strong></div>
          <div class="profile-item"><span>参考净值（T 日）</span><strong>${net.toFixed(4)}</strong></div>
          <div class="profile-item"><span>可赎回份额</span><strong>${maxShares.toFixed(2)} 份</strong></div>
          <div class="profile-item"><span>赎回状态</span><strong>${fund && fund.redeemStatus ? fund.redeemStatus : '开放赎回'}</strong></div>
        </div>
        ${fund && fund.redeemStatus === '暂停赎回'
          ? '<div class="role-banner" style="margin-bottom:12px">该基金当前暂停赎回，销售端可受理申请，但 TA 可能确认失败（演示）。</div>'
          : ''}
        <div class="field">
          <label for="redeemShares">赎回份额</label>
          <div style="display:flex;gap:8px">
            <input id="redeemShares" type="number" min="0" step="0.01" value="${maxShares.toFixed(2)}">
            <button class="btn btn-outline" type="button" id="redeemAll" style="min-width:88px">全部赎回</button>
          </div>
          <div class="hint">赎回费 ${fund ? fund.fee.redeem : '0.50%'} · 申请后 T+1 由 TA 确认，确认后资金进入现金账户</div>
        </div>
        <div class="summary-box" style="margin:0">
          <div class="summary-top">预计到账 <span class="tag blue">模拟</span></div>
          <div class="profile-item"><span>赎回金额</span><strong id="redeemCash">—</strong></div>
          <div class="profile-item"><span>赎回费</span><strong id="redeemFee">—</strong></div>
        </div>`,
      footer: `<button class="btn btn-outline" type="button" data-modal-close>取消</button><button class="btn btn-primary" type="button" id="redeemSubmit">提交赎回</button>`
    });
    const update = () => {
      const shares = num($('#redeemShares').value);
      const gross = shares * net;
      $('#redeemCash').textContent = formatMoney(gross * (1 - feeRate));
      $('#redeemFee').textContent = formatMoney(gross * feeRate);
    };
    $('#redeemShares').addEventListener('input', update);
    $('#redeemAll').addEventListener('click', () => {
      $('#redeemShares').value = maxShares.toFixed(2);
      update();
    });
    update();
    $('#redeemSubmit').addEventListener('click', () => {
      const shares = num($('#redeemShares').value);
      if (shares <= 0) { toast('请输入赎回份额'); return; }
      if (shares > maxShares + 0.001) { toast('赎回份额不能超过可赎回份额'); return; }
      const gross = shares * net;
      const fee = gross * feeRate;
      createTransaction({
        type: '基金赎回',
        fundName: holding.name,
        amount: `+${formatMoney(gross * (1 - feeRate))}`,
        detail: `赎回 ${shares.toFixed(2)} 份 · 已报送 TA · 确认日 ${taConfirmDate()}`,
        effect: { kind: 'redeem', code: holding.code, amount: gross, fee, nav: net, shares }
      });
      closeModal();
      toast('赎回申请已提交，等待 TA 登记确认；确认后资金进入现金账户');
    });
  }

  /* ----------------------------- 风险画像与问卷 ----------------------------- */
  const QUIZ = [
    { q: '您的投资经验更接近以下哪种情况？', options: [['几乎没有投资经验', 1], ['买过货币基金或银行理财', 2], ['有 1–3 年基金投资经验', 3], ['有 3 年以上多类资产投资经验', 4], ['熟悉权益类与衍生品，经验丰富', 5]] },
    { q: '若组合在一个月内下跌 10%，您会？', options: [['立即全部赎回', 1], ['赎回大部分', 2], ['观望不动', 3], ['继续持有并小幅补仓', 4], ['显著加仓', 5]] },
    { q: '您的投资计划期限是？', options: [['1 年以内', 1], ['1–3 年', 2], ['3–5 年', 3], ['5 年以上', 4], ['10 年以上', 5]] },
    { q: '这笔资金占您可投资资产的比重？', options: [['超过 80%', 1], ['60%–80%', 2], ['40%–60%', 3], ['20%–40%', 4], ['低于 20%', 5]] },
    { q: '您更接近哪种收益预期？', options: [['保本，接受 2% 左右年化', 1], ['接受小幅波动，追求 3%–5%', 2], ['接受中等波动，追求 5%–8%', 3], ['接受较大波动，追求 8%–12%', 4], ['追求 12% 以上，可承受大幅回撤', 5]] }
  ];
  const RISK_NAMES = { 1: '保守型', 2: '稳健型', 3: '平衡型', 4: '成长型', 5: '进取型' };
  const RISK_CONCLUSIONS = {
    1: '以保本与流动性为首要目标，建议以货币与短债类资产为主。',
    2: '可承受小幅波动，适合债券为主、权益为辅的稳健配置。',
    3: '接受适度波动，适合股债均衡的配置结构。',
    4: '可承受较大波动，可提高权益资产比例以追求长期增长。',
    5: '风险承受能力较高，可配置较高比例权益与商品资产，但需关注回撤。'
  };

  function openQuiz() {
    openModal({
      title: '风险承受能力测评',
      sub: '复用机构适当性问卷 · 5 题 · 演示计分',
      body: `
        <div id="quizForm">
          ${QUIZ.map((item, qi) => `
            <div class="quiz-q">
              <b>${qi + 1}. ${item.q}</b>
              <div class="quiz-opts">
                ${item.options.map(([label, score]) => `
                  <label><input type="radio" name="q${qi}" value="${score}">${label}</label>`).join('')}
              </div>
            </div>`).join('')}
        </div>`,
      footer: `<button class="btn btn-outline" type="button" data-modal-close>稍后再测</button><button class="btn btn-primary" type="button" id="quizSubmit">提交测评</button>`
    });
    $('#quizSubmit').addEventListener('click', () => {
      let total = 0;
      let answered = 0;
      QUIZ.forEach((_, index) => {
        const picked = $(`input[name="q${index}"]:checked`);
        if (picked) { total += num(picked.value); answered += 1; }
      });
      if (answered < QUIZ.length) { toast('请完成全部 5 道题目后再提交'); return; }
      const average = total / QUIZ.length;
      const level = average <= 1.6 ? 1 : average <= 2.4 ? 2 : average <= 3.4 ? 3 : average <= 4.2 ? 4 : 5;
      state.risk = level;
      persist();
      closeModal();
      refreshProfile(level);
      toast(`测评完成：当前风险等级 ${RISK_LABELS[level]}（演示）`);
    });
  }

  function refreshProfile(level) {
    const percent = [20, 40, 60, 80, 100][level - 1];
    const donut = $('#profileDonut');
    if (donut) donut.style.background = `conic-gradient(var(--accent) ${percent}%, #eef2f8 ${percent}% 100%)`;
    const levelText = $('#profileLevel');
    if (levelText) levelText.textContent = `R${level}`;
    const nameText = $('#profileLevelName');
    if (nameText) nameText.textContent = RISK_NAMES[level];
    const conclusion = $('#profileConclusion');
    if (conclusion) conclusion.textContent = RISK_CONCLUSIONS[level];
    const date = $('#profileDate');
    if (date) date.textContent = '2026/11/13';
    const conclusionTag = $('#profileTag');
    if (conclusionTag) conclusionTag.textContent = `当前评估有效 · ${RISK_LABELS[level]}`;
    const riskTag = $('#fundRiskTag');
    if (riskTag) riskTag.textContent = `当前风险评级：R${level}`;
  }

  function initProfile() {
    refreshProfile(state.risk);
    const button = $('#retakeQuiz');
    if (button) button.addEventListener('click', openQuiz);
  }

  /* ----------------------------- 投顾端页面 ----------------------------- */
  function clientTableRows(filtered) {
    return filtered.map((c) => `
      <tr>
        <td>
          <div class="fund-name">
            <div class="avatar" style="height:29px;width:29px;font-size:11px">${c.avatar}</div>
            <div><strong>${safe(c.name)}</strong><div class="small-muted" style="margin-top:4px">${c.id}</div></div>
          </div>
        </td>
        <td>${c.risk}</td>
        <td><strong>${c.aum}</strong></td>
        <td>${c.goal}</td>
        <td class="positive">${c.ret}</td>
        <td><span class="tag ${c.priority === '高' ? 'red' : 'blue'}">${c.status}</span></td>
        <td><button class="mini-link" type="button" data-client="${c.id}">查看详情 ${icon('chevron-right', 13)}</button></td>
      </tr>`).join('');
  }

  /* 客户 360 页：搜索 + 三维度多选筛选 */
  const clientFilters = { risk: [], status: [], priority: [] };
  let clientKeyword = '';

  function renderClientTable() {
    const box = $('#clientTable');
    if (!box) return;
    const keyword = clientKeyword.trim().toLowerCase();
    const filtered = DATA.clients.filter((c) => {
      const matchKeyword = !keyword || `${c.name}${c.id}${c.risk}`.toLowerCase().includes(keyword);
      const matchRisk = !clientFilters.risk.length || clientFilters.risk.includes(c.riskKey);
      const matchStatus = !clientFilters.status.length || clientFilters.status.includes(c.status);
      const matchPriority = !clientFilters.priority.length || clientFilters.priority.includes(c.priority);
      return matchKeyword && matchRisk && matchStatus && matchPriority;
    });
    box.innerHTML = filtered.length
      ? `<div class="table-wrap"><table><thead><tr><th>客户</th><th>风险画像</th><th>管理资产</th><th>投资目标</th><th>区间收益</th><th>关注事项</th><th>操作</th></tr></thead><tbody>${clientTableRows(filtered)}</tbody></table></div>`
      : '<div class="empty">没有匹配的客户</div>';
    const summary = $('#filterSummary');
    if (summary) {
      const count = clientFilters.risk.length + clientFilters.status.length + clientFilters.priority.length;
      summary.textContent = count ? `已选 ${count} 个筛选条件 · 匹配 ${filtered.length} 位客户` : `未设置筛选条件 · 共 ${filtered.length} 位客户`;
    }
  }

  function openClientDrawer(id) {
    const client = DATA.clients.find((c) => c.id === id);
    if (!client) return;
    const portfolio = (DATA.clientPortfolios || []).find((item) => item.clientId === id);
    const model = portfolio ? (DATA.modelPortfolios || []).find((item) => item.id === portfolio.modelId) : null;
    const strategy = model ? (DATA.strategies || []).find((item) => item.id === model.strategyId) : null;
    openDrawer(`
      <div class="drawer-top">
        <div>
          <div class="drawer-title">${safe(client.name)} · 客户 360</div>
          <div class="drawer-sub">客户编号 ${client.id} · 模拟客户数据</div>
        </div>
        <button class="x-btn" type="button" data-close>${icon('x', 18)}</button>
      </div>
      <div class="drawer-body">
        <div class="summary-box">
          <div class="summary-top">
            <span style="display:flex;gap:10px;align-items:center">
              <span class="avatar" style="height:38px;width:38px">${client.avatar}</span>
              ${safe(client.name)} <span class="tag green">${client.risk}</span>
            </span>
            <span class="tag ${client.priority === '高' ? 'red' : 'blue'}">优先级 ${client.priority}</span>
          </div>
          <p>${safe(client.note)}</p>
          <p style="margin-top:7px">当前策略：<b>${strategy ? strategy.name : '未匹配'}</b>${model ? ` · 模型组合 ${model.name}` : ''}</p>
        </div>
        <div class="client-meta">
          <div><label>管理资产</label><b>${client.aum}</b></div>
          <div><label>区间收益</label><b class="positive">${client.ret}</b></div>
          <div><label>投资目标</label><b>${client.goal}</b></div>
          <div><label>计划期限</label><b>${client.terms}</b></div>
          <div><label>投资期限（KYC）</label><b>${client.horizonYears} 年</b></div>
          <div><label>流动性需求</label><b>${client.liquidity}</b></div>
          <div><label>投资经验</label><b>${client.experience}</b></div>
          <div><label>持有基金</label><b>${client.products}</b></div>
        </div>
        <div class="subsection">AI 客户洞察</div>
        <div class="role-banner">综合风险画像、资产配置与投资限制：${safe(client.note)}。建议由投顾核对数据源、适当性和当前市况后决定是否调整。</div>
        <div class="subsection">建议操作</div>
        <div class="inline-actions">
          <button class="btn btn-primary" type="button" data-chat="帮我诊断${safe(client.name)}的客户组合">${icon('sparkles', 15)} AI 诊断</button>
          <a class="btn btn-outline" href="strategy.html?client=${encodeURIComponent(client.name)}&tab=config">基于 KYC 配置策略</a>
          <a class="btn btn-outline" href="reports.html?client=${encodeURIComponent(client.name)}">报告草案</a>
        </div>
        <div class="footnote">原型操作仅更新界面，不调用客户真实账户或证券交易系统。</div>
      </div>`, true);
  }

  function initClients() {
    const search = $('#clientSearch');
    if (search) {
      search.addEventListener('input', (event) => {
        clientKeyword = event.target.value;
        renderClientTable();
        event.target.focus();
      });
    }
    const toggle = $('#toggleFilter');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const panel = $('#filterPanel');
        if (!panel) return;
        panel.classList.toggle('show');
        toggle.classList.toggle('btn-light', panel.classList.contains('show'));
      });
    }
    $$('#filterPanel [data-filter-group]').forEach((chip) => {
      chip.addEventListener('click', () => {
        const group = chip.dataset.filterGroup;
        const value = chip.dataset.filterValue;
        const list = clientFilters[group];
        const index = list.indexOf(value);
        if (index >= 0) list.splice(index, 1);
        else list.push(value);
        chip.classList.toggle('active', index < 0);
        renderClientTable();
      });
    });
    const clear = $('#clearFilters');
    if (clear) {
      clear.addEventListener('click', () => {
        clientFilters.risk = [];
        clientFilters.status = [];
        clientFilters.priority = [];
        $$('#filterPanel .chip').forEach((chip) => chip.classList.remove('active'));
        renderClientTable();
      });
    }
    renderClientTable();
  }

  /* ----------------------------- 策略库与客户配置 ----------------------------- */
  const ASSET_LABELS = ['权益', '债券', '货币', '黄金'];
  const ASSET_COLORS = ['#0da59b', '#609cd8', '#efa952', '#958bdc'];
  const LIQUIDITY_RANK = { 高: 3, 中: 2, 低: 1 };

  const strategyState = {
    tab: 'library',
    keyword: '',
    risk: '全部',
    category: '全部',
    status: '全部',
    clientId: 'C1024',
    strategyId: null,
    taa: null
  };

  const strategyById = (id) => DATA.strategies.find((s) => s.id === id);
  const fundByCode = (code) => DATA.funds.find((f) => f.code === code);

  /** KYC 硬约束过滤 + 加权评分：目标契合 30% / 回撤 20% / 夏普 15% / 稳定性 15% / 收益 10% / 费率 10% */
  function evaluateMatch(client, strategy) {
    const riskNum = (value) => Number(String(value).replace('R', ''));
    const checks = [
      { label: `风险 ${strategy.risk} ≤ 客户 ${client.riskKey}`, pass: riskNum(strategy.risk) <= riskNum(client.riskKey) },
      { label: `期限 ${client.horizonYears} 年 ≥ ${strategy.minHorizon} 年`, pass: client.horizonYears >= strategy.minHorizon },
      { label: `流动性「${strategy.liquidity}」满足客户「${client.liquidity}」`, pass: LIQUIDITY_RANK[strategy.liquidity] >= LIQUIDITY_RANK[client.liquidity] }
    ];
    const goalScore = strategy.category === client.goalCategory ? 100 : (strategy.category === '多资产' ? 80 : 65);
    const score = Math.round(
      goalScore * 0.3 + strategy.scores.drawdown * 0.2 + strategy.scores.sharpe * 0.15 +
      strategy.scores.stability * 0.15 + strategy.scores.ret * 0.1 + strategy.scores.fee * 0.1
    );
    return { checks, pass: checks.every((item) => item.pass), score };
  }

  function currentConfigClient() {
    return DATA.clients.find((c) => c.id === strategyState.clientId) || DATA.clients[0];
  }

  function filteredStrategies() {
    const keyword = strategyState.keyword.trim().toLowerCase();
    return DATA.strategies.filter((s) => {
      const matchKeyword = !keyword || `${s.name}${s.id}${s.category}${s.styles.join('')}`.toLowerCase().includes(keyword);
      const matchRisk = strategyState.risk === '全部' || s.risk === strategyState.risk;
      const matchCategory = strategyState.category === '全部' || s.category === strategyState.category;
      const matchStatus = strategyState.status === '全部' || s.status === strategyState.status;
      return matchKeyword && matchRisk && matchCategory && matchStatus;
    });
  }

  function renderLibrary() {
    const body = $('#strategyBody');
    if (!body) return;
    const list = filteredStrategies();
    body.innerHTML = list.length ? list.map((s) => `
      <tr>
        <td><strong>${safe(s.name)}</strong><div class="small-muted" style="margin-top:4px">${s.id} · ${s.styles.join(' / ')}</div></td>
        <td><span class="tag blue">${s.category}</span> <span class="tag">${s.risk}</span></td>
        <td class="positive">${s.metrics.ret}</td>
        <td>${s.metrics.vol}</td>
        <td class="negative">${s.metrics.drawdown}</td>
        <td>${s.metrics.sharpe}</td>
        <td><b>${s.rating}</b><span class="small-muted"> / 5</span></td>
        <td>${s.clients} 人<div class="small-muted" style="margin-top:4px">${s.aum}</div></td>
        <td><span class="tag ${s.status === '在售' ? 'green' : 'gold'}">${s.status}</span></td>
        <td>
          <button class="mini-link" type="button" data-strategy-detail="${s.id}">详情</button>
          <button class="mini-link" type="button" data-strategy-use="${s.id}" style="margin-left:8px">配置客户</button>
        </td>
      </tr>`).join('') : '<tr><td colspan="10"><div class="empty">没有匹配的策略，请调整筛选条件</div></td></tr>';
    const count = $('#libraryCount');
    if (count) count.textContent = `共 ${list.length} 个策略`;
  }

  function scoreRow(label, value) {
    return `<div class="score-row"><label>${label}</label><div class="score-bar"><i style="width:${value}%"></i></div><b>${value}</b></div>`;
  }

  function openStrategyDrawer(id) {
    const s = strategyById(id);
    if (!s) return;
    const scoreItems = [
      ['收益', s.scores.ret], ['波动', s.scores.vol], ['回撤', s.scores.drawdown], ['夏普', s.scores.sharpe],
      ['稳定性', s.scores.stability], ['容量', s.scores.capacity], ['费率', s.scores.fee]
    ];
    openDrawer(`
      <div class="drawer-top">
        <div><div class="drawer-title">${safe(s.name)}</div><div class="drawer-sub">${s.id} · 策略评价更新于 ${s.reviewedAt}</div></div>
        <button class="x-btn" type="button" data-close>${icon('x', 18)}</button>
      </div>
      <div class="drawer-body">
        <div class="inline-actions" style="margin-bottom:14px">
          <span class="tag blue">${s.category}</span><span class="tag">${s.risk}</span>
          ${s.styles.map((style) => `<span class="tag purple">${style}</span>`).join('')}
          <span class="tag ${s.status === '在售' ? 'green' : 'gold'}">${s.status}</span>
        </div>
        <p class="section-subtext" style="margin-top:0">${safe(s.desc)}</p>
        <div class="kv-grid">
          <div><label>近一年收益</label><b class="positive">${s.metrics.ret}</b></div>
          <div><label>年化波动</label><b>${s.metrics.vol}</b></div>
          <div><label>最大回撤</label><b class="negative">${s.metrics.drawdown}</b></div>
          <div><label>夏普比率</label><b>${s.metrics.sharpe}</b></div>
          <div><label>策略容量</label><b>${s.metrics.capacity}</b></div>
          <div><label>综合费率</label><b>${s.metrics.fee}</b></div>
        </div>
        <div class="subsection">系统化评价 · 综合 ${s.score} 分 / ${s.rating} 星</div>
        ${scoreItems.map(([label, value]) => scoreRow(label, value)).join('')}
        <div class="subsection">SAA 基准与 TAA 当前偏离</div>
        <div class="table-wrap"><table>
          <thead><tr><th>大类</th><th>SAA 基准</th><th>区间带</th><th>TAA 当前</th><th>偏离</th></tr></thead>
          <tbody>${s.saa.map((base, index) => {
            const dev = s.taa[index] - base;
            return `<tr><td>${ASSET_LABELS[index]}</td><td><strong>${base}%</strong></td><td>${s.ranges[index][0]}%–${s.ranges[index][1]}%</td><td>${s.taa[index]}%</td><td><span class="tag ${Math.abs(dev) > 2 ? 'gold' : 'green'}">${dev >= 0 ? '+' : ''}${dev}pp</span></td></tr>`;
          }).join('')}</tbody>
        </table></div>
        <div class="subsection">基金池与目标权重</div>
        <div class="table-wrap"><table>
          <thead><tr><th>基金</th><th>角色</th><th>权重</th><th>管理费</th></tr></thead>
          <tbody>${s.funds.map((item) => {
            const fund = fundByCode(item.code);
            return `<tr><td><strong>${fund ? safe(fund.name) : item.code}</strong><div class="small-muted" style="margin-top:4px">${item.code} · ${fund ? fund.company : ''}</div></td><td><span class="tag ${item.role === '核心' ? 'green' : item.role === '流动性' ? 'blue' : 'gold'}">${item.role}</span></td><td>${item.weight}%</td><td>${fund ? fund.fee.manage : '—'}</td></tr>`;
          }).join('')}</tbody>
        </table></div>
        <div class="inline-actions" style="margin-top:16px">
          <button class="btn btn-primary" type="button" data-strategy-use="${s.id}">用该策略配置客户</button>
          <button class="btn btn-outline" type="button" data-chat="请解释${safe(s.name)}的SAA基准与TAA偏离逻辑">${icon('sparkles', 15)} AI 解释策略</button>
        </div>
        <div class="footnote">策略评分、区间带与持仓均为模拟数据；真实策略需经过投研评审、回测与合规审核后上架。</div>
      </div>`, true);
  }

  function setStrategyTab(tab) {
    strategyState.tab = tab === 'config' ? 'config' : 'library';
    $$('[data-strategy-tab]').forEach((btn) => btn.classList.toggle('active', btn.dataset.strategyTab === strategyState.tab));
    const library = $('#libraryPanel');
    const config = $('#clientConfigPanel');
    if (library) library.hidden = strategyState.tab !== 'library';
    if (config) config.hidden = strategyState.tab !== 'config';
  }

  function renderKyc() {
    const client = currentConfigClient();
    const select = $('#configClientSelect');
    if (select && select.value !== client.id) select.value = client.id;

    const summary = $('#kycSummary');
    if (summary) {
      summary.innerHTML = `
        <div style="display:flex;gap:11px;align-items:center">
          <span class="avatar" style="height:36px;width:36px">${client.avatar}</span>
          <div><b style="font-size:13px">${safe(client.name)}</b>
            <div class="small-muted" style="margin-top:4px">${client.id} · ${client.goal}</div>
          </div>
          <span class="tag green" style="margin-left:auto">${client.risk}</span>
        </div>`;
    }
    const checks = $('#kycChecks');
    if (checks) {
      checks.innerHTML = [
        ['风险等级上限', client.riskKey],
        ['计划期限', `${client.horizonYears} 年`],
        ['流动性需求', client.liquidity],
        ['投资经验', client.experience]
      ].map(([label, value]) => `<div class="kyc-item"><label>${label}</label><b>${value}</b></div>`).join('');
    }

    const candidates = DATA.strategies.map((s) => ({ strategy: s, match: evaluateMatch(client, s) }));
    const passed = candidates.filter((item) => item.match.pass).sort((a, b) => b.match.score - a.match.score);
    const filtered = candidates.length - passed.length;
    if (!strategyState.strategyId || !strategyById(strategyState.strategyId)) {
      const top = passed[0];
      strategyState.strategyId = top ? top.strategy.id : null;
      strategyState.taa = top ? [...top.strategy.taa] : null;
    }

    const list = $('#candidateList');
    if (list) {
      list.innerHTML = passed.length ? passed.map(({ strategy, match }) => `
        <div class="match-card ${strategyState.strategyId === strategy.id ? 'active' : ''}" data-strategy-select="${strategy.id}">
          <div class="match-score" style="--score:${match.score}%"><div><b>${match.score}</b><small>匹配度</small></div></div>
          <div style="flex:1;min-width:0">
            <div class="match-head"><strong>${safe(strategy.name)}</strong><span class="tag blue">${strategy.category}</span><span class="tag">${strategy.risk}</span></div>
            <div class="match-desc">${safe(strategy.desc)}</div>
            <div class="match-reasons">${match.checks.map((check) => `<span class="tag ${check.pass ? 'green' : 'red'}" style="padding:2px 6px">${check.pass ? '✓' : '✕'} ${check.label}</span>`).join('')}</div>
          </div>
        </div>`).join('') : '<div class="empty">没有通过硬约束的策略，请调整客户 KYC 或策略库</div>';
      const count = $('#candidateCount');
      if (count) count.textContent = `通过硬约束 ${passed.length} 个 · 已过滤 ${filtered} 个`;
    }
    renderSelectedStrategy();
  }

  function renderSelectedStrategy() {
    const s = strategyById(strategyState.strategyId);
    const panel = $('#strategyConfigPanel');
    if (!panel) return;
    if (!s) { panel.hidden = true; return; }
    panel.hidden = false;

    const client = currentConfigClient();
    const match = evaluateMatch(client, s);
    const title = $('#selectedStrategyTitle');
    if (title) title.textContent = s.name;
    const tags = $('#selectedStrategyTags');
    if (tags) {
      tags.innerHTML = `<span class="tag blue">${s.category}</span><span class="tag">${s.risk}</span>${s.styles.map((style) => `<span class="tag purple">${style}</span>`).join('')}<span class="tag green">匹配度 ${match.score}</span>`;
    }
    const reasonBox = $('#selectedMatchReasons');
    if (reasonBox) {
      reasonBox.innerHTML = match.checks.map((check) => `<div class="approval-line"><div class="circle" style="background:${check.pass ? '#e6f8f4' : '#fff1f3'};color:${check.pass ? '#03a78c' : '#db566c'}">${icon(check.pass ? 'circle-check' : 'circle-alert', 14)}</div><span>${check.label}</span></div>`).join('');
    }
    renderSaaRows(s);
    renderFundPlan(s);
  }

  function renderSaaRows(s) {
    const box = $('#saaRows');
    if (!box) return;
    box.innerHTML = s.saa.map((base, index) => {
      const [min, max] = s.ranges[index];
      const taa = strategyState.taa[index];
      const dev = taa - base;
      const devClass = Math.abs(dev) <= 2 ? 'green' : Math.abs(dev) <= 5 ? 'gold' : 'red';
      return `<div class="alloc-row">
        <div class="alloc-label"><i class="dot" style="background:${ASSET_COLORS[index]}"></i>${ASSET_LABELS[index]}</div>
        <div>
          <div class="alloc-track">
            <span class="alloc-band" style="left:${min}%;width:${Math.max(max - min, 2)}%"></span>
            <span class="alloc-fill" style="width:${taa}%;background:${ASSET_COLORS[index]}"></span>
            <span class="alloc-marker" style="left:${base}%"></span>
          </div>
          <div class="alloc-caption">SAA ${base}% · 区间 ${min}%–${max}%</div>
        </div>
        <div class="alloc-actions">
          <b>${taa}%</b>
          <span class="tag ${devClass}">${dev >= 0 ? '+' : ''}${dev}pp</span>
          <span class="taa-controls">
            <button type="button" data-taa-index="${index}" data-taa-delta="-1" aria-label="降低${ASSET_LABELS[index]}权重">−</button>
            <button type="button" data-taa-index="${index}" data-taa-delta="1" aria-label="提高${ASSET_LABELS[index]}权重">+</button>
          </span>
        </div>
      </div>`;
    }).join('');
    const total = strategyState.taa.reduce((sum, value) => sum + value, 0);
    const maxDev = Math.max(...s.saa.map((base, index) => Math.abs(strategyState.taa[index] - base)));
    const status = $('#saaStatus');
    if (status) {
      status.innerHTML = `<span class="tag ${total === 100 ? 'green' : 'red'}">权重合计 ${total}%</span><span class="tag ${maxDev <= 3 ? 'green' : maxDev <= 5 ? 'gold' : 'red'}">最大偏离 ${maxDev}pp</span><span class="tag blue">TAA 内部阈值 ±3pp</span>`;
    }
  }

  function renderFundPlan(s) {
    const body = $('#fundPlanBody');
    if (!body) return;
    body.innerHTML = s.funds.map((item) => {
      const fund = fundByCode(item.code);
      return `<tr>
        <td><strong>${fund ? safe(fund.name) : item.code}</strong><div class="small-muted" style="margin-top:4px">${item.code} · ${fund ? fund.company : ''}</div></td>
        <td><span class="tag">${fund ? fund.type : '—'}</span></td>
        <td>${fund ? fund.style : '—'}</td>
        <td><span class="tag ${item.role === '核心' ? 'green' : item.role === '流动性' ? 'blue' : 'gold'}">${item.role}</span></td>
        <td><b>${item.weight}%</b></td>
        <td>${fund ? fund.fee.manage : '—'}</td>
        <td>${fund ? fund.liquidity : '—'}</td>
      </tr>`;
    }).join('');

    const maxFund = Math.max(...s.funds.map((item) => item.weight));
    const companyMap = {};
    s.funds.forEach((item) => {
      const fund = fundByCode(item.code);
      if (fund) companyMap[fund.company] = (companyMap[fund.company] || 0) + item.weight;
    });
    const maxCompany = Math.max(...Object.values(companyMap));
    const weightedFee = s.funds.reduce((sum, item) => {
      const fund = fundByCode(item.code);
      return sum + item.weight * (fund ? parseFloat(fund.fee.manage) : 0);
    }, 0) / 100;
    const summary = $('#fundPlanSummary');
    if (summary) {
      summary.innerHTML = `<span class="tag ${maxFund <= 25 ? 'green' : 'red'}">单基金最大 ${maxFund}% · 上限 25%</span><span class="tag ${maxCompany <= 35 ? 'green' : 'gold'}">单管理人最大 ${maxCompany}% · 上限 35%</span><span class="tag blue">加权管理费 ${weightedFee.toFixed(2)}%</span><span class="tag green">基金数量 ${s.funds.length} 只</span>`;
    }
  }

  function adjustTaa(index, delta) {
    const s = strategyById(strategyState.strategyId);
    if (!s || !strategyState.taa) return;
    const range = s.ranges[index];
    const next = strategyState.taa[index] + delta;
    if (next < range[0] || next > range[1]) {
      toast(`该大类权重需保持在 ${range[0]}%–${range[1]}% 区间内`);
      return;
    }
    const weights = [...strategyState.taa];
    const other = weights
      .map((weight, i) => ({ weight, i }))
      .filter((item) => item.i !== index && ((delta > 0 && weights[item.i] - delta >= s.ranges[item.i][0]) || (delta < 0 && weights[item.i] - delta <= s.ranges[item.i][1])))
      .sort((a, b) => b.weight - a.weight)[0];
    if (!other) {
      toast('调整后其他大类将越界，无法完成本次 TAA 调整');
      return;
    }
    weights[index] = next;
    weights[other.i] -= delta;
    strategyState.taa = weights;
    renderSaaRows(s);
    toast(delta > 0 ? '已上调战术权重（演示）' : '已下调战术权重（演示）');
  }

  function initStrategy() {
    const params = new URLSearchParams(location.search);
    const presetClient = params.get('client');
    if (presetClient) {
      const client = DATA.clients.find((item) => item.name === presetClient || item.id === presetClient);
      if (client) strategyState.clientId = client.id;
    }
    const presetStrategy = params.get('strategy');
    if (presetStrategy && strategyById(presetStrategy)) {
      strategyState.strategyId = presetStrategy;
      strategyState.taa = [...strategyById(presetStrategy).taa];
    }

    const select = $('#configClientSelect');
    if (select) {
      select.innerHTML = DATA.clients.map((client) => `<option value="${client.id}">${client.name} · ${client.risk}</option>`).join('');
      select.value = strategyState.clientId;
      select.addEventListener('change', (event) => {
        strategyState.clientId = event.target.value;
        strategyState.strategyId = null;
        strategyState.taa = null;
        renderKyc();
      });
    }

    $$('[data-strategy-tab]').forEach((btn) => {
      btn.addEventListener('click', () => setStrategyTab(btn.dataset.strategyTab));
    });

    const search = $('#strategySearch');
    if (search) {
      search.addEventListener('input', (event) => {
        strategyState.keyword = event.target.value;
        renderLibrary();
        event.target.focus();
      });
    }
    $$('#strategyRiskChoice button').forEach((btn) => {
      btn.addEventListener('click', () => {
        strategyState.risk = btn.dataset.risk;
        $$('#strategyRiskChoice button').forEach((item) => item.classList.toggle('active', item === btn));
        renderLibrary();
      });
    });
    const category = $('#strategyCategory');
    if (category) category.addEventListener('change', (event) => { strategyState.category = event.target.value; renderLibrary(); });
    const status = $('#strategyStatus');
    if (status) status.addEventListener('change', (event) => { strategyState.status = event.target.value; renderLibrary(); });

    const candidateList = $('#candidateList');
    if (candidateList) {
      candidateList.addEventListener('click', (event) => {
        const card = event.target.closest('[data-strategy-select]');
        if (!card) return;
        const strategy = strategyById(card.dataset.strategySelect);
        if (!strategy) return;
        strategyState.strategyId = strategy.id;
        strategyState.taa = [...strategy.taa];
        renderKyc();
      });
    }

    const saaRows = $('#saaRows');
    if (saaRows) {
      saaRows.addEventListener('click', (event) => {
        const button = event.target.closest('[data-taa-index]');
        if (!button) return;
        adjustTaa(num(button.dataset.taaIndex), num(button.dataset.taaDelta));
      });
    }

    const reset = $('#resetTaa');
    if (reset) {
      reset.addEventListener('click', () => {
        const strategy = strategyById(strategyState.strategyId);
        if (!strategy) return;
        strategyState.taa = [...strategy.saa];
        renderSaaRows(strategy);
        toast('已将 TAA 恢复为 SAA 基准（演示）');
      });
    }
    const generateFunds = $('#generateFundPlan');
    if (generateFunds) {
      generateFunds.addEventListener('click', () => toast('已按 TAA 权重重新生成基金层组合（演示）'));
    }
    const save = $('#saveClientPortfolio');
    if (save) {
      save.addEventListener('click', () => toast(`已保存为 ${currentConfigClient().name} 的模拟客户组合，等待人工确认`));
    }
    const submit = $('#submitStrategyApproval');
    if (submit) {
      submit.addEventListener('click', () => toast('已提交 SAA / TAA / 基金层配置草案至审批队列（演示）'));
    }
    const explain = $('#explainStrategyConfig');
    if (explain) {
      explain.addEventListener('click', () => {
        const strategy = strategyById(strategyState.strategyId);
        openChat(strategy ? `请解释${strategy.name}的SAA基准、TAA偏离和基金层构建逻辑` : '请解释SAA与TAA的区别');
      });
    }

    renderLibrary();
    renderKyc();
    setStrategyTab(params.get('tab') === 'config' || presetClient ? 'config' : 'library');
  }

  /* ----------------------------- 组合管理（三级联动） ----------------------------- */
  const portfolioState = {
    strategyId: DATA.strategies[0].id,
    modelId: DATA.modelPortfolios[0].id
  };

  function modelById(id) {
    return DATA.modelPortfolios.find((m) => m.id === id);
  }

  function renderStrategyStrip() {
    const box = $('#strategyStrip');
    if (!box) return;
    box.innerHTML = DATA.strategies.filter((s) => s.status !== '下架').map((s) => {
      const models = DATA.modelPortfolios.filter((m) => m.strategyId === s.id);
      const clients = models.reduce((sum, m) => sum + m.clients, 0);
      return `<button class="strategy-chip ${portfolioState.strategyId === s.id ? 'active' : ''}" type="button" data-portfolio-strategy="${s.id}">
        <b>${safe(s.name)}</b>
        <span>${s.category} · ${s.risk} · ${models.length} 个模型组合</span>
        <span>覆盖客户 ${clients} 人</span>
        <span class="tag ${s.status === '在售' ? 'green' : 'gold'}">${s.status}</span>
      </button>`;
    }).join('');
  }

  function renderModelPortfolios() {
    const body = $('#modelPortfolioBody');
    if (!body) return;
    const models = DATA.modelPortfolios.filter((m) => m.strategyId === portfolioState.strategyId);
    if (!models.some((m) => m.id === portfolioState.modelId)) {
      portfolioState.modelId = models[0] ? models[0].id : null;
    }
    body.innerHTML = models.length ? models.map((m) => `
      <tr>
        <td><strong>${safe(m.name)}</strong><div class="small-muted" style="margin-top:4px">${m.id}</div></td>
        <td><span class="tag">${m.risk}</span></td>
        <td class="positive">${m.ret}</td>
        <td>${m.vol}</td>
        <td><span class="tag ${parseFloat(m.saaDeviation) > 5 ? 'gold' : 'green'}">${m.saaDeviation}</span></td>
        <td><span class="tag ${parseFloat(m.taaDeviation) > 3 ? 'gold' : 'green'}">${m.taaDeviation}</span></td>
        <td>${m.clients} 人</td>
        <td><span class="tag ${m.status === '正常' ? 'green' : 'gold'}">${m.status}</span></td>
        <td><button class="mini-link" type="button" data-model="${m.id}">查看</button></td>
      </tr>`).join('') : '<tr><td colspan="9"><div class="empty">该策略下暂无模型组合</div></td></tr>';
    const count = $('#modelCount');
    if (count) count.textContent = `模型组合 ${models.length} 个`;
  }

  function renderModelDetail() {
    const model = modelById(portfolioState.modelId);
    const title = $('#modelDetailTitle');
    const sub = $('#modelDetailSub');
    if (!model) {
      if (title) title.textContent = '模型组合';
      if (sub) sub.textContent = '请选择策略与模型组合';
      return;
    }
    const strategy = strategyById(model.strategyId);
    if (title) title.textContent = model.name;
    if (sub) sub.textContent = `${model.id} · 引用策略 ${strategy ? strategy.name : '—'} · 覆盖客户 ${model.clients} 人`;
    const tag = $('#modelStatusTag');
    if (tag) {
      tag.textContent = model.status;
      tag.className = `tag ${model.status === '正常' ? 'green' : 'gold'}`;
    }

    const rows = $('#modelAllocRows');
    if (rows) {
      rows.innerHTML = ASSET_LABELS.map((label, index) => {
        const diff = model.actual[index] - model.saa[index];
        return `<tr>
          <td>${label}</td>
          <td><strong>${model.saa[index]}%</strong></td>
          <td>${model.taa[index]}%</td>
          <td>${model.actual[index]}%</td>
          <td><span class="tag ${Math.abs(diff) > 5 ? 'gold' : Math.abs(diff) > 2 ? 'blue' : 'green'}">${diff >= 0 ? '+' : ''}${diff}pp</span></td>
        </tr>`;
      }).join('');
    }

    const fundBody = $('#modelFundBody');
    if (fundBody) {
      fundBody.innerHTML = (strategy ? strategy.funds : []).map((item) => {
        const fund = fundByCode(item.code);
        return `<tr>
          <td><strong>${fund ? safe(fund.name) : item.code}</strong><div class="small-muted" style="margin-top:4px">${item.code} · ${fund ? fund.company : ''}</div></td>
          <td>${fund ? fund.type : '—'}</td>
          <td><span class="tag ${item.role === '核心' ? 'green' : item.role === '流动性' ? 'blue' : 'gold'}">${item.role}</span></td>
          <td><b>${item.weight}%</b></td>
          <td>${fund ? fund.liquidity : '—'}</td>
        </tr>`;
      }).join('');
    }

    const deviations = $('#modelDeviations');
    if (deviations) {
      deviations.innerHTML = `
        <div class="rebal-row"><span>SAA 最大偏离</span><b><span class="tag ${parseFloat(model.saaDeviation) > 5 ? 'gold' : 'green'}">${model.saaDeviation}</span></b></div>
        <div class="rebal-row"><span>TAA 相对基准偏离</span><b><span class="tag ${parseFloat(model.taaDeviation) > 3 ? 'gold' : 'green'}">${model.taaDeviation}</span></b></div>
        <div class="rebal-row"><span>跟踪误差预算</span><b>3.0%</b></div>
        <div class="rebal-row"><span>建议执行机制</span><b>人工审批</b></div>`;
    }
    renderClientPortfolios();
  }

  function renderClientPortfolios() {
    const body = $('#clientPortfolioBody');
    if (!body) return;
    const list = DATA.clientPortfolios.filter((p) => p.modelId === portfolioState.modelId);
    body.innerHTML = list.length ? list.map((p) => `
      <tr>
        <td><strong>${safe(p.name)}</strong><div class="small-muted" style="margin-top:4px">${p.clientId}</div></td>
        <td>${p.aum}</td>
        <td>${p.actual.map((value, index) => `${ASSET_LABELS[index]} ${value}%`).join(' · ')}</td>
        <td><span class="tag ${parseFloat(p.deviation) > 5 ? 'gold' : 'green'}">${p.deviation}</span></td>
        <td><span class="tag ${p.status === '正常' ? 'green' : p.status === '待调仓' ? 'gold' : 'blue'}">${p.status}</span></td>
        <td>${p.lastReview}</td>
        <td><button class="mini-link" type="button" data-client-portfolio="${p.clientId}">查看</button></td>
      </tr>`).join('') : '<tr><td colspan="7"><div class="empty">该模型组合下暂无客户组合</div></td></tr>';
    const count = $('#clientPortfolioCount');
    if (count) count.textContent = `引用客户 ${list.length} 位`;
  }

  function openClientPortfolioDrawer(clientId) {
    const portfolio = DATA.clientPortfolios.find((p) => p.clientId === clientId);
    if (!portfolio) return;
    const client = DATA.clients.find((c) => c.id === clientId);
    const model = modelById(portfolio.modelId);
    const strategy = model ? strategyById(model.strategyId) : null;
    const allocation = model ? ASSET_LABELS.map((label, index) => `
      <div class="rebal-row"><span>${label}</span><b>SAA ${model.saa[index]}% · 实际 ${portfolio.actual[index]}%</b></div>`).join('') : '';
    const funds = strategy ? strategy.funds.map((item) => {
      const fund = fundByCode(item.code);
      return `<tr><td><strong>${fund ? safe(fund.name) : item.code}</strong></td><td>${item.weight}%</td><td><span class="tag">${item.role}</span></td></tr>`;
    }).join('') : '';
    const clientTrades = (DATA.clientTradeStatus || {})[portfolio.clientId] || [];
    openDrawer(`
      <div class="drawer-top">
        <div><div class="drawer-title">${safe(portfolio.name)} · 客户组合</div><div class="drawer-sub">${portfolio.clientId} · 引用 ${model ? model.name : '—'}</div></div>
        <button class="x-btn" type="button" data-close>${icon('x', 18)}</button>
      </div>
      <div class="drawer-body">
        <div class="summary-box">
          <div class="summary-top">
            <span style="display:flex;gap:10px;align-items:center">
              <span class="avatar" style="height:34px;width:34px">${client ? client.avatar : '客'}</span>
              ${safe(portfolio.name)}
            </span>
            <span class="tag ${portfolio.status === '正常' ? 'green' : 'gold'}">${portfolio.status}</span>
          </div>
          <p>当前策略：${strategy ? strategy.name : '—'}（${strategy ? strategy.risk : '—'}） · 模型组合：${model ? model.name : '—'}</p>
        </div>
        <div class="client-meta">
          <div><label>客户资产</label><b>${portfolio.aum}</b></div>
          <div><label>组合偏离</label><b>${portfolio.deviation}</b></div>
          <div><label>客户风险等级</label><b>${client ? client.riskKey : '—'}</b></div>
          <div><label>投资期限</label><b>${client ? `${client.horizonYears} 年` : '—'}</b></div>
          <div><label>流动性需求</label><b>${client ? client.liquidity : '—'}</b></div>
          <div><label>最近复核</label><b>${portfolio.lastReview}</b></div>
        </div>
        <div class="subsection">SAA 与实际权重对比</div>
        <div class="rebal-list">${allocation}</div>
        <div class="subsection">基金层持仓</div>
        <div class="table-wrap"><table>
          <thead><tr><th>基金</th><th>权重</th><th>角色</th></tr></thead>
          <tbody>${funds}</tbody>
        </table></div>
        <div class="subsection">最近交易与 TA 状态</div>
        <div class="table-wrap"><table>
          <thead><tr><th>日期</th><th>类型</th><th>基金</th><th>金额/份额</th><th>TA 状态</th><th>回执</th></tr></thead>
          <tbody>${clientTrades.length ? clientTrades.map((trade) => `
            <tr>
              <td>${trade.date}</td>
              <td>${trade.type}</td>
              <td>${safe(trade.fund)}</td>
              <td>${trade.amount}</td>
              <td><span class="tag ${trade.status === '确认成功' ? 'green' : trade.status === '确认失败' ? 'red' : 'gold'}">${trade.status}</span></td>
              <td>${safe(trade.receipt)}</td>
            </tr>`).join('') : '<tr><td colspan="6"><div class="empty">暂无交易记录</div></td></tr>'}</tbody>
        </table></div>
        <div class="inline-actions" style="margin-top:16px">
          <button class="btn btn-primary" type="button" data-push-advice="${safe(portfolio.name)}">${icon('refresh-cw', 15)} 推送调仓建议</button>
          <button class="btn btn-outline" type="button" data-chat="请诊断${safe(portfolio.name)}的客户组合，说明SAA偏离和TAA调整建议">${icon('sparkles', 15)} AI 诊断</button>
          <a class="btn btn-outline" href="clients.html">客户 360</a>
        </div>
        <div class="footnote">推送后客户将在「调仓建议」页看到调出/调入明细，确认跟调后才会创建调仓交易。</div>
      </div>`, true);
  }

  function initPortfolios() {
    renderStrategyStrip();
    renderModelPortfolios();
    renderModelDetail();

    const strip = $('#strategyStrip');
    if (strip) {
      strip.addEventListener('click', (event) => {
        const button = event.target.closest('[data-portfolio-strategy]');
        if (!button) return;
        portfolioState.strategyId = button.dataset.portfolioStrategy;
        portfolioState.modelId = DATA.modelPortfolios.find((m) => m.strategyId === portfolioState.strategyId)?.id || null;
        renderStrategyStrip();
        renderModelPortfolios();
        renderModelDetail();
      });
    }
    const body = $('#modelPortfolioBody');
    if (body) {
      body.addEventListener('click', (event) => {
        const button = event.target.closest('[data-model]');
        if (!button) return;
        portfolioState.modelId = button.dataset.model;
        renderModelPortfolios();
        renderModelDetail();
        const model = modelById(portfolioState.modelId);
        if (model) toast(`已切换到 ${model.name} 的模拟配置`);
      });
    }
    const clientBody = $('#clientPortfolioBody');
    if (clientBody) {
      clientBody.addEventListener('click', (event) => {
        const button = event.target.closest('[data-client-portfolio]');
        if (button) openClientPortfolioDrawer(button.dataset.clientPortfolio);
      });
    }
    const rebalance = $('#rebalanceButton');
    if (rebalance) {
      rebalance.addEventListener('click', () => {
        const model = modelById(portfolioState.modelId);
        const strategy = strategyById(portfolioState.strategyId);
        openChat(`为${strategy ? strategy.name : '当前策略'}的${model ? model.name : '模型组合'}生成再平衡建议，说明SAA区间、TAA偏离与需审核风险`);
      });
    }
  }

  /* 风险监控 */
  let riskCategory = '全部';

  function renderRiskList() {
    const box = $('#riskList');
    if (!box) return;
    const pendingAll = pendingRisks();
    const pending = riskCategory === '全部' ? pendingAll : pendingAll.filter((risk) => risk.category === riskCategory);
    box.innerHTML = pending.length ? pending.map((risk) => `
      <div class="alert-item">
        <div class="alert-left">${icon('shield-alert', 18)}</div>
        <div class="alert-right">
          <div class="alert-title">${safe(risk.title)} <span style="float:right"><span class="tag ${risk.type === '高风险' ? 'red' : 'gold'}">${risk.type}</span></span></div>
          <p class="alert-desc">${safe(risk.detail)}</p>
          <div class="alert-footer">
            <span class="small-muted">${risk.time} · ${risk.category} · 规则 ${risk.rule} · 模拟规则引擎</span>
            <button class="btn btn-outline btn-sm" type="button" data-resolve="${risk.id}">标记已复核</button>
          </div>
        </div>
      </div>`).join('') : `<div class="empty">${riskCategory === '全部' ? '当前没有待处理的模拟风险告警 ✓' : '该分类下没有待处理告警'}</div>`;

    const pendingCount = $('#pendingRiskCount');
    if (pendingCount) pendingCount.textContent = `${pendingAll.length} 项`;
    const highCount = $('#highRiskCount');
    if (highCount) highCount.textContent = `${pendingAll.filter((r) => r.type === '高风险').length} 项`;
    const categoryCount = $('#riskCategoryCount');
    if (categoryCount) categoryCount.textContent = `${pending.length} 条`;
  }

  function initRisks() {
    renderRiskList();
    const filters = $('#riskFilters');
    if (filters) {
      filters.addEventListener('click', (event) => {
        const chip = event.target.closest('[data-risk-cat]');
        if (!chip) return;
        riskCategory = chip.dataset.riskCat;
        $$('#riskFilters .chip').forEach((item) => item.classList.toggle('active', item === chip));
        renderRiskList();
      });
    }
    const box = $('#riskList');
    if (box) {
      box.addEventListener('click', (event) => {
        const button = event.target.closest('[data-resolve]');
        if (!button) return;
        const id = num(button.dataset.resolve);
        if (!state.resolvedRisks.includes(id)) state.resolvedRisks.push(id);
        persist();
        renderRiskList();
        refreshRiskPill();
        toast('已标记人工复核（演示状态）');
      });
    }
  }

  /* 投顾报告 */
  function reportClients() {
    return DATA.clients.map((c) => `<option value="${c.name}" ${state.reportClient === c.name ? 'selected' : ''}>${c.name} · ${c.risk}</option>`).join('');
  }

  function refreshReports() {
    $$('#reportTypeGroup button').forEach((btn) => btn.classList.toggle('active', btn.dataset.reportType === state.reportType));
    const select = $('#reportClientSelect');
    if (select && select.value !== state.reportClient) select.value = state.reportClient;
    const strategy = strategyById(state.reportStrategy) || DATA.strategies[0];
    const strategySelect = $('#reportStrategySelect');
    if (strategySelect && strategy && strategySelect.value !== strategy.id) strategySelect.value = strategy.id;
    const strategyName = $('#reportStrategyName');
    if (strategyName) strategyName.textContent = strategy ? strategy.name : '待选择';
    const frameworkText = $('#reportFrameworkText');
    if (frameworkText && strategy) {
      frameworkText.textContent = `SAA 基准 权益 ${strategy.saa[0]}% / 债券 ${strategy.saa[1]}% / 货币 ${strategy.saa[2]}% / 黄金 ${strategy.saa[3]}%；TAA 当前 ${strategy.taa[0]}% / ${strategy.taa[1]}% / ${strategy.taa[2]}% / ${strategy.taa[3]}%。`;
    }
    const status = $('#reportStatus');
    if (status) {
      status.textContent = state.reportGenerated ? 'AI 草案待复核' : '模板预览';
      status.className = `tag ${state.reportGenerated ? 'gold' : ''}`;
    }
    const inlineStatus = $('#reportStatusInline');
    if (inlineStatus) inlineStatus.textContent = state.reportGenerated ? 'AI 草案待复核' : '模板预览';
    const sub = $('#reportPreviewSub');
    if (sub) sub.textContent = state.reportGenerated ? 'AI 草案待复核 · 对外使用前须经投顾复核与合规审批' : '模板预览 · 尚未生成报告正文';
    const clientText = $('#reportClientText');
    if (clientText) clientText.textContent = `服务对象：${state.reportClient || '待选择'}`;
    const titleText = $('#reportTypeTitle');
    if (titleText) titleText.textContent = state.reportType;
    const draftStep = $('#draftStep');
    if (draftStep) {
      draftStep.className = 'approval-line';
      draftStep.innerHTML = state.reportGenerated
        ? `<div class="circle">${icon('circle-check', 14)}</div><span>生成报告初稿 <small>· 已完成</small></span>`
        : `<div class="circle" style="background:#fff7e8;color:#cf9633">${icon('clock', 14)}</div><span>生成报告初稿 <small>· 待生成</small></span>`;
    }
    const generatedTag = $('#reportGeneratedTag');
    if (generatedTag) generatedTag.hidden = !state.reportGenerated;
  }

  function initReports() {
    const params = new URLSearchParams(location.search);
    const presetClient = params.get('client');
    if (presetClient && DATA.clients.some((c) => c.name === presetClient)) {
      state.reportClient = presetClient;
      state.reportGenerated = false;
      persist();
    }
    if (!state.reportClient) state.reportClient = DATA.clients[0].name;
    if (!state.reportStrategy || !strategyById(state.reportStrategy)) state.reportStrategy = DATA.strategies[0].id;

    const strategySelect = $('#reportStrategySelect');
    if (strategySelect) {
      strategySelect.innerHTML = DATA.strategies.map((strategy) => `<option value="${strategy.id}">${strategy.name} · ${strategy.category}</option>`).join('');
      strategySelect.value = state.reportStrategy;
      strategySelect.addEventListener('change', (event) => {
        state.reportStrategy = event.target.value;
        state.reportGenerated = false;
        persist();
        refreshReports();
      });
    }

    const select = $('#reportClientSelect');
    if (select) {
      select.innerHTML = reportClients();
      select.value = state.reportClient;
      select.addEventListener('change', (event) => {
        state.reportClient = event.target.value;
        state.reportGenerated = false;
        persist();
        refreshReports();
      });
    }
    $$('#reportTypeGroup button').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.reportType = btn.dataset.reportType;
        state.reportGenerated = false;
        persist();
        refreshReports();
      });
    });
    $$('[data-generate-report]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.reportGenerated = true;
        persist();
        refreshReports();
        toast('报告初稿已生成，状态：待人工复核');
      });
    });
    refreshReports();
  }

  /* 审批与合规 */
  function refreshApprovals() {
    let pending = 0;
    DATA.approvals.forEach((item) => {
      const row = $(`[data-approval-row="${item.id}"]`);
      if (!row) return;
      const approved = item.approved || state.approved.includes(item.id);
      if (!approved) pending += 1;
      const status = row.querySelector('[data-approval-status]');
      if (status) {
        status.textContent = approved ? '已通过' : '待复核';
        status.className = `tag ${approved ? 'green' : 'gold'}`;
      }
      const button = row.querySelector('[data-approve]');
      if (button) {
        button.disabled = approved;
        button.className = `btn btn-sm ${approved ? 'btn-light' : 'btn-outline'}`;
        button.textContent = approved ? '已复核' : '复核通过';
      }
    });
    const count = $('#approvalPendingCount');
    if (count) count.textContent = `待复核 ${pending} 项`;
  }

  function initCompliance() {
    const levelClass = (level) => (level === 'SAA' ? 'purple' : level === 'TAA' ? 'blue' : level === '基金' ? 'gold' : '');
    const table = $('#approvalBody');
    if (table) {
      table.innerHTML = DATA.approvals.map((item) => {
        const approved = item.approved || state.approved.includes(item.id);
        return `
          <tr data-approval-row="${item.id}">
            <td><strong>${item.id}</strong><div class="small-muted" style="margin-top:4px">${item.type}</div></td>
            <td>${item.target}</td>
            <td><span class="tag ${levelClass(item.level)}">${item.level} 层</span></td>
            <td><span class="tag ${item.ruleWarn ? 'gold' : 'green'}">${item.rule}</span></td>
            <td><span class="tag ${approved ? 'green' : 'gold'}" data-approval-status>${approved ? '已通过' : '待复核'}</span></td>
            <td><button class="btn btn-sm ${approved ? 'btn-light' : 'btn-outline'}" type="button" data-approve="${item.id}" ${approved ? 'disabled' : ''}>${approved ? '已复核' : '复核通过'}</button></td>
          </tr>`;
      }).join('');
    }
    const box = $('#approvalBody');
    if (box) {
      box.addEventListener('click', (event) => {
        const button = event.target.closest('[data-approve]');
        if (!button || button.disabled) return;
        const id = button.dataset.approve;
        if (!state.approved.includes(id)) state.approved.push(id);
        persist();
        refreshApprovals();
        toast('模拟审批完成：已留痕，未发起任何真实交易');
      });
    }
    refreshApprovals();
  }

  /* ----------------------------- 页面初始化分发 ----------------------------- */
  function initPage() {
    if (PAGE === 'overview') initOverview();
    if (PAGE === 'funds') initFunds();
    if (PAGE === 'plan') initRebalanceAdvice();
    if (PAGE === 'holdings') initHoldings();
    if (PAGE === 'transactions') initTransactions();
    if (PAGE === 'profile') initProfile();
    if (PAGE === 'clients') initClients();
    if (PAGE === 'strategy') initStrategy();
    if (PAGE === 'portfolios') initPortfolios();
    if (PAGE === 'risks') initRisks();
    if (PAGE === 'reports') initReports();
    if (PAGE === 'compliance') initCompliance();
  }

  /* ----------------------------- 启动 ----------------------------- */
  if (IS_DEMO_TOOL) {
    // 演示工具页不渲染业务壳层，仅复用状态、弹窗与 TA 回执能力
    if (!$('#modalRoot')) {
      const modalRoot = document.createElement('div');
      modalRoot.id = 'modalRoot';
      document.body.appendChild(modalRoot);
    }
  } else {
    renderShell();
    initPage();

    // 支持通过 ?chat=xxx 深链直接发起 AI 提问（用于跨页面演示）
    const chatParam = new URLSearchParams(location.search).get('chat');
    if (chatParam) openChat(chatParam);
  }

  window.FundPilot = {
    state,
    toast,
    openChat,
    openDrawer,
    closeDrawer,
    openModal,
    closeModal,
    ensureTransactions,
    ensureCash,
    ensureHoldings,
    pendingPurchaseAmount,
    availableCash,
    applyTradeEffect,
    openTaReceiptModal,
    buildTaReceipt,
    applyTaReceipt,
    refreshCashSummary,
    formatMoney
  };
})();
