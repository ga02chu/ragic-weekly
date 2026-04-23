export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { path, limit = 1000, token } = req.query;

  if (!path || !token) {
    return res.status(400).json({ error: `Missing: ${!path ? 'path' : 'token'}` });
  }

  try {
    const url = `https://ap7.ragic.com/${path}?api&limit=${limit}&APIKey=${token}`;
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
