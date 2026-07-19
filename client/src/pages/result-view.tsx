import { useEffect, useState } from "react";
import { AlertCircle, ImageOff, MapPin, Ruler, Satellite, ShieldCheck, Footprints } from "lucide-react";
import type { MeasureResponse } from "@shared/schema";
import { FacetTable, useFacetRows } from "@/components/FacetTable";
import { QuoteCalculator } from "@/components/QuoteCalculator";
import { ReportView } from "@/components/ReportView";
import { fmtNum, fmtSqft } from "@/lib/pitch";

// --- helpers --------------------------------------------------------------

function fmtPct(v: number | null | undefined, digits = 0): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `${(v * 100).toFixed(digits)}%`;
}

function fmtSignedPct(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "—";
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
}

function bandColorClass(band?: string): string {
  const b = (band || "").toUpperCase();
  if (b === "HIGH") return "text-confidence-high border-confidence-high/40 bg-confidence-high/10";
  if (b === "MEDIUM") return "text-confidence-medium border-confidence-medium/40 bg-confidence-medium/10";
  if (b === "LOW") return "text-confidence-low border-confidence-low/40 bg-confidence-low/10";
  return "text-muted-foreground border-border bg-muted/40";
}

// --- basemap tile ---------------------------------------------------------

function projectToTile(
  lat: number,
  lon: number,
  centerLat: number,
  centerLon: number,
  halfDeg: number,
): { xPct: number; yPct: number } {
  const cosLat = Math.cos((centerLat * Math.PI) / 180);
  const xPct = 50 + (((lon - centerLon) * cosLat) / (2 * halfDeg)) * 100;
  const yPct = 50 - ((lat - centerLat) / (2 * halfDeg)) * 100;
  return { xPct, yPct };
}

function footprintRings(
  geom: unknown,
  centerLat: number,
  centerLon: number,
  halfDeg: number,
): string[] {
  const g = geom as { type?: string; coordinates?: unknown } | null;
  if (!g || !g.coordinates) return [];
  const polys: number[][][][] =
    g.type === "Polygon"
      ? [g.coordinates as number[][][]]
      : g.type === "MultiPolygon"
        ? (g.coordinates as number[][][][])
        : [];
  return polys
    .map((rings) => rings[0] ?? [])
    .filter((ring) => ring.length >= 3)
    .map((ring) =>
      ring
        .map(([lonPt, latPt]) => {
          const { xPct, yPct } = projectToTile(latPt, lonPt, centerLat, centerLon, halfDeg);
          return `${xPct.toFixed(2)},${yPct.toFixed(2)}`;
        })
        .join(" "),
    );
}

function tileToLatLon(
  xFrac: number,
  yFrac: number,
  centerLat: number,
  centerLon: number,
  halfDeg: number,
): { lat: number; lon: number } {
  const cosLat = Math.cos((centerLat * Math.PI) / 180);
  const lon = centerLon + ((xFrac - 0.5) * 2 * halfDeg) / cosLat;
  const lat = centerLat - (yFrac - 0.5) * 2 * halfDeg;
  return { lat, lon };
}

