import { FileText, Printer } from "lucide-react";
import type { MeasureResponse } from "@shared/schema";
import type { FacetRow } from "./FacetTable";
import { fmtNum, fmtSqft } from "@/lib/pitch";

// Print-ready measurement report. Renders inline in the Report tab and uses
// the browser's print pipeline for a clean PDF (no extra dependency).

export function ReportView({
  result,
  rows,
  adjustedTotal,
}: {
  result: MeasureResponse;
  rows: FacetRow[];
  adjustedTotal: number | null;
}) {
  const p = result.parcel;
  const m = result.measurement;
  const c = result.confidence;
  const ic = result.independent_crosscheck;
  const area = adjustedTotal ?? m?.measured_area_sqft ?? null;
  const when = new Date().toLocaleString();

  return (
    <div className="flex flex-col gap-4">
      <div className="no-print flex items-center justify-between rounded-xl border border-border/60 bg-card/40 px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          Print or save as PDF from your browser dialog.
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-md border border-border/60 bg-background px-3 py-1.5 text-sm hover-elevate"
          data-testid="button-print"
        >
          <Printer className="h-3.5 w-5" />
          Print / PDF
        </button>
      </div>

      <div className="print-page rounded-xl border border-border/60 bg-card p-8" data-testid="report-page">
        <div className="flex items-start justify-between border-b border-border/60 pb-4">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Roofsat measurement report
            </div>
            <h2 className="mt-2 text-xl font-semibold">{p?.address ?? "—"}</h2>
            {p?.lat != null && p?.lon != null && (
              <div className="mt-1 font-mono text-xs text-muted-foreground">
                {p.lat.toFixed(5)}, {p.lon.toFixed(5)} · {p.geocode_source}
              </div>
            )}
          </div>
          <div className="text-right font-mono text-xs text-muted-foreground">
            <div>{when}</div>
            {result._meta && <div>engine v{result._meta.version}</div>}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ["Roof area", area != null ? fmtSqft(area) : "—"],
            ["Squares", area != null ? fmtNum(area / 100, 2) : "—"],
            ["Facets", m?.facet_count != null ? String(m.facet_count) : "—"],
            ["Primary pitch", m?.primary_pitch ?? "—"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg border border-border/60 p-3">
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
              <div className="mt-1 font-mono text-lg font-semibold tabular-nums">{v}</div>
            </div>
          ))}
        </div>

        {adjustedTotal != null && m?.measured_area_sqft != null && (
          <div className="mt-3 font-mono text-[10px] text-muted-foreground">
            area includes manual pitch overrides · engine-measured {fmtSqft(m.measured_area_sqft)}
          </div>
        )}

        {rows.length > 0 && (
          <table className="mt-6 w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-4">Facet</th>
                <th className="py-2 pr-4 text-right">Plan sqft</th>
                <th className="py-2 pr-4">Pitch</th>
                <th className="py-2 text-right">Sloped sqft</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.facet_id} className="border-b border-border/30 last:border-0">
                  <td className="py-2 pr-4 font-mono text-xs">#{i + 1}</td>
                  <td className="py-2 pr-4 text-right font-mono text-xs tabular-nums">{fmtNum(r.planimetric_area_sqft, 0)}</td>
                  <td className="py-2 pr-4 font-mono text-xs">
                    {r.overridePitch ?? r.pitch_snapped}
                    {r.overridePitch && <span className="ml-1 text-[10px]">(override)</span>}
                  </td>
                  <td className="py-2 text-right font-mono text-xs tabular-nums">{fmtNum(r.effectiveSlopedSqft, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {c && (
            <div className="rounded-lg border border-border/60 p-3">
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Confidence</div>
              <div className="mt-1 font-mono text-sm">
                {String(c.band).toUpperCase()} · {Math.round(c.combined_confidence * 100)}%
              </div>
              <div className="mt-2 font-mono text-[10px] text-muted-foreground">
                density {Math.round((c.density_subscore ?? 0) * 100)}% · geometry {Math.round((c.geometry_subscore ?? 0) * 100)}% · crosscheck {Math.round((c.crosscheck_subscore ?? 0) * 100)}%
              </div>
            </div>
          )}
          {ic && (
            <div className="rounded-lg border border-border/60 p-3">
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Independent witness</div>
              <div className="mt-1 font-mono text-sm">{ic.status}</div>
              {ic.delta_pct != null && (
                <div className="mt-2 font-mono text-[10px] text-muted-foreground">
                  Δ {ic.delta_pct >= 0 ? "+" : ""}{ic.delta_pct.toFixed(1)}% vs Google Solar {fmtSqft(ic.solar_api_area_sqft)}
                </div>
              )}
            </div>
          )}
        </div>

        {result.flags && result.flags.length > 0 && (
          <div className="mt-4 font-mono text-[10px] text-muted-foreground">
            flags: {result.flags.join(" · ")}
          </div>
        )}

        <p className="mt-8 border-t border-border/60 pt-4 text-[10px] leading-relaxed text-muted-foreground">
          Measurement derived from USGS 3DEP LiDAR, Microsoft building footprints, and parcel data.
          Field verification is recommended before insurance submissions or material orders.
          {adjustedTotal != null && " This report contains operator pitch overrides."}
        </p>
      </div>
    </div>
  );
}
