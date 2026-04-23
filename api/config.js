export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Return whether server-side config is available
  // Never expose the actual token to the client
  res.status(200).json({
    hasToken: !!process.env.RAGIC_TOKEN,
    hasPath:  !!process.env.RAGIC_PATH,
  });
}
