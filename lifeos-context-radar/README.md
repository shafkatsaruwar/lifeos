# LifeOS Context Radar

This is a deliberately small Chrome/Arc extension. It recognizes only the job sites you explicitly enable and never creates a task automatically.

## Install it in Arc or Chrome

1. Open chrome://extensions in Chrome, or arc://extensions in Arc.
2. Turn on Developer mode.
3. Click Load unpacked.
4. Select the lifeos-context-radar folder.
5. Pin LifeOS Context Radar to your browser toolbar.

For local web testing, open the extension, expand Settings, and change the LifeOS URL to your local Next.js address (usually `http://localhost:3000`).

## How it works

1. Open an approved job-site or Coursera page: LinkedIn, Indeed, Handshake, Greenhouse, Lever, or Coursera.
2. Click the extension.
3. It asks whether you want to open a Career activity in LifeOS.
4. LifeOS asks once more before starting the activity.

The extension does not read form fields, passwords, emails, job application answers, or course work. It only recognizes the hostname and current page title, locally in your browser.
