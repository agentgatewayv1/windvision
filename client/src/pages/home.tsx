import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { MeasureResponse } from "@shared/schema";
import { ResultView } from "./result-view";
import { MeasureProgress } from "@/components/MeasureProgress";
import { HistoryPanel } from "@/components/HistoryPanel";
import {
  clearHistory,
  loadHistory,
  removeFromHistory,
  saveToHistory,
  type HistoryEntry,
} from "@/lib/history";
import {
  fetchRemoteHistory,
  fetchRemoteResult,
  remoteConfigured,
  removeRemote,
  saveRemote,
} from "@/lib/remoteHistory";
import type { HistoryItem } from "@/components/HistoryPanel";

const formSchema = z.object({
  address: z
    .string()
    .min(6, "Enter a street address, city, and state")
    .max(200, "That's a long address"),
});
type FormValues = z.infer<typeof formSchema>;

// Addresses from the ground-truth validation set — known to geocode and
// measure end-to-end.
const SAMPLE_ADDRESSES = [
  "620 Evergreen Dr, York, PA 17402",
  "1829 Lincoln Highway, Lancaster, PA 17602",
  "805 Temperance Hill Rd, Lititz, PA 17543",
];

type MeasureInput = { address: string; user_pin?: [number, number] };

export default function HomePage() {
  const [result, setResult] = useState<MeasureResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastAddress, setLastAddress] = useState<string | null>(null);
  const [userPin, setUserPin] = useState<[number, number] | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [remote, setRemote] = useState(false);
  const [remoteItems, setRemoteItems] = useState<HistoryItem[]>([]);

  // On mount: prefer server history (Supabase) when the backend is configured.
  useEffect(() => {
    let cancelled = false;
    remoteConfigured().then(async (ok) => {
      if (cancelled || !ok) return;
      try {
        const items = await fetchRemoteHistory();
        if (!cancelled) {
          setRemote(true);
          setRemoteItems(items);
        }
      } catch {
        /* fall back to localStorage silently */
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshRemote = async () => {
    try {
      setRemoteItems(await fetchRemoteHistory());
    } catch { /* keep stale list */ }
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { address: "" },
  });

  const measure = useMutation<MeasureResponse, Error, MeasureInput>({
    mutationFn: async (values) => {
      const res = await apiRequest("POST", "/api/measure", {
        address: values.address.trim(),
        ...(values.user_pin ? { user_pin: values.user_pin } : {}),
      });
      return res.json();
    },
    onMutate: (values) => {
      setLastAddress(values.address.trim());
      setUserPin(values.user_pin ?? null);
    },
    onSuccess: (data, values) => {
      setResult(data);
      setErrorMessage(null);
      // Only persist real measurements (with an area), not no-go short-circuits.
      if (data.measurement?.measured_area_sqft != null) {
        setHistory(saveToHistory(values.address.trim(), data));
        if (remote) {
          saveRemote(values.address.trim(), data).then(refreshRemote).catch(() => {});
        }
      }
    },
    onError: (err) => {
      setResult(null);
      setErrorMessage(err.message);
    },
  });

  const onSubmit = (values: FormValues) => measure.mutate({ address: values.address });

  const pickSample = (addr: string) => {
    form.setValue("address", addr, { shouldValidate: true });
    measure.mutate({ address: addr });
  };

  const pickRoof = (lat: number, lon: number) => {
    if (!lastAddress || measure.isPending) return;
    measure.mutate({ address: lastAddress, user_pin: [lat, lon] });
  };

  const loadFromHistory = (item: HistoryItem) => {
    form.setValue("address", item.address);
    setLastAddress(item.address);
    setUserPin(null);
    setErrorMessage(null);
    const local = item as HistoryEntry;
    if (local.result) {
      setResult(local.result);
      return;
    }
    // Remote entry: fetch the cached full result by id.
    fetchRemoteResult(item.id)
      .then((r) => setResult(r))
      .catch((err) => setErrorMessage(err.message));
  };

  const handleRemove = (id: string) => {
    if (remote) {
      removeRemote(id).then(refreshRemote).catch(() => {});
    } else {
      setHistory(removeFromHistory(id));
    }
  };

  const handleClear = () => {
    if (remote) {
      Promise.all(remoteItems.map((e) => removeRemote(e.id).catch(() => {})))
        .then(refreshRemote)
        .catch(() => {});
    } else {
      clearHistory();
      setHistory([]);
    }
  };

  return (
    <div className="flex flex-col gap-10">
      {/* Hero + form */}
      <section className="relative overflow-hidden rounded-xl border border-border/60 bg-card/40">
        <div className="absolute inset-0 bg-grid opacity-40" aria-hidden />
        <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary/10 to-transparent" aria-hidden />
        <div className="relative flex flex-col gap-6 px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex items-center gap-2 self-start rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-mono text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" />
            <span>satellite + lidar measurement</span>
          </div>
          <div className="max-w-2xl">
            <h1 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl" data-testid="text-hero">
              Measure any roof from an address.
            </h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Enter a property. Roofsat pulls the parcel, LiDAR point cloud, and
              satellite imagery, segments the facets, and returns a measurement
              with a calibrated confidence score — plus a quote-ready
              facet breakdown.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex w-full flex-col gap-3 sm:flex-row">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="sr-only">Property address</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        data-testid="input-address"
                        placeholder="123 Main St, Lancaster, PA"
                        className="h-11 border-border/70 bg-background/80 font-mono text-sm"
                        autoComplete="off"
                        autoFocus
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                data-testid="button-measure"
                disabled={measure.isPending}
                className="h-11 px-5 font-medium"
              >
                {measure.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Measuring…
                  </>
                ) : (
                  <>
                    Measure
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </Form>

          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">Try:</span>
            {SAMPLE_ADDRESSES.map((addr) => (
              <button
                key={addr}
                type="button"
                onClick={() => pickSample(addr)}
                disabled={measure.isPending}
                data-testid={`button-sample-${addr.slice(0, 3)}`}
                className="rounded-md border border-border/60 bg-background/70 px-2 py-1 font-mono text-xs text-muted-foreground hover-elevate disabled:opacity-40"
              >
                {addr}
              </button>
            ))}
          </div>
        </div>
      </section>

      <HistoryPanel
        entries={remote ? remoteItems : history}
        remote={remote}
        onSelect={loadFromHistory}
        onRemove={handleRemove}
        onClear={handleClear}
      />

      {/* Error / progress / result */}
      {errorMessage && (
        <div
          data-testid="text-error"
          className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
        >
          <div className="font-medium">Measurement failed</div>
          <div className="mt-1 whitespace-pre-wrap font-mono text-xs opacity-80">
            {errorMessage}
          </div>
        </div>
      )}

      {measure.isPending && !result && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <MeasureProgress />
          </div>
          <div className="lg:col-span-3 aspect-square animate-pulse rounded-xl border border-border/60 bg-noise bg-card/40" />
        </div>
      )}

      {result && (
        <ResultView
          result={result}
          onPickRoof={pickRoof}
          userPin={userPin}
          rePicking={measure.isPending}
        />
      )}
    </div>
  );
}
