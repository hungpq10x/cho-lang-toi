// Điều phối chung: chuyển tab, định dạng, thông báo, mã QR.
const App = (() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const moneyFmt = new Intl.NumberFormat('vi-VN');
  const qtyFmt = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });
  const money = n => moneyFmt.format(Math.round(n || 0)) + 'đ';
  const qty = n => qtyFmt.format(n || 0);

  // Chấp nhận cả "1,5" và "1.5". Dấu chấm/phẩy trong giá tiền được coi là phân cách nghìn.
  const parseQty = v => {
    const n = parseFloat(String(v).replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
  };
  const parsePrice = v => parseInt(String(v).replace(/[^\d]/g, ''), 10) || 0;

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const stripAccents = s => String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D');

  const isToday = iso => new Date(iso).toDateString() === new Date().toDateString();

  function time(iso) {
    const d = new Date(iso);
    const hm = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const dm = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    return isToday(iso) ? `${hm} hôm nay` : `${hm} ${dm}`;
  }

  const date = iso => new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  async function copyText(text, okMsg = 'Đã copy') {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Dự phòng cho trình duyệt cũ hoặc trang mở qua file://
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    toast(okMsg);
  }

  function download(filename, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ---------- Mã QR (VietQR) ----------
  const bankName = bin => Store.BANKS.find(b => b.bin === bin)?.name || bin;

  function transferNote(order) {
    return `${order.code} ${stripAccents(order.customer.name)}`.toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 25).trim();
  }

  function qrUrl(order) {
    const s = Store.state.settings;
    const params = [
      ['amount', order.total],
      ['addInfo', transferNote(order)],
      ['accountName', stripAccents(s.accountName).toUpperCase()],
    ].map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    // Dùng thẳng .svg: link .png chỉ chuyển hướng sang .svg và không cho phép tải bằng script.
    return `https://img.vietqr.io/image/${s.bankBin}-${encodeURIComponent(s.accountNo)}-compact2.svg?${params}`;
  }

  // Vẽ ảnh QR (SVG) ra PNG để gửi được qua Zalo.
  async function qrPng(order) {
    const res = await fetch(qrUrl(order));
    if (!res.ok) throw new Error('Không tải được mã QR (' + res.status + ')');
    const svgUrl = URL.createObjectURL(new Blob([await res.text()], { type: 'image/svg+xml' }));
    try {
      const img = new Image();
      img.src = svgUrl;
      await img.decode();
      const scale = 1080 / (img.naturalWidth || 540);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round((img.naturalWidth || 540) * scale);
      canvas.height = Math.round((img.naturalHeight || 640) * scale);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  }

  function orderMessage(order) {
    const s = Store.state.settings;
    const lines = [
      `🧾 Đơn ${order.code} – ${s.shopName}`,
      `Khách: ${order.customer.name} – ${order.customer.phone}`,
    ];
    if (order.customer.address) lines.push(`Địa chỉ: ${order.customer.address}`);
    if (order.note) lines.push(`Ghi chú: ${order.note}`);
    lines.push('', ...order.items.map(i => `• ${i.name} x ${qty(i.qty)} ${i.unit} = ${money(i.price * i.qty)}`));
    lines.push('', `TỔNG: ${money(order.total)}`);
    if (order.status === 'paid') lines.push('✅ Đã thanh toán. Cảm ơn quý khách!');
    else lines.push(
      `💳 Chuyển khoản: ${bankName(s.bankBin)} – ${s.accountNo} – ${s.accountName}`,
      `Nội dung: ${transferNote(order)}`,
      `Mã QR: ${qrUrl(order)}`,
    );
    return lines.join('\n');
  }

  let qrOrder = null;
  function showQr(order) {
    qrOrder = order;
    $('#qr-title').textContent = `${order.code} · ${order.customer.name}`;
    $('#qr-amount').textContent = money(order.total);
    $('#qr-img').src = qrUrl(order);
    const s = Store.state.settings;
    $('#qr-info').innerHTML = `${esc(bankName(s.bankBin))} · ${esc(s.accountNo)}<br>${esc(s.accountName)}<br>Nội dung: <b>${esc(transferNote(order))}</b>`;
    $('#qr-warn').classList.toggle('hidden', !Store.isSampleAccount());
    $('#qr-dialog').showModal();
  }

  async function shareQr() {
    const order = qrOrder;
    const text = orderMessage(order);
    try {
      const blob = await qrPng(order);
      const file = new File([blob], `QR-${order.code}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text });
        return;
      }
      download(file.name, blob, 'image/png');
      toast('Đã tải ảnh QR về máy');
    } catch (e) {
      if (e.name === 'AbortError') return;
      if (navigator.share) {
        try { await navigator.share({ text }); return; } catch (err) { if (err.name === 'AbortError') return; }
      }
      copyText(text, 'Đã copy tin nhắn kèm link QR');
    }
  }

  // ---------- Chuyển tab ----------
  const views = {};
  let currentTab = 'new';

  function register(name, view) {
    views[name] = view;
  }

  function showTab(name) {
    currentTab = name;
    $$('.view').forEach(v => v.classList.toggle('hidden', v.dataset.view !== name));
    $$('.tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    views[name]?.render?.();
    window.scrollTo(0, 0);
  }

  // Gọi sau mỗi lần dữ liệu thay đổi.
  function refresh() {
    const s = Store.state;
    $('#shop-name').textContent = s.settings.shopName;
    $('#current-batch').textContent = Store.currentBatch().name;
    document.title = `${s.settings.shopName} – Quản lý đơn`;
    const unpaid = s.orders.filter(o => o.status === 'unpaid').length;
    $('#unpaid-badge').textContent = unpaid;
    $('#unpaid-badge').classList.toggle('hidden', !unpaid);
    if (currentTab !== 'new') views[currentTab]?.render?.();
  }

  function start() {
    Object.values(views).forEach(v => v.init?.());
    $$('.tabbar button').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));
    $('#qr-dialog').addEventListener('click', e => {
      if (e.target.matches('[data-close]') || e.target === e.currentTarget) e.currentTarget.close();
    });
    $('#qr-share').addEventListener('click', shareQr);
    $('#qr-copy').addEventListener('click', () => copyText(orderMessage(qrOrder), 'Đã copy, dán vào Zalo để gửi khách'));
    refresh();
    showTab('new');

    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(e => console.warn('Không đăng ký được service worker', e));
    }
  }

  return {
    $, $$, money, qty, parseQty, parsePrice, esc, stripAccents, isToday, time, date,
    toast, copyText, download, bankName, qrUrl, qrPng, orderMessage, showQr,
    register, showTab, refresh, start,
  };
})();
