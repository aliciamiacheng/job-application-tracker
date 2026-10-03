import { readApplications, sendError } from '../lib/tracker.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'GET only' });
  }
  try { return res.status(200).json({ applications: await readApplications() }); }
  catch (error) { return sendError(res, error); }
}
