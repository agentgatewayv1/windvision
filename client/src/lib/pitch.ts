// Pitch math shared by the facet editor and quote calculator.
// Mirrors roofsat/geometry/pitch.py: multiplier = sqrt(r^2 + run^2) / run.

export const STANDARD_PITCHES = [
  "0:12", "1:12", "2:12", "3:12", "4:12", "5:12", "6:12",
  "7:12", "8:12", "9:12", "10:12", "12:12", "14:12", "16:12", "18:12",
] as const;

export function pitchMultiplier(pitch: string): number {
  const [r, run] = pitch.split(":").map(Number);
  if (!run) return 1;
  return Math.sqrt(r * r + run * run) / run;
}

// Recompute a facet's sloped area when the operator overrides the snapped pitch.
export function reslopeFacet(planSqft: number, pitch: string): number {
  return planSqft * pitchMultiplier(pitch);
}

export function fmtSqft(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "—";
  return Math.round(v).toLocaleString() + " sqft";
}

export function fmtNum(v: number | null | undefined, digits = 1): string {
  if (v == null || Number.isNaN(v)) return "—";
  return v.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtMoney(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "—";
  return v.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
