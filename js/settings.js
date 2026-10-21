// Tab "Cài đặt": đợt hàng, món hàng, tài khoản ngân hàng, sao lưu.
const Settings = (() => {
  const { $, money, esc, parsePrice } = App;

  function renderBatches() {
    const s = Store.state;
    const cur = Store.currentBatch().id;
    $('#batch-list').innerHTML = s.batches.slice().reverse().map(b => {
      const count = s.orders.filter(o => o.batchId === b.id).length;
      const actions = b.id === cur
        ? '<span class="cur">Đang dùng</span>'
        : `<span>
             <button type="button" class="btn btn-sm" data-act="use" data-id="${b.id}">Dùng lại</button>
             ${count ? '' : `<button type="button" class="btn btn-sm btn-danger" data-act="del" data-id="${b.id}">Xoá</button>`}
           </span>`;
      return `<div class="batch"><div><b>${esc(b.name)}</b><br><small class="muted">${App.date(b.createdAt)} · ${count} đơn</small></div>${actions}</div>`;
    }).join('');
  }

  function renderProducts() {
    const list = Store.state.products;
    $('#product-list').innerHTML = list.length ? '<div class="product-row product-head"><span>Tên món</span><span>Đơn vị</span><span>Giá (đ)</span><span></span></div>' + list.map(p => `
      <div class="product-row ${p.active ? '' : 'off'}" data-id="${p.id}">
        <input name="name" value="${esc(p.name)}" aria-label="Tên món">
        <input name="unit" value="${esc(p.unit)}" aria-label="Đơn vị">
        <input name="price" value="${App.qty(p.price)}" inputmode="numeric" aria-label="Giá">
        ${p.active
          ? `<button type="button" class="icon-btn" data-act="remove" title="Xoá / ẩn món">🗑</button>`
          : `<button type="button" class="icon-btn" data-act="restore" title="Bán lại món này">↺</button>`}
      </div>`).join('')
      : '<p class="empty">Chưa có món nào.</p>';
  }

  function renderBank() {
    const s = Store.state.settings;
    const f = $('#bank-form');
    $('#bank-select').innerHTML = Store.BANKS.map(b => `<option value="${b.bin}">${esc(b.name)}</option>`).join('');
    f.shopName.value = s.shopName;
    f.bankBin.value = s.bankBin;
    f.accountNo.value = s.accountNo;
    f.accountName.value = s.accountName;
    $('#bank-warn').classList.toggle('hidden', !Store.isSampleAccount());
  }

  function renderBackup() {
    const last = Store.state.lastBackupAt;
    $('#backup-info').textContent = last
      ? `Lần sao lưu gần nhất: ${App.time(last)}.`
      : 'Chưa sao lưu lần nào.';
  }

  function render() {
    renderBatches();
    renderProducts();
    renderBank();
    renderBackup();
  }

  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  function exportCsv() {
    const s = Store.state;
    const batchName = id => s.batches.find(b => b.id === id)?.name || '';
    const cell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['Mã đơn', 'Thời gian', 'Đợt', 'Khách', 'SĐT', 'Địa chỉ', 'Món hàng', 'Tổng tiền', 'Trạng thái', 'Ghi chú'];
    const rows = s.orders.map(o => [
      o.code,
      new Date(o.createdAt).toLocaleString('vi-VN'),
      batchName(o.batchId),
      o.customer.name,
      `="${o.customer.phone}"`, // để Excel giữ số 0 ở đầu
      o.customer.address,
      o.items.map(i => `${i.name} ${App.qty(i.qty)} ${i.unit}`).join('; '),
      o.total,
      o.status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán',
      o.note,
    ]);
    const csv = '﻿' + [header, ...rows].map(r => r.map(cell).join(',')).join('\r\n');
    App.download(`don-hang-${today()}.csv`, csv, 'text/csv;charset=utf-8');
  }

  function init() {
    $('#new-batch').addEventListener('click', () => {
      const n = Store.state.batches.length + 1;
      const now = new Date();
      const d = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}`;
      const name = prompt('Tên đợt hàng mới:', `Đợt ${n} – ${d}`);
      if (!name?.trim()) return;
      Store.addBatch(name.trim());
      App.toast(`Đã mở "${name.trim()}". Đơn mới sẽ vào đợt này.`);
      App.refresh();
    });

    $('#batch-list').addEventListener('click', ev => {
      const btn = ev.target.closest('button[data-act]');
      if (!btn) return;
      if (btn.dataset.act === 'use') {
        Store.setCurrentBatch(btn.dataset.id);
        App.toast(`Đang dùng "${Store.currentBatch().name}"`);
      } else if (confirm('Xoá đợt hàng trống này?')) {
        Store.deleteBatch(btn.dataset.id);
      }
      App.refresh();
    });

    const plist = $('#product-list');
    plist.addEventListener('change', ev => {
      const row = ev.target.closest('.product-row');
      const field = ev.target.name;
      let value = ev.target.value.trim();
      if (field === 'price') value = parsePrice(value);
      if (!value) { renderProducts(); return App.toast('Không được để trống'); }
      Store.updateProduct(row.dataset.id, { [field]: value });
      if (field === 'price') ev.target.value = App.qty(value);
      App.toast('Đã lưu');
    });
    plist.addEventListener('click', ev => {
      const btn = ev.target.closest('button[data-act]');
      if (!btn) return;
      const id = btn.closest('.product-row').dataset.id;
      const p = Store.state.products.find(x => x.id === id);
      if (btn.dataset.act === 'restore') {
        Store.updateProduct(id, { active: true });
        App.toast(`Đã bán lại "${p.name}"`);
      } else if (confirm(`Bỏ món "${p.name}" khỏi danh sách bán?`)) {
        const result = Store.removeProduct(id);
        App.toast(result === 'hidden' ? `Đã ẩn "${p.name}" (vẫn giữ trong đơn cũ)` : `Đã xoá "${p.name}"`);
      }
      renderProducts();
    });

    $('#product-add').addEventListener('submit', ev => {
      ev.preventDefault();
      const f = ev.target;
      const name = f.name.value.trim();
      const unit = f.unit.value.trim();
      const price = parsePrice(f.price.value);
      if (!name || !unit || !price) return App.toast('Nhập đủ tên, đơn vị và giá');
      Store.addProduct({ name, unit, price });
      f.reset();
      f.name.focus();
      renderProducts();
      App.toast(`Đã thêm "${name}" – ${money(price)}/${unit}`);
    });

    $('#bank-form').addEventListener('submit', ev => {
      ev.preventDefault();
      const f = ev.target;
      const accountNo = f.accountNo.value.replace(/\s/g, '');
      if (!/^\d{6,19}$/.test(accountNo)) return App.toast('Số tài khoản chỉ gồm chữ số');
      Store.updateSettings({
        shopName: f.shopName.value.trim() || 'Chợ Làng Tôi',
        bankBin: f.bankBin.value,
        accountNo,
        accountName: App.stripAccents(f.accountName.value.trim()).toUpperCase(),
      });
      App.toast('Đã lưu thông tin nhận tiền');
      App.refresh();
    });

    $('#bank-test').addEventListener('click', () => {
      App.showQr({ code: 'DH0000', customer: { name: 'Khach thu', phone: '' }, items: [], total: 10000, status: 'unpaid' });
    });

    $('#export-json').addEventListener('click', () => {
      App.download(`cholangtoi-saoluu-${today()}.json`, Store.exportData(), 'application/json');
      renderBackup();
      App.toast('Đã tải bản sao lưu');
    });
    $('#export-csv').addEventListener('click', exportCsv);
    $('#import-json').addEventListener('change', async ev => {
      const file = ev.target.files[0];
      ev.target.value = '';
      if (!file) return;
      if (!confirm('Khôi phục sẽ THAY THẾ toàn bộ dữ liệu hiện tại trên máy này bằng dữ liệu trong file. Tiếp tục?')) return;
      try {
        Store.importData(await file.text());
        App.toast('Đã khôi phục dữ liệu');
        App.refresh();
      } catch (e) {
        alert('Không khôi phục được: ' + e.message);
      }
    });
  }

  App.register('settings', { init, render });
})();
