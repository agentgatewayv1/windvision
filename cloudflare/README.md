# Cloudflare deployment

roofsat-web is deployed as a single thin Cloudflare Worker (`worker.js`).

## Architecture

- **Frontend assets** are gzipped and hosted in Supabase Storage (public bucket `assets`):
  `app.js.gz`, `app.css.gz`, `index.html.gz`.
- The Worker fetches each asset once, gunzips it with `DecompressionStream`, and caches it in
  module scope. Cloudflare handles client-facing compression automatically.
- **API routes** are inline in the Worker:
  - `GET /api/health` — status incl. engine + Supabase config flags
  - `POST /api/measure` — proxies to the Python engine (`ROOFSAT_API_URL` / `ROOFSAT_API_TOKEN`), 120s timeout
  - `GET /api/basemap` — proxies engine basemap imagery
  - `GET/POST /api/measurements`, `GET/DELETE /api/measurements/:id` — Supabase PostgREST CRUD
- SPA fallback: every non-API, non-asset route serves `index.html`.

## Bindings (Worker environment variables)

| Name | Type | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | plain_text | Supabase project URL |
| `SUPABASE_ANON_KEY` | secret_text | publishable key (server-side only) |
| `ROOFSAT_API_URL` | plain_text | public URL of the Python engine (set when tunnel is up) |
| `ROOFSAT_API_TOKEN` | secret_text | engine bearer token |

## Redeploy

1. `npm run build`
2. `gzip -9` the files in `dist/public` → upload as `app.js.gz`, `app.css.gz`, `index.html.gz`
   to the Supabase `assets` bucket (x-upsert).
3. Only redeploy `worker.js` if the Worker code itself changed (asset keys are stable).
