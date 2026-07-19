// Roofsat brand mark: two overlapping polygons suggesting a rooftop measured
// from above, with a subtle scan line. Works monochrome, uses currentColor.

export function Logo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Roofsat"
    >
      {/* Outer roof polygon */}
      <path d="M4 16 L16 5 L28 16 L26 27 L6 27 Z" />
      {/* Inner ridge line */}
      <path d="M10 27 L16 12 L22 27" opacity={0.65} />
      {/* Scan line — the "sat" part */}
      <path d="M2 10 L30 10" opacity={0.3} strokeDasharray="2 3" />
    </svg>
  );
}

export function LogoWordmark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Logo className="h-6 w-6 text-primary" />
      <span className="font-mono text-sm font-semibold tracking-tight" data-testid="text-brand">
        roofsat
      </span>
    </div>
  );
}
