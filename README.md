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

## Deploy to GitHub Pages

The `Deploy to GitHub Pages` workflow builds and publishes the app whenever changes are pushed to `main`. It is also available to run manually from the repository's **Actions** tab. The workflow attempts to enable Pages automatically. If that step fails with a permissions error, enable it once in **Settings → Pages → Build and deployment → Source → GitHub Actions**, then rerun the workflow.

The site URL is:

`https://shapartha.github.io/regular-works/`

The workflow builds with the repository subpath and publishes a `404.html` fallback so Angular routes continue to load when opened directly.

Because the API is hosted on a different origin, add `https://shapartha.github.io` to the backend's `ALLOWED_ORIGINS` environment variable in cPanel, preserving any existing allowed origins. Restart the Node.js app after changing the variable.
