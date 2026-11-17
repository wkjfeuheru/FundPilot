/* ============================================================
   FundPilot 原型 · 登录 / 注册交互
   仅做前端演示：校验、角色切换、验证码倒计时、跳转工作台
   ============================================================ */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const params = new URLSearchParams(location.search);
  const IS_REGISTER = document.body.dataset.auth === 'register';

  let role = params.get('role') === 'advisor' ? 'advisor' : 'investor';
  const isAdvisor = () => role === 'advisor';
  const homeFor = () => (isAdvisor() ? '../fa/overview.html' : '../investor/overview.html');

  const ICON_CHECK = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>';
  const ICON_EYE = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="2.6"/></svg>';
  const ICON_EYE_OFF = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18M10.6 6.2A10.5 10.5 0 0 1 12 6c6.4 0 10 6 10 6a17 17 0 0 1-3 3.6M6.2 7.4A17 17 0 0 0 2 12s3.6 6 10 6a10 10 0 0 0 4.3-.9"/></svg>';

  /* ----------------------------- Toast ----------------------------- */
  let toastTimer = null;
  function toast(message) {
    let el = $('#authToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'authToast';
      el.className = 'auth-toast';
      document.body.appendChild(el);
    }
    el.innerHTML = `${ICON_CHECK}<span>${String(message).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))}</span>`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.remove(), 2800);
  }

  /* ----------------------------- 角色切换 ----------------------------- */
  const ROLE_COPY = {
    investor: {
      title: '让每一笔投资，都有清晰的依据',
      desc: '从资产总览到智能配置，AI 解释每一个配置理由，所有建议由你自主确认。',
      points: [
        ['组合诊断与配置解释', '结合风险画像与持仓，用自然语言说明专业概念。'],
        ['适当性前置校验', '产品风险等级与你的测评结果匹配后才给出建议。'],
        ['自主决策、不自动交易', '所有调仓与申购均为模拟草案，需你主动确认。']
      ],
      previewTitle: 'AI 组合健康检查 · 本周',
      previewFoot: '✓ 风险模型扫描完成 · 数据为模拟演示',
      stats: [['总资产', '¥1,286,420'], ['组合风险', 'R3 平衡型'], ['待确认', '1 项']]
    },
    advisor: {
      title: '让投顾决策更快、更有依据',
      desc: '客户 360、策略优化与报告起草集中在同一工作台，AI 只生成草案，审批权仍在人。',
      points: [
        ['客户 360 与 AI 简报', '聚合画像、持仓与风险限制，优先呈现待复核事项。'],
        ['量化策略与再平衡', '场景优化结果附约束检查摘要，可追溯、可复现。'],
        ['合规审批链路', 'AI 草案 → 规则校验 → 人工复核 → 合规审批 → 留痕。']
      ],
      previewTitle: 'AI 今日扫描 · 客户工作台',
      previewFoot: '✓ 286 位客户扫描完成 · 数据为模拟演示',
      stats: [['在管客户', '286 人'], ['待复核风险', '4 项'], ['待审方案', '7 份']]
    }
  };

  function applyRole() {
    document.body.classList.toggle('advisor', isAdvisor());
    $$('.auth-role button').forEach((btn) => btn.classList.toggle('active', btn.dataset.role === role));

    const copy = ROLE_COPY[role];
    const heroTitle = $('#heroTitle');
    if (heroTitle) heroTitle.textContent = copy.title;
    const heroDesc = $('#heroDesc');
    if (heroDesc) heroDesc.textContent = copy.desc;
    const previewTitle = $('#previewTitle');
    if (previewTitle) previewTitle.textContent = copy.previewTitle;
    const previewFoot = $('#previewFoot');
    if (previewFoot) previewFoot.textContent = copy.previewFoot;

    copy.points.forEach(([title, desc], index) => {
      const pointTitle = $(`#pointTitle${index + 1}`);
      const pointDesc = $(`#pointDesc${index + 1}`);
      if (pointTitle) pointTitle.textContent = title;
      if (pointDesc) pointDesc.textContent = desc;
    });
    copy.stats.forEach(([label, value], index) => {
      const statLabel = $(`#statLabel${index + 1}`);
      const statValue = $(`#statValue${index + 1}`);
      if (statLabel) statLabel.textContent = label;
      if (statValue) statValue.textContent = value;
    });

    const switchLink = $('#switchAuth');
    if (switchLink) switchLink.href = `${IS_REGISTER ? 'login' : 'register'}.html?role=${role}`;
    const registerHome = $('#successLogin');
    if (registerHome) registerHome.href = `login.html?role=${role}`;

    const title = $('#formTitle');
    if (title && IS_REGISTER) title.textContent = isAdvisor() ? '创建投顾账号' : '创建投资者账号';
    const sub = $('#formSub');
    if (sub && IS_REGISTER) {
      sub.textContent = isAdvisor()
        ? '注册后进入 FundPilot PRO 投顾工作台，账号权限由机构统一分配。'
        : '注册后完善风险测评，即可获得与自身风险等级匹配的配置建议。';
    }

    const demoName = $('#demoName');
    if (demoName) demoName.textContent = isAdvisor() ? '林予安 · 高级投顾' : '陈女士 · 平衡型投资者 R3';
  }

  $$('.auth-role button').forEach((btn) => {
    btn.addEventListener('click', () => {
      role = btn.dataset.role;
      applyRole();
    });
  });

  /* ----------------------------- 密码显隐 ----------------------------- */
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-toggle-password]');
    if (!button) return;
    const input = document.getElementById(button.dataset.togglePassword);
    if (!input) return;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    button.innerHTML = show ? ICON_EYE_OFF : ICON_EYE;
    button.setAttribute('aria-label', show ? '隐藏密码' : '显示密码');
  });

  /* ----------------------------- 校验工具 ----------------------------- */
  function setError(input, message) {
    const field = input.closest('.field');
    if (!field) return;
    field.classList.add('invalid');
    const error = field.querySelector('.auth-error');
    if (error) error.textContent = message;
  }

  function clearError(input) {
    const field = input.closest('.field');
    if (field) field.classList.remove('invalid');
  }

  document.addEventListener('input', (event) => {
    if (event.target.matches('input')) clearError(event.target);
  });

  function markLoading(button, text) {
    if (!button) return;
    button.dataset.original = button.innerHTML;
    button.disabled = true;
    button.textContent = text;
  }

  function restore(button) {
    if (!button) return;
    button.disabled = false;
    if (button.dataset.original) button.innerHTML = button.dataset.original;
  }

  /* ----------------------------- 登录 ----------------------------- */
  const loginForm = $('#loginForm');
  if (loginForm) {
    const account = $('#account');
    const password = $('#password');
    const submit = $('#loginSubmit');

    if (params.get('registered') === '1') {
      toast('注册成功，请使用新账号登录');
      const preset = params.get('account');
      if (preset && account) account.value = preset;
    }

    loginForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const accountValue = account.value.trim();
      const passwordValue = password.value;

      if (!accountValue) { setError(account, '请输入手机号或客户账号'); account.focus(); return; }
      if (accountValue.length < 6) { setError(account, '账号格式不正确，请检查后重试'); account.focus(); return; }
      if (!passwordValue) { setError(password, '请输入登录密码'); password.focus(); return; }
      if (passwordValue.length < 6) { setError(password, '密码至少 6 位'); password.focus(); return; }

      markLoading(submit, '登录中…');
      setTimeout(() => {
        toast('登录成功，正在进入工作台');
        setTimeout(() => { location.href = homeFor(); }, 500);
      }, 600);
    });

    const demoLogin = $('#demoLogin');
    if (demoLogin) {
      demoLogin.addEventListener('click', () => {
        account.value = isAdvisor() ? 'linyuan.advisor' : '13800138000';
        password.value = 'fundpilot';
        clearError(account);
        clearError(password);
        toast(`已填入演示账号：${isAdvisor() ? '林予安 · 高级投顾' : '陈女士 · 投资者'}`);
        setTimeout(() => loginForm.requestSubmit(), 420);
      });
    }

    const forgot = $('#forgotPassword');
    if (forgot) forgot.addEventListener('click', () => toast('重置密码需短信验证（演示环境未接入短信服务）'));

    restore(submit);
  }

  /* ----------------------------- 注册 ----------------------------- */
  const registerForm = $('#registerForm');
  if (registerForm) {
    const name = $('#regName');
    const phone = $('#regPhone');
    const code = $('#regCode');
    const password = $('#regPassword');
    const confirm = $('#regConfirm');
    const agree = $('#agreeTerms');
    const submit = $('#registerSubmit');
    const sendCode = $('#sendCode');
    const meterBars = $$('.password-meter i');
    const successPanel = $('#registerSuccess');
    const successPhone = $('#successPhone');

    let countdownTimer = null;

    password.addEventListener('input', () => {
      const value = password.value;
      let score = 0;
      if (value.length >= 8) score += 1;
      if (/[A-Za-z]/.test(value) && /\d/.test(value)) score += 1;
      if (/[^A-Za-z0-9]/.test(value) && value.length >= 10) score += 1;
      meterBars.forEach((bar, index) => bar.classList.toggle('on', index < score));
    });

    if (sendCode) {
      sendCode.addEventListener('click', () => {
        const phoneValue = phone.value.trim();
        if (!/^1[3-9]\d{9}$/.test(phoneValue)) { setError(phone, '请输入正确的 11 位手机号'); phone.focus(); return; }
        clearError(phone);
        toast('验证码已发送（演示验证码：123456）');
        let left = 60;
        sendCode.disabled = true;
        sendCode.textContent = `${left}s 后重发`;
        clearInterval(countdownTimer);
        countdownTimer = setInterval(() => {
          left -= 1;
          if (left <= 0) {
            clearInterval(countdownTimer);
            sendCode.disabled = false;
            sendCode.textContent = '获取验证码';
          } else {
            sendCode.textContent = `${left}s 后重发`;
          }
        }, 1000);
      });
    }

    registerForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const nameValue = name.value.trim();
      const phoneValue = phone.value.trim();
      const codeValue = code.value.trim();
      const passwordValue = password.value;
      const confirmValue = confirm.value;

      if (!nameValue) { setError(name, '请输入您的姓名'); name.focus(); return; }
      if (nameValue.length < 2) { setError(name, '姓名至少 2 个字符'); name.focus(); return; }
      if (!/^1[3-9]\d{9}$/.test(phoneValue)) { setError(phone, '请输入正确的 11 位手机号'); phone.focus(); return; }
      if (!/^\d{6}$/.test(codeValue)) { setError(code, '请输入 6 位数字验证码'); code.focus(); return; }
      if (passwordValue.length < 8 || !/[A-Za-z]/.test(passwordValue) || !/\d/.test(passwordValue)) {
        setError(password, '密码至少 8 位，且同时包含字母与数字');
        password.focus();
        return;
      }
      if (confirmValue !== passwordValue) { setError(confirm, '两次输入的密码不一致'); confirm.focus(); return; }
      if (!agree.checked) { toast('请先阅读并同意服务协议与隐私政策'); agree.focus(); return; }

      markLoading(submit, '创建账号中…');
      setTimeout(() => {
        restore(submit);
        registerForm.style.display = 'none';
        const roleTabs = $('.auth-role');
        if (roleTabs) roleTabs.style.display = 'none';
        if (successPhone) successPhone.textContent = `账号 ${phoneValue} 已创建（${isAdvisor() ? '投顾端' : '用户端'}）`;
        if (successPanel) successPanel.classList.add('show');
        toast('注册成功，请前往登录');
      }, 700);
    });

    restore(submit);
  }

  /* ----------------------------- 协议提示 ----------------------------- */
  $$('[data-agreement]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      toast('服务协议与隐私政策为演示占位内容，不构成法律文本');
    });
  });

  applyRole();
})();
