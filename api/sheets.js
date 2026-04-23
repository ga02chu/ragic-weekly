const SHEET_ID = '1MZ9VZ5Tg9OeQEcJqwP-lsqEE3i8Yd9oq';
const MONTH_TABS = ['一月份保底業績','二月份保底業績','三月份保底業績','四月份保底業績',
  '五月份保底業績','六月份保底業績','七月份保底業績','八月份保底業績',
  '九月份保底業績','十月份保底業績','十一月份保底業績','十二月份保底業績'];

// Each store block is 9 cols wide
// Store name at col E(4), target at F(2) row 2 = index 1
// Blocks: cols 4-12, 13-21, 22-30, 31-39, 40-48 (0-indexed)
const STORE_NAME_COL_OFFSETS  = [4, 13, 22, 31, 40];  // E, N, W, AF, AO
const STORE_TARGET_COL_OFFSETS = [5, 14, 23, 32, 41]; // F, O, X, AG, AP

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { month } = req.query;
  if (!month) return res.status(400).json({ error: 'Missing month' });

  const tabName = MONTH_TABS[parseInt(month) - 1];
  if (!tabName) return res.status(400).json({ error: 'Invalid month' });

  try {
    // Fetch rows 2 (store names + targets) - row index 2 in sheets = A2:AQ2
    const range = encodeURIComponent(`${tabName}!A2:AQ2`);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${process.env.GOOGLE_SHEETS_API_KEY}`;
    const r = await fetch(url);
    const data = await r.json();

    if (data.error) return res.status(500).json({ error: data.error.message });

    const row = (data.values || [[]])[0] || [];

    const targets = {};
    for (let i = 0; i < STORE_NAME_COL_OFFSETS.length; i++) {
      const nameCol   = STORE_NAME_COL_OFFSETS[i];
      const targetCol = STORE_TARGET_COL_OFFSETS[i];
      const name   = row[nameCol]   ? String(row[nameCol]).trim()   : null;
      const target = row[targetCol] ? parseInt(String(row[targetCol]).replace(/[,$\s]/g,'')) : 0;
      if (name && target > 0) targets[name] = target;
    }

    return res.status(200).json({ targets, tab: tabName, debug: { rowLength: row.length, row: row.slice(0,50) } });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
