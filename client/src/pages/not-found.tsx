import { Link } from "wouter";
import { AlertCircle, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 font-mono text-xs text-muted-foreground">
        <AlertCircle className="h-3 w-3 text-confidence-medium" />
        <span>404 — not found</span>
      </div>
      <h1 className="text-xl font-semibold tracking-tight" data-testid="text-notfound-title">
        No route at this URL.
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        The page you tried to reach isn&apos;t part of Roofsat. Head back to the
        measurement page and start with an address.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-background/70 px-3 py-1.5 text-sm hover-elevate"
        data-testid="link-notfound-home"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to measure
      </Link>
    </div>
  );
}
