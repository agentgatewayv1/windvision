// Measurement history persisted in localStorage. No backend table needed:
// the webapp is stateless, so the browser is the natural place for a
// per-operator recent list.

import type { MeasureResponse } from "@shared/schema";

export interface HistoryEntry {
  id: string;
  address: string;
  measuredAt: string; // ISO
  measured_area_sqft: number | null;
  facet_count: number | null;
  primary_pitch: string | null;
  band: string | null;
  combined_confidence: number | null;
  elapsed_seconds: number | null;
  result: MeasureResponse; // full payload for instant reload
}

const KEY = "roofsat.history.v1";
const MAX_ENTRIES = 25;

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveToHistory(address: string, result: MeasureResponse): HistoryEntry[] {
  const entries = loadHistory();
  const entry: HistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    address,
    measuredAt: new Date().toISOString(),
    measured_area_sqft: result.measurement?.measured_area_sqft ?? null,
    facet_count: result.measurement?.facet_count ?? null,
    primary_pitch: result.measurement?.primary_pitch ?? null,
    band: result.confidence?.band ?? null,
    combined_confidence: result.confidence?.combined_confidence ?? null,
    elapsed_seconds: result._meta?.elapsed_seconds ?? null,
    result,
  };
  // Dedupe by address: a re-measure replaces the older entry for that address.
  const next = [entry, ...entries.filter((e) => e.address !== address)].slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage full — drop the cached payloads of the oldest half and retry
    const trimmed = next.slice(0, Math.ceil(MAX_ENTRIES / 2));
    try {
      localStorage.setItem(KEY, JSON.stringify(trimmed));
    } catch { /* give up silently */ }
    return trimmed;
  }
  return next;
}

export function removeFromHistory(id: string): HistoryEntry[] {
  const next = loadHistory().filter((e) => e.id !== id);
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  return next;
}

export function clearHistory(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
