// Tab "Thống kê": doanh thu và tổng số lượng từng món cần chuẩn bị.
const Stats = (() => {
  const { $, money, qty, esc } = App;

  let scope = null; // null = đợt hiện tại, 'today', 'all' hoặc id đợt

  function scopeLabel(value) {
    if (value === 'today') return 'Hôm nay';
    if (value === 'all') return 'Tất cả các đợt';
    return Store.state.batches.find(b => b.id === value)?.name || '';
  }

  function scopedOrders(value) {
    const orders = Store.state.orders;
    if (value === 'today') return orders.filter(o => App.isToday(o.createdAt));
    if (value === 'all') return orders;
    return orders.filter(o => o.batchId === value);
  }

  // Cộng dồn số lượng theo món, giữ thứ tự món như trong Cài đặt.
  function prepList(orders) {
    const order = new Map(Store.state.products.map((p, i) => [p.id, i]));
    const map = new Map();
    for (const o of orders) {
      for (const i of o.items) {
        const key = i.productId + '|' + i.unit;
        const row = map.get(key) || { productId: i.productId, name: i.name, unit: i.unit, qty: 0, money: 0, orders: 0 };
        row.qty = Math.round((row.qty + i.qty) * 100) / 100;
        row.money += Math.round(i.price * i.qty);
        row.orders += 1;
        map.set(key, row);
      }
    }
    return [...map.values()].sort((a, b) => (order.get(a.productId) ?? 1e9) - (order.get(b.productId) ?? 1e9) || a.name.localeCompare(b.name, 'vi'));
  }

  function render() {
    const sel = $('#stats-scope');
    const cur = Store.currentBatch().id;
    const value = scope || cur;
    sel.innerHTML = Store.state.batches.slice().reverse()
      .map(b => `<option value="${b.id}">${esc(b.name)}${b.id === cur ? ' (hiện tại)' : ''}</option>`).join('')
      + '<option value="today">Hôm nay</option><option value="all">Tất cả các đợt</option>';
    sel.value = value;

    const orders = scopedOrders(value);
    const paid = orders.filter(o => o.status === 'paid');
    const sum = list => list.reduce((s, o) => s + o.total, 0);
    const revenue = sum(orders);
    const collected = sum(paid);

    $('#stat-tiles').innerHTML = `
      <div class="stat wide"><span>Tổng doanh thu · ${esc(scopeLabel(value))}</span><strong>${money(revenue)}</strong></div>
      <div class="stat paid"><span>Đã thu</span><strong>${money(collected)}</strong></div>
      <div class="stat unpaid"><span>Còn phải thu</span><strong>${money(revenue - collected)}</strong></div>
      <div class="stat"><span>Số đơn</span><strong>${orders.length}</strong></div>
      <div class="stat"><span>Đơn chưa TT</span><strong>${orders.length - paid.length}</strong></div>`;

    const rows = prepList(orders);
    $('#prep-list').innerHTML = rows.length
      ? `<table class="prep"><tbody>${rows.map(r => `
          <tr>
            <td>${esc(r.name)}<br><small class="muted">${r.orders} đơn</small></td>
            <td class="money">${money(r.money)}</td>
            <td class="qty">${qty(r.qty)} <span class="unit">${esc(r.unit)}</span></td>
          </tr>`).join('')}</tbody></table>`
      : '<p class="empty">Chưa có đơn nào trong phạm vi này.</p>';

    const sorted = orders.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    $('#pack-list').innerHTML = sorted.length
      ? sorted.map(o => `
          <div class="pack">
            <b>${o.code} · ${esc(o.customer.name)} ${o.status === 'paid' ? '✅' : '⏳'}</b>
            ${o.items.map(i => `${esc(i.name)} ${qty(i.qty)} ${esc(i.unit)}`).join(', ')}
            ${o.customer.address ? `<br><small class="muted">📍 ${esc(o.customer.address)}</small>` : ''}
          </div>`).join('')
      : '<p class="empty">Chưa có đơn.</p>';
  }

  function prepText() {
    const value = scope || Store.currentBatch().id;
    const orders = scopedOrders(value);
    return [
      `📦 HÀNG CẦN CHUẨN BỊ – ${scopeLabel(value)} (${orders.length} đơn)`,
      ...prepList(orders).map(r => `• ${r.name}: ${qty(r.qty)} ${r.unit}`),
    ].join('\n');
  }

  function packText() {
    const value = scope || Store.currentBatch().id;
    const orders = scopedOrders(value).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return [
      `🛍 ĐÓNG GÓI THEO KHÁCH – ${scopeLabel(value)}`,
      ...orders.map(o => {
        const lines = ['', `${o.code} – ${o.customer.name} – ${o.customer.phone}${o.status === 'paid' ? ' (đã TT)' : ` (chưa TT ${money(o.total)})`}`];
        if (o.customer.address) lines.push(`📍 ${o.customer.address}`);
        lines.push(...o.items.map(i => `  • ${i.name} ${qty(i.qty)} ${i.unit}`));
        return lines.join('\n');
      }),
    ].join('\n');
  }

  function init() {
    $('#stats-scope').addEventListener('change', ev => {
      scope = ev.target.value === Store.currentBatch().id ? null : ev.target.value;
      render();
    });
    $('#copy-prep').addEventListener('click', () => App.copyText(prepText(), 'Đã copy danh sách chuẩn bị hàng'));
    $('#copy-pack').addEventListener('click', () => App.copyText(packText(), 'Đã copy danh sách đóng gói'));
  }

  App.register('stats', { init, render });
})();
