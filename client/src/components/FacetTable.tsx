import { useMemo, useState } from "react";
import { Layers, RotateCcw } from "lucide-react";
import type { Facet } from "@shared/schema";
import { STANDARD_PITCHES, pitchMultiplier, fmtNum } from "@/lib/pitch";

// Facet breakdown with per-facet pitch override. Overrides are an operator
// correction layer: they re-slope the facet's measured planimetric area
// client-side and clearly mark the total as adjusted — the engine's fitted
// values are never hidden.

export interface FacetRow extends Facet {
  overridePitch: string | null;
  effectiveMultiplier: number;
  effectiveSlopedSqft: number;
}

export function useFacetRows(facets: Facet[] | null | undefined) {
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  const rows: FacetRow[] = useMemo(() => {
    return (facets ?? []).map((f) => {
      const overridePitch = overrides[f.facet_id] ?? null;
      const mult = overridePitch ? pitchMultiplier(overridePitch) : f.pitch_multiplier;
      return {
        ...f,
        overridePitch,
        effectiveMultiplier: mult,
        effectiveSlopedSqft: f.planimetric_area_sqft * mult,
      };
    });
  }, [facets, overrides]);

  const adjusted = Object.keys(overrides).length > 0;
  const totalSloped = rows.reduce((s, r) => s + r.effectiveSlopedSqft, 0);
  const totalPlan = rows.reduce((s, r) => s + r.planimetric_area_sqft, 0);

  return {
    rows,
    adjusted,
    totalSloped,
    totalPlan,
    setPitch: (id: string, pitch: string | null) =>
      setOverrides((o) => {
        const next = { ...o };
        if (pitch == null) delete next[id];
        else next[id] = pitch;
        return next;
      }),
    reset: () => setOverrides({}),
  };
}

function rmseClass(rmse: number | undefined): string {
  if (rmse == null) return "text-muted-foreground";
  if (rmse < 0.05) return "text-confidence-high";
  if (rmse < 0.1) return "text-confidence-medium";
  return "text-confidence-low";
}

export function FacetTable({
  rows,
  adjusted,
  onSetPitch,
  onReset,
}: {
  rows: FacetRow[];
  adjusted: boolean;
  onSetPitch: (id: string, pitch: string | null) => void;
  onReset: () => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
        No facet breakdown in this result (run reached an early pipeline stage).
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card/40" data-testid="table-facets">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <Layers className="h-3.5 w-3.5" />
          Facet breakdown · {rows.length} planes
        </div>
        {adjusted && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-foreground"
            data-testid="button-reset-pitches"
          >
            <RotateCcw className="h-3 w-3" />
            reset overrides
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2">Facet</th>
              <th className="px-4 py-2 text-right">Plan area</th>
              <th className="px-4 py-2">Pitch (fitted)</th>
              <th className="px-4 py-2">Override</th>
              <th className="px-4 py-2 text-right">Slope °</th>
              <th className="px-4 py-2 text-right">RMSE m</th>
              <th className="px-4 py-2 text-right">Sloped area</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.facet_id}
                className={`border-b border-border/30 last:border-0 ${r.overridePitch ? "bg-primary/5" : ""}`}
                data-testid={`row-facet-${i}`}
              >
                <td className="px-4 py-2 font-mono text-xs">#{i + 1}</td>
                <td className="px-4 py-2 text-right font-mono text-xs tabular-nums">
                  {fmtNum(r.planimetric_area_sqft, 0)}
                </td>
                <td className="px-4 py-2 font-mono text-xs">
                  {r.pitch_snapped}
                  {r.snap_distance_deg != null && (
                    <span className="ml-1 text-[10px] text-muted-foreground">
                      Δ{r.snap_distance_deg.toFixed(1)}°
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <select
                    value={r.overridePitch ?? ""}
                    onChange={(e) => onSetPitch(r.facet_id, e.target.value || null)}
                    className="h-7 rounded-md border border-border/60 bg-background px-1.5 font-mono text-xs"
                    data-testid={`select-pitch-${i}`}
                  >
                    <option value="">fitted</option>
                    {STANDARD_PITCHES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2 text-right font-mono text-xs tabular-nums">
                  {r.pitch_continuous_deg != null ? r.pitch_continuous_deg.toFixed(1) : "—"}
                </td>
                <td className={`px-4 py-2 text-right font-mono text-xs tabular-nums ${rmseClass(r.plane_rmse)}`}>
                  {r.plane_rmse != null ? r.plane_rmse.toFixed(3) : "—"}
                </td>
                <td className="px-4 py-2 text-right font-mono text-xs font-medium tabular-nums">
                  {fmtNum(r.effectiveSlopedSqft, 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {adjusted && (
        <div className="border-t border-primary/30 bg-primary/5 px-4 py-2 font-mono text-[10px] text-muted-foreground">
          totals reflect manual pitch overrides — engine-fitted values shown as “fitted”
        </div>
      )}
    </div>
  );
}
