/* ── State ── */
const state = {
  records: [],
  prevRecords: [],
  activeSection: 'dashboard',
  activeRange: 'thisweek',
  storeFilter: 'all',
  sessionFilter: 'all', // 'all' | 'noon' | 'evening'
  charts: [],
  settings: {},
  fields: {},
};

/* ── Taiwan National Holidays (2024-2026) ── */
const TW_HOLIDAYS = new Set([
  // 2024
  '2024-01-01','2024-02-08','2024-02-09','2024-02-10','2024-02-11','2024-02-12','2024-02-13','2024-02-14',
  '2024-02-28','2024-04-04','2024-04-05','2024-05-01','2024-06-10','2024-09-17','2024-10-10',
  // 2025
  '2025-01-01','2025-01-27','2025-01-28','2025-01-29','2025-01-30','2025-01-31','2025-02-03','2025-02-04',
  '2025-02-28','2025-04-03','2025-04-04','2025-05-01','2025-05-30','2025-06-10','2025-10-06','2025-10-10',
  // 2026
  '2026-01-01','2026-02-16','2026-02-17','2026-02-18','2026-02-19','2026-02-20','2026-02-23','2026-02-24',
  '2026-02-28','2026-04-03','2026-04-04','2026-05-01','2026-06-19','2026-09-25','2026-10-09','2026-10-10',
]);
function isHoliday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(String(dateStr).replace(/\//g,'-'));
  const dow = d.getDay();
  const iso = String(dateStr).replace(/\//g,'-').slice(0,10);
  return dow === 0 || dow === 6 || TW_HOLIDAYS.has(iso);
}

const DEFAULT_FIELDS = {
  date:       '營業日期',
  store:      '分店簡稱',
  session:    '營業時間',
  rev:        '當日營業額',
  guests:     '用餐人數',
  groups:     '用餐組數',
  noshow:     'No Show 組數',
  avgPay:     '客單價',
  supervisor: '值班人員',
  complaint:  '當日客訴與事件處理',
  food:       '當日食材狀況反應',
  share:      '當日其他事件分享',
};

const BRAND = '#3c2929';
const BRAND_LIGHT = '#f5efef';
const FRANCHISE_STORES = ['4號店(藝文店)'];
function getStoreType(name) { return FRANCHISE_STORES.includes(name) ? 'franchise' : 'direct'; }
function getStoreDisplayName(name) { return name === '4號店(藝文店)' ? '藝文店（加盟）' : name; }

/* ── Persist ── */
function loadStorage() {
  try {
    state.settings = JSON.parse(localStorage.getItem('ragic_settings') || '{}');
    state.fields   = JSON.parse(localStorage.getItem('ragic_fields')   || '{}');
  } catch {}
}
function saveSettings() {
  const token  = document.getElementById('settingsToken').value.trim();
  const path   = document.getElementById('settingsPath').value.trim();
  const server = document.getElementById('settingsServer').value;
  state.settings = { token, path, server };
  localStorage.setItem('ragic_settings', JSON.stringify(state.settings));
  showFeedback('saveFeedback', '✓ 已儲存');
  updateConnStatus();
}
function saveFields() {
  const keys = ['fDate','fStore','fRev','fGuests','fGroups','fNoshow','fAvgPay','fSupervisor','fComplaint','fShare'];
  const map  = { fDate:'date',fStore:'store',fRev:'rev',fGuests:'guests',fGroups:'groups',fNoshow:'noshow',fAvgPay:'avgPay',fSupervisor:'supervisor',fComplaint:'complaint',fShare:'share' };
  keys.forEach(k => { const v = document.getElementById(k).value.trim(); if (v) state.fields[map[k]] = v; });
  localStorage.setItem('ragic_fields', JSON.stringify(state.fields));
  showFeedback('fieldsFeedback', '✓ 已儲存');
}
function showFeedback(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  setTimeout(() => { el.textContent = ''; }, 2500);
}
function fillSettingsForm() {
  const s = state.settings;
  if (s.token)  document.getElementById('settingsToken').value = s.token;
  if (s.path)   document.getElementById('settingsPath').value  = s.path;
  if (s.server) document.getElementById('settingsServer').value = s.server;
  const fm = { fDate:'date',fStore:'store',fRev:'rev',fGuests:'guests',fGroups:'groups',fNoshow:'noshow',fAvgPay:'avgPay',fSupervisor:'supervisor',fComplaint:'complaint',fShare:'share' };
  Object.entries(fm).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) { el.placeholder = DEFAULT_FIELDS[key]; if (state.fields[key]) el.value = state.fields[key]; }
  });
}
function toggleToken() {
  const inp = document.getElementById('settingsToken');
  const btn = document.getElementById('toggleTokenBtn');
  if (inp.type === 'password') { inp.type = 'text'; btn.textContent = '隱藏'; }
  else { inp.type = 'password'; btn.textContent = '顯示'; }
}
async function updateConnStatus() {
  const el = document.getElementById('connStatus');
  const dot = el.querySelector('.dot');
  const txt = el.querySelector('span:last-child');
  try {
    const r = await fetch('/api/config');
    const d = await r.json();
    if (d.hasToken && d.hasPath) {
      dot.className = 'dot dot-green'; txt.textContent = '系統已連線';
      state.serverConfig = true; return;
    }
  } catch {}
  if (state.settings.token && state.settings.path) {
    dot.className = 'dot dot-green'; txt.textContent = '已設定';
  } else {
    dot.className = 'dot dot-gray'; txt.textContent = '尚未連線';
  }
}

/* ── Date helpers ── */
function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function getRange(key) {
  const t = new Date();
  const dow = t.getDay();
  let from, to;
  if (key === 'thisweek') {
    from = new Date(t); from.setDate(t.getDate() - (dow === 0 ? 6 : dow - 1));
    to = new Date(from); to.setDate(from.getDate() + 6);
  } else if (key === 'lastweek') {
    from = new Date(t); from.setDate(t.getDate() - (dow === 0 ? 6 : dow - 1) - 7);
    to = new Date(from); to.setDate(from.getDate() + 6);
  } else if (key === 'thismonth') {
    from = new Date(t.getFullYear(), t.getMonth(), 1);
    to   = new Date(t.getFullYear(), t.getMonth() + 1, 0); // last day of current month
  } else if (key === 'lastmonth') {
    from = new Date(t.getFullYear(), t.getMonth() - 1, 1);
    to   = new Date(t.getFullYear(), t.getMonth(), 0); // last day of last month
  }
  return { from: toISO(from), to: toISO(to) };
}
function getPrevRange(key, currentFrom, currentTo) {
  const from = new Date(currentFrom);
  const to   = new Date(currentTo);
  const diff = to - from;
  const prevTo   = new Date(from - 86400000);
  const prevFrom = new Date(prevTo - diff);
  return { from: toISO(prevFrom), to: toISO(prevTo) };
}
function applyRange(key) {
  state.activeRange = key;
  document.querySelectorAll('.quick-btn').forEach(b => b.classList.toggle('active', b.dataset.range === key));
  const dateInputs = document.getElementById('dateInputs');
  if (key === 'custom') {
    dateInputs.style.display = 'flex';
  } else {
    dateInputs.style.display = 'none';
    const r = getRange(key);
    document.getElementById('dateFrom').value = r.from;
    document.getElementById('dateTo').value   = r.to;
  }
}
function formatRangeLabel() {
  const from = document.getElementById('dateFrom').value;
  const to   = document.getElementById('dateTo').value;
  if (!from || !to) return '';
  if (from === to) return from;
  return `${from} ～ ${to}`;
}