function BasemapTile({
  path,
  source,
  imageryDate,
  centerLat,
  centerLon,
  halfDeg,
  footprint,
  userPin,
  onPickRoof,
  rePicking,
  pinIgnored,
}: {
  path: string;
  source: string;
  imageryDate?: string | null;
  centerLat?: number | null;
  centerLon?: number | null;
  halfDeg?: number | null;
  footprint?: unknown;
  userPin?: [number, number] | null;
  onPickRoof?: (lat: number, lon: number) => void;
  rePicking?: boolean;
  pinIgnored?: boolean;
}) {
  const [errored, setErrored] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const url = `/api/basemap?path=${encodeURIComponent(path)}`;
  const isTiff = path.toLowerCase().endsWith(".tif") || path.toLowerCase().endsWith(".tiff");

  const pickable =
    loaded && !errored && !rePicking &&
    onPickRoof != null && centerLat != null && centerLon != null && halfDeg != null;

  const handlePick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pickable) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xFrac = (e.clientX - rect.left) / rect.width;
    const yFrac = (e.clientY - rect.top) / rect.height;
    const { lat, lon } = tileToLatLon(xFrac, yFrac, centerLat!, centerLon!, halfDeg!);
    onPickRoof!(lat, lon);
  };

  useEffect(() => {
    setErrored(false);
    setLoaded(false);
  }, [path]);

  return (
    <div
      className={`relative aspect-square overflow-hidden rounded-xl border border-border/60 bg-noise bg-card/40 ${pickable ? "cursor-crosshair" : ""}`}
      onClick={handlePick}
      title={pickable ? "Click a roof to re-measure that building" : undefined}
      data-testid="tile-basemap"
    >
      {isTiff ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
          <Satellite className="h-8 w-8 text-primary" />
          <div className="text-sm">
            <div className="font-medium">GeoTIFF basemap fetched</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Browser can't render TIFF directly. Download to view in QGIS.
            </div>
          </div>
          <a
            href={url}
            className="rounded-md border border-border/60 bg-background/80 px-3 py-1.5 text-xs font-mono hover-elevate"
            download
            data-testid="link-basemap-download"
          >
            download .tif
          </a>
        </div>
      ) : errored ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <ImageOff className="h-8 w-8" />
          <div className="text-xs">Basemap tile could not be loaded.</div>
        </div>
      ) : (
        <>
          {!loaded && (
            <div className="absolute inset-0 animate-pulse bg-noise" aria-hidden />
          )}
          <img
            src={url}
            alt={`Basemap tile from ${source}`}
            className="h-full w-full object-cover"
            data-testid="img-basemap"
            onLoad={() => setLoaded(true)}
            onError={() => setErrored(true)}
          />
          {loaded && (
            <>
              {centerLat != null && centerLon != null && halfDeg != null && footprint != null && (
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden
                  data-testid="overlay-footprint"
                >
                  {footprintRings(footprint, centerLat, centerLon, halfDeg).map((pts, i) => (
                    <polygon
                      key={i}
                      points={pts}
                      fill="hsl(var(--primary) / 0.12)"
                      stroke="hsl(var(--primary))"
                      strokeWidth="0.6"
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </svg>
              )}
              <div
                className="pointer-events-none absolute left-1/2 top-1/2"
                aria-hidden
                data-testid="marker-pin"
              >
                <span className="absolute block h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-white/90" />
                <MapPin
                  className="absolute h-9 w-9 -translate-x-1/2 -translate-y-[94%] text-primary drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
                  strokeWidth={2.25}
                />
              </div>
              {userPin != null && centerLat != null && centerLon != null && halfDeg != null && (() => {
                const { xPct, yPct } = projectToTile(userPin[0], userPin[1], centerLat, centerLon, halfDeg);
                return (
                  <div
                    className="pointer-events-none absolute"
                    style={{ left: `${xPct}%`, top: `${yPct}%` }}
                    aria-hidden
                    data-testid="marker-user-pin"
                  >
                    <span className="absolute block h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400 ring-2 ring-black/60" />
                  </div>
                );
              })()}
              {rePicking && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[1px]">
                  <div className="rounded-md border border-border/60 bg-background/90 px-3 py-1.5 font-mono text-xs">
                    re-measuring at your pick…
                  </div>
                </div>
              )}
              <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border/60 bg-background/85 px-2 py-1 text-center font-mono text-[10px] text-muted-foreground backdrop-blur-sm">
                {pinIgnored && (
                  <div className="text-amber-500" data-testid="text-pin-ignored">
                    no building found at your pick — kept the original roof
                  </div>
                )}
                <div>pin = geocoded point · outline = measured roof</div>
                {pickable && <div>wrong roof? click the correct one to re-measure</div>}
              </div>
            </>
          )}
        </>
      )}

      <div className="absolute left-3 top-3 rounded-md border border-border/60 bg-background/85 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
        {source.replace(/_/g, " ")}
      </div>
      {imageryDate && (
        <div className="absolute right-3 top-3 rounded-md border border-border/60 bg-background/85 px-2 py-1 font-mono text-[10px] text-muted-foreground backdrop-blur-sm">
          {imageryDate}
        </div>
      )}
    </div>
  );
}

