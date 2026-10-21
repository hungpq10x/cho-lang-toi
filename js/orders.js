// Tab "Đơn hàng": danh sách, lọc, đổi trạng thái thanh toán, QR.
const Orders = (() => {
  const { $, $$, money, qty, esc, stripAccents } = App;

  let filter = 'all';
  let batchId = null; // null = đợt hiện tại, 'all' = tất cả

  function visibleOrders() {
    const bid = batchId || Store.currentBatch().id;
    const term = stripAccents($('#order-search').value).toLowerCase().trim();
    const digits = term.replace(/\D/g, '');
    return Store.state.orders
      .filter(o => bid === 'all' || o.batchId === bid)
      .filter(o => filter === 'all' || o.status === filter)
      .filter(o => !term ||
        stripAccents(o.customer.name).toLowerCase().includes(term) ||
        (digits.length >= 3 && o.customer.phone.includes(digits)) ||
        o.code.toLowerCase().includes(term))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  function renderBatchSelect() {
    const sel = $('#order-batch');
    const cur = Store.currentBatch().id;
    sel.innerHTML = Store.state.batches.slice().reverse()
      .map(b => `<option value="${b.id}">${esc(b.name)}</option>`).join('')
      + '<option value="all">Tất cả các đợt</option>';
    sel.value = batchId || cur;
  }

  function card(o) {
    const items = o.items.map(i =>
      `<li><span>${esc(i.name)} × ${qty(i.qty)} ${esc(i.unit)}</span><span>${money(i.price * i.qty)}</span></li>`).join('');
    const paid = o.status === 'paid';
    return `
      <article class="card order" data-id="${o.id}">
        <div class="order-top">
          <div>
            <div class="order-code">${o.code} · ${App.time(o.createdAt)}</div>
            <div class="order-name">${esc(o.customer.name)}</div>
          </div>
          <button type="button" class="status ${o.status}" data-act="toggle">${paid ? '✓ Đã TT' : 'Chưa TT'}</button>
        </div>
        <div class="order-contact">
          <a href="tel:${esc(o.customer.phone)}">${esc(o.customer.phone)}</a>${o.customer.address ? ' · ' + esc(o.customer.address) : ''}
        </div>
        <ul class="order-items">${items}</ul>
        ${o.note ? `<p class="order-note">📝 ${esc(o.note)}</p>` : ''}
        <div class="order-total"><span>Tổng cộng</span><strong>${money(o.total)}</strong></div>
        <div class="order-actions">
          <button type="button" class="btn ${paid ? '' : 'btn-primary'}" data-act="qr">QR</button>
          <button type="button" class="btn" data-act="copy">Copy</button>
          <button type="button" class="btn" data-act="edit">Sửa</button>
          <button type="button" class="btn btn-danger" data-act="delete">Xoá</button>
        </div>
      </article>`;
  }

  function render() {
    renderBatchSelect();
    const list = visibleOrders();
    const unpaid = list.filter(o => o.status === 'unpaid');
    const due = unpaid.reduce((s, o) => s + o.total, 0);
    $('#order-summary').textContent = list.length
      ? `${list.length} đơn · ${unpaid.length} chưa thanh toán${due ? ' · còn phải thu ' + money(due) : ''}`
      : '';
    const anyOrders = Store.state.orders.length > 0;
    $('#order-list').innerHTML = list.length
      ? list.map(card).join('')
      : `<p class="empty">${anyOrders ? 'Không có đơn nào khớp bộ lọc.' : 'Chưa có đơn nào. Bấm <b>Tạo đơn</b> để nhập đơn đầu tiên.'}</p>`;
  }

  function onAction(ev) {
    const btn = ev.target.closest('button[data-act]');
    if (!btn) return;
    const id = btn.closest('.order').dataset.id;
    const order = Store.state.orders.find(o => o.id === id);
    switch (btn.dataset.act) {
      case 'toggle': {
        const o = Store.toggleOrderPaid(id);
        App.toast(o.status === 'paid' ? `${o.code}: đã thanh toán` : `${o.code}: chuyển về chưa thanh toán`);
        App.refresh();
        break;
      }
      case 'qr':
        App.showQr(order);
        break;
      case 'copy':
        App.copyText(App.orderMessage(order), 'Đã copy, dán vào Zalo để gửi khách');
        break;
      case 'edit':
        OrderForm.edit(order);
        break;
      case 'delete':
        if (confirm(`Xoá đơn ${order.code} của ${order.customer.name}? Không thể hoàn tác.`)) {
          Store.deleteOrder(id);
          App.toast(`Đã xoá đơn ${order.code}`);
          App.refresh();
        }
        break;
    }
  }

  function init() {
    $('#order-list').addEventListener('click', onAction);
    $('#order-search').addEventListener('input', render);
    $('#order-batch').addEventListener('change', ev => {
      batchId = ev.target.value === Store.currentBatch().id ? null : ev.target.value;
      render();
    });
    $('#order-filter').addEventListener('click', ev => {
      const chip = ev.target.closest('.chip');
      if (!chip) return;
      filter = chip.dataset.filter;
      $$('.chip', ev.currentTarget).forEach(c => c.classList.toggle('active', c === chip));
      render();
    });
  }

  App.register('orders', { init, render });
})();
