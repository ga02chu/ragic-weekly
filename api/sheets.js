const SHEET_ID = '1fMlJSs6u9JkSQEhQiRYhlKF4eIJXU46yVgfnjv7jBxo';
const MONTH_TABS = ['一月份保底業績','二月份保底業績','三月份保底業績','四月份保底業績',
  '五月份保底業績','六月份保底業績','七月份保底業績','八月份保底業績',
  '九月份保底業績','十月份保底業績','十一月份保底業績','十二月份保底業績'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { month } = req.query;
  if (!month) return res.status(400).json({ error: 'Missing month' });

  const tabName = MONTH_TABS[parseInt(month) - 1];
  if (!tabName) return res.status(400).json({ error: 'Invalid month' });

  try {
    // Fetch rows 2-3 to get store names and targets
    const range = encodeURIComponent(`${tabName}!A2:AQ3`);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${process.env.GOOGLE_SHEETS_API_KEY}`;
    const r = await fetch(url);
    const data = await r.json();

    if (data.error) return res.status(500).json({ error: data.error.message });

    const rows = data.values || [];
    const row2 = rows[0] || []; // store names row
    const row3 = rows[1] || []; // targets row

    // Find store names in row2 and match targets in row3
    // Store name appears at indices 3,12,21,30,39 (0-indexed: D col)
    // Target appears at same col offset in row3
    const targets = {};

    for (let i = 0; i < row2.length; i++) {
      const cell = String(row2[i] || '').trim();
      // Store names are things like 明曜店, 仁愛店, 北屯店, 英洸家, 藝文店
      if (cell && !['月份','2026/04','2026/03','2026/02','2026/01','2025','實際總業績','本月目標依據','表一',''].includes(cell)
          && !cell.match(/^\d/) && cell.length >= 2 && cell.length <= 10) {
        // Look for the target in row3 at same or nearby position
        // Target col is usually i+2 (F col after store name at D col)
        const targetVal = row3[i+2] || row3[i+1] || row3[i] || '';
        const target = parseInt(String(targetVal).replace(/[,$\s]/g,''));
        if (target > 0 && target > 100000) { // reasonable target amount
          targets[cell] = target;
        }
      }
    }

    return res.status(200).json({ targets, tab: tabName });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
