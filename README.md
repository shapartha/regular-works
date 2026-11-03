# Regular Works

A standalone Angular 22 application using Angular Material. Daily checklist items and per-profile completion progress are persisted by a small Node.js API in separate JSON files under `server/data/`.

## Requirements

- Node.js 22.22.3 or newer (required by Angular CLI 22)
- npm

## Run locally

```sh
npm install
npm run start:dev
```

`npm run start:dev` runs the JSON-backed API and Angular development server together. Open the local URL printed by Angular CLI. The dev server proxies `/api` requests to the local API.

All profiles' task progress is cleared daily at 07:30 in the API server's local timezone. If the API is offline at that time, it clears progress when it next starts.

## Deploy to Render

Create a **Web Service** from this repository and configure:

- Build command: `npm ci && npm run build`
- Start command: `npm start`

The build produces the Angular app, and the single Node.js process serves both the app and `/api` routes. Render provides the `PORT` environment variable; the server binds to all interfaces.

The JSON files need persistent storage if edits must survive service restarts and redeploys. Attach a Render Persistent Disk (for example at `/var/data`) and set the service environment variable `DATA_DIR` to that mount path. Without a persistent disk, a Render free service's filesystem is ephemeral.
