# Job Application Tracker

A private, lightweight tracker for Alicia's Summer 2027 recruiting.

## What it tracks
- Summer 2027 internships and Summer Analyst programs
- Roles intended for students graduating in 2028
- Company, role, location, category, URL, dates, status, source, notes
- Started-but-not-submitted applications that you intentionally save

Statuses: Interested, Started, Applied, Assessment, Interview, Final Round, Offer, Rejected, Withdrawn.

## Add an application
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
