# Regular Works

A standalone Angular 22 frontend using Angular Material. It uses the separately deployed `RegularWorksBackend` API for task and profile data.

## Requirements

- Node.js 22.22.3 or newer (required by Angular CLI 22)
- npm

## Run locally

```sh
npm install
npm start
```

The Angular development server proxies API requests to `http://localhost:3001`. Start the backend separately from its project folder.

All profiles' task progress is cleared daily at 07:30 in the API server's local timezone. If the API is offline at that time, it clears progress when it next starts.

## Deploy to Render

Deploy this repository as a **Static Site**:

- Build command: `npm ci && npm run build`
- Publish directory: `dist/regular-works/browser`
- Environment variable: `API_BASE_URL` set to the backend service's origin, for example `https://regular-works-backend.onrender.com`

Deploy `RegularWorksBackend` as a separate **Web Service**. Set its `ALLOWED_ORIGINS` environment variable to this Static Site's origin.

The backend JSON files need persistent storage if edits must survive service restarts and redeploys. Attach a Render Persistent Disk to the backend service (for example at `/var/data`) and set `DATA_DIR=/var/data`. Without a persistent disk, the backend filesystem is ephemeral.
