export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { path, limit = 1000, token } = req.query;

  // Use env var token first, fallback to query param
  const apiToken = process.env.RAGIC_TOKEN || token;
  const apiPath  = process.env.RAGIC_PATH  || path;

  if (!apiPath || !apiToken) {
    return res.status(400).json({ error: `Missing: ${!apiPath ? 'path' : 'token'}` });
  }

  try {
    const url = `https://ap7.ragic.com/${apiPath}?api&limit=${limit}&APIKey=${apiToken}`;
    const response = await fetch(url);
    const text = await response.text();
    try {
      const data = JSON.parse(text);
      return res.status(200).json(data);
    } catch {
      return res.status(200).send(text);
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
