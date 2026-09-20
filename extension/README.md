# Browser capture extension

This Chrome extension recognizes likely job/application pages and lets you save the current role as **Started**.

## Install
1. Download/clone this repository.
2. In Chrome, open `chrome://extensions`.
3. Turn on Developer mode.
4. Choose **Load unpacked** and select the `extension` folder.

## Use
When you are on a job page, click the extension. Confirm the detected company/role/location and click **Save as Started**.

The extension deliberately does **not** collect general browser history. Saved jobs remain in Chrome local storage until you export them.

Click **Export saved jobs for GitHub** to create `inbox.json`. Replace the repository's root `inbox.json` with that file and run the tracker workflow; the Python ingester adds new records and deduplicates them.

## Next phase
Automatic GitHub upload requires an authenticated bridge. Do not put a GitHub personal access token in extension source code. Automatic Gmail confirmation detection likewise requires explicit Gmail authorization. Those integrations should be added through a secure backend/OAuth flow.
