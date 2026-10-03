import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { FIELDS, parseCSV, serializeCSV } from '../lib/tracker.js';
import add from '../api/save-job.js';
import edit from '../api/update-application.js';
import status from '../api/update-status.js';
import remove from '../api/delete-application.js';
import read from '../api/applications.js';

let stored, revision, writes, conflict;
const origin = 'https://tracker.example';
const fixture = (id, company) => ({
  ...Object.fromEntries(FIELDS.map(field => [field, ''])),
  id, company, role: 'Summer Analyst', status: 'Interested',
  date_discovered: '2026-09-21', source: 'Inbox', notes: 'Original note',
});

beforeEach(() => {
  stored = [fixture('APP-0001', 'First'), fixture('APP-0002', 'Second')];
  revision = 1; writes = 0; conflict = false;
  process.env.GITHUB_TOKEN = 'test-token';
  process.env.INGEST_SECRET = 'test-extension-secret';
  globalThis.fetch = async (_url, options) => {
    if (options.method !== 'PUT') {
      return Response.json({ sha: String(revision), content: Buffer.from(serializeCSV(stored)).toString('base64') });
    }
    const body = JSON.parse(options.body);
    if (conflict) {
      conflict = false;
      stored.push(fixture('APP-0003', 'Concurrent application'));
      revision++;
      return new Response('', { status: 409 });
    }
    assert.equal(body.sha, String(revision));
    stored = parseCSV(Buffer.from(body.content, 'base64').toString());
    revision++; writes++;
    return Response.json({ ok: true });
  };
});

async function invoke(handler, body, overrides = {}) {
  const req = { method: 'POST', body, headers: {host:'tracker.example', origin,
    'content-type':'application/json'}, ...overrides };
  const res = { code: 200, headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
    end() { return this; },
  };
  await handler(req, res);
  return res;
}

test('CSV round-trips commas, quotes, multiline notes, and Unicode', () => {
  const row = {...fixture('APP-0001', 'A, B'), notes:'"Interview"\n香港'};
  assert.deepEqual(parseCSV(serializeCSV([row])), [row]);
});

test('key-free dashboard creation accepts an optional URL and stores all details', async () => {
  const res = await invoke(add, {company:'Third', role:'PM Intern', status:'Applied',
    location:'London', category:'Product', deadline:'2026-11-01', notes:'Line 1\nLine 2'});
  assert.equal(res.code, 200);
  assert.equal(res.body.id, 'APP-0003');
  const row = stored.at(-1);
  assert.equal(row.url, '');
  assert.equal(row.source, 'Manual');
  assert.equal(row.category, 'Product');
  assert.equal(row.date_applied, new Date().toISOString().slice(0, 10));
  assert.equal(row.notes, 'Line 1\nLine 2');
});

test('manual edit preserves identity, discovery date, source, and other applications', async () => {
  const other = {...stored[1]};
  const res = await invoke(edit, {id:'APP-0001', company:'Edited', role:'PM Intern',
    category:'Product', location:'Hong Kong', url:'https://example.com/job',
    status:'Interview', date_applied:'2026-10-01', notes:'Updated, with "quotes"'});
  assert.equal(res.code, 200);
  assert.equal(stored[0].id, 'APP-0001');
  assert.equal(stored[0].date_discovered, '2026-09-21');
  assert.equal(stored[0].source, 'Inbox');
  assert.equal(stored[0].date_applied, '2026-10-01');
  assert.equal(stored[0].company, 'Edited');
  assert.deepEqual(stored[1], other);
});

test('key-free status update records date applied', async () => {
  const res = await invoke(status, {id:'APP-0001', status:'Applied'});
  assert.equal(res.code, 200);
  assert.equal(stored[0].status, 'Applied');
  assert.equal(stored[0].date_applied, new Date().toISOString().slice(0, 10));
});

test('key-free deletion removes only the requested application', async () => {
  const res = await invoke(remove, {id:'APP-0001'});
  assert.equal(res.code, 200);
  assert.deepEqual(stored.map(row => row.id), ['APP-0002']);
});

test('cross-site requests without the extension key cannot write', async () => {
  const res = await invoke(add, {company:'Third', role:'Intern'}, {
    headers:{host:'tracker.example', origin:'https://other.example', 'content-type':'application/json'}});
  assert.equal(res.code, 401);
  assert.equal(writes, 0);
});

test('the existing extension key still permits cross-origin requests', async () => {
  const res = await invoke(add, {company:'Third', role:'Intern'}, {
    headers:{host:'tracker.example', origin:'chrome-extension://extension',
      'x-tracker-key':'test-extension-secret', 'content-type':'application/json'}});
  assert.equal(res.code, 200);
  assert.equal(res.headers['Access-Control-Allow-Origin'], '*');
  assert.equal(stored.at(-1).source, 'Browser');
});

test('invalid links, dates, and statuses are rejected before storage', async () => {
  for (const invalid of [{url:'javascript:alert(1)'}, {deadline:'2026-02-30'}, {status:'Unknown'}]) {
    const res = await invoke(add, {company:'Third', role:'Intern', ...invalid});
    assert.equal(res.code, 400);
  }
  assert.equal(writes, 0);
});

test('a concurrent GitHub save is retried without losing the new application', async () => {
  conflict = true;
  const res = await invoke(add, {company:'Third', role:'Intern'});
  assert.equal(res.code, 200);
  assert.equal(res.body.id, 'APP-0004');
  assert.deepEqual(stored.map(row => row.company), ['First','Second','Concurrent application','Third']);
});

test('duplicate creation does not write and duplicate edits are rejected', async () => {
  const res = await invoke(add, {company:'First', role:'Summer Analyst'});
  assert.equal(res.body.duplicate, true);
  assert.equal(writes, 0);
  const edited = await invoke(edit, {id:'APP-0002', company:'First', role:'Summer Analyst'});
  assert.equal(edited.code, 409);
  assert.equal(writes, 0);
});

test('GET returns persisted records in the dashboard response format', async () => {
  const res = await invoke(read, null, {method:'GET'});
  assert.equal(res.code, 200);
  assert.deepEqual(res.body.applications, stored);
});
