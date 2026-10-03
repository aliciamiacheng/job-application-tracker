import { acceptWrite, applicationInput, duplicateApplication, mutateApplications,
  applyStatusDates, TrackerError, sendError } from '../lib/tracker.js';

export default async function handler(req, res) {
  if (!acceptWrite(req, res)) return;
  try {
    const id = String(req.body?.id || '').trim();
    if (!id) throw new TrackerError(400, 'Application id is required.');
    const data = applicationInput(req.body);
    const result = await mutateApplications(rows => {
      const record = rows.find(row => row.id === id);
      if (!record) throw new TrackerError(404, 'Application not found.');
      if (duplicateApplication(rows, data, id)) throw new TrackerError(409, 'That company and role or link is already tracked.');
      Object.assign(record, data);
      applyStatusDates(record, new Date().toISOString().slice(0, 10));
      return { ok: true, id };
    }, 'Edit application ' + id);
    return res.status(200).json(result);
  } catch (error) { return sendError(res, error); }
}
