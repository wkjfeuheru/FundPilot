/* ============================================================
   FundPilot 演示工具 · TA 回执模拟台
   复用 app.js 暴露的状态与回执能力，仅演示第三方确认
   ============================================================ */
(() => {
  'use strict';

  const FP = window.FundPilot;
  if (!FP) return;
  const $ = (selector) => document.querySelector(selector);
  const safe = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pending = () => FP.ensureTransactions().filter((tx) => tx.status === '待登记确认');
  const tagClass = (status) => (status === '确认成功' ? 'green' : status === '确认失败' ? 'red' : 'gold');
  const actionLabel = (tx) => {
    const kind = tx.effect ? tx.effect.kind : '';
    if (kind === 'purchase') return '申购 · T+1 确认';
    if (kind === 'redeem') return '赎回 · T+1 确认';
    if (kind === 'rebalance') return '调仓 · T+1 确认';
    return '历史流水';
  };

  function render() {
    const list = pending();
    $('#simPending').textContent = `${list.length} 笔`;
    $('#simCash').textContent = FP.formatMoney(FP.ensureCash());
    $('#simFrozen').textContent = FP.formatMoney(FP.pendingPurchaseAmount());
    $('#simAvailable').textContent = FP.formatMoney(FP.availableCash());

    const body = $('#taPendingBody');
    body.innerHTML = list.length ? list.map((tx) => `
      <tr>
        <td><strong>${safe(tx.type)}</strong><div class="small-muted" style="margin-top:4px">${tx.id}</div></td>
        <td>${safe(tx.fundName)}</td>
        <td>${safe(tx.amount)}</td>
        <td>${safe(tx.time)}</td>
        <td><span class="tag blue">${actionLabel(tx)}</span></td>
        <td><button class="btn btn-sm btn-outline" type="button" data-sim-ta="${tx.id}">提交 TA 回执</button></td>
      </tr>`).join('') : '<tr><td colspan="6"><div class="demo-empty">当前没有待登记确认交易。请先在客户端提交申购、赎回或确认跟调。</div></td></tr>';

    const history = FP.ensureTransactions().filter((tx) => tx.receipt).slice(0, 8);
    const historyBody = $('#taHistoryBody');
    historyBody.innerHTML = history.length ? history.map((tx) => {
      const receipt = tx.receipt;
      // 历史回执可能缺少确认金额，改为按已有字段拼接，避免渲染出 undefined
      const confirmed = [receipt.nav && `${receipt.nav} 净值`, receipt.amount, receipt.shares && `${receipt.shares} 份`]
        .filter(Boolean).map(safe).join(' · ');
      const resultText = receipt.result === 'failure'
        ? `失败：${safe(receipt.failReason)}`
        : confirmed;
      return `<tr>
        <td>${safe(tx.type)}<div class="small-muted" style="margin-top:4px">${tx.id}</div></td>
        <td>${safe(tx.fundName)}</td>
        <td><span class="tag ${tagClass(tx.status)}">${tx.status}</span></td>
        <td>${safe(receipt.no)}</td>
        <td>${safe(receipt.date)}</td>
        <td>${resultText}</td>
        <td>${safe(receipt.fee)}</td>
      </tr>`;
    }).join('') : '<tr><td colspan="7"><div class="demo-empty">暂无 TA 回执记录</div></td></tr>';
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-sim-ta]');
    if (button) FP.openTaReceiptModal(button.dataset.simTa);
  });

  const batch = $('#batchSuccess');
  if (batch) {
    batch.addEventListener('click', () => {
      const list = pending();
      if (!list.length) { FP.toast('当前没有待登记确认交易'); return; }
      FP.openModal({
        title: '批量确认 TA 回执',
        sub: `共 ${list.length} 笔待登记交易 · 全部按确认成功处理`,
        body: `
          <div class="summary-box">
            <div class="summary-top">批量确认摘要</div>
            ${list.map((tx) => `<div class="profile-item"><span>${safe(tx.type)} · ${safe(tx.fundName)}</span><strong>${safe(tx.amount)}</strong></div>`).join('')}
          </div>
          <div class="role-banner">批量确认将逐笔写入 TA 回执编号与确认结果，并按回执更新客户持仓与现金；该操作仅用于演示，不连接真实 TA。</div>`,
        footer: `<button class="btn btn-outline" type="button" data-modal-close>取消</button><button class="btn btn-primary" type="button" id="batchConfirm">确认全部成功</button>`
      });
      $('#batchConfirm').addEventListener('click', () => {
        const targets = pending();
        targets.forEach((tx) => FP.applyTaReceipt(tx.id, 'success', '', FP.buildTaReceipt(tx)));
        FP.closeModal();
        render();
        FP.toast(`已批量确认 ${targets.length} 笔 TA 回执（演示）`);
      });
    });
  }

  window.addEventListener('fundpilot:ta-receipt', render);
  render();
})();
