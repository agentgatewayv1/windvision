import type { Express, Request, Response } from "express";
import type { Server } from "node:http";
import { measureRequestSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

// --- Supabase (measurement history) ----------------------------------------
// Optional: when SUPABASE_URL + SUPABASE_ANON_KEY are set, measurements are
// persisted server-side so history follows the operator across devices
// (phone, laptop). Without them the app falls back to browser localStorage.
function supaUrl(): string | null {
  const url = (process.env.SUPABASE_URL || "").trim();
  return url ? url.replace(/\/$/, "") : null;
}

function supaKey(): string | null {
  const key = (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "").trim();
  return key || null;
}

function supaConfigured(): boolean {
  return !!(supaUrl() && supaKey());
}

async function supa(
  method: string,
  path: string,
  body?: unknown,
  prefer?: string,
): Promise<{ status: number; data: unknown; error?: string }> {
  const base = supaUrl();
  const key = supaKey();
  if (!base || !key) return { status: 503, data: null, error: "Supabase is not configured" };
  try {
    const resp = await fetch(`${base}/rest/v1/${path}`, {
      method,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...(prefer ? { Prefer: prefer } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await resp.text();
    let data: unknown = null;
    if (text) {
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
    }
    if (!resp.ok) {
      const msg = (data as { message?: string })?.message || `Supabase returned ${resp.status}`;
      return { status: resp.status, data: null, error: msg };
    }
    return { status: resp.status, data };
  } catch (e) {
    return { status: 502, data: null, error: e instanceof Error ? e.message : String(e) };
  }
}

// The Python API lives outside this sandbox. Its URL and optional token are
// configured entirely by the user via runtime env vars (survives redeploys).
function apiUrl(): string | null {
  const url = (process.env.ROOFSAT_API_URL || "").trim();
  return url ? url.replace(/\/$/, "") : null;
}

function apiToken(): string | null {
  const token = (process.env.ROOFSAT_API_TOKEN || "").trim();
  return token || null;
}

async function callPython(
  path: string,
  init: RequestInit,
  timeoutMs = 60_000,
): Promise<{ status: number; body: unknown; error?: string }> {
  const base = apiUrl();
  if (!base) {
    return {
      status: 503,
      body: null,
      error:
        "Python API URL is not configured. Set ROOFSAT_API_URL to the URL of your running roofsat api server (e.g. an ngrok tunnel).",
    };
  }

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...((init.headers as Record<string, string>) || {}),
  };
  const token = apiToken();
  if (token) headers["x-api-key"] = token;

  try {
    const resp = await fetch(`${base}${path}`, {
      ...init,
      headers,
      signal: ctl.signal,
    });
    const text = await resp.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = { raw: text };
      }
    }
    return { status: resp.status, body };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("aborted") || msg.includes("AbortError")) {
      return {
        status: 504,
        body: null,
        error: `Timed out after ${timeoutMs / 1000}s waiting for the Python API at ${base}.`,
      };
    }
    return {
      status: 502,
      body: null,
      error: `Could not reach the Python API at ${base}: ${msg}`,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // --- health ---------------------------------------------------------
  app.get("/api/health", async (_req: Request, res: Response) => {
    const base = apiUrl();
    const hasToken = !!apiToken();
    if (!base) {
      return res.json({
        ok: true,
        api_url: null,
        api_reachable: false,
        api_version: null,
        api_token_configured: hasToken,
        error: "ROOFSAT_API_URL is not set on the server.",
      });
    }
    const { status, body, error } = await callPython("/health", { method: "GET" }, 5000);
    if (error) {
      return res.json({
        ok: true,
        api_url: base,
        api_reachable: false,
        api_version: null,
        api_token_configured: hasToken,
        error,
      });
    }
    const version = (body as { version?: string })?.version ?? null;
    return res.json({
      ok: true,
      api_url: base,
      api_reachable: status === 200,
      api_version: version,
      api_token_configured: hasToken,
      error: status === 200 ? null : `Python API returned ${status}`,
    });
  });

  // --- measure --------------------------------------------------------
  app.post("/api/measure", async (req: Request, res: Response) => {
    const parsed = measureRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: fromZodError(parsed.error).toString(),
      });
    }

    const {
      status,
      body,
      error,
    } = await callPython(
      "/measure",
      { method: "POST", body: JSON.stringify(parsed.data) },
      120_000, // pipeline may take 60-90s on cold caches
    );

    if (error) {
      return res.status(status || 502).json({ error });
    }
    return res.status(status).json(body);
  });

  // --- measurement history (Supabase) --------------------------------------
  // Status so the client knows whether to use server or localStorage history.
  app.get("/api/measurements/config", (_req: Request, res: Response) => {
    res.json({ configured: supaConfigured() });
  });

  // Summary list, newest first (no heavy result payloads).
  app.get("/api/measurements", async (_req: Request, res: Response) => {
    const { status, data, error } = await supa(
      "GET",
      "measurements?select=id,address,measured_area_sqft,facet_count,primary_pitch,band,combined_confidence,elapsed_seconds,created_at&order=created_at.desc&limit=50",
    );
    if (error) return res.status(status || 502).json({ error });
    return res.json(data);
  });

  // One full measurement (includes the cached pipeline result).
  app.get("/api/measurements/:id", async (req: Request, res: Response) => {
    const id = String(req.params.id);
    if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: "invalid id" });
    const { status, data, error } = await supa("GET", `measurements?id=eq.${id}&select=*`);
    if (error) return res.status(status || 502).json({ error });
    const rows = data as unknown[];
    if (!Array.isArray(rows) || rows.length === 0) return res.status(404).json({ error: "not found" });
    return res.json(rows[0]);
  });

  // Save (upsert by address: a re-measure refreshes the row).
  app.post("/api/measurements", async (req: Request, res: Response) => {
    const { address, result } = req.body || {};
    if (!address || !result) return res.status(400).json({ error: "address and result are required" });
    const m = result.measurement || {};
    const c = result.confidence || {};
    const row = {
      address: String(address),
      measured_area_sqft: m.measured_area_sqft ?? null,
      facet_count: m.facet_count ?? null,
      primary_pitch: m.primary_pitch ?? null,
      band: c.band ?? null,
      combined_confidence: c.combined_confidence ?? null,
      elapsed_seconds: result._meta?.elapsed_seconds ?? null,
      result,
      updated_at: new Date().toISOString(),
    };
    const { status, data, error } = await supa(
      "POST",
      "measurements?on_conflict=address",
      row,
      "resolution=merge-duplicates,return=representation",
    );
    if (error) return res.status(status || 502).json({ error });
    const rows = data as unknown[];
    return res.status(status).json(Array.isArray(rows) ? rows[0] : data);
  });

  app.delete("/api/measurements/:id", async (req: Request, res: Response) => {
    const id = String(req.params.id);
    if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: "invalid id" });
    const { status, error } = await supa("DELETE", `measurements?id=eq.${id}`);
    if (error) return res.status(status || 502).json({ error });
    return res.status(204).end();
  });

  // --- basemap proxy --------------------------------------------------
  app.get("/api/basemap", async (req: Request, res: Response) => {
    const path = String(req.query.path || "").trim();
    if (!path) return res.status(400).json({ error: "path is required" });

    const base = apiUrl();
    if (!base) {
      return res.status(503).json({ error: "ROOFSAT_API_URL is not set" });
    }

    const url = `${base}/basemap?path=${encodeURIComponent(path)}`;
    const headers: Record<string, string> = {};
    const token = apiToken();
    if (token) headers["x-api-key"] = token;

    try {
      const upstream = await fetch(url, { headers });
      if (!upstream.ok) {
        return res.status(upstream.status).json({ error: `upstream returned ${upstream.status}` });
      }
      const ctype = upstream.headers.get("Content-Type") || "application/octet-stream";
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.setHeader("Content-Type", ctype);
      res.setHeader("Cache-Control", "public, max-age=3600");
      return res.send(buf);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return res.status(502).json({ error: `basemap fetch failed: ${msg}` });
    }
  });

  return httpServer;
}