/* ── Store filter ── */
function setStoreFilter(f) {
  state.storeFilter = f;
  document.querySelectorAll('.filter-btn[data-filter]').forEach(b => b.classList.toggle('active', b.dataset.filter === f));
  if (state.records.length > 0) renderAll();
}
function setSessionFilter(f) {
  state.sessionFilter = f;
  document.querySelectorAll('.session-btn').forEach(b => b.classList.toggle('active', b.dataset.session === f));
  if (state.records.length > 0) renderAll();
}
function filterStores(byStore) {
  if (state.storeFilter === 'all') return byStore;
  return Object.fromEntries(Object.entries(byStore).filter(([k,v]) =>
    state.storeFilter === 'direct' ? v.type === 'direct' : v.type === 'franchise'
  ));
}

/* ── Field helpers ── */
function getF(key) { return state.fields[key] || DEFAULT_FIELDS[key]; }
function getVal(r, key) {
  const field = getF(key);
  const aliases = {
    date:       [field, '營業日期', '日期', 'Date'],
    store:      [field, '分店簡稱', '分店', 'store'],
    session:    [field, '營業時間', 'session'],
    rev:        [field, '當日營業額', '營業額'],
    guests:     [field, '用餐人數', '來客數'],
    groups:     [field, '用餐組數', '訂單數'],
    noshow:     [field, 'No Show 組數', 'No Show組數', 'no show組數', 'NoShow組數', 'No Show', 'noshow'],
    avgPay:     [field, '客單價'],
    supervisor: [field, '值班人員', '值班主管'],
    complaint:  [field, '當日客訴與事件處理', '客訴'],
    food:       [field, '當日食材狀況反應', '食材狀況'],
    share:      [field, '當日其他事件分享', '其他事件'],
  };
  const list = aliases[key] || [field];
  for (const k of list) { if (r[k] !== undefined && r[k] !== '') return r[k]; }
  return null;
}
function toNum(v) {
  if (v === null || v === undefined) return 0;
  return parseFloat(String(v).replace(/[$,\s]/g,'')) || 0;
}

