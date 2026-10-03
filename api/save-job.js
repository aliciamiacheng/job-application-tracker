import { acceptWrite, applicationInput, duplicateApplication, mutateApplications,
  applyStatusDates, FIELDS, sendError } from '../lib/tracker.js';

export default async function handler(req, res) {
  if (!acceptWrite(req, res)) return;
  try {
    const data = applicationInput(req.body);
    const today = new Date().toISOString().slice(0, 10);
    const result = await mutateApplications(rows => {
      const duplicate = duplicateApplication(rows, data);
      if (duplicate) return { ok: true, duplicate: true, id: duplicate.id };
      const max = rows.reduce((value, row) => Math.max(value, Number(String(row.id).split('-').pop()) || 0), 0);
      const id = 'APP-' + String(max + 1).padStart(4, '0');
      const record = Object.fromEntries(FIELDS.map(field => [field, '']));
      Object.assign(record, data, { id, date_discovered: today,
        source: req.headers['x-tracker-key'] ? 'Browser' : 'Manual' });
      applyStatusDates(record, today);
      rows.push(record);
      return { ok: true, id };
    }, 'Track application: ' + data.company + ' - ' + data.role);
    return res.status(200).json(result);
  } catch (error) { return sendError(res, error); }
}
