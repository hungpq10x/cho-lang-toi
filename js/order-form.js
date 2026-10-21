// Tab "Tạo đơn": nhập khách, chọn món, lưu đơn.
const OrderForm = (() => {
  const { $, $$, money, qty, parseQty, esc, stripAccents } = App;

  let quantities = {};   // productId -> số lượng
  let editing = null;    // đơn đang sửa

  const form = () => $('#order-form');
  const stepOf = unit => (/^(kg|lạng|lit|lít)$/i.test(unit) ? 0.5 : 1);

  // Món đang bán, cộng thêm các món của đơn đang sửa (giữ nguyên giá lúc đặt).
  function entries() {
    const list = Store.state.products.filter(p => p.active)
      .map(p => ({ productId: p.id, name: p.name, unit: p.unit, price: p.price }));
    if (editing) {
      for (const item of editing.items) {
        const found = list.find(e => e.productId === item.productId);
        if (found) Object.assign(found, { price: item.price });
        else list.push({ productId: item.productId, name: item.name, unit: item.unit, price: item.price });
      }
    }
    return list;
  }

  function render() {
    const list = entries();
    $('#picker-empty').classList.toggle('hidden', list.length > 0);
    $('#product-picker').innerHTML = list.map(e => {
      const q = quantities[e.productId] || 0;
      return `
        <div class="pick ${q ? 'on' : ''}" data-id="${e.productId}" data-step="${stepOf(e.unit)}">
          <div>
            <div class="pick-name">${esc(e.name)}</div>
            <div class="pick-price">${money(e.price)} / ${esc(e.unit)}</div>
            <div class="pick-sub">${q ? '= ' + money(e.price * q) : ''}</div>
          </div>
          <div class="stepper">
            <button type="button" data-act="minus" aria-label="Bớt">−</button>
            <input type="text" inputmode="decimal" value="${q ? qty(q) : ''}" placeholder="0" aria-label="Số lượng ${esc(e.name)}">
            <button type="button" data-act="plus" aria-label="Thêm">+</button>
          </div>
        </div>`;
    }).join('');
    updateTotal();
  }

  function updatePick(card) {
    const id = card.dataset.id;
    const e = entries().find(x => x.productId === id);
    const q = quantities[id] || 0;
    card.classList.toggle('on', q > 0);
    card.querySelector('.pick-sub').textContent = q ? '= ' + money(e.price * q) : '';
    updateTotal();
  }

  function currentItems() {
    return entries()
      .filter(e => quantities[e.productId] > 0)
      .map(e => ({ ...e, qty: quantities[e.productId] }));
  }

  function updateTotal() {
    const items = currentItems();
    const total = items.reduce((s, i) => s + Math.round(i.price * i.qty), 0);
    $('#form-total').textContent = money(total);
    $('#form-count').textContent = items.length ? `${items.length} món` : 'Chưa chọn món';
  }

  // ---------- Gợi ý khách cũ ----------
  function suggest() {
    const f = form();
    const phone = f.phone.value.replace(/\D/g, '');
    const name = stripAccents(f.name.value).toLowerCase().trim();
    const box = $('#customer-suggest');
    if (phone.length < 3 && name.length < 2) { box.innerHTML = ''; return; }
    const matches = Store.customers().filter(c =>
      (phone.length >= 3 && c.phone.includes(phone)) ||
      (name.length >= 2 && stripAccents(c.name).toLowerCase().includes(name))
    ).filter(c => !(c.phone === phone && c.name === f.name.value.trim())).slice(0, 4);
    box.innerHTML = matches.map((c, i) =>
      `<button type="button" data-i="${i}">↺ ${esc(c.name)} · ${esc(c.phone)}</button>`).join('');
    box.onclick = ev => {
      const btn = ev.target.closest('button');
      if (!btn) return;
      const c = matches[btn.dataset.i];
      f.phone.value = c.phone;
      f.name.value = c.name;
      f.address.value = c.address || '';
      box.innerHTML = '';
      clearInvalid();
    };
  }

  function clearInvalid() {
    $$('.invalid', form()).forEach(el => el.classList.remove('invalid'));
  }

  function reset() {
    form().reset();
    quantities = {};
    editing = null;
    $('#form-title').textContent = 'Đơn mới';
    $('#save-order').textContent = 'Lưu đơn';
    $('#cancel-edit').classList.add('hidden');
    $('#customer-suggest').innerHTML = '';
    clearInvalid();
    render();
  }

  function edit(order) {
    reset();
    editing = order;
    const f = form();
    f.phone.value = order.customer.phone;
    f.name.value = order.customer.name;
    f.address.value = order.customer.address || '';
    f.note.value = order.note || '';
    order.items.forEach(i => { quantities[i.productId] = i.qty; });
    $('#form-title').textContent = `Sửa đơn ${order.code}`;
    $('#save-order').textContent = 'Lưu thay đổi';
    $('#cancel-edit').classList.remove('hidden');
    App.showTab('new');
  }

  function submit(ev) {
    ev.preventDefault();
    clearInvalid();
    const f = form();
    const phone = f.phone.value.replace(/\D/g, '');
    const name = f.name.value.trim();
    const items = currentItems();
    const errors = [];
    if (!/^0\d{9,10}$/.test(phone)) { f.phone.classList.add('invalid'); errors.push('SĐT chưa đúng (10 số, bắt đầu bằng 0)'); }
    if (!name) { f.name.classList.add('invalid'); errors.push('chưa có tên khách'); }
    if (!items.length) errors.push('chưa chọn món nào');
    if (errors.length) {
      App.toast('⚠ ' + errors[0].charAt(0).toUpperCase() + errors[0].slice(1));
      (f.querySelector('.invalid') || $('#product-picker')).scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const wasEditing = !!editing;
    const order = Store.saveOrder({
      customer: { name, phone, address: f.address.value.trim() },
      note: f.note.value.trim(),
      items,
    }, editing?.id);
    App.toast(wasEditing ? `Đã cập nhật đơn ${order.code}` : `✓ Đã lưu đơn ${order.code} – ${money(order.total)}`);
    reset();
    App.refresh();
    if (wasEditing) App.showTab('orders');
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function init() {
    const f = form();
    f.addEventListener('submit', submit);
    f.phone.addEventListener('input', suggest);
    f.name.addEventListener('input', suggest);
    f.addEventListener('input', ev => ev.target.classList.remove('invalid'));
    $('#cancel-edit').addEventListener('click', () => { reset(); App.showTab('orders'); });

    const picker = $('#product-picker');
    picker.addEventListener('click', ev => {
      const btn = ev.target.closest('button[data-act]');
      if (!btn) return;
      const card = btn.closest('.pick');
      const step = parseFloat(card.dataset.step);
      const id = card.dataset.id;
      const next = Math.max(0, Math.round(((quantities[id] || 0) + (btn.dataset.act === 'plus' ? step : -step)) * 100) / 100);
      if (next) quantities[id] = next; else delete quantities[id];
      card.querySelector('input').value = next ? qty(next) : '';
      updatePick(card);
    });
    picker.addEventListener('input', ev => {
      const card = ev.target.closest('.pick');
      const q = parseQty(ev.target.value);
      if (q) quantities[card.dataset.id] = q; else delete quantities[card.dataset.id];
      updatePick(card);
    });
    picker.addEventListener('focusin', ev => { if (ev.target.matches('input')) ev.target.select(); });
  }

  App.register('new', { init, render });
  return { edit, reset };
})();
