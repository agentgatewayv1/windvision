import { Cloud, History, X } from "lucide-react";
import { fmtSqft } from "@/lib/pitch";

// Structural item: satisfied by both local HistoryEntry (localStorage) and
// RemoteEntry (Supabase). The panel only renders summary fields.
export interface HistoryItem {
  id: string;
  address: string;
  measured_area_sqft: number | null;
  primary_pitch: string | null;
  band: string | null;
}

function bandDot(band: string | null): string {
  const b = (band || "").toUpperCase();
  if (b === "HIGH") return "bg-confidence-high";
  if (b === "MEDIUM") return "bg-confidence-medium";
  if (b === "LOW") return "bg-confidence-low";
  return "bg-muted-foreground";
}

export function HistoryPanel({
  entries,
  remote,
  onSelect,
  onRemove,
  onClear,
}: {
  entries: HistoryItem[];
  remote?: boolean;
  onSelect: (e: HistoryItem) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  if (entries.length === 0) return null;

  return (
    <section className="rounded-xl border border-border/60 bg-card/40 p-5" data-testid="panel-history">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <History className="h-3.5 w-3.5" />
          Recent measurements
          {remote && (
            <span className="flex items-center gap-1 rounded-full border border-border/60 px-1.5 py-0.5 font-mono text-[9px] normal-case tracking-normal text-muted-foreground" title="Synced via Supabase — visible on all your devices">
              <Cloud className="h-2.5 w-2.5" />
              synced
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClear}
          className="font-mono text-[10px] text-muted-foreground hover:text-foreground"
          data-testid="button-clear-history"
        >
          clear all
        </button>
      </div>
      <ul className="mt-3 divide-y divide-border/50">
        {entries.map((e) => (
          <li key={e.id} className="group flex items-center gap-3 py-2">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${bandDot(e.band)}`} aria-hidden />
            <button
              type="button"
              onClick={() => onSelect(e)}
              className="flex flex-1 items-baseline justify-between gap-3 text-left"
              data-testid={`button-history-${e.id}`}
            >
              <span className="truncate font-mono text-xs">{e.address}</span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                {e.measured_area_sqft != null ? fmtSqft(e.measured_area_sqft) : "—"}
                {e.primary_pitch ? ` · ${e.primary_pitch}` : ""}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onRemove(e.id)}
              className="opacity-0 transition-opacity group-hover:opacity-100"
              aria-label={`Remove ${e.address}`}
              data-testid={`button-remove-${e.id}`}
            >
              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