/* ── Parse date ── */
function parseRagicDate(dv) {
  if (!dv) return null;
  const s = String(dv).trim();
  let d = new Date(s.replace(/\//g, '-'));
  if (!isNaN(d)) return d;
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) return new Date(`${mdy[3]}-${mdy[1].padStart(2,'0')}-${mdy[2].padStart(2,'0')}`);
  const ymd = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (ymd) return new Date(`${ymd[1]}-${ymd[2]}-${ymd[3]}`);
  return null;
}

/* ── Fetch records for a date range ── */
async function fetchRange(token, path, dateFrom, dateTo) {
  const params = new URLSearchParams({ limit: 3000 });
  if (path)  params.set('path', path);
  if (token) params.set('token', token);
  const url = `/api/ragic?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const raw = await res.json();
  if (raw.status === 'ERROR') throw new Error(raw.msg);

  const from = new Date(dateFrom); from.setHours(0,0,0,0);
  const to   = new Date(dateTo);   to.setHours(23,59,59,999);
  const allValues = Object.values(raw).filter(r => typeof r === 'object' && r && !Array.isArray(r));
  return allValues.filter(r => {
    const dateFields = [getF('date'), '營業日期', '日期', 'Date'];
    let dv = null;
    for (const f of dateFields) { if (r[f] !== undefined && r[f] !== '') { dv = r[f]; break; } }
    if (!dv) return false;
    const dt = parseRagicDate(dv);
    if (!dt || isNaN(dt)) return false;
    return dt >= from && dt <= to;
  });
}

/* ── Main fetch ── */
async function fetchData() {
  const token = state.settings.token || '';
  const path  = state.settings.path  || '';
  // If server has env vars, token/path can be empty
  const dateFrom = document.getElementById('dateFrom').value;
  const dateTo   = document.getElementById('dateTo').value;
  if (!dateFrom || !dateTo) { showToast('請選擇日期區間'); return; }

  const btn = document.getElementById('fetchBtn');
  btn.disabled = true; btn.textContent = '查詢中…';
  showLoading();

  try {
    const prev = getPrevRange(state.activeRange, dateFrom, dateTo);
    const [records, prevRecords] = await Promise.all([
      fetchRange(token, path, dateFrom, dateTo),
      fetchRange(token, path, prev.from, prev.to),
    ]);

    state.records     = records;
    state.prevRecords = prevRecords;
    document.getElementById('dateRangeLabel').textContent = formatRangeLabel();

    if (state.records.length === 0) {
      showEmptyResult(); showToast('此區間無資料'); return;
    }

    renderAll();
    // Achievement is optional - don't let it block main render
    try {
      const achFrom = document.getElementById('dateFrom').value;
      const achTo   = document.getElementById('dateTo').value;
      const { byStore: achByStore } = processRecords(state.records);
      renderAchievement(filterStores(achByStore), achFrom, achTo).catch(() => {
        const el = document.getElementById('achievementContent');
        if (el) el.innerHTML = '';
      });
    } catch(e) {}
    showToast(`已載入 ${state.records.length} 筆資料`);
  } catch(e) {
    showToast('載入失敗：' + e.message);
    showEmptyResult();
  } finally {
    btn.disabled = false; btn.textContent = '載入報表';
  }
}

/* ── Process records into byStore ── */
function processRecords(records) {
  const byStore = {}, byDate = {};
  for (const r of records) {
    const storeName  = getVal(r, 'store') || '未知分店';
    const date       = getVal(r, 'date') || '';
    const rev        = toNum(getVal(r, 'rev'));
    const guests     = toNum(getVal(r, 'guests'));
    const groups     = toNum(getVal(r, 'groups'));
    const noshow     = toNum(getVal(r, 'noshow'));
    const avgPay     = toNum(getVal(r, 'avgPay'));
    const session    = getVal(r, 'session')    || '';
    const supervisor = getVal(r, 'supervisor') || '-';
    const complaint  = getVal(r, 'complaint')  || '';
    const food       = getVal(r, 'food')       || '';
    const share      = getVal(r, 'share')      || '';

    // Session filter
    if (state.sessionFilter === 'noon'    && session !== '中午') continue;
    if (state.sessionFilter === 'evening' && session !== '晚上') continue;

    if (!byStore[storeName]) byStore[storeName] = {
      rev:0, guests:0, groups:0, noshow:0, avgPays:[], records:[],
      type: getStoreType(storeName),
      displayName: getStoreDisplayName(storeName),
    };
    byStore[storeName].rev    += rev;
    byStore[storeName].guests += guests;
    byStore[storeName].groups += groups;
    byStore[storeName].noshow += noshow;
    if (avgPay > 0) byStore[storeName].avgPays.push(avgPay);
    byStore[storeName].records.push({ date, session, supervisor, complaint, food, share });
    if (date) byDate[date] = (byDate[date] || 0) + rev;
  }
  return { byStore, byDate };
}

function renderAll() {
  const { byStore, byDate } = processRecords(state.records);
  const { byStore: prevByStore } = processRecords(state.prevRecords);
  const filtered     = filterStores(byStore);
  const prevFiltered = filterStores(prevByStore);
  renderDashboard(filtered, byDate, prevFiltered);
  renderStores(filtered, prevFiltered);
  renderLogs(filtered);
}

/* ── Helpers ── */
const COLORS = [BRAND,'#5c7a6e','#8B6914','#1e4d8c','#6b4c8a','#1a6b4a','#7a3a1e','#2d5a6b'];
function fmt(n)  { return Math.round(n).toLocaleString(); }
function fmtD(s) { return s ? String(s).replace(/-/g,'/') : '-'; }
function diffBadge(curr, prev) {
  if (!prev || prev === 0) return '';
  const pct = ((curr - prev) / prev * 100).toFixed(1);
  const up = curr >= prev;
  return `<span class="diff-badge ${up ? 'diff-up' : 'diff-down'}">${up ? '▲' : '▼'} ${Math.abs(pct)}%</span>`;
}

/* ── Dashboard ── */
function renderDashboard(byStore, byDate, prevByStore) {
  const stores = Object.keys(byStore).sort();
  const totalRev    = stores.reduce((s,k) => s + byStore[k].rev, 0);
  const totalGuests = stores.reduce((s,k) => s + byStore[k].guests, 0);
  const totalGroups = stores.reduce((s,k) => s + byStore[k].groups, 0);
  const totalNoshow = stores.reduce((s,k) => s + byStore[k].noshow, 0);
  const dates = Object.keys(byDate).sort();
  const avgRevPerDay = dates.length > 0 ? totalRev / dates.length : 0;
  const noshowPct = totalGroups > 0 ? ((totalNoshow/totalGroups)*100).toFixed(1) : '0.0';

  const prevStores = Object.keys(prevByStore);
  const prevRev    = prevStores.reduce((s,k) => s + prevByStore[k].rev, 0);
  const prevGuests = prevStores.reduce((s,k) => s + prevByStore[k].guests, 0);
  const prevGroups = prevStores.reduce((s,k) => s + prevByStore[k].groups, 0);
  const prevNoshow = prevStores.reduce((s,k) => s + prevByStore[k].noshow, 0);

  state.charts.forEach(c => c.destroy());
  state.charts = [];

  document.getElementById('dashboardContent').innerHTML = `
    <div class="session-bar">
      <button class="session-btn active" data-session="all" onclick="setSessionFilter('all')">全部時段</button>
      <button class="session-btn" data-session="noon" onclick="setSessionFilter('noon')">中午</button>
      <button class="session-btn" data-session="evening" onclick="setSessionFilter('evening')">晚上</button>
    </div>
    <div class="metrics-grid">
      <div class="metric-card highlight">
        <div class="m-label">期間總營業額</div>
        <div class="m-value">$${fmt(totalRev)} ${diffBadge(totalRev, prevRev)}</div>
        <div class="m-sub">日均 $${fmt(avgRevPerDay)}</div>
      </div>
      <div class="metric-card">
        <div class="m-label">總用餐人數</div>
        <div class="m-value">${fmt(totalGuests)} ${diffBadge(totalGuests, prevGuests)}</div>
        <div class="m-sub">共 ${fmt(totalGroups)} 組</div>
      </div>
      <div class="metric-card">
        <div class="m-label">No Show 組數</div>
        <div class="m-value">${fmt(totalNoshow)} ${diffBadge(totalNoshow, prevNoshow)}</div>
        <div class="m-sub">占訂單 ${noshowPct}%</div>
      </div>
      <div class="metric-card">
        <div class="m-label">查詢分店數</div>
        <div class="m-value">${stores.length}</div>
        <div class="m-sub">共 ${state.records.length} 筆資料</div>
      </div>
    </div>

    <div id="achievementContent"></div>

    <div class="charts-row">
      <div class="chart-card">
        <div class="c-title">每日營業額趨勢</div>
        <div class="chart-wrap" style="height:220px;">
          <canvas id="trendChart" role="img" aria-label="每日總營業額趨勢">每日營業額趨勢</canvas>
        </div>
      </div>
      <div class="chart-card">
        <div class="c-title">各分店佔比</div>
        <div class="chart-wrap" style="height:220px;">
          <canvas id="donutChart" role="img" aria-label="各分店營業額圓餅圖">分店佔比</canvas>
        </div>
      </div>
    </div>

    <div class="table-card">
      <div class="table-header"><h3>各分店概覽</h3></div>
      <table>
        <thead><tr>
          <th style="width:18%">分店</th>
          <th style="width:7%">類型</th>
          <th style="width:17%">營業額</th>
          <th style="width:11%">用餐人數</th>
          <th style="width:11%">用餐組數</th>
          <th style="width:11%">No Show</th>
          <th style="width:11%">客單價</th>
          <th style="width:14%">環比狀態</th>
        </tr></thead>
        <tbody>
          ${stores.map(s => {
            const d = byStore[s];
            const p = prevByStore[s];
            const avg = d.avgPays.length ? d.avgPays.reduce((a,b)=>a+b,0)/d.avgPays.length : 0;
            const prevRev = p ? p.rev : 0;
            const revChange = prevRev > 0 ? (d.rev - prevRev) / prevRev * 100 : null;
            const badge = revChange === null ? '<span class="badge" style="background:#F3F4F6;color:#6b7280">無對比</span>'
              : revChange >= 5 ? '<span class="badge badge-good">↑ 成長</span>'
              : revChange <= -5 ? '<span class="badge badge-danger">↓ 衰退</span>'
              : '<span class="badge badge-warn">→ 持平</span>';
            const typeBadge = d.type === 'franchise'
              ? '<span class="badge" style="background:#EDE9FE;color:#5B21B6">加盟</span>'
              : `<span class="badge" style="background:${BRAND_LIGHT};color:${BRAND}">直營</span>`;
            return `<tr>
              <td class="store-name-cell">${d.displayName}</td>
              <td>${typeBadge}</td>
              <td>$${fmt(d.rev)} ${diffBadge(d.rev, prevRev)}</td>
              <td>${fmt(d.guests)}</td>
              <td>${fmt(d.groups)}</td>
              <td>${fmt(d.noshow)} 組</td>
              <td>$${fmt(avg)}</td>
              <td>${badge}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  state.charts.push(new Chart(document.getElementById('trendChart'), {
    type: 'line',
    data: {
      labels: dates.map(d => d.slice(5)),
      datasets: [{
        label: '當日總營業額', data: dates.map(d => byDate[d]),
        borderColor: BRAND, backgroundColor: BRAND_LIGHT,
        borderWidth: 2, tension: 0.35, fill: true,
        pointBackgroundColor: BRAND, pointRadius: 4, pointHoverRadius: 6,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { ticks: { callback: v => '$' + fmt(v), font: { size: 11 } }, grid: { color: '#F3F4F6' } },
        x: { ticks: { autoSkip: true, maxRotation: 0, font: { size: 11 } }, grid: { display: false } }
      }
    }
  }));

  state.charts.push(new Chart(document.getElementById('donutChart'), {
    type: 'doughnut',
    data: {
      labels: stores.map(s => byStore[s].displayName),
      datasets: [{ data: stores.map(s => byStore[s].rev), backgroundColor: COLORS.slice(0, stores.length), borderWidth: 0, hoverOffset: 6 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'right', labels: { font: { size: 11 }, boxWidth: 11, padding: 10 } } },
      cutout: '60%',
    }
  }));
}

/* ── Stores ── */
function renderStores(byStore, prevByStore) {
  const stores = Object.keys(byStore).sort((a,b) => byStore[b].rev - byStore[a].rev);
  const maxRev = stores.length ? byStore[stores[0]].rev : 1;

  document.getElementById('storesContent').innerHTML = `
    <div class="session-bar">
      <button class="session-btn active" data-session="all" onclick="setSessionFilter('all')">全部時段</button>
      <button class="session-btn" data-session="noon" onclick="setSessionFilter('noon')">中午</button>
      <button class="session-btn" data-session="evening" onclick="setSessionFilter('evening')">晚上</button>
    </div>
    <div class="table-card" style="margin-bottom:20px;">
      <div class="table-header"><h3>分店營業額排行</h3></div>
      <div style="padding:20px 24px;">
        <div class="bar-chart">
          ${stores.map((s,i) => {
            const d = byStore[s];
            const pct = maxRev > 0 ? (d.rev / maxRev * 100) : 0;
            const p = prevByStore[s];
            const prevRevPct = p && maxRev > 0 ? (p.rev / maxRev * 100) : 0;
            return `<div class="bar-row">
              <div class="bar-meta">
                <span class="bm-name">${i+1}. ${d.displayName}</span>
                <span class="bm-val">$${fmt(d.rev)} ${diffBadge(d.rev, p ? p.rev : 0)}</span>
              </div>
              <div class="bar-track">
                <div class="bar-fill" style="width:${pct.toFixed(1)}%; background:${COLORS[i % COLORS.length]}"></div>
                ${p ? `<div class="bar-prev" style="width:${prevRevPct.toFixed(1)}%"></div>` : ''}
              </div>
            </div>`;
          }).join('')}
        </div>
        <div style="font-size:11px;color:#9ca3af;margin-top:12px;">深色＝本期　淡色虛線＝上一期</div>
      </div>
    </div>

    <div class="table-card">
      <div class="table-header"><h3>詳細數據比較</h3></div>
      <table>
        <thead><tr>
          <th style="width:16%">分店</th>
          <th style="width:7%">類型</th>
          <th style="width:15%">總營業額</th>
          <th style="width:10%">上期</th>
          <th style="width:10%">用餐人數</th>
          <th style="width:10%">用餐組數</th>
          <th style="width:9%">No Show</th>
          <th style="width:9%">No Show率</th>
          <th style="width:9%">客單價</th>
          <th style="width:5%">狀態</th>
        </tr></thead>
        <tbody>
          ${stores.map(s => {
            const d = byStore[s];
            const p = prevByStore[s];
            const avg = d.avgPays.length ? d.avgPays.reduce((a,b)=>a+b,0)/d.avgPays.length : 0;
            const nr = d.groups > 0 ? (d.noshow/d.groups)*100 : 0;
            const revChange = p && p.rev > 0 ? (d.rev - p.rev) / p.rev * 100 : null;
            const badge = revChange === null ? '<span class="badge" style="background:#F3F4F6;color:#6b7280">-</span>'
              : revChange >= 5 ? '<span class="badge badge-good">成長</span>'
              : revChange <= -5 ? '<span class="badge badge-danger">衰退</span>'
              : '<span class="badge badge-warn">持平</span>';
            const typeBadge = d.type === 'franchise'
              ? '<span class="badge" style="background:#EDE9FE;color:#5B21B6">加盟</span>'
              : `<span class="badge" style="background:${BRAND_LIGHT};color:${BRAND}">直營</span>`;
            return `<tr>
              <td class="store-name-cell">${d.displayName}</td>
              <td>${typeBadge}</td>
              <td>$${fmt(d.rev)}</td>
              <td style="color:#9ca3af;font-size:12px">${p ? '$'+fmt(p.rev) : '-'}</td>
              <td>${fmt(d.guests)}</td>
              <td>${fmt(d.groups)}</td>
              <td>${fmt(d.noshow)}</td>
              <td>${nr.toFixed(1)}%</td>
              <td>$${fmt(avg)}</td>
              <td>${badge}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/* ── Logs (timeline, direct only, AI analysis) ── */
async function renderLogs(byStore) {
  const dateFrom = document.getElementById('dateFrom').value;
  const dateTo   = document.getElementById('dateTo').value;

  // Direct stores only for logs
  const directStores = Object.entries(byStore)
    .filter(([,v]) => v.type === 'direct')
    .sort(([a],[b]) => a.localeCompare(b));

  // Build log text for AI
  let allLogsText = '';
  for (const [s, d] of directStores) {
    const recs = d.records.sort((a,b) => a.date.localeCompare(b.date));
    allLogsText += `【${d.displayName}】\n`;
    for (const r of recs) {
      const hasContent = (r.complaint && !['無','無客訴'].includes(r.complaint.trim())) ||
                         (r.food && r.food.trim() !== '無') ||
                         (r.share && !['無','無事件分享'].includes(r.share.trim()));
      if (!hasContent) continue;
      allLogsText += `${fmtD(r.date)} 值班：${r.supervisor}\n`;
      if (r.complaint && !['無','無客訴'].includes(r.complaint.trim())) allLogsText += `  客訴：${r.complaint}\n`;
      if (r.food && r.food.trim() !== '無') allLogsText += `  食材：${r.food}\n`;
      if (r.share && !['無','無事件分享'].includes(r.share.trim())) allLogsText += `  分享：${r.share}\n`;
    }
    allLogsText += '\n';
  }

  // Build timeline HTML per store
  const timelineHtml = directStores.map(([s, d]) => {
    const recs = d.records.sort((a,b) => a.date.localeCompare(b.date));
    const items = recs.map(r => {
      const hasComplaint = r.complaint && !['無','無客訴'].includes(r.complaint.trim());
      const hasFood      = r.food && r.food.trim() !== '無';
      const hasShare     = r.share && !['無','無事件分享'].includes(r.share.trim());
      const hasContent   = hasComplaint || hasFood || hasShare;
      return `
        <div class="tl-item ${hasContent ? '' : 'tl-quiet'}">
          <div class="tl-dot ${hasComplaint ? 'tl-dot-complaint' : hasFood ? 'tl-dot-food' : hasContent ? 'tl-dot-share' : ''}"></div>
          <div class="tl-body">
            <div class="tl-meta">${fmtD(r.date)} <span class="tl-sup">${r.supervisor}</span></div>
            ${hasComplaint ? `<div class="tl-row"><span class="log-tag log-tag-c">客訴</span>${r.complaint}</div>` : ''}
            ${hasFood      ? `<div class="tl-row"><span class="log-tag log-tag-f">食材</span>${r.food}</div>` : ''}
            ${hasShare     ? `<div class="tl-row"><span class="log-tag log-tag-s">分享</span>${r.share}</div>` : ''}
            ${!hasContent  ? `<div class="tl-quiet-text">無特殊事項</div>` : ''}
          </div>
        </div>`;
    }).join('');
    return `
      <div class="tl-store-block">
        <div class="tl-store-name">${d.displayName}</div>
        <div class="tl-track">${items}</div>
      </div>`;
  }).join('');

  document.getElementById('logsContent').innerHTML = `
    <div class="session-bar">
      <button class="session-btn active" data-session="all" onclick="setSessionFilter('all')">全部時段</button>
      <button class="session-btn" data-session="noon" onclick="setSessionFilter('noon')">中午</button>
      <button class="session-btn" data-session="evening" onclick="setSessionFilter('evening')">晚上</button>
    </div>
    <div class="ai-analysis-card" id="aiAnalysisCard">
      <div class="ai-header">
        <div class="ai-icon">✦</div>
        <div>
          <div class="ai-title">AI 週報分析</div>
          <div class="ai-sub" id="aiSub">正在分析本期各分店日誌...</div>
        </div>
      </div>
      <div class="ai-body" id="aiBody">
        <div class="ai-loading">
          <div class="ai-skeleton"></div>
          <div class="ai-skeleton" style="width:80%"></div>
          <div class="ai-skeleton" style="width:90%"></div>
          <div class="ai-skeleton" style="width:70%"></div>
        </div>
      </div>
    </div>

    <div class="section-title" style="margin:0 0 16px;">各分店值班日誌</div>
    <div class="tl-grid">${timelineHtml}</div>
  `;

  // AI analysis
  if (!allLogsText.trim()) {
    document.getElementById('aiBody').innerHTML = '<div class="ai-error">本期無日誌內容可供分析</div>';
    return;
  }
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logs: allLogsText, dateFrom, dateTo })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    const text = data.text || '分析失敗';
    const formatted = text.split('\n').map(line => {
      if (['📊','⚠️','✅','🎯'].some(e => line.startsWith(e))) return `<div class="ai-section-title">${line}</div>`;
      if (line.trim() === '') return '<div style="height:6px"></div>';
      return `<div class="ai-line">${line}</div>`;
    }).join('');
    document.getElementById('aiBody').innerHTML = `<div class="ai-content">${formatted}</div>`;
    document.getElementById('aiSub').textContent = `已完成分析・${dateFrom} ～ ${dateTo}`;
  } catch(e) {
    document.getElementById('aiBody').innerHTML = `<div class="ai-error">AI 分析暫時無法使用：${e.message}</div>`;
  }
}

/* ── UI ── */
function showLoading() {
  const skels = Array(4).fill(0).map(() => `<div class="metric-card"><div class="skeleton" style="height:12px;width:60%;margin-bottom:10px;"></div><div class="skeleton" style="height:28px;width:80%;"></div></div>`).join('');
  document.getElementById('dashboardContent').innerHTML = `<div class="metrics-grid">${skels}</div><div class="skeleton" style="height:260px;border-radius:10px;margin-bottom:14px;"></div>`;
}
function showEmptyResult() {
  const empty = `<div class="empty-state"><p class="empty-title">此區間無資料</p><p class="empty-sub">請確認日期區間與 API 設定是否正確</p></div>`;
  ['dashboardContent','storesContent','logsContent'].forEach(id => { document.getElementById(id).innerHTML = empty; });
}
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}
function switchSection(key) {
  state.activeSection = key;
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('section-' + key).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.section === key));
  const titles = { dashboard:'總覽', stores:'分店比較', logs:'主管日誌', yoy:'年度比較', wd:'平假日分析', settings:'設定' };
  document.getElementById('pageTitle').textContent = titles[key] || '';
  // Show/hide topbars
  const isYoy = key === 'yoy';
  const isWd  = key === 'wd';
  document.getElementById('mainTopbarRight').style.display = (isYoy||isWd) ? 'none' : 'flex';
  document.getElementById('yoyTopbarRight').style.display  = isYoy ? 'flex' : 'none';
  document.getElementById('wdTopbarRight').style.display   = isWd  ? 'flex' : 'none';
  // Clear date label when switching to yoy or settings
  if (isYoy || isWd || key === 'settings') document.getElementById('dateRangeLabel').textContent = '';
  else if (state.records.length > 0) document.getElementById('dateRangeLabel').textContent = formatRangeLabel();
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  loadStorage();
  fillSettingsForm();
  updateConnStatus();
  applyRange('thisweek');
  switchSection('dashboard');
  initYoyControls();
  initWdControls();

  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => applyRange(btn.dataset.range));
  });
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchSection(btn.dataset.section));
  });
  document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => setStoreFilter(btn.dataset.filter));
  });
  document.getElementById('fetchBtn').addEventListener('click', fetchData);
  document.getElementById('dateFrom').addEventListener('change', () => applyRange('custom'));
  document.getElementById('dateTo').addEventListener('change',   () => applyRange('custom'));
});

/* ════════════════════════════════════════
   年度同期比較 (YoY)
════════════════════════════════════════ */
const yoyState = { filter: 'all', charts: [] };

function initYoyControls() {
  const yearSel = document.getElementById('yoyYear');
  const now = new Date();
  for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) {
    const opt = document.createElement('option');
    opt.value = y; opt.textContent = y + '年';
    yearSel.appendChild(opt);
  }
  document.getElementById('yoyMonth').value = now.getMonth() + 1;

  document.querySelectorAll('[data-yoy-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      yoyState.filter = btn.dataset.yoyFilter;
      document.querySelectorAll('[data-yoy-filter]').forEach(b => b.classList.toggle('active', b.dataset.yoyFilter === yoyState.filter));
      if (yoyState.lastData) renderYoy(yoyState.lastData.curr, yoyState.lastData.prev, yoyState.lastData.currYear, yoyState.lastData.prevYear, yoyState.lastData.month);
    });
  });
  document.getElementById('yoyFetchBtn').addEventListener('click', fetchYoy);
}

async function fetchYoy() {
  const token = state.settings.token || '';
  const path  = state.settings.path  || '';
  const year  = parseInt(document.getElementById('yoyYear').value);
  const month = parseInt(document.getElementById('yoyMonth').value);

  const btn = document.getElementById('yoyFetchBtn');
  btn.disabled = true; btn.textContent = '查詢中…';
  document.getElementById('yoyContent').innerHTML = '<div class="loading-state" style="padding:3rem;text-align:center;color:#6b7280">載入中...</div>';

  const pad = n => String(n).padStart(2,'0');
  const lastDay = new Date(year, month, 0).getDate();
  const currFrom = `${year}-${pad(month)}-01`;
  const currTo   = `${year}-${pad(month)}-${pad(lastDay)}`;
  const prevLastDay = new Date(year-1, month, 0).getDate();
  const prevFrom = `${year-1}-${pad(month)}-01`;
  const prevTo   = `${year-1}-${pad(month)}-${pad(prevLastDay)}`;

  try {
    const [curr, prev] = await Promise.all([
      fetchRange(token, path, currFrom, currTo),
      fetchRange(token, path, prevFrom, prevTo),
    ]);
    yoyState.lastData = { curr, prev, currYear: year, prevYear: year-1, month };
    renderYoy(curr, prev, year, year-1, month);
    showToast(`已載入 ${year}年 vs ${year-1}年 ${month}月資料`);
  } catch(e) {
    showToast('載入失敗：' + e.message);
    document.getElementById('yoyContent').innerHTML = '<div class="empty-state"><p class="empty-title">載入失敗</p></div>';
  } finally {
    btn.disabled = false; btn.textContent = '載入比較';
  }
}

function filterYoyStores(byStore) {
  if (yoyState.filter === 'all') return byStore;
  return Object.fromEntries(Object.entries(byStore).filter(([,v]) =>
    yoyState.filter === 'direct' ? v.type === 'direct' : v.type === 'franchise'
  ));
}

function renderYoy(currRecords, prevRecords, currYear, prevYear, month) {
  const curr = filterYoyStores(processRecords(currRecords).byStore);
  const prev = filterYoyStores(processRecords(prevRecords).byStore);
  yoyState.charts.forEach(c => c.destroy()); yoyState.charts = [];

  const allStores = Array.from(new Set([...Object.keys(curr), ...Object.keys(prev)])).sort();
  const monthName = `${month}月`;

  // Summary KPIs
  const cRev    = Object.values(curr).reduce((s,v) => s+v.rev, 0);
  const pRev    = Object.values(prev).reduce((s,v) => s+v.rev, 0);
  const cGuests = Object.values(curr).reduce((s,v) => s+v.guests, 0);
  const pGuests = Object.values(prev).reduce((s,v) => s+v.guests, 0);
  const cAvgPays = Object.values(curr).flatMap(v => v.avgPays);
  const pAvgPays = Object.values(prev).flatMap(v => v.avgPays);
  const cAvg = cAvgPays.length ? cAvgPays.reduce((a,b)=>a+b,0)/cAvgPays.length : 0;
  const pAvg = pAvgPays.length ? pAvgPays.reduce((a,b)=>a+b,0)/pAvgPays.length : 0;

  document.getElementById('yoyContent').innerHTML = `
    <div class="yoy-header">
      <span class="yoy-badge yoy-curr">${currYear}年${monthName}</span>
      <span style="color:#9ca3af;font-size:13px;">vs</span>
      <span class="yoy-badge yoy-prev">${prevYear}年${monthName}</span>
    </div>

    <div class="metrics-grid" style="margin-bottom:20px;">
      <div class="metric-card highlight">
        <div class="m-label">月總營業額</div>
        <div class="m-value">$${fmt(cRev)} ${diffBadge(cRev,pRev)}</div>
        <div class="m-sub">去年同期 $${fmt(pRev)}</div>
      </div>
      <div class="metric-card">
        <div class="m-label">總用餐人數</div>
        <div class="m-value">${fmt(cGuests)} ${diffBadge(cGuests,pGuests)}</div>
        <div class="m-sub">去年同期 ${fmt(pGuests)}</div>
      </div>
      <div class="metric-card">
        <div class="m-label">平均客單價</div>
        <div class="m-value">$${fmt(cAvg)} ${diffBadge(cAvg,pAvg)}</div>
        <div class="m-sub">去年同期 $${fmt(pAvg)}</div>
      </div>
    </div>

    <div class="charts-row" style="margin-bottom:20px;">
      <div class="chart-card">
        <div class="c-title">各分店營業額對比</div>
        <div class="chart-wrap" style="height:${Math.max(200, allStores.length*50)}px;">
          <canvas id="yoyBarChart" role="img" aria-label="各分店年度對比長條圖">年度對比</canvas>
        </div>
      </div>
      <div class="chart-card">
        <div class="c-title">各分店客單價對比</div>
        <div class="chart-wrap" style="height:${Math.max(200, allStores.length*50)}px;">
          <canvas id="yoyAvgChart" role="img" aria-label="各分店客單價對比">客單價對比</canvas>
        </div>
      </div>
    </div>

    <div class="table-card">
      <div class="table-header"><h3>各分店同期詳細比較</h3></div>
      <table>
        <thead><tr>
          <th style="width:16%">分店</th>
          <th style="width:7%">類型</th>
          <th style="width:14%">${currYear}年營業額</th>
          <th style="width:14%">${prevYear}年營業額</th>
          <th style="width:10%">營業額漲跌</th>
          <th style="width:11%">${currYear}年來客</th>
          <th style="width:11%">${prevYear}年來客</th>
          <th style="width:10%">${currYear}年客單價</th>
          <th style="width:7%">狀態</th>
        </tr></thead>
        <tbody>
          ${allStores.map(s => {
            const c = curr[s], p = prev[s];
            const displayName = c?.displayName || p?.displayName || s;
            const type = c?.type || p?.type || 'direct';
            const cR = c?.rev||0, pR = p?.rev||0;
            const cG = c?.guests||0, pG = p?.guests||0;
            const cAp = c?.avgPays||[], pAp = p?.avgPays||[];
            const cAv = cAp.length ? cAp.reduce((a,b)=>a+b,0)/cAp.length : 0;
            const revChg = pR > 0 ? ((cR-pR)/pR*100) : null;
            const badge = revChg === null ? '<span class="badge" style="background:#F3F4F6;color:#6b7280">-</span>'
              : revChg >= 5  ? '<span class="badge badge-good">成長</span>'
              : revChg <= -5 ? '<span class="badge badge-danger">衰退</span>'
              : '<span class="badge badge-warn">持平</span>';
            const typeBadge = type === 'franchise'
              ? '<span class="badge" style="background:#EDE9FE;color:#5B21B6">加盟</span>'
              : `<span class="badge" style="background:${BRAND_LIGHT};color:${BRAND}">直營</span>`;
            return `<tr>
              <td class="store-name-cell">${displayName}</td>
              <td>${typeBadge}</td>
              <td>$${fmt(cR)}</td>
              <td style="color:#9ca3af">$${fmt(pR)}</td>
              <td>${diffBadge(cR,pR)} ${revChg!==null?revChg.toFixed(1)+'%':'-'}</td>
              <td>${fmt(cG)}</td>
              <td style="color:#9ca3af">${fmt(pG)}</td>
              <td>$${fmt(cAv)}</td>
              <td>${badge}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  const labels = allStores.map(s => (curr[s]||prev[s]).displayName);

  yoyState.charts.push(new Chart(document.getElementById('yoyBarChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: `${currYear}年`, data: allStores.map(s => curr[s]?.rev||0), backgroundColor: BRAND, borderRadius: 4 },
        { label: `${prevYear}年`, data: allStores.map(s => prev[s]?.rev||0), backgroundColor: '#d4b8b8', borderRadius: 4 },
      ]
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } } },
      scales: {
        x: { ticks: { callback: v => '$'+fmt(v), font: { size: 10 } } },
        y: { ticks: { font: { size: 11 } } }
      }
    }
  }));

  yoyState.charts.push(new Chart(document.getElementById('yoyAvgChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: `${currYear}年客單價`, data: allStores.map(s => { const ap=curr[s]?.avgPays||[]; return ap.length?ap.reduce((a,b)=>a+b,0)/ap.length:0; }), backgroundColor: BRAND, borderRadius: 4 },
        { label: `${prevYear}年客單價`, data: allStores.map(s => { const ap=prev[s]?.avgPays||[]; return ap.length?ap.reduce((a,b)=>a+b,0)/ap.length:0; }), backgroundColor: '#d4b8b8', borderRadius: 4 },
      ]
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } } },
      scales: {
        x: { ticks: { callback: v => '$'+fmt(v), font: { size: 10 } } },
        y: { ticks: { font: { size: 11 } } }
      }
    }
  }));
}

/* ════════════════════════════════════════
   平假日分析 (Weekday vs Holiday)
════════════════════════════════════════ */
const wdState = { filter: 'all', sessionFilter: 'all', charts: [] };

function initWdControls() {
  // Init year selector
  const wdYearSel = document.getElementById('wdYear');
  const now = new Date();
  for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) {
    const opt = document.createElement('option');
    opt.value = y; opt.textContent = y + '年';
    wdYearSel.appendChild(opt);
  }
  document.getElementById('wdMonth').value = now.getMonth() + 1;
  document.getElementById('wdFetchBtn').addEventListener('click', fetchWd);
  document.querySelectorAll('[data-wd-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      wdState.filter = btn.dataset.wdFilter;
      document.querySelectorAll('[data-wd-filter]').forEach(b => b.classList.toggle('active', b.dataset.wdFilter === wdState.filter));
      if (wdState.lastData) renderWd(wdState.lastData);
    });
  });
  document.querySelectorAll('[data-wd-session]').forEach(btn => {
    btn.addEventListener('click', () => {
      wdState.sessionFilter = btn.dataset.wdSession;
      document.querySelectorAll('[data-wd-session]').forEach(b => b.classList.toggle('active', b.dataset.wdSession === wdState.sessionFilter));
      if (wdState.lastData) renderWd(wdState.lastData);
    });
  });
}

async function fetchWd() {
  const token = state.settings.token || '';
  const path  = state.settings.path  || '';
  const year  = parseInt(document.getElementById('wdYear').value);
  const month = parseInt(document.getElementById('wdMonth').value);

  const btn = document.getElementById('wdFetchBtn');
  btn.disabled = true; btn.textContent = '查詢中…';
  document.getElementById('wdContent').innerHTML = '<div class="loading-state" style="padding:3rem;text-align:center;color:#6b7280">載入中...</div>';

  const pad = n => String(n).padStart(2,'0');
  const lastDay = new Date(year, month, 0).getDate();
  const from = `${year}-${pad(month)}-01`;
  const to   = `${year}-${pad(month)}-${pad(lastDay)}`;

  try {
    const records = await fetchRange(token, path, from, to);
    wdState.lastData = { records, year, month };
    renderWd(wdState.lastData);
    showToast(`已載入 ${year}年${month}月資料`);
  } catch(e) {
    showToast('載入失敗：' + e.message);
    document.getElementById('wdContent').innerHTML = '<div class="empty-state"><p class="empty-title">載入失敗</p></div>';
  } finally {
    btn.disabled = false; btn.textContent = '載入分析';
  }
}

function processWdRecords(records) {
  const wd = { rev:0, guests:0, groups:0, noshow:0, avgPays:[], days:new Set() };
  const hd = { rev:0, guests:0, groups:0, noshow:0, avgPays:[], days:new Set() };
  const wdByStore = {}, hdByStore = {};

  for (const r of records) {
    const storeName = getVal(r, 'store') || '未知分店';
    const session   = getVal(r, 'session') || '';
    const date      = getVal(r, 'date') || '';

    // Store filter
    const type = getStoreType(storeName);
    if (wdState.filter === 'direct'    && type !== 'direct')    continue;
    if (wdState.filter === 'franchise' && type !== 'franchise') continue;
    // Session filter
    if (wdState.sessionFilter === 'noon'    && session !== '中午') continue;
    if (wdState.sessionFilter === 'evening' && session !== '晚上') continue;

    const rev    = toNum(getVal(r, 'rev'));
    const guests = toNum(getVal(r, 'guests'));
    const groups = toNum(getVal(r, 'groups'));
    const noshow = toNum(getVal(r, 'noshow'));
    const avgPay = toNum(getVal(r, 'avgPay'));
    const displayName = getStoreDisplayName(storeName);
    const holiday = isHoliday(date);
    const bucket  = holiday ? hd : wd;
    const byStore = holiday ? hdByStore : wdByStore;

    bucket.rev    += rev;
    bucket.guests += guests;
    bucket.groups += groups;
    bucket.noshow += noshow;
    if (avgPay > 0) bucket.avgPays.push(avgPay);
    if (date) bucket.days.add(date);

    if (!byStore[storeName]) byStore[storeName] = { rev:0, guests:0, groups:0, avgPays:[], displayName, type };
    byStore[storeName].rev    += rev;
    byStore[storeName].guests += guests;
    byStore[storeName].groups += groups;
    if (avgPay > 0) byStore[storeName].avgPays.push(avgPay);
  }
  return { wd, hd, wdByStore, hdByStore };
}

function renderWd({ records, year, month }) {
  wdState.charts.forEach(c => c.destroy()); wdState.charts = [];
  const { wd, hd, wdByStore, hdByStore } = processWdRecords(records);

  const wdAvg = wd.avgPays.length ? wd.avgPays.reduce((a,b)=>a+b,0)/wd.avgPays.length : 0;
  const hdAvg = hd.avgPays.length ? hd.avgPays.reduce((a,b)=>a+b,0)/hd.avgPays.length : 0;
  const wdDays = wd.days.size || 1;
  const hdDays = hd.days.size || 1;

  const allStores = Array.from(new Set([...Object.keys(wdByStore), ...Object.keys(hdByStore)])).sort();

  document.getElementById('wdContent').innerHTML = `
    <div class="yoy-header">
      <span class="yoy-badge yoy-curr">平日</span>
      <span style="color:#9ca3af;font-size:13px;">vs</span>
      <span class="yoy-badge" style="background:#5c7a6e;color:#fff;">假日</span>
      <span style="font-size:12px;color:#9ca3af;margin-left:8px;">${year}年${month}月・平日${wdDays}天 / 假日${hdDays}天</span>
    </div>

    <div class="metrics-grid" style="margin-bottom:20px;">
      <div class="metric-card highlight">
        <div class="m-label">平日日均營業額</div>
        <div class="m-value">$${fmt(wd.rev/wdDays)} ${diffBadge(wd.rev/wdDays, hd.rev/hdDays)}</div>
        <div class="m-sub">假日日均 $${fmt(hd.rev/hdDays)}</div>
      </div>
      <div class="metric-card">
        <div class="m-label">平日日均來客</div>
        <div class="m-value">${fmt(wd.guests/wdDays)} ${diffBadge(wd.guests/wdDays, hd.guests/hdDays)}</div>
        <div class="m-sub">假日日均 ${fmt(hd.guests/hdDays)}</div>
      </div>
      <div class="metric-card">
        <div class="m-label">平日客單價</div>
        <div class="m-value">$${fmt(wdAvg)} ${diffBadge(wdAvg, hdAvg)}</div>
        <div class="m-sub">假日客單價 $${fmt(hdAvg)}</div>
      </div>
      <div class="metric-card">
        <div class="m-label">平日 No Show</div>
        <div class="m-value">${fmt(wd.noshow)}</div>
        <div class="m-sub">假日 No Show ${fmt(hd.noshow)}</div>
      </div>
    </div>

    <div class="charts-row" style="margin-bottom:20px;">
      <div class="chart-card">
        <div class="c-title">各分店日均營業額（平日 vs 假日）</div>
        <div class="chart-wrap" style="height:${Math.max(200, allStores.length*55)}px;">
          <canvas id="wdRevChart" role="img" aria-label="平假日營業額對比">平假日比較</canvas>
        </div>
      </div>
      <div class="chart-card">
        <div class="c-title">各分店客單價（平日 vs 假日）</div>
        <div class="chart-wrap" style="height:${Math.max(200, allStores.length*55)}px;">
          <canvas id="wdAvgChart" role="img" aria-label="平假日客單價對比">客單價比較</canvas>
        </div>
      </div>
    </div>

    <div class="table-card">
      <div class="table-header"><h3>各分店平假日詳細比較</h3></div>
      <table>
        <thead><tr>
          <th style="width:16%">分店</th>
          <th style="width:13%">平日營業額</th>
          <th style="width:13%">假日營業額</th>
          <th style="width:10%">平日來客</th>
          <th style="width:10%">假日來客</th>
          <th style="width:11%">平日客單價</th>
          <th style="width:11%">假日客單價</th>
          <th style="width:16%">客單價差異（假日-平日）</th>
        </tr></thead>
        <tbody>
          ${allStores.map(s => {
            const w = wdByStore[s], h = hdByStore[s];
            const dn = (w||h).displayName;
            const wR = w?.rev||0, hR = h?.rev||0;
            const wG = w?.guests||0, hG = h?.guests||0;
            const wAp = w?.avgPays||[], hAp = h?.avgPays||[];
            const wAv = wAp.length ? wAp.reduce((a,b)=>a+b,0)/wAp.length : 0;
            const hAv = hAp.length ? hAp.reduce((a,b)=>a+b,0)/hAp.length : 0;
            const diff = wAv > 0 ? (hAv - wAv) : null;
            const diffPct = wAv > 0 ? ((hAv - wAv) / wAv * 100) : null;
            const badge = diff === null ? '<span style="color:#9ca3af">-</span>'
              : diff > 0
                ? '<span class="diff-badge diff-up">▲ $' + fmt(Math.abs(diff)) + ' (+' + Math.abs(diffPct).toFixed(1) + '%)</span>'
                : diff < 0
                ? '<span class="diff-badge diff-down">▼ $' + fmt(Math.abs(diff)) + ' (-' + Math.abs(diffPct).toFixed(1) + '%)</span>'
                : '<span style="color:#9ca3af">持平</span>';
            return `<tr>
              <td class="store-name-cell">${dn}</td>
              <td>$${fmt(wR)}</td><td>$${fmt(hR)}</td>
              <td>${fmt(wG)}</td><td>${fmt(hG)}</td>
              <td>$${fmt(wAv)}</td><td>$${fmt(hAv)}</td>
              <td style="white-space:nowrap">${badge}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  const labels = allStores.map(s => (wdByStore[s]||hdByStore[s]).displayName);
  wdState.charts.push(new Chart(document.getElementById('wdRevChart'), {
    type: 'bar',
    data: { labels, datasets: [
      { label: '平日日均', data: allStores.map(s => (wdByStore[s]?.rev||0)/(wdDays)), backgroundColor: BRAND, borderRadius:4 },
      { label: '假日日均', data: allStores.map(s => (hdByStore[s]?.rev||0)/(hdDays)), backgroundColor: '#5c7a6e', borderRadius:4 },
    ]},
    options: { indexAxis:'y', responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ position:'top', labels:{ boxWidth:12, font:{size:11} } } },
      scales:{ x:{ ticks:{ callback: v=>'$'+fmt(v), font:{size:10} } }, y:{ ticks:{ font:{size:11} } } }
    }
  }));
  wdState.charts.push(new Chart(document.getElementById('wdAvgChart'), {
    type: 'bar',
    data: { labels, datasets: [
      { label: '平日客單價', data: allStores.map(s => { const ap=wdByStore[s]?.avgPays||[]; return ap.length?ap.reduce((a,b)=>a+b,0)/ap.length:0; }), backgroundColor: BRAND, borderRadius:4 },
      { label: '假日客單價', data: allStores.map(s => { const ap=hdByStore[s]?.avgPays||[]; return ap.length?ap.reduce((a,b)=>a+b,0)/ap.length:0; }), backgroundColor: '#5c7a6e', borderRadius:4 },
    ]},
    options: { indexAxis:'y', responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ position:'top', labels:{ boxWidth:12, font:{size:11} } } },
      scales:{ x:{ ticks:{ callback: v=>'$'+fmt(v), font:{size:10} } }, y:{ ticks:{ font:{size:11} } } }
    }
  }));
}

/* ════════════════════════════════════════
   目標達成追蹤
════════════════════════════════════════ */
// Store name mapping: Google Sheet name → Ragic display name
const STORE_NAME_MAP = {
  '明曜店': '2號店(明曜店)',
  '北屯店': '3號店(台中北屯店)',
  '台中北屯店': '3號店(台中北屯店)',
  '藝文店': '4號店(藝文店)',
  '仁愛店': '品牌概念店(仁愛店)',
  '英洸家': '英洸家',
};

async function fetchTargets(month) {
  try {
    const res = await fetch(`/api/sheets?month=${month}`);
    if (!res.ok) return {};
    const data = await res.json();
    if (data.error) return {};
    return data.targets || {};
  } catch { return {}; }
}

async function renderAchievement(byStore, dateFrom, dateTo) {
  const el = document.getElementById('achievementContent');
  if (!el) return;

  el.innerHTML = '<div style="color:#9ca3af;font-size:13px;padding:8px 0">載入目標中...</div>';

  try {
    const month = parseInt((dateFrom || '').slice(5, 7));
    if (!month) { el.innerHTML = ''; return; }

    const targets = await fetchTargets(month);
    if (!Object.keys(targets).length) { el.innerHTML = ''; return; }

    // Calculate elapsed days
    const today = new Date();
    const todayDay = today.getDate();
    const totalDays = new Date(today.getFullYear(), month, 0).getDate();
    const isCurrentMonth = (today.getFullYear() === new Date(dateFrom).getFullYear() &&
                            today.getMonth() === new Date(dateFrom).getMonth());
    const effectiveElapsed = isCurrentMonth ? todayDay : totalDays;

    const rows = Object.entries(targets).map(([sheetName, target]) => {
      const ragicName = STORE_NAME_MAP[sheetName] || sheetName;
      const storeEntry = Object.entries(byStore).find(([k, v]) =>
        k === ragicName || v.displayName === ragicName ||
        k.includes(sheetName) || v.displayName.includes(sheetName)
      );
      const actual = storeEntry ? storeEntry[1].rev : 0;
      const pct = target > 0 ? (actual / target * 100) : 0;
      // Project: daily average × remaining days
      const projected = effectiveElapsed > 0 ? Math.round(actual / effectiveElapsed * totalDays) : 0;
      const projPct = target > 0 ? (projected / target * 100) : 0;
      const color = pct >= 100 ? '#0F6E56' : pct >= 80 ? '#BA7517' : '#A32D2D';
      const barColor = pct >= 100 ? '#1D9E75' : pct >= 80 ? '#EF9F27' : BRAND;
      const gap = actual - target;

      return { sheetName, target, actual, pct, projected, projPct, color, barColor, gap };
    });

    el.innerHTML = `
      <div class="achievement-grid">
        ${rows.map(r => `
          <div class="ach-card">
            <div class="ach-store">${r.sheetName}</div>
            <div class="ach-row-item">
              <span class="ach-label">實際營業額</span>
              <span class="ach-val">$${fmt(r.actual)}</span>
            </div>
            <div class="ach-row-item">
              <span class="ach-label">月目標</span>
              <span class="ach-val" style="color:#9ca3af">$${fmt(r.target)}</span>
            </div>
            <div class="ach-row-item">
              <span class="ach-label">預估月底</span>
              <span class="ach-val" style="color:${r.projPct>=100?'#0F6E56':'#BA7517'}">$${fmt(r.projected)}</span>
            </div>
            <div class="ach-bar-wrap" style="margin-top:10px;">
              <div class="ach-bar-track">
                <div class="ach-bar-fill" style="width:${Math.min(r.pct,100).toFixed(1)}%;background:${r.barColor}"></div>
              </div>
              <span class="ach-pct" style="color:${r.color}">${r.pct.toFixed(1)}%</span>
            </div>
            <div class="ach-sub">${r.gap >= 0 ? '▲ 超標' : '▼ 差距'} $${fmt(Math.abs(r.gap))}・預估達成 ${r.projPct.toFixed(1)}%</div>
          </div>
        `).join('')}
      </div>
    `;
  } catch(e) {
    el.innerHTML = `<div style="font-size:12px;color:#9ca3af">目標資料載入失敗：${e.message}</div>`;
  }
}
