# Regular Works

A standalone Angular 22 application using Angular Material. Daily checklist items and per-profile completion progress are persisted by a small Node.js API in separate JSON files under `server/data/`.

## Requirements

- Node.js 22.22.3 or newer (required by Angular CLI 22)
- npm

## Run locally

```sh
npm install
npm start
```

`npm start` runs the JSON-backed API and Angular development server together. Open the local URL printed by Angular CLI. The dev server proxies `/api` requests to the local API.

All profiles' task progress is cleared daily at 07:30 in the API server's local timezone. If the API is offline at that time, it clears progress when it next starts.

Create a production build with `npm run build`. When hosting the built frontend, also run the API and configure the host to proxy `/api` requests to it.
