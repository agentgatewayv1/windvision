// Server-persisted measurement history (Supabase via the Node backend).
// When the backend reports Supabase configured, history lives server-side and
// follows the operator across devices; otherwise the caller falls back to
// localStorage (lib/history.ts).

import type { MeasureResponse } from "@shared/schema";
import { apiRequest } from "./queryClient";

export interface RemoteEntry {
  id: string;
  address: string;
  measured_area_sqft: number | null;
  facet_count: number | null;
  primary_pitch: string | null;
  band: string | null;
  combined_confidence: number | null;
  elapsed_seconds: number | null;
  created_at: string;
}

export async function remoteConfigured(): Promise<boolean> {
  try {
    const res = await apiRequest("GET", "/api/measurements/config");
    const data = (await res.json()) as { configured?: boolean };
    return data.configured === true;
  } catch {
    return false;
  }
}

export async function fetchRemoteHistory(): Promise<RemoteEntry[]> {
  const res = await apiRequest("GET", "/api/measurements");
  return (await res.json()) as RemoteEntry[];
}

export async function fetchRemoteResult(id: string): Promise<MeasureResponse> {
  const res = await apiRequest("GET", `/api/measurements/${id}`);
  const row = (await res.json()) as { result: MeasureResponse };
  return row.result;
}

export async function saveRemote(address: string, result: MeasureResponse): Promise<void> {
  await apiRequest("POST", "/api/measurements", { address, result });
}

export async function removeRemote(id: string): Promise<void> {
  await apiRequest("DELETE", `/api/measurements/${id}`);
}
