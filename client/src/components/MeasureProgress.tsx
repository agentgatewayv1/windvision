import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

// Staged progress indicator for the 30-90s pipeline run. The Python API is
// synchronous, so stages advance on a timer tuned to typical stage costs —
// honest labeling, approximate timing.
const STAGES: { label: string; detail: string; at: number }[] = [
  { label: "Precheck", detail: "geocode + LiDAR coverage", at: 0 },
  { label: "Parcel", detail: "Regrid parcel + footprint", at: 4 },
  { label: "Point cloud", detail: "3DEP LiDAR clip", at: 12 },
  { label: "Facets", detail: "RANSAC plane peel + pitch", at: 30 },
  { label: "Cross-check", detail: "footprint + Solar witness", at: 55 },
  { label: "Confidence", detail: "scoring + band", at: 70 },
];

export function MeasureProgress() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => setElapsed((Date.now() - t0) / 1000), 250);
    return () => clearInterval(id);
  }, []);

  const activeIdx = STAGES.reduce((acc, s, i) => (elapsed >= s.at ? i : acc), 0);

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-5" data-testid="card-progress">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Measuring
        </div>
        <div className="font-mono text-xs text-muted-foreground tabular-nums">
          {elapsed.toFixed(1)}s
        </div>
      </div>
      <ol className="mt-4 space-y-3">
        {STAGES.map((s, i) => {
          const done = i < activeIdx;
          const active = i === activeIdx;
          return (
            <li key={s.label} className="flex items-center gap-3">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-mono ${
                  done
                    ? "border-confidence-high/50 bg-confidence-high/15 text-confidence-high"
                    : active
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border/60 text-muted-foreground"
                }`}
              >
                {done ? (
                  <Check className="h-3 w-3" />
                ) : active ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  i + 1
                )}
              </span>
              <div className="flex flex-1 items-baseline justify-between gap-2">
                <span className={`text-sm ${active ? "text-foreground" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">{s.detail}</span>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-xs text-muted-foreground">
        Cold runs take 60–90s while LiDAR tiles download; cached addresses
        return in a few seconds.
      </p>
    </div>
  );
}
