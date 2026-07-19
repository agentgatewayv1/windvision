// roofsat-web thin Worker — assets fetched+cached from Supabase Storage, API routes inline
const ASSET_BASE = "https://fagwmcyebbrlnmcbtwqr.supabase.co/storage/v1/object/public/assets/";
const ASSETS = {
  js:  { key: "app.js.gz",      type: "application/javascript; charset=utf-8" },
  css: { key: "app.css.gz",     type: "text/css; charset=utf-8" },
  html:{ key: "index.html.gz",  type: "text/html; charset=utf-8" }
};
const cache = {}; // module-scope warm cache: name -> ArrayBuffer (decompressed bytes)

async function asset(name, cacheControl) {
  const a = ASSETS[name];
  if (!cache[name]) {
    const res = await fetch(ASSET_BASE + a.key);
    if (!res.ok) return new Response("asset fetch failed: " + res.status, { status: 502 });
    const ds = new DecompressionStream("gzip");
    const decompressed = new Response(res.body.pipeThrough(ds));
    cache[name] = await decompressed.arrayBuffer();
  }
  return new Response(cache[name], {
    headers: {
      "content-type": a.type,
      "cache-control": cacheControl,
      "access-control-allow-origin": "*"
    }
  });
}
function jsonRes(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", "access-control-allow-origin": "*" } });
}
function supaConfigured(env) { return !!(env.SUPABASE_URL && env.SUPABASE_ANON_KEY); }
async function supa(env, path, init = {}) {
  const h = Object.assign({
    "apikey": env.SUPABASE_ANON_KEY,
    "Authorization": "Bearer " + env.SUPABASE_ANON_KEY,
    "content-type": "application/json"
  }, init.headers || {});
  const res = await fetch(env.SUPABASE_URL + "/rest/v1/" + path, Object.assign({}, init, { headers: h }));
  const text = await res.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "GET,POST,DELETE,OPTIONS", "access-control-allow-headers": "content-type" } });
    }
    // ---------- API ----------
    if (path === "/api/health") {
      return jsonRes({ ok: true, service: "roofsat-web", version: "0.2.0", engine_configured: !!env.ROOFSAT_API_URL, supabase_configured: supaConfigured(env) });
    }
    if (path === "/api/measurements/config") return jsonRes({ configured: supaConfigured(env) });
    if (path === "/api/measurements" && request.method === "GET") {
      if (!supaConfigured(env)) return jsonRes([]);
      const r = await supa(env, "measurements?select=id,address,measured_area_sqft,facet_count,primary_pitch,band,combined_confidence,elapsed_seconds,created_at&order=created_at.desc&limit=25");
      return jsonRes(Array.isArray(r.data) ? r.data : [], r.status);
    }
    if (path === "/api/measurements" && request.method === "POST") {
      if (!supaConfigured(env)) return jsonRes({ error: "Supabase not configured" }, 503);
      const body = await request.json();
      const row = {
        address: body.address,
        measured_area_sqft: body && body.result ? body.result.measured_area_sqft ?? null : null,
        facet_count: body && body.result ? body.result.facet_count ?? null : null,
        primary_pitch: body && body.result ? body.result.primary_pitch ?? null : null,
        band: body && body.result ? body.result.band ?? null : null,
        combined_confidence: body && body.result ? body.result.combined_confidence ?? null : null,
        elapsed_seconds: body && body.result ? body.result.elapsed_seconds ?? null : null,
        result: body.result
      };
      const r = await supa(env, "measurements?on_conflict=address", { method: "POST", headers: { "Prefer": "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(row) });
      return jsonRes(Array.isArray(r.data) ? r.data[0] : r.data, r.status);
    }
    const mMatch = path.match(/^\/api\/measurements\/([^/]+)$/);
    if (mMatch && request.method === "GET") {
      if (!supaConfigured(env)) return jsonRes({ error: "Supabase not configured" }, 503);
      const r = await supa(env, "measurements?id=eq." + encodeURIComponent(mMatch[1]) + "&select=*");
      return jsonRes(Array.isArray(r.data) && r.data[0] ? r.data[0] : {}, r.status);
    }
    if (mMatch && request.method === "DELETE") {
      if (!supaConfigured(env)) return jsonRes({ error: "Supabase not configured" }, 503);
      await supa(env, "measurements?id=eq." + encodeURIComponent(mMatch[1]), { method: "DELETE" });
      return new Response(null, { status: 204, headers: { "access-control-allow-origin": "*" } });
    }
    if (path === "/api/measure" && request.method === "POST") {
      if (!env.ROOFSAT_API_URL) return jsonRes({ error: "Measuring engine not configured (ROOFSAT_API_URL missing)" }, 503);
      const body = await request.text();
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 120000);
      try {
        const res = await fetch(env.ROOFSAT_API_URL.replace(/\/$/, "") + "/measure", {
          method: "POST",
          headers: Object.assign({ "content-type": "application/json" }, env.ROOFSAT_API_TOKEN ? { "authorization": "Bearer " + env.ROOFSAT_API_TOKEN } : {}),
          body, signal: ctrl.signal
        });
        const text = await res.text();
        return new Response(text, { status: res.status, headers: { "content-type": "application/json", "access-control-allow-origin": "*" } });
      } catch (e) {
        return jsonRes({ error: "Engine request failed: " + (e && e.message ? e.message : String(e)) }, 502);
      } finally { clearTimeout(t); }
    }
    if (path === "/api/basemap") {
      if (!env.ROOFSAT_API_URL) return jsonRes({ error: "Engine not configured" }, 503);
      const res = await fetch(env.ROOFSAT_API_URL.replace(/\/$/, "") + "/basemap" + url.search, {
        headers: env.ROOFSAT_API_TOKEN ? { "authorization": "Bearer " + env.ROOFSAT_API_TOKEN } : {}
      });
      return new Response(res.body, { status: res.status, headers: { "content-type": res.headers.get("content-type") || "application/octet-stream", "access-control-allow-origin": "*" } });
    }
    // ---------- Static ----------
    if (path.startsWith("/assets/") && path.endsWith(".js")) return asset("js", "public, max-age=31536000, immutable");
    if (path.startsWith("/assets/") && path.endsWith(".css")) return asset("css", "public, max-age=31536000, immutable");
    return asset("html", "no-cache"); // SPA fallback
  }
};
