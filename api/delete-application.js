import { acceptWrite, mutateApplications, TrackerError, sendError } from '../lib/tracker.js';

export default async function handler(req, res) {
  if (!acceptWrite(req, res)) return;
  try {
    const id = String(req.body?.id || '').trim();
    if (!id) throw new TrackerError(400, 'Application id is required.');
    const result = await mutateApplications(rows => {
      const index = rows.findIndex(row => row.id === id);
      if (index < 0) throw new TrackerError(404, 'Application not found.');
      rows.splice(index, 1);
      return { ok: true, id };
    }, 'Delete application ' + id);
    return res.status(200).json(result);
  } catch (error) { return sendError(res, error); }
}
