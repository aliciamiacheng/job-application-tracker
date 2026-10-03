# Job Application Tracker

A lightweight tracker for Alicia's Summer 2027 recruiting.

## What it tracks
- Summer 2027 internships and Summer Analyst programs
- Roles intended for students graduating in 2028
- Company, role, location, category, URL, dates, status, source, notes
- Started-but-not-submitted applications that you intentionally save

Statuses: Interested, Started, Applied, Assessment, Interview, Final Round, Offer, Rejected, Withdrawn.

## Add an application
On the website, click **+ Add application**. Company and role are required; the link is optional. Choose a status and category, and add dates, location, and notes. Click **Edit** on a row to change its details, use its status dropdown for a quick update, or **Delete** to remove it.

Website edits save directly to `applications.csv` in GitHub and require no sync key. Anyone who can access the website can edit the tracker. Same-origin checks prevent cross-site browser writes but are not owner authentication. Keep the deployment behind access control if owner-only access is needed. The Chrome extension still uses `INGEST_SECRET`; `GITHUB_TOKEN` stays on the server.

Edit `applications.csv` directly, or run:

```bash
python tracker.py add --company "Company" --role "2027 Summer Analyst" --url "https://..." --status Started
```

Update an existing application:

```bash
python tracker.py update --id APP-0001 --status Applied
```

Generate a readable dashboard:

```bash
python tracker.py dashboard
```

## Automatic collection
The included GitHub Action can ingest a JSON queue file and regenerate the dashboard. A browser extension or email integration can later write standardized records into the queue.

This repository does **not** silently monitor your Google/Chrome browsing history. For privacy and reliability, opened-but-unsubmitted applications should be captured intentionally (for example, with a browser-extension "Save application" button). Email confirmation parsing can be added separately with explicit Gmail authorization.

## Data model
See `applications.csv`. The unique ID prevents duplicate or ambiguous updates.

## Deployment and verification
`vercel.json` explicitly selects the Other framework so an existing Next.js preset cannot break this HTML/Node application. The build copies only the website into `public/`; the `api/` handlers run as Vercel functions. Configure `GITHUB_TOKEN` with repository contents write access. `INGEST_SECRET` is only needed for the extension.

```bash
npm test
npm run build
```