// --- stat card ------------------------------------------------------------

function Stat({
  label,
  value,
  detail,
  icon: Icon,
  testId,
}: {
  label: string;
  value: string;
  detail?: string;
  icon: React.ComponentType<{ className?: string }>;
  testId: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 font-mono text-xl font-semibold tabular-nums" data-testid={testId}>
        {value}
      </div>
      {detail && <div className="mt-1 text-xs text-muted-foreground">{detail}</div>}
    </div>
  );
}

// --- tabs -----------------------------------------------------------------

type Tab = "overview" | "facets" | "quote" | "report";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "facets", label: "Facets" },
  { id: "quote", label: "Quote" },
  { id: "report", label: "Report" },
];

// --- main -----------------------------------------------------------------

export function ResultView({
  result,
  onPickRoof,
  userPin,
  rePicking,
}: {
  result: MeasureResponse;
  onPickRoof?: (lat: number, lon: number) => void;
  userPin?: [number, number] | null;
  rePicking?: boolean;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const { rows, adjusted, totalSloped, setPitch, reset } = useFacetRows(result.facets);

  // Coverage no-go short-circuit
  if (result.precheck && result.precheck.go_no_go === "no_go" && !result.parcel) {
    return (
      <div className="rounded-xl border border-confidence-medium/40 bg-confidence-medium/5 p-6" data-testid="text-no-go">
        <div className="flex items-center gap-2 font-medium text-confidence-medium">
          <AlertCircle className="h-4 w-4" />
          Roof cannot be measured
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          The precheck stage returned no_go — usually no LiDAR coverage, no
          usable footprint, or an ambiguous parcel. Try a nearby address or a
          property with recent PA LiDAR data.
        </p>
        {result.precheck.reasons && (
          <ul className="mt-3 list-inside list-disc font-mono text-xs text-muted-foreground">
            {result.precheck.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const m = result.measurement;
  const c = result.confidence;
  const ic = result.independent_crosscheck;
  const bm = result.basemap;
  const p = result.parcel;
  const meta = result._meta;

  const displayArea = adjusted ? totalSloped : m?.measured_area_sqft;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Result
          </div>
          <h2 className="mt-1 font-mono text-lg font-semibold" data-testid="text-result-address">
            {p?.address || "—"}
          </h2>
          {p?.lat != null && p?.lon != null && (
            <div className="mt-1 font-mono text-xs text-muted-foreground">
              {p.lat.toFixed(5)}, {p.lon.toFixed(5)}
            </div>
          )}
        </div>
        {meta && (
          <div className="font-mono text-xs text-muted-foreground">
            {meta.elapsed_seconds.toFixed(1)}s · {meta.result_type}
          </div>
        )}
      </div>

      {result.degraded && (
        <div className="rounded-lg border border-confidence-medium/40 bg-confidence-medium/5 p-3 text-sm">
          <span className="font-medium text-confidence-medium">Degraded result:</span>{" "}
          <span className="font-mono text-xs">{result.degraded}</span>
        </div>
      )}

      {/* Tab bar */}
      <div className="no-print flex gap-1 rounded-lg border border-border/60 bg-card/40 p-1" data-testid="tabs-result">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            data-testid={`tab-${t.id}`}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm transition-colors ${
              tab === t.id
                ? "bg-background font-medium text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {t.id === "facets" && rows.length > 0 && (
              <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">{rows.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Basemap */}
          <div className="lg:col-span-3">
            {bm ? (
              <BasemapTile
                path={bm.path}
                source={bm.source}
                imageryDate={bm.imagery_date}
                centerLat={p?.lat}
                centerLon={p?.lon}
                halfDeg={bm.half_deg}
                footprint={p?.footprint_polygon}
                userPin={userPin}
                onPickRoof={onPickRoof}
                rePicking={rePicking}
                pinIgnored={
                  userPin != null &&
                  !!p?.footprint_source &&
                  !p.footprint_source.includes("+user_pin")
                }
              />
            ) : (
              <div className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border border-border/60 bg-card/40 text-muted-foreground">
                <ImageOff className="h-8 w-8" />
                <div className="text-xs">No basemap tile available.</div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 lg:col-span-2">
            <Stat
              icon={Ruler}
              label={adjusted ? "Measured area (adjusted)" : "Measured area"}
              value={fmtSqft(displayArea)}
              detail={
                [
                  m?.facet_count != null ? `${m.facet_count} facets` : null,
                  m?.primary_pitch ? `primary ${m.primary_pitch}` : null,
                  adjusted && m?.measured_area_sqft != null
                    ? `engine ${fmtSqft(m.measured_area_sqft)}`
                    : null,
                ].filter(Boolean).join(" · ") || undefined
              }
              testId="text-measured-area"
            />

            {m?.perimeter_ft != null && (
              <Stat
                icon={Footprints}
                label="Eave perimeter"
                value={`${fmtNum(m.perimeter_ft, 0)} ft`}
                detail={result.area_source ? `area source: ${result.area_source}` : undefined}
                testId="text-perimeter"
              />
            )}

            {c && (
              <div className={`rounded-xl border p-4 ${bandColorClass(c.band)}`} data-testid="card-confidence">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Confidence
                </div>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="font-mono text-xl font-semibold tabular-nums" data-testid="text-confidence-band">
                    {String(c.band).toUpperCase()}
                  </span>
                  <span className="font-mono text-sm text-muted-foreground">
                    {fmtPct(c.combined_confidence, 0)}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-muted-foreground">density</div>
                    <div className="font-mono tabular-nums">{fmtPct(c.density_subscore)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">geometry</div>
                    <div className="font-mono tabular-nums">{fmtPct(c.geometry_subscore)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">crosscheck</div>
                    <div className="font-mono tabular-nums">{fmtPct(c.crosscheck_subscore)}</div>
                  </div>
                </div>
              </div>
            )}

            {ic && (
              <Stat
                icon={Satellite}
                label="Independent witness"
                value={ic.status}
                detail={
                  ic.delta_pct != null
                    ? `Δ ${fmtSignedPct(ic.delta_pct)} vs ${fmtSqft(ic.solar_api_area_sqft)}` +
                      (ic.solar_imagery_date ? ` · ${ic.solar_imagery_date} imagery` : "") +
                      (ic.reason === "imagery_quality_medium" ? " (medium quality)" : "")
                    : "Google Solar API — no data"
                }
                testId="text-independent-crosscheck"
              />
            )}

            {p && (
              <Stat
                icon={MapPin}
                label="Footprint"
                value={fmtSqft(p.footprint_area_sqft) || "—"}
                detail={[p.landuse, p.footprint_source].filter(Boolean).join(" · ")}
                testId="text-parcel"
              />
            )}
          </div>
        </div>
      )}

      {tab === "facets" && (
        <FacetTable rows={rows} adjusted={adjusted} onSetPitch={setPitch} onReset={reset} />
      )}

      {tab === "quote" && (
        displayArea != null ? (
          <QuoteCalculator slopedAreaSqft={displayArea} />
        ) : (
          <div className="rounded-xl border border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
            No measured area in this result to quote from.
          </div>
        )
      )}

      {tab === "report" && (
        <ReportView result={result} rows={rows} adjustedTotal={adjusted ? totalSloped : null} />
      )}

      {result.flags && result.flags.length > 0 && (
        <div className="rounded-lg border border-border/60 bg-card/40 p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Flags</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {result.flags.map((f) => (
              <span key={f} className="rounded-md border border-border/60 bg-background/70 px-2 py-1 font-mono text-xs">
                {f}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
