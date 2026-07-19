import { Link, useLocation } from "wouter";
import { Moon, Sun, Settings, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { LogoWordmark } from "./Logo";
import { useTheme } from "./ThemeProvider";
import { Button } from "@/components/ui/button";
import type { HealthResponse } from "@shared/schema";

function ApiStatusPill() {
  const { data, isLoading } = useQuery<HealthResponse>({
    queryKey: ["/api/health"],
    refetchInterval: 30_000,
  });

  const reachable = !isLoading && data?.api_reachable === true;
  const configured = !isLoading && !!data?.api_url;

  const color = isLoading
    ? "bg-muted-foreground"
    : reachable
      ? "bg-confidence-high"
      : configured
        ? "bg-confidence-medium"
        : "bg-confidence-low";

  const label = isLoading
    ? "checking…"
    : reachable
      ? "api online"
      : configured
        ? "api unreachable"
        : "api not configured";

  return (
    <Link
      href="/settings"
      className="group flex items-center gap-2 rounded-md border border-border/60 bg-card/60 px-2.5 py-1.5 text-xs font-mono text-muted-foreground hover-elevate"
      data-testid="link-api-status"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} aria-hidden />
      <span>{label}</span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { theme, toggle } = useTheme();
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-md no-print">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center" data-testid="link-home">
            <LogoWordmark />
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            <Link
              href="/"
              data-testid="link-nav-measure"
              className={`rounded-md px-3 py-1.5 text-sm hover-elevate ${
                location === "/" ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              Measure
            </Link>
            <Link
              href="/about"
              data-testid="link-nav-about"
              className={`rounded-md px-3 py-1.5 text-sm hover-elevate ${
                location === "/about" ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              About
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <ApiStatusPill />
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              data-testid="button-theme-toggle"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Link href="/settings" data-testid="link-settings">
              <Button variant="ghost" size="icon" aria-label="Settings">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">{children}</main>

      <footer className="border-t border-border/60 py-6 no-print">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 px-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:px-6">
          <div className="flex items-center gap-3 font-mono">
            <Activity className="h-3 w-3" />
            <span>roofsat / measurement engine</span>
          </div>
          <div className="font-mono">
            LiDAR · Regrid · Google Solar · PASDA
          </div>
        </div>
      </footer>
    </div>
  );
}
