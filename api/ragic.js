export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { path, limit = 1000 } = req.query;
  const auth = req.headers['authorization'];

  if (!path || !auth) {
    return res.status(400).json({ error: 'Missing path or authorization' });
  }

  const server = path.startsWith('ap') ? path.split('/')[0] : 'ap7';
  const formPath = path.includes('.ragic.com') ? path : path;

  try {
    const url = `https://ap7.ragic.com/${path}?api&limit=${limit}`;
    const response = await fetch(url, {
      headers: { 'Authorization': auth }
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
