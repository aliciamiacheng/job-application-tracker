import { acceptWrite, mutateApplications, applyStatusDates,
  STATUSES, TrackerError, sendError } from '../lib/tracker.js';

export default async function handler(req, res) {
  if (!acceptWrite(req, res)) return;
  try {
    const id = String(req.body?.id || '').trim();
    const status = String(req.body?.status || '').trim();
    if (!id || !STATUSES.includes(status)) throw new TrackerError(400, 'Valid id and status are required.');
    const result = await mutateApplications(rows => {
      const record = rows.find(row => row.id === id);
      if (!record) throw new TrackerError(404, 'Application not found.');
      record.status = status;
      applyStatusDates(record, new Date().toISOString().slice(0, 10));
      return { ok: true, id, status };
    }, 'Update ' + id + ' status to ' + status);
    return res.status(200).json(result);
  } catch (error) { return sendError(res, error); }
}
