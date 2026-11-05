'use strict';
// Trang quản trị Chùa An Nhiên — JS thuần, không phụ thuộc.
// An toàn: KHÔNG dùng innerHTML với dữ liệu máy chủ; mọi nội dung qua textContent/createElement.
(function () {
  const API = '/admin/api';
  const $ = (sel) => document.querySelector(sel);
  const SVG_NS = 'http://www.w3.org/2000/svg';

  // ---------------------------------------------------------------- tiện ích DOM
  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = v;
        else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v === true ? '' : String(v));
      }
    }
    for (const c of children) {
      if (c == null || c === false) continue;
      node.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return node;
  }
  function svg(tag, attrs) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) node.setAttribute(k, String(v));
    return node;
  }
  function clear(node) { node.replaceChildren(); }
  function empty(text) { return el('li', { class: 'empty', text }); }

  const dtf = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
  function fmtTime(s) {
    if (!s) return '–';
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? String(s) : dtf.format(d);
  }

  // ---------------------------------------------------------------- toast
  function toast(msg, kind = 'error') {
    const t = el('div', { class: 'toast ' + kind, role: kind === 'error' ? 'alert' : 'status', text: msg });
    $('#toasts').append(t);
    setTimeout(() => t.remove(), kind === 'error' ? 6000 : 3000);
  }

  const ERR_MSG = {
    invalid_password: 'Sai mật khẩu',
    rate_limited: 'Thử quá nhiều lần, vui lòng đợi một phút',
    admin_disabled: 'Trang quản trị chưa được bật (thiếu ADMIN_PASSWORD)',
    unauthorized: 'Phiên đăng nhập đã hết hạn',
    csrf: 'Yêu cầu bị chặn (CSRF)',
    not_found: 'Không tìm thấy',
    invalid_id: 'Mã không hợp lệ',
    invalid_payload: 'Dữ liệu không hợp lệ',
  };

  // ---------------------------------------------------------------- API
  class ApiError extends Error {
    constructor(status, code) {
      super(ERR_MSG[code] || ('Lỗi máy chủ (' + status + ')'));
      this.status = status;
      this.code = code;
    }
  }

  async function api(path, opts = {}) {
    const method = opts.method || 'GET';
    const headers = { accept: 'application/json' };
    if (method !== 'GET') {
      headers['x-admin-request'] = '1';
      headers['content-type'] = 'application/json';
    }
    let res;
    try {
      res = await fetch(API + path, {
        method,
        headers,
        credentials: 'same-origin',
        body: method !== 'GET' ? JSON.stringify(opts.body ?? {}) : undefined,
      });
    } catch {
      throw new ApiError(0, 'network');
    }
    let data = null;
    try { data = await res.json(); } catch { /* không phải JSON */ }
    if (!res.ok) {
      const err = new ApiError(res.status, data && data.error);
      if (res.status === 401 && path !== '/login') showLogin();
      throw err;
    }
    return data || {};
  }

  // Gọi API kèm khoá nút + toast lỗi
  async function act(btn, fn, okMsg) {
    if (btn) btn.disabled = true;
    try {
      const r = await fn();
      if (okMsg) toast(okMsg, 'success');
      return r;
    } catch (e) {
      if (e.status !== 401) toast(e.code === 'network' ? 'Không kết nối được máy chủ' : e.message);
      return undefined;
    } finally {
      if (btn && btn.isConnected) btn.disabled = false;
    }
  }

  // ---------------------------------------------------------------- đăng nhập
  function showLogin() {
    stopAutoRefresh();
    $('#app-view').hidden = true;
    $('#login-view').hidden = false;
    $('#login-password').focus();
  }

  async function showApp() {
    let me;
    try { me = await api('/me'); } catch (e) {
      if (e.status === 503) { showLogin(); $('#login-error').textContent = e.message; }
      else if (e.status !== 401) { showLogin(); toast(e.message); }
      return;
    }
    $('#login-view').hidden = true;
    $('#app-view').hidden = false;
    const feats = Array.isArray(me.features) && me.features.length ? ' · Tính năng: ' + me.features.join(', ') : '';
    $('#mode-info').textContent = 'Chế độ kiểm duyệt: ' + (me.moderationMode || '?') + feats;
    selectTab(location.hash.slice(1) || 'lanterns');
  }

  $('#login-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const pw = $('#login-password');
    const errEl = $('#login-error');
    const btn = ev.submitter || $('#login-form button');
    errEl.textContent = '';
    if (!pw.value) { errEl.textContent = 'Vui lòng nhập mật khẩu'; pw.focus(); return; }
    btn.disabled = true;
    try {
      await api('/login', { method: 'POST', body: { password: pw.value } });
      pw.value = '';
      await showApp();
    } catch (e) {
      errEl.textContent = e.code === 'network' ? 'Không kết nối được máy chủ' : e.message;
      pw.select();
    } finally {
      btn.disabled = false;
    }
  });

  $('#logout-btn').addEventListener('click', async () => {
    try { await api('/logout', { method: 'POST' }); } catch { /* bỏ qua */ }
    showLogin();
  });

  // ---------------------------------------------------------------- tab
  const loaders = {
    lanterns: loadLanterns,
    reports: loadReports,
    users: loadUsers,
    words: loadWords,
    stats: loadStats,
  };
  let currentTab = null;
  let refreshTimer = null;

  function stopAutoRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = null;
  }

  function selectTab(name) {
    if (!loaders[name]) name = 'lanterns';
    currentTab = name;
    for (const b of document.querySelectorAll('.tabs [role="tab"]')) {
      const on = b.dataset.tab === name;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      $('#panel-' + b.dataset.tab).hidden = !on;
    }
    if (location.hash !== '#' + name) history.replaceState(null, '', '#' + name);
    stopAutoRefresh();
    loaders[name]();
    if (name === 'lanterns') {
      refreshTimer = setInterval(() => {
        if (document.visibilityState === 'visible' && $('#lantern-status').value === 'pending') loadLanterns(true);
      }, 15000);
    }
  }

  const tabButtons = [...document.querySelectorAll('.tabs [role="tab"]')];
  for (const b of tabButtons) {
    b.addEventListener('click', () => selectTab(b.dataset.tab));
    b.addEventListener('keydown', (ev) => {
      const i = tabButtons.indexOf(b);
      let j = null;
      if (ev.key === 'ArrowRight') j = (i + 1) % tabButtons.length;
      else if (ev.key === 'ArrowLeft') j = (i - 1 + tabButtons.length) % tabButtons.length;
      else if (ev.key === 'Home') j = 0;
      else if (ev.key === 'End') j = tabButtons.length - 1;
      if (j == null) return;
      ev.preventDefault();
      tabButtons[j].focus();
      selectTab(tabButtons[j].dataset.tab);
    });
  }
  for (const b of document.querySelectorAll('[data-refresh]')) {
    b.addEventListener('click', () => loaders[b.dataset.refresh]());
  }

  // ---------------------------------------------------------------- khóa thiết bị (dùng chung)
  async function setBan(btn, userId, banned, label) {
    if (!userId) { toast('Không rõ thiết bị'); return false; }
    const who = label ? ' "' + label + '"' : '';
    if (banned && !confirm('Khóa thiết bị' + who + '? Mọi đèn đang hiển thị của thiết bị này sẽ bị ẩn.')) return false;
    const r = await act(btn, () => api('/users/' + encodeURIComponent(userId) + '/ban', { method: 'POST', body: { banned } }),
      banned ? 'Đã khóa thiết bị' : 'Đã mở khóa thiết bị');
    return !!r;
  }

  // ---------------------------------------------------------------- đèn hoa đăng
  const STATUS_LABEL = { pending: 'Chờ duyệt', approved: 'Đã duyệt', hidden: 'Đã ẩn' };

  function swatch(color) {
    const s = el('span', { class: 'swatch', role: 'img', 'aria-label': 'Màu ' + color, title: color });
    // gán qua CSSOM: giá trị không hợp lệ bị bỏ qua, không thể chèn CSS khác
    s.style.backgroundColor = String(color || '');
    return s;
  }

  let lanternSeq = 0;
  async function loadLanterns(silent) {
    const status = $('#lantern-status').value;
    const seq = ++lanternSeq;
    let data;
    try { data = await api('/lanterns?status=' + encodeURIComponent(status)); } catch (e) {
      if (!silent && e.status !== 401) toast(e.message);
      return;
    }
    if (seq !== lanternSeq) return;
    const list = $('#lantern-list');
    clear(list);
    const rows = data.lanterns || [];
    $('#lantern-count').textContent = rows.length + ' đèn';
    if (!rows.length) { list.append(empty('Không có đèn nào')); return; }
    for (const l of rows) list.append(lanternItem(l));
  }

  function lanternItem(l) {
    const li = el('li', { class: 'item' });
    const approve = l.status !== 'approved' && el('button', { type: 'button', class: 'btn ok', text: 'Duyệt' });
    const hide = l.status !== 'hidden' && el('button', { type: 'button', class: 'btn', text: 'Ẩn' });
    const ban = el('button', { type: 'button', class: 'btn danger', text: 'Khóa thiết bị' });
    const after = () => (currentTab === 'lanterns' ? loadLanterns(true) : null);
    if (approve) approve.addEventListener('click', async () => {
      if (await act(approve, () => api('/lanterns/' + encodeURIComponent(l.id) + '/approve', { method: 'POST' }), 'Đã duyệt đèn')) after();
    });
    if (hide) hide.addEventListener('click', async () => {
      if (await act(hide, () => api('/lanterns/' + encodeURIComponent(l.id) + '/hide', { method: 'POST' }), 'Đã ẩn đèn')) after();
    });
    ban.addEventListener('click', async () => { if (await setBan(ban, l.userId, true, l.nickname)) after(); });

    li.append(
      swatch(l.color),
      el('div', { class: 'item-body' },
        el('div', null, el('strong', { text: l.nickname || '(ẩn danh)' }), ' ',
          el('span', { class: 'badge ' + l.status, text: STATUS_LABEL[l.status] || l.status })),
        el('p', { class: 'item-text', text: l.text }),
        el('div', { class: 'item-meta' },
          el('span', { text: 'Tạo: ' + fmtTime(l.createdAt) }),
          el('span', { text: 'Hết hạn: ' + fmtTime(l.expiresAt) }),
          el('span', { text: '♥ ' + (l.likes || 0) }),
          l.reports ? el('span', { class: 'badge danger', text: l.reports + ' báo cáo' }) : null,
          el('span', { title: 'Mã thiết bị', text: 'TB: ' + (l.userId || '–') }))),
      el('div', { class: 'item-actions' }, approve, hide, ban),
    );
    return li;
  }
  $('#lantern-status').addEventListener('change', () => loadLanterns());

  // ---------------------------------------------------------------- báo cáo
  async function loadReports() {
    const resolved = $('#report-resolved').value;
    let data;
    try { data = await api('/reports?resolved=' + encodeURIComponent(resolved)); } catch (e) {
      if (e.status !== 401) toast(e.message);
      return;
    }
    const list = $('#report-list');
    clear(list);
    const rows = data.reports || [];
    $('#report-count').textContent = rows.length + ' mục';
    if (!rows.length) { list.append(empty('Không có báo cáo nào')); return; }
    for (const r of rows) list.append(reportItem(r));
  }

  function reportItem(r) {
    const isLantern = r.targetType === 'lantern';
    const resolveBtn = el('button', { type: 'button', class: 'btn ok', text: 'Đánh dấu đã xử lý' });
    resolveBtn.addEventListener('click', async () => {
      const ok = await act(resolveBtn, () => api('/reports/resolve', { method: 'POST', body: { targetType: r.targetType, targetId: r.targetId } }), 'Đã xử lý báo cáo');
      if (ok) loadReports();
    });
    let hideBtn = null;
    if (isLantern) {
      hideBtn = el('button', { type: 'button', class: 'btn', text: 'Ẩn đèn' });
      hideBtn.addEventListener('click', async () => {
        const ok = await act(hideBtn, () => api('/lanterns/' + encodeURIComponent(r.targetId) + '/hide', { method: 'POST' }), 'Đã ẩn đèn');
        if (ok) loadReports();
      });
    }
    let banBtn = null;
    if (r.ownerId) {
      banBtn = el('button', { type: 'button', class: 'btn danger', text: 'Khóa thiết bị' });
      banBtn.addEventListener('click', async () => { if (await setBan(banBtn, r.ownerId, true)) loadReports(); });
    }
    const reasons = (r.reasons || []).filter(Boolean);
    return el('li', { class: 'item' },
      el('div', { class: 'item-body' },
        el('div', null,
          el('span', { class: 'badge', text: isLantern ? 'Đèn' : 'Người dùng' }), ' ',
          el('span', { class: 'badge danger', text: r.count + ' báo cáo' })),
        el('p', { class: 'item-text', text: r.preview || '(không có nội dung)' }),
        reasons.length ? el('div', { class: 'item-meta' }, el('span', { text: 'Lý do: ' + reasons.slice(0, 10).join(' · ') })) : null,
        el('div', { class: 'item-meta' },
          el('span', { text: 'Gần nhất: ' + fmtTime(r.lastAt) }),
          el('span', { text: 'Mã: ' + r.targetId }),
          r.ownerId && isLantern ? el('span', { text: 'TB: ' + r.ownerId }) : null)),
      el('div', { class: 'item-actions' }, resolveBtn, hideBtn, banBtn),
    );
  }
  $('#report-resolved').addEventListener('change', loadReports);

  // ---------------------------------------------------------------- thiết bị
  async function loadUsers() {
    let data;
    try { data = await api('/users'); } catch (e) {
      if (e.status !== 401) toast(e.message);
      return;
    }
    renderUsers($('#banned-list'), data.banned || [], 'Chưa khóa thiết bị nào');
    renderUsers($('#flagged-list'), data.flagged || [], 'Không có thiết bị bị gắn cờ');
  }

  function renderUsers(list, users, emptyText) {
    clear(list);
    if (!users.length) { list.append(empty(emptyText)); return; }
    for (const u of users) {
      const btn = u.banned
        ? el('button', { type: 'button', class: 'btn', text: 'Mở khóa' })
        : el('button', { type: 'button', class: 'btn danger', text: 'Khóa thiết bị' });
      btn.addEventListener('click', async () => { if (await setBan(btn, u.id, !u.banned, u.nickname)) loadUsers(); });
      list.append(el('li', { class: 'item' },
        el('div', { class: 'item-body' },
          el('div', null, el('strong', { text: u.nickname || '(chưa đặt tên)' }), ' ',
            u.banned ? el('span', { class: 'badge danger', text: 'Đã khóa' }) : null, ' ',
            u.flagged ? el('span', { class: 'badge pending', text: 'Gắn cờ' }) : null),
          el('div', { class: 'item-meta' },
            el('span', { text: 'Mã: ' + u.id }),
            el('span', { text: 'Lần cuối: ' + fmtTime(u.lastSeenAt) }))),
        el('div', { class: 'item-actions' }, btn)));
    }
  }

  // ---------------------------------------------------------------- từ cấm
  async function loadWords() {
    let data;
    try { data = await api('/words'); } catch (e) {
      if (e.status !== 401) toast(e.message);
      return;
    }
    const words = data.words || [];
    $('#words-text').value = words.join('\n');
    $('#words-count').textContent = words.length + ' mục';
  }

  $('#words-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const raw = $('#words-text').value.split('\n').map((s) => s.trim()).filter(Boolean);
    const tooLong = raw.find((w) => w.length > 60);
    if (tooLong) { toast('Mỗi mục tối đa 60 ký tự: "' + tooLong.slice(0, 30) + '…"'); return; }
    const words = [...new Set(raw)];
    if (words.length > 5000) { toast('Tối đa 5000 mục'); return; }
    const r = await act(ev.submitter, () => api('/words', { method: 'PUT', body: { words } }));
    if (r) {
      toast('Đã lưu ' + (r.count ?? words.length) + ' từ cấm', 'success');
      $('#words-text').value = words.join('\n');
      $('#words-count').textContent = words.length + ' mục';
    }
  });

  const REASON_LABEL = { empty: 'Trống', too_long: 'Quá dài', banned_word: 'Có từ cấm', link: 'Chứa đường dẫn', phone: 'Chứa số điện thoại', ads: 'Quảng cáo', spam: 'Spam' };
  $('#test-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const out = $('#test-result');
    const text = $('#test-text').value;
    const r = await act(ev.submitter, () => api('/words/test', { method: 'POST', body: { text } }));
    clear(out);
    if (!r) return;
    if (r.ok) out.append(el('p', { class: 'ok', text: 'Hợp lệ — không phát hiện từ cấm.' }));
    else {
      out.append(el('p', { class: 'bad', text: 'Bị chặn: ' + (REASON_LABEL[r.reason] || r.reason || 'không rõ') }));
      if (r.match) out.append(el('p', null, 'Khớp: ', el('code', { text: String(r.match) })));
    }
    if (typeof r.clean === 'string') out.append(el('p', null, 'Sau lọc: ', el('code', { text: r.clean })));
  });

  // ---------------------------------------------------------------- thống kê
  const SERIES = [
    { key: 'lanterns', label: 'Đèn hoa đăng', color: '#b5651d' },
    { key: 'incense', label: 'Nhang', color: '#3f7a5f' },
    { key: 'bells', label: 'Chuông', color: '#5b6fa8' },
  ];
  const AREA_LABEL = {
    cong: 'Cổng', san: 'Sân', 'chinh-dien': 'Chính điện', 'lau-chuong': 'Lầu chuông',
    'ho-sen': 'Hồ sen', 'bo-song': 'Bờ sông', 'am-xam': 'Am xăm', 'thien-duong': 'Thiền đường',
  };

  async function loadStats() {
    let data;
    try { data = await api('/stats?days=' + encodeURIComponent($('#stats-days').value)); } catch (e) {
      if (e.status !== 401) toast(e.message);
      return;
    }
    const now = data.now || {};
    $('#online-now').textContent = String(now.online ?? 0);
    const areas = $('#area-list');
    clear(areas);
    for (const [k, v] of Object.entries(now.areas || {})) {
      areas.append(el('li', { text: (AREA_LABEL[k] || k) + ': ' + v }));
    }
    const days = data.days || [];
    drawChart(days);
    const tbody = $('#stats-table tbody');
    clear(tbody);
    for (const d of [...days].reverse()) {
      tbody.append(el('tr', null,
        el('td', { text: d.day }), el('td', { text: d.lanterns }), el('td', { text: d.incense }),
        el('td', { text: d.bells }), el('td', { text: d.reports }), el('td', { text: d.newUsers }),
        el('td', { text: d.peakOnline })));
    }
  }
  $('#stats-days').addEventListener('change', loadStats);

  function drawChart(days) {
    const box = $('#chart');
    const legend = $('#chart-legend');
    clear(box);
    clear(legend);
    for (const s of SERIES) {
      const item = el('span', { text: s.label });
      item.style.setProperty('--c', s.color);
      legend.append(item);
    }
    if (!days.length) { box.append(el('p', { class: 'muted', text: 'Chưa có dữ liệu' })); return; }

    const W = 720, H = 260, P = { l: 36, r: 10, t: 10, b: 28 };
    const iw = W - P.l - P.r, ih = H - P.t - P.b;
    const max = Math.max(1, ...days.flatMap((d) => SERIES.map((s) => d[s.key] || 0)));
    const nice = niceMax(max);
    const n = days.length;
    const slot = iw / n;
    const x = (i) => P.l + slot * i + slot / 2;
    const y = (v) => P.t + ih - (v / nice) * ih;

    const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Biểu đồ đèn, nhang, chuông theo ngày' });
    // lưới + trục Y
    for (let k = 0; k <= 4; k++) {
      const v = (nice / 4) * k;
      root.append(svg('line', { x1: P.l, x2: W - P.r, y1: y(v), y2: y(v), stroke: '#e3d9c8', 'stroke-width': 1 }));
      const t = svg('text', { x: P.l - 4, y: y(v) + 3, 'text-anchor': 'end' });
      t.textContent = String(Math.round(v));
      root.append(t);
    }
    // cột: đèn hoa đăng
    const bw = Math.max(1, slot * 0.6);
    days.forEach((d, i) => {
      const v = d.lanterns || 0;
      const rect = svg('rect', { x: x(i) - bw / 2, y: y(v), width: bw, height: Math.max(0, P.t + ih - y(v)), fill: SERIES[0].color, opacity: 0.55, rx: 1.5 });
      const tt = svg('title', {});
      tt.textContent = `${d.day}: ${v} đèn, ${d.incense || 0} nhang, ${d.bells || 0} chuông`;
      rect.append(tt);
      root.append(rect);
    });
    // đường: nhang, chuông
    for (const s of SERIES.slice(1)) {
      const pts = days.map((d, i) => `${x(i).toFixed(1)},${y(d[s.key] || 0).toFixed(1)}`).join(' ');
      root.append(svg('polyline', { points: pts, fill: 'none', stroke: s.color, 'stroke-width': 2, 'stroke-linejoin': 'round' }));
      if (n <= 45) days.forEach((d, i) => root.append(svg('circle', { cx: x(i), cy: y(d[s.key] || 0), r: 2.5, fill: s.color })));
    }
    // nhãn trục X
    const step = Math.ceil(n / 10);
    days.forEach((d, i) => {
      if (i % step !== 0 && i !== n - 1) return;
      const t = svg('text', { x: x(i), y: H - 8, 'text-anchor': 'middle' });
      t.textContent = String(d.day).slice(5); // MM-DD
      root.append(t);
    });
    box.append(root);
  }

  function niceMax(v) {
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return Math.max(4, m * p);
    return 10 * p;
  }

  // ---------------------------------------------------------------- khởi động
  window.addEventListener('hashchange', () => {
    if (!$('#app-view').hidden) selectTab(location.hash.slice(1));
  });
  showApp();
})();
