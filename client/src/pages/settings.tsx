import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, AlertTriangle, Terminal } from "lucide-react";
import type { HealthResponse } from "@shared/schema";

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-border/60 bg-card/60 p-3 font-mono text-xs">
      <code>{children}</code>
    </pre>
  );
}

export default function SettingsPage() {
  const { data, isLoading, refetch, isFetching } = useQuery<HealthResponse>({
    queryKey: ["/api/health"],
    refetchInterval: 15_000,
  });

  const reachable = data?.api_reachable === true;
  const configured = !!data?.api_url;

  let statusIcon = <AlertTriangle className="h-4 w-4 text-confidence-medium" />;
  let statusLabel = "Checking…";
  let statusClass = "border-border/60 bg-card/40";

  if (!isLoading) {
    if (reachable) {
      statusIcon = <CheckCircle2 className="h-4 w-4 text-confidence-high" />;
      statusLabel = "API online";
      statusClass = "border-confidence-high/40 bg-confidence-high/5";
    } else if (configured) {
      statusIcon = <XCircle className="h-4 w-4 text-confidence-low" />;
      statusLabel = "API unreachable";
      statusClass = "border-confidence-low/40 bg-confidence-low/5";
    } else {
      statusIcon = <AlertTriangle className="h-4 w-4 text-confidence-medium" />;
      statusLabel = "API not configured";
      statusClass = "border-confidence-medium/40 bg-confidence-medium/5";
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="max-w-3xl">
        <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Settings
        </div>
        <h1 className="mt-2 text-xl font-semibold tracking-tight" data-testid="text-settings-title">
          Backend configuration
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Roofsat&apos;s Node backend proxies to a separately-hosted Python
          measurement API. Point it at your API by setting the two env vars
          below.
        </p>
      </section>

      <section
        data-testid="card-api-status"
        className={`rounded-xl border p-5 ${statusClass}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {statusIcon}
            <span className="font-medium" data-testid="text-api-status-label">
              {statusLabel}
            </span>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            data-testid="button-recheck"
            className="rounded-md border border-border/60 bg-background/70 px-3 py-1 font-mono text-xs hover-elevate disabled:opacity-50"
          >
            {isFetching ? "checking…" : "recheck"}
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 font-mono text-xs sm:grid-cols-2">
          <div className="rounded-md border border-border/60 bg-background/40 px-3 py-2">
            <div className="text-muted-foreground">ROOFSAT_API_URL</div>
            <div className="mt-1 truncate" data-testid="text-api-url">
              {data?.api_url || <span className="text-muted-foreground">(not set)</span>}
            </div>
          </div>
          <div className="rounded-md border border-border/60 bg-background/40 px-3 py-2">
            <div className="text-muted-foreground">Auth</div>
            <div className="mt-1" data-testid="text-api-auth">
              {data?.api_token_configured ? "x-api-key configured" : "no token"}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-3xl">
        <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Local setup
        </div>
        <h2 className="mt-2 text-lg font-semibold">Run the Python API</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          From the <span className="font-mono">roofsat</span> repo, start the
          stdlib HTTP server that wraps <span className="font-mono">pipeline.run()</span>.
        </p>
        <div className="mt-3">
          <CodeBlock>
            {`cd roofsat
source .venv/bin/activate
export ROOFSAT_API_TOKEN=$(openssl rand -hex 24)
PYTHONPATH=src python -m api.server --host 127.0.0.1 --port 8787`}
          </CodeBlock>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Expose it publicly with a tunnel so the Node backend (or a deployed
          copy of this app) can reach it:
        </p>
        <div className="mt-3">
          <CodeBlock>{`cloudflared tunnel --url http://127.0.0.1:8787`}</CodeBlock>
        </div>
      </section>

      <section className="max-w-3xl">
        <h2 className="text-lg font-semibold">Point the webapp at your API</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The Node backend reads these at request time — no rebuild needed.
        </p>
        <div className="mt-3">
          <CodeBlock>
            {`# .env (dev) or credentials={} for publish_website
ROOFSAT_API_URL=https://your-tunnel.trycloudflare.com
ROOFSAT_API_TOKEN=<same token you set on the Python side>`}
          </CodeBlock>
        </div>
        <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
          <Terminal className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            The status pill in the header polls <span className="font-mono">/api/health</span>{" "}
            every 30s. Green means the API is reachable, amber means it&apos;s
            configured but unreachable, red means no URL is set.
          </span>
        </p>
      </section>
    </div>
  );
}
