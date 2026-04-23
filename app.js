/* ── State ── */
const state = {
  records: [],
  activeSection: 'dashboard',
  activeRange: 'thisweek',
  charts: [],
  settings: {},
  fields: {},
};

const DEFAULT_FIELDS = {
  date:       '營業日期',
  store:      '分店簡稱',
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

/* ── 加盟店映射：Ragic分店名稱 → 顯示名稱/類型 ── */
const FRANCHISE_STORES = ['4號店(藝文店)'];
function getStoreType(name) {
  return FRANCHISE_STORES.includes(name) ? 'franchise' : 'direct';
}
function getStoreDisplayName(name) {
  if (name === '4號店(藝文店)') return '藝文店（加盟）';
  return name;
}

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
function updateConnStatus() {
  const el = document.getElementById('connStatus');
  const dot = el.querySelector('.dot');
  const txt = el.querySelector('span:last-child');
  if (state.settings.token && state.settings.path) {
    dot.className = 'dot dot-green'; txt.textContent = '已設定';
  } else {
    dot.className = 'dot dot-gray'; txt.textContent = '尚未連線';
  }
}

/* ── Date helpers ── */
function toISO(d) { return d.toISOString().slice(0,10); }
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
    to   = new Date(t.getFullYear(), t.getMonth() + 1, 0);
  } else if (key === 'lastmonth') {
    from = new Date(t.getFullYear(), t.getMonth() - 1, 1);
    to   = new Date(t.getFullYear(), t.getMonth(), 0);
  }
  return { from: toISO(from), to: toISO(to) };
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
  return `${from}  ～  ${to}`;
}

