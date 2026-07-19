import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { fmtMoney, fmtNum } from "@/lib/pitch";

// Quote calculator: turns a (possibly pitch-adjusted) sloped area into
// squares, waste-adjusted material quantities, and a price estimate.
// 1 square = 100 sqft. 3 bundles of shingles per square.

const WASTE_OPTIONS = [
  { value: 10, label: "10% — simple gable" },
  { value: 12, label: "12% — average" },
  { value: 15, label: "15% — complex / hip" },
  { value: 18, label: "18% — cut-up, many facets" },
];

export function QuoteCalculator({ slopedAreaSqft }: { slopedAreaSqft: number }) {
  const [wastePct, setWastePct] = useState(12);
  const [pricePerSquare, setPricePerSquare] = useState(450);
  const [tearOff, setTearOff] = useState(true);

  const q = useMemo(() => {
    const squares = slopedAreaSqft / 100;
    const squaresWaste = squares * (1 + wastePct / 100);
    const bundles = Math.ceil(squaresWaste * 3);
    const underlaymentRolls = Math.ceil(squaresWaste / 4); // 4 sq per roll
    const tearOffCost = tearOff ? squares * 100 : 0; // ~$100/sq tear-off
    const installCost = squaresWaste * pricePerSquare;
    return {
      squares,
      squaresWaste,
      bundles,
      underlaymentRolls,
      tearOffCost,
      installCost,
      total: installCost + tearOffCost,
    };
  }, [slopedAreaSqft, wastePct, pricePerSquare, tearOff]);

  return (
    <div className="rounded-xl border border-border/60 bg-card/40" data-testid="card-quote">
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
        <Calculator className="h-3.5 w-3.5" />
        Quote calculator
      </div>
      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Waste factor
          <select
            value={wastePct}
            onChange={(e) => setWastePct(Number(e.target.value))}
            className="h-9 rounded-md border border-border/60 bg-background px-2 font-mono text-xs text-foreground"
            data-testid="select-waste"
          >
            {WASTE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Install price / square
          <input
            type="number"
            min={0}
            step={10}
            value={pricePerSquare}
            onChange={(e) => setPricePerSquare(Number(e.target.value) || 0)}
            className="h-9 rounded-md border border-border/60 bg-background px-2 font-mono text-xs"
            data-testid="input-price"
          />
        </label>
        <label className="flex items-end gap-2 pb-1 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={tearOff}
            onChange={(e) => setTearOff(e.target.checked)}
            className="h-4 w-4 accent-[hsl(var(--primary))]"
            data-testid="checkbox-tearoff"
          />
          include tear-off (~$100/sq)
        </label>
      </div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-b-xl border-t border-border/50 bg-border/40 sm:grid-cols-4">
        {[
          ["Squares (net)", fmtNum(q.squares, 2)],
          [`Squares +${wastePct}%`, fmtNum(q.squaresWaste, 2)],
          ["Shingle bundles", String(q.bundles)],
          ["Underlayment rolls", String(q.underlaymentRolls)],
        ].map(([k, v]) => (
          <div key={k} className="bg-card px-4 py-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
            <div className="mt-1 font-mono text-lg font-semibold tabular-nums" data-testid={`text-quote-${k}`}>{v}</div>
          </div>
        ))}
      </div>
      <div className="flex items-baseline justify-between border-t border-border/50 px-4 py-3">
        <span className="text-xs text-muted-foreground">
          {tearOff ? `install ${fmtMoney(q.installCost)} + tear-off ${fmtMoney(q.tearOffCost)}` : "install only"}
        </span>
        <span className="font-mono text-xl font-semibold tabular-nums" data-testid="text-quote-total">
          {fmtMoney(q.total)}
        </span>
      </div>
    </div>
  );
}
