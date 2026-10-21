// Lưu toàn bộ dữ liệu trong localStorage dưới một khoá duy nhất.
const Store = (() => {
  const KEY = 'cholangtoi.v1';
  const SAMPLE_ACCOUNT = '0123456789';

  const BANKS = [
    { bin: '970422', name: 'MB Bank' },
    { bin: '970436', name: 'Vietcombank' },
    { bin: '970415', name: 'VietinBank' },
    { bin: '970418', name: 'BIDV' },
    { bin: '970405', name: 'Agribank' },
    { bin: '970407', name: 'Techcombank' },
    { bin: '970416', name: 'ACB' },
    { bin: '970432', name: 'VPBank' },
    { bin: '970423', name: 'TPBank' },
    { bin: '970403', name: 'Sacombank' },
    { bin: '970437', name: 'HDBank' },
    { bin: '970441', name: 'VIB' },
    { bin: '970443', name: 'SHB' },
    { bin: '970426', name: 'MSB' },
    { bin: '970448', name: 'OCB' },
    { bin: '970440', name: 'SeABank' },
    { bin: '970449', name: 'LPBank' },
    { bin: '970431', name: 'Eximbank' },
  ];

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function defaults() {
    const now = new Date().toISOString();
    const batchId = uid();
    const products = [
      ['Rau muống', 'bó', 15000],
      ['Cải ngọt', 'bó', 15000],
      ['Thịt ba chỉ', 'kg', 160000],
      ['Thịt nạc vai', 'kg', 150000],
      ['Gà ta', 'kg', 140000],
      ['Trứng gà ta', 'chục', 40000],
      ['Cá rô đồng', 'kg', 90000],
      ['Đậu phụ', 'bìa', 5000],
    ].map(([name, unit, price]) => ({ id: uid(), name, unit, price, active: true }));
    return {
      settings: {
        shopName: 'Chợ Làng Tôi',
        bankBin: '970422',
        accountNo: SAMPLE_ACCOUNT,
        accountName: 'NGUYEN THI VAN',
      },
      products,
      batches: [{ id: batchId, name: 'Đợt 1', createdAt: now }],
      currentBatchId: batchId,
      orders: [],
      seq: 0,
      lastBackupAt: null,
    };
  }

  let state;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      state = raw ? JSON.parse(raw) : defaults();
    } catch (e) {
      console.error('Không đọc được dữ liệu, dùng dữ liệu mặc định', e);
      state = defaults();
    }
    normalize();
    save();
  }

  function normalize() {
    if (!state.batches?.length) {
      const d = defaults();
      state.batches = d.batches;
      state.currentBatchId = d.currentBatchId;
    }
    if (!state.batches.some(b => b.id === state.currentBatchId)) {
      state.currentBatchId = state.batches[state.batches.length - 1].id;
    }
    state.seq = state.seq || state.orders.length;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      alert('Không lưu được dữ liệu trên máy này (bộ nhớ trình duyệt bị chặn hoặc đầy).');
    }
  }

  // ---------- Đợt hàng ----------
  const currentBatch = () => state.batches.find(b => b.id === state.currentBatchId) || state.batches[state.batches.length - 1];

  function addBatch(name) {
    const batch = { id: uid(), name, createdAt: new Date().toISOString() };
    state.batches.push(batch);
    state.currentBatchId = batch.id;
    save();
    return batch;
  }

  function setCurrentBatch(id) {
    state.currentBatchId = id;
    save();
  }

  function deleteBatch(id) {
    if (state.orders.some(o => o.batchId === id) || state.batches.length < 2) return false;
    state.batches = state.batches.filter(b => b.id !== id);
    if (state.currentBatchId === id) state.currentBatchId = state.batches[state.batches.length - 1].id;
    save();
    return true;
  }

  // ---------- Sản phẩm ----------
  function addProduct({ name, unit, price }) {
    state.products.push({ id: uid(), name, unit, price, active: true });
    save();
  }

  function updateProduct(id, patch) {
    Object.assign(state.products.find(p => p.id === id), patch);
    save();
  }

  // Món đã có trong đơn thì chỉ ẩn, không xoá, để đơn cũ vẫn hiển thị đúng.
  function removeProduct(id) {
    const used = state.orders.some(o => o.items.some(i => i.productId === id));
    if (used) updateProduct(id, { active: false });
    else {
      state.products = state.products.filter(p => p.id !== id);
      save();
    }
    return used ? 'hidden' : 'deleted';
  }

  // ---------- Đơn hàng ----------
  function saveOrder(data, editingId) {
    const items = data.items.map(i => ({ ...i }));
    const total = items.reduce((s, i) => s + Math.round(i.price * i.qty), 0);
    if (editingId) {
      const order = state.orders.find(o => o.id === editingId);
      Object.assign(order, { customer: data.customer, note: data.note, items, total, updatedAt: new Date().toISOString() });
      save();
      return order;
    }
    state.seq += 1;
    const order = {
      id: uid(),
      code: 'DH' + String(state.seq).padStart(4, '0'),
      batchId: currentBatch().id,
      createdAt: new Date().toISOString(),
      customer: data.customer,
      note: data.note,
      items,
      total,
      status: 'unpaid',
      paidAt: null,
    };
    state.orders.push(order);
    save();
    return order;
  }

  function toggleOrderPaid(id) {
    const order = state.orders.find(o => o.id === id);
    order.status = order.status === 'paid' ? 'unpaid' : 'paid';
    order.paidAt = order.status === 'paid' ? new Date().toISOString() : null;
    save();
    return order;
  }

  function deleteOrder(id) {
    state.orders = state.orders.filter(o => o.id !== id);
    save();
  }

  // Khách cũ, lấy thông tin mới nhất theo SĐT.
  function customers() {
    const map = new Map();
    for (const o of state.orders) map.set(o.customer.phone, o.customer);
    return [...map.values()].reverse();
  }

  // ---------- Cài đặt ----------
  function updateSettings(patch) {
    Object.assign(state.settings, patch);
    save();
  }

  const isSampleAccount = () => state.settings.accountNo === SAMPLE_ACCOUNT;

  // ---------- Sao lưu ----------
  function exportData() {
    state.lastBackupAt = new Date().toISOString();
    save();
    return JSON.stringify(state, null, 2);
  }

  function importData(text) {
    const data = JSON.parse(text);
    if (!Array.isArray(data.orders) || !Array.isArray(data.products) || !data.settings) {
      throw new Error('File không đúng định dạng sao lưu của Chợ Làng Tôi');
    }
    state = data;
    normalize();
    save();
  }

  load();

  return {
    get state() { return state; },
    BANKS, uid,
    currentBatch, addBatch, setCurrentBatch, deleteBatch,
    addProduct, updateProduct, removeProduct,
    saveOrder, toggleOrderPaid, deleteOrder, customers,
    updateSettings, isSampleAccount,
    exportData, importData,
  };
})();