/* ── Field value getter ── */
function getF(key) { return state.fields[key] || DEFAULT_FIELDS[key]; }
function getVal(r, key) {
  const field = getF(key);
  const aliases = {
    date:       [field, '營業日期', '日期', 'Date'],
    store:      [field, '分店簡稱', '分店', 'store'],
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
  for (const k of list) {
    if (r[k] !== undefined && r[k] !== '') return r[k];
  }
  return null;
}
function toNum(v) {
  if (v === null || v === undefined) return 0;
  return parseFloat(String(v).replace(/[$,\s]/g,'')) || 0;
}

/* ── Fetch ── */
async function fetchData() {
  const token = state.settings.token;
  const path  = state.settings.path;
  if (!token || !path) {
    showToast('請先在設定頁填入 API Token 與表單路徑'); switchSection('settings'); return;
  }
  const dateFrom = document.getElementById('dateFrom').value;
  const dateTo   = document.getElementById('dateTo').value;
  if (!dateFrom || !dateTo) { showToast('請選擇日期區間'); return; }

  const btn = document.getElementById('fetchBtn');
  btn.disabled = true; btn.textContent = '查詢中…';
  showLoading();

  try {
    const url = `/api/ragic?path=${encodeURIComponent(path)}&limit=1000&token=${encodeURIComponent(token)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();

    if (raw.status === 'ERROR') throw new Error(raw.msg);

    const from = new Date(dateFrom); from.setHours(0,0,0,0);
    const to   = new Date(dateTo);   to.setHours(23,59,59,999);

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

    const allValues = Object.values(raw).filter(r => typeof r === 'object' && r && !Array.isArray(r));

    state.records = allValues.filter(r => {
      const dateFields = [getF('date'), '營業日期', '日期', 'Date'];
      let dv = null;
      for (const f of dateFields) { if (r[f] !== undefined && r[f] !== '') { dv = r[f]; break; } }
      if (!dv) return false;
      const dt = parseRagicDate(dv);
      if (!dt || isNaN(dt)) return false;
      return dt >= from && dt <= to;
    });

    document.getElementById('dateRangeLabel').textContent = formatRangeLabel();

    if (state.records.length === 0) {
      showEmptyResult(); showToast('此區間無資料'); return;
    }

    renderAll();
    showToast(`已載入 ${state.records.length} 筆資料`);
  } catch(e) {
    showToast('載入失敗：' + e.message);
    showEmptyResult();
  } finally {
    btn.disabled = false; btn.textContent = '載入報表';
  }
}

/* ── Data processing ── */
function processData() {
  const byStore = {}, byDate = {};
  for (const r of state.records) {
    const storeName = getVal(r, 'store') || '未知分店';
    const date  = getVal(r, 'date') || '';
    const rev   = toNum(getVal(r, 'rev'));
    const guests = toNum(getVal(r, 'guests'));
    const groups = toNum(getVal(r, 'groups'));
    const noshow = toNum(getVal(r, 'noshow'));
    const avgPay = toNum(getVal(r, 'avgPay'));
    const supervisor = getVal(r, 'supervisor') || '-';
    const complaint  = getVal(r, 'complaint')  || '';
    const food       = getVal(r, 'food')       || '';
    const share      = getVal(r, 'share')      || '';

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
    byStore[storeName].records.push({ date, supervisor, complaint, food, share });

    if (date) byDate[date] = (byDate[date] || 0) + rev;
  }
  return { byStore, byDate };
}

/* ── Render all ── */
function renderAll() {
  const { byStore, byDate } = processData();
  renderDashboard(byStore, byDate);
  renderStores(byStore);
  renderLogs(byStore);
}

/* ── Dashboard ── */
const COLORS = ['#1D9E75','#3266ad','#BA7517','#A32D2D','#533AB7','#0F6E56','#634806','#185FA5'];
function fmt(n)   { return Math.round(n).toLocaleString(); }
function fmtD(s)  { return s ? String(s).replace(/-/g,'/') : '-'; }

function renderDashboard(byStore, byDate) {
  const stores = Object.keys(byStore).sort();
  const totalRev    = stores.reduce((s,k) => s + byStore[k].rev, 0);
  const totalGuests = stores.reduce((s,k) => s + byStore[k].guests, 0);
  const totalGroups = stores.reduce((s,k) => s + byStore[k].groups, 0);
  const totalNoshow = stores.reduce((s,k) => s + byStore[k].noshow, 0);
  const dates = Object.keys(byDate).sort();
  const avgRevPerDay = dates.length > 0 ? totalRev / dates.length : 0;
  const noshowPct = totalGroups > 0 ? ((totalNoshow/totalGroups)*100).toFixed(1) : '0.0';

  state.charts.forEach(c => c.destroy());
  state.charts = [];

  document.getElementById('dashboardContent').innerHTML = `
    <div class="metrics-grid">
      <div class="metric-card highlight">
        <div class="m-label">期間總營業額</div>
        <div class="m-value">$${fmt(totalRev)}</div>
        <div class="m-sub">日均 $${fmt(avgRevPerDay)}</div>
      </div>
      <div class="metric-card">
        <div class="m-label">總用餐人數</div>
        <div class="m-value">${fmt(totalGuests)}</div>
        <div class="m-sub">共 ${fmt(totalGroups)} 組</div>
      </div>
      <div class="metric-card">
        <div class="m-label">No Show 組數</div>
        <div class="m-value">${fmt(totalNoshow)}</div>
        <div class="m-sub">占訂單 ${noshowPct}%</div>
      </div>
      <div class="metric-card">
        <div class="m-label">查詢分店數</div>
        <div class="m-value">${stores.length}</div>
        <div class="m-sub">共 ${state.records.length} 筆資料</div>
      </div>
    </div>

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
          <th style="width:20%">分店</th>
          <th style="width:8%">類型</th>
          <th style="width:18%">營業額</th>
          <th style="width:12%">用餐人數</th>
          <th style="width:12%">用餐組數</th>
          <th style="width:12%">No Show</th>
          <th style="width:10%">客單價</th>
          <th style="width:8%">狀態</th>
        </tr></thead>
        <tbody>
          ${stores.map(s => {
            const d = byStore[s];
            const avg = d.avgPays.length ? d.avgPays.reduce((a,b)=>a+b,0)/d.avgPays.length : 0;
            const nr = d.groups > 0 ? (d.noshow/d.groups)*100 : 0;
            const badge = nr > 10 ? '<span class="badge badge-danger">需關注</span>'
                        : nr > 5  ? '<span class="badge badge-warn">一般</span>'
                        : '<span class="badge badge-good">良好</span>';
            const typeBadge = d.type === 'franchise'
              ? '<span class="badge" style="background:#EDE9FE;color:#5B21B6">加盟</span>'
              : '<span class="badge" style="background:#E0F2FE;color:#0369A1">直營</span>';
            return `<tr>
              <td class="store-name-cell">${d.displayName}</td>
              <td>${typeBadge}</td>
              <td>$${fmt(d.rev)}</td>
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
        label: '當日總營業額',
        data: dates.map(d => byDate[d]),
        borderColor: '#1D9E75', backgroundColor: 'rgba(29,158,117,0.08)',
        borderWidth: 2, tension: 0.35, fill: true,
        pointBackgroundColor: '#1D9E75', pointRadius: 4, pointHoverRadius: 6,
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

/* ── Stores Section ── */
function renderStores(byStore) {
  const stores = Object.keys(byStore).sort((a,b) => byStore[b].rev - byStore[a].rev);
  const maxRev = stores.length ? byStore[stores[0]].rev : 1;

  document.getElementById('storesContent').innerHTML = `
    <div class="table-card" style="margin-bottom:20px;">
      <div class="table-header"><h3>分店營業額排行</h3></div>
      <div style="padding:20px 24px;">
        <div class="bar-chart">
          ${stores.map((s,i) => {
            const d = byStore[s];
            const pct = maxRev > 0 ? (d.rev / maxRev * 100) : 0;
            return `<div class="bar-row">
              <div class="bar-meta">
                <span class="bm-name">${i+1}. ${d.displayName}</span>
                <span class="bm-val">$${fmt(d.rev)}</span>
              </div>
              <div class="bar-track"><div class="bar-fill" style="width:${pct.toFixed(1)}%; background:${COLORS[i % COLORS.length]}"></div></div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>

    <div class="table-card">
      <div class="table-header"><h3>詳細數據比較</h3></div>
      <table>
        <thead><tr>
          <th style="width:18%">分店</th>
          <th style="width:7%">類型</th>
          <th style="width:15%">總營業額</th>
          <th style="width:11%">用餐人數</th>
          <th style="width:11%">用餐組數</th>
          <th style="width:10%">No Show</th>
          <th style="width:10%">No Show率</th>
          <th style="width:10%">平均客單價</th>
          <th style="width:8%">狀態</th>
        </tr></thead>
        <tbody>
          ${stores.map(s => {
            const d = byStore[s];
            const avg = d.avgPays.length ? d.avgPays.reduce((a,b)=>a+b,0)/d.avgPays.length : 0;
            const nr = d.groups > 0 ? (d.noshow/d.groups)*100 : 0;
            const badge = nr > 10 ? '<span class="badge badge-danger">需關注</span>'
                        : nr > 5  ? '<span class="badge badge-warn">一般</span>'
                        : '<span class="badge badge-good">良好</span>';
            const typeBadge = d.type === 'franchise'
              ? '<span class="badge" style="background:#EDE9FE;color:#5B21B6">加盟</span>'
              : '<span class="badge" style="background:#E0F2FE;color:#0369A1">直營</span>';
            return `<tr>
              <td class="store-name-cell">${d.displayName}</td>
              <td>${typeBadge}</td>
              <td>$${fmt(d.rev)}</td>
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

/* ── Logs Section with AI Analysis ── */
async function renderLogs(byStore) {
  const stores = Object.keys(byStore).sort();
  const dateFrom = document.getElementById('dateFrom').value;
  const dateTo   = document.getElementById('dateTo').value;

  // Build full log text for AI
  let allLogsText = `日期區間：${dateFrom} ～ ${dateTo}\n\n`;
  for (const s of stores) {
    const d = byStore[s];
    const recs = d.records.sort((a,b) => a.date.localeCompare(b.date));
    allLogsText += `【${d.displayName}】\n`;
    for (const r of recs) {
      allLogsText += `${fmtD(r.date)} 值班：${r.supervisor}\n`;
      if (r.complaint && r.complaint !== '無' && r.complaint !== '無客訴') allLogsText += `  客訴：${r.complaint}\n`;
      if (r.food && r.food !== '無') allLogsText += `  食材：${r.food}\n`;
      if (r.share && r.share !== '無' && r.share !== '無事件分享') allLogsText += `  分享：${r.share}\n`;
    }
    allLogsText += '\n';
  }

  // Render log records first
  const logsHtml = stores.map(s => {
    const d = byStore[s];
    const recs = d.records.sort((a,b) => a.date.localeCompare(b.date));
    const entries = recs.map(r => {
      const hasContent = (r.complaint && r.complaint !== '無' && r.complaint !== '無客訴') ||
                         (r.food && r.food !== '無') ||
                         (r.share && r.share !== '無' && r.share !== '無事件分享');
      if (!hasContent) return `<div class="log-entry"><div class="log-meta">${fmtD(r.date)} | ${r.supervisor}</div><div class="log-empty">無特殊事項</div></div>`;
      return `<div class="log-entry">
        <div class="log-meta">${fmtD(r.date)} | ${r.supervisor}</div>
        ${r.complaint && r.complaint !== '無' && r.complaint !== '無客訴' ? `<div class="log-row log-tag-complaint"><span class="log-tag">客訴</span>${r.complaint}</div>` : ''}
        ${r.food && r.food !== '無' ? `<div class="log-row log-tag-food"><span class="log-tag">食材</span>${r.food}</div>` : ''}
        ${r.share && r.share !== '無' && r.share !== '無事件分享' ? `<div class="log-row log-tag-share"><span class="log-tag">分享</span>${r.share}</div>` : ''}
      </div>`;
    }).join('');
    return `<div class="log-card"><div class="lc-store">${d.displayName}</div>${entries}</div>`;
  }).join('');

  document.getElementById('logsContent').innerHTML = `
    <div class="ai-analysis-card" id="aiAnalysisCard">
      <div class="ai-header">
        <div class="ai-icon">✦</div>
        <div>
          <div class="ai-title">AI 週報分析</div>
          <div class="ai-sub">正在分析本期各分店日誌...</div>
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

    <div class="section-title" style="margin-bottom:12px;">各分店完整日誌</div>
    <div class="logs-grid">${logsHtml}</div>
  `;

  // Call Claude API via proxy for analysis
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logs: allLogsText, dateFrom, dateTo })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    const text = data.text || '分析失敗，請稍後再試';

    // Format output with line breaks
    const formatted = text
      .split('\n')
      .map(line => {
        if (line.startsWith('📊') || line.startsWith('⚠️') || line.startsWith('✅') || line.startsWith('🎯')) {
          return `<div class="ai-section-title">${line}</div>`;
        } else if (line.trim().startsWith('（') || line.trim() === '') {
          return `<div class="ai-note">${line}</div>`;
        } else {
          return `<div class="ai-line">${line}</div>`;
        }
      })
      .join('');

    document.getElementById('aiBody').innerHTML = `<div class="ai-content">${formatted}</div>`;
    document.querySelector('.ai-sub').textContent = `已完成分析・${dateFrom} ～ ${dateTo}`;
  } catch(e) {
    document.getElementById('aiBody').innerHTML = `<div class="ai-error">AI 分析暫時無法使用：${e.message}</div>`;
  }
}

/* ── UI Helpers ── */
function showLoading() {
  const skels = Array(4).fill(0).map(() => `<div class="metric-card"><div class="skeleton" style="height:12px;width:60%;margin-bottom:10px;"></div><div class="skeleton" style="height:28px;width:80%;"></div></div>`).join('');
  document.getElementById('dashboardContent').innerHTML = `<div class="metrics-grid">${skels}</div><div class="skeleton" style="height:260px;border-radius:10px;margin-bottom:14px;"></div>`;
}
function showEmptyResult() {
  const empty = `<div class="empty-state"><p class="empty-title">此區間無資料</p><p class="empty-sub">請確認日期區間與 API 設定是否正確</p></div>`;
  document.getElementById('dashboardContent').innerHTML = empty;
  document.getElementById('storesContent').innerHTML = empty;
  document.getElementById('logsContent').innerHTML = empty;
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
  const titles = { dashboard:'總覽', stores:'分店比較', logs:'主管日誌', settings:'設定' };
  document.getElementById('pageTitle').textContent = titles[key] || '';
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  loadStorage();
  fillSettingsForm();
  updateConnStatus();
  applyRange('thisweek');

  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => applyRange(btn.dataset.range));
  });
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchSection(btn.dataset.section));
  });
  document.getElementById('fetchBtn').addEventListener('click', fetchData);
  document.getElementById('dateFrom').addEventListener('change', () => applyRange('custom'));
  document.getElementById('dateTo').addEventListener('change',   () => applyRange('custom'));
});
