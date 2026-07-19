# Roofsat webapp

Web frontend for the Roofsat roof measurement pipeline. Talks to the Python API at [agentgatewayv1/roofsat](https://github.com/agentgatewayv1/roofsat).

## Stack

- Express + Vite dev server (single port)
- React + Tailwind CSS + shadcn/ui
- Wouter router with hash routing
- Server-side proxy to Python measurement API

## Running locally

Requires the Python API from `agentgatewayv1/roofsat` to be running on `http://127.0.0.1:8787`.

```bash
npm install
ROOFSAT_API_URL=http://127.0.0.1:8787 \
ROOFSAT_API_TOKEN=<your token> \
  npm run dev
```

Then open http://localhost:5000 (or set `PORT=3001` if macOS AirPlay Receiver has port 5000).

## Environment

- `ROOFSAT_API_URL` — Python API base URL
- `ROOFSAT_API_TOKEN` — optional shared secret, sent as `x-api-key`
- `PORT` — override the default 5000
