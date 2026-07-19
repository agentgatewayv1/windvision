import { Ruler, Satellite, Layers, ShieldCheck, Database, GitBranch } from "lucide-react";

const STAGES: {
  n: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  body: string;
}[] = [
  {
    n: "01",
    name: "Precheck",
    icon: Database,
    body:
      "Geocode the address, resolve the parcel from Regrid, pull the building footprint from Microsoft ML Buildings or the county assessor, and verify LiDAR + orthophoto coverage before spending compute.",
  },
  {
    n: "02",
    name: "Basemap",
    icon: Satellite,
    body:
      "Fetch the highest-resolution basemap available for the parcel: PASDA 2024 Lancaster ortho, NAIP 2022 for the rest of PA, or a Google Solar RGB tile as a nationwide fallback.",
  },
  {
    n: "03",
    name: "Segment",
    icon: Layers,
    body:
      "Rasterize LiDAR returns clipped to the footprint, fit facet planes, and reconstruct the roof geometry. No inference is scored as measurement — geometry comes before calibration.",
  },
  {
    n: "04",
    name: "Measure",
    icon: Ruler,
    body:
      "Compute per-facet area in square feet with pitch corrections, then sum to a whole-roof estimate. Report facet count and per-facet breakdown alongside the total.",
  },
  {
    n: "05",
    name: "Confidence",
    icon: ShieldCheck,
    body:
      "Score the measurement on three axes — point density, geometric fit, and independent crosscheck against Google Solar — then combine into a HIGH / MEDIUM / LOW band. Estimates never masquerade as ground truth.",
  },
];

export default function AboutPage() {
  return (
    <div className="flex flex-col gap-10">
      <section className="max-w-3xl">
        <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          About
        </div>
        <h1 className="mt-2 text-xl font-semibold leading-tight tracking-tight" data-testid="text-about-title">
          Honest roof measurements from public geospatial data.
        </h1>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          Roofsat combines LiDAR point clouds, parcel boundaries, and satellite
          imagery into a single measurement pipeline. Every result carries a
          confidence score so downstream systems know when to trust the number
          and when to escalate to a field crew.
        </p>
      </section>

      <section>
        <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Pipeline
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {STAGES.map((s) => (
            <div
              key={s.n}
              data-testid={`card-stage-${s.n}`}
              className="rounded-xl border border-border/60 bg-card/40 p-5"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-muted-foreground">{s.n}</span>
                <s.icon className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{s.name}</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Data sources
        </div>
        <ul className="mt-4 grid grid-cols-1 gap-3 font-mono text-sm sm:grid-cols-2">
          {[
            ["PA LiDAR", "PASDA / USGS 3DEP point clouds"],
            ["Parcels", "Regrid nationwide parcel API"],
            ["Footprints", "Microsoft ML Buildings + assessor data"],
            ["Basemap", "PASDA 2024 · NAIP 2022 · Google Solar RGB"],
            ["Crosscheck", "Google Solar API — independent witness"],
            ["Geocoding", "Nominatim → Regrid fallback"],
          ].map(([k, v]) => (
            <li
              key={k}
              className="flex items-baseline justify-between gap-3 rounded-lg border border-border/60 bg-card/40 px-3 py-2"
            >
              <span className="text-foreground">{k}</span>
              <span className="text-xs text-muted-foreground">{v}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-border/60 bg-card/40 p-5">
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
          <GitBranch className="h-3 w-3" />
          Design principles
        </div>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>Geometry before calibration. Never rescale toward a target.</li>
          <li>Inference is never scored as measurement.</li>
          <li>Every number ships with a confidence band and an independent witness when one exists.</li>
          <li>No scraping of MLS-adjacent sources. County assessor data only.</li>
        </ul>
      </section>
    </div>
  );
}
