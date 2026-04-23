const SHEET_ID = '1MZ9VZ5Tg9OeQEcJqwP-lsqEE3i8Yd9oq';
const MONTH_TABS = ['一月份保底業績','二月份保底業績','三月份保底業績','四月份保底業績',
  '五月份保底業績','六月份保底業績','七月份保底業績','八月份保底業績',
  '九月份保底業績','十月份保底業績','十一月份保底業績','十二月份保底業績'];

// Column letters for each store slot (9 cols apart: E,N,W,AF,AO...)
function colIndexToLetter(n) {
  let s = '';
  while (n >= 0) { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; }
  return s;
}
// Store slots: name at col E(4), F(5)=target, then +9 each
// E=4, N=13, W=22, AF=31, AO=40
const STORE_NAME_COLS  = [4, 13, 22, 31, 40];  // E,N,W,AF,AO
const STORE_TARGET_COLS = [5, 14, 23, 32, 41]; // F,O,X,AG,AP

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { month } = req.query; // 1-12
  if (!month) return res.status(400).json({ error: 'Missing month' });

  const tabName = MONTH_TABS[parseInt(month) - 1];
  if (!tabName) return res.status(400).json({ error: 'Invalid month' });

  try {
    // Fetch row 2 (store names) and row 3 (targets)
    const range = encodeURIComponent(`${tabName}!A2:AQ3`);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${process.env.GOOGLE_SHEETS_API_KEY}`;
    const r = await fetch(url);
    const data = await r.json();

    if (data.error) return res.status(500).json({ error: data.error.message });

    const rows = data.values || [];
    const nameRow   = rows[0] || [];
    const targetRow = rows[1] || [];

    const targets = {};
    for (let i = 0; i < STORE_NAME_COLS.length; i++) {
      const nameCol   = STORE_NAME_COLS[i];
      const targetCol = STORE_TARGET_COLS[i];
      const name   = nameRow[nameCol]   ? String(nameRow[nameCol]).trim()   : null;
      const target = targetRow[targetCol] ? parseInt(String(targetRow[targetCol]).replace(/[,$]/g,'')) : 0;
      if (name && target > 0) targets[name] = target;
    }

    return res.status(200).json({ targets, tab: tabName });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
