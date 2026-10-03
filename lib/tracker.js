export const FIELDS = ['id', 'company', 'role', 'location', 'category', 'url', 'status',
  'date_discovered', 'date_started', 'date_applied', 'last_updated', 'source', 'deadline', 'notes'];
export const STATUSES = ['Interested', 'Started', 'Applied', 'Assessment', 'Interview',
  'Final Round', 'Offer', 'Rejected', 'Withdrawn'];
const FILE_URL = 'https://api.github.com/repos/aliciamiacheng/job-application-tracker/contents/applications.csv';

export class TrackerError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i], next = text[i + 1];
    if (quoted && char === '"' && next === '"') { cell += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i++;
      row.push(cell);
      if (row.some(Boolean)) rows.push(row);
      row = []; cell = '';
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  if (!rows.length) return [];
  const fields = rows.shift();
  return rows.map(values => Object.fromEntries(fields.map((field, i) => [field, values[i] || ''])));
}

export function serializeCSV(rows) {
  const cell = value => {
    const text = String(value ?? '');
    return /[",\n\r]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  };
  return FIELDS.join(',') + '\n' +
    rows.map(row => FIELDS.map(field => cell(row[field])).join(',')).join('\n') +
    (rows.length ? '\n' : '');
}

function headers() {
  if (!process.env.GITHUB_TOKEN) throw new TrackerError(500, 'Tracker storage is not configured on the server.');
  return { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN,
    Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
}

async function readFile() {
  const response = await fetch(FILE_URL, { headers: headers(), signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new TrackerError(502, 'Could not read the tracker from GitHub.');
  const file = await response.json();
  const csv = Buffer.from(file.content.replace(/\n/g, ''), 'base64').toString('utf8');
  return { sha: file.sha, rows: parseCSV(csv) };
}

export async function readApplications() { return (await readFile()).rows; }

export async function mutateApplications(change, message) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const file = await readFile();
    const result = change(file.rows);
    if (result.duplicate) return result;
    const response = await fetch(FILE_URL, {
      method: 'PUT', headers: { ...headers(), 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({ message, sha: file.sha,
        content: Buffer.from(serializeCSV(file.rows)).toString('base64') }),
    });
    if (response.ok) return result;
    if (response.status !== 409) throw new TrackerError(502, 'Could not save the tracker to GitHub.');
  }
  throw new TrackerError(409, 'The tracker changed while saving. Please try again.');
}

// Dashboard edits are key-free. External clients (including the extension) retain key-based access.
// This prevents cross-site browser requests; it does not restrict access to a particular owner.
export function acceptWrite(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Tracker-Key');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.status(204).end();
    return false;
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    res.status(405).json({ error: 'POST only' }); return false;
  }
  const hasKey = Boolean(process.env.INGEST_SECRET &&
    req.headers['x-tracker-key'] === process.env.INGEST_SECRET);
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const sameOrigin = Boolean(host && req.headers.origin === protocol + '://' + host);
  if (hasKey) res.setHeader('Access-Control-Allow-Origin', '*');
  if (!hasKey && !sameOrigin) {
    res.status(401).json({ error: 'Use the tracker website to make changes.' }); return false;
  }
  if (String(req.headers['content-type'] || '').split(';')[0].trim() !== 'application/json') {
    res.status(415).json({ error: 'Send application/json.' }); return false;
  }
  return true;
}

export function sendError(res, error) {
  console.error('Tracker request failed', { status: error.status || 502, name: error.name });
  return res.status(error.status || 502).json({
    error: error instanceof TrackerError ? error.message : 'Could not reach tracker storage. Please try again.',
  });
}

export function applicationInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new TrackerError(400, 'Application details are required.');
  const data = {};
  for (const field of ['company', 'role', 'location', 'category', 'url', 'status', 'date_applied', 'deadline', 'notes']) {
    data[field] = String(body[field] ?? '').trim();
    if (data[field].length > (field === 'notes' ? 5000 : 2000)) throw new TrackerError(400, field + ' is too long.');
  }
  if (!data.company || !data.role) throw new TrackerError(400, 'Company and role are required.');
  data.status ||= 'Started';
  if (!STATUSES.includes(data.status)) throw new TrackerError(400, 'Choose a valid application status.');
  if (data.url) {
    let url;
    try { url = new URL(data.url); } catch { throw new TrackerError(400, 'Enter a valid application link.'); }
    if (!['http:', 'https:'].includes(url.protocol)) throw new TrackerError(400, 'Application links must use http or https.');
  }
  for (const field of ['date_applied', 'deadline']) {
    const date = data[field];
    if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) {
      throw new TrackerError(400, 'Enter a valid ' + field.replace('_', ' ') + ' date.');
    }
  }
  return data;
}

export function duplicateApplication(rows, data, ignoreId = '') {
  return rows.find(row => row.id !== ignoreId &&
    ((data.url && row.url === data.url) ||
     (row.company.trim().toLowerCase() === data.company.toLowerCase() &&
      row.role.trim().toLowerCase() === data.role.toLowerCase())));
}

export function applyStatusDates(record, today) {
  if (record.status === 'Started' && !record.date_started) record.date_started = today;
  if (['Applied', 'Assessment', 'Interview', 'Final Round', 'Offer', 'Rejected'].includes(record.status) &&
    !record.date_applied) record.date_applied = today;
  record.last_updated = today;
}
