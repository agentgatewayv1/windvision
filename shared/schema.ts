// roofsat-web has no persistent data model of its own. We only re-export the
// shape of the Python API's response so both server and client can share it.

import { z } from "zod";

export const measureRequestSchema = z.object({
  address: z.string().min(3, "Enter a full street address"),
  user_pin: z
    .tuple([z.number(), z.number()])
    .nullable()
    .optional(),
  stop_after_stage: z.number().int().min(0).max(7).nullable().optional(),
});

export type MeasureRequest = z.infer<typeof measureRequestSchema>;

export const basemapSchema = z
  .object({
    source: z.string(),
    path: z.string(),
    format: z.string(),
    size_px: z.number().nullable().optional(),
    half_deg: z.number().nullable().optional(),
    imagery_date: z.string().nullable().optional(),
  })
  .passthrough();
export type Basemap = z.infer<typeof basemapSchema>;

export const confidenceSchema = z
  .object({
    combined_confidence: z.number(),
    band: z.enum(["HIGH", "MEDIUM", "LOW", "high", "medium", "low"]),
    density_subscore: z.number().nullable().optional(),
    geometry_subscore: z.number().nullable().optional(),
    crosscheck_subscore: z.number().nullable().optional(),
    reasons: z.array(z.string()).optional(),
    flags: z.array(z.string()).optional(),
  })
  .passthrough();
export type Confidence = z.infer<typeof confidenceSchema>;

export const measurementSchema = z
  .object({
    measured_area_sqft: z.number(),
    footprint_area_sqft: z.number().nullable().optional(),
    perimeter_ft: z.number().nullable().optional(),
    primary_pitch: z.string().nullable().optional(),
    mean_pitch_deg: z.number().nullable().optional(),
    facet_count: z.number().nullable().optional(),
  })
  .passthrough();
export type Measurement = z.infer<typeof measurementSchema>;

// A single roof facet (Stage 2)
export const facetSchema = z
  .object({
    facet_id: z.string(),
    point_count: z.number(),
    points_per_m2: z.number().optional(),
    plane_rmse: z.number().optional(),
    planimetric_area_sqft: z.number(),
    pitch_continuous_deg: z.number().optional(),
    pitch_snapped: z.string(),
    snap_distance_deg: z.number().optional(),
    pitch_multiplier: z.number(),
    sloped_area_sqft: z.number(),
    pitch_source: z.string().optional(),
    facet_confidence: z.number().optional(),
  })
  .passthrough();
export type Facet = z.infer<typeof facetSchema>;

export const independentCrosscheckSchema = z
  .object({
    status: z.string(),
    delta_pct: z.number().nullable().optional(),
    solar_api_area_sqft: z.number().nullable().optional(),
    solar_imagery_date: z.string().nullable().optional(),
    reason: z.string().nullable().optional(),
    source: z.string().optional(),
  })
  .passthrough();
export type IndependentCrosscheck = z.infer<typeof independentCrosscheckSchema>;

export const parcelSchema = z
  .object({
    address: z.string().optional(),
    lat: z.number().optional(),
    lon: z.number().optional(),
    geocode_source: z.string().optional(),
    footprint_source: z.string().optional(),
    footprint_polygon: z.any().optional(),
    footprint_area_sqft: z.number().nullable().optional(),
    parcel_area_sqft: z.number().nullable().optional(),
    landuse: z.string().nullable().optional(),
  })
  .passthrough();
export type Parcel = z.infer<typeof parcelSchema>;

export const coveragePrecheckSchema = z
  .object({
    go_no_go: z.enum(["go", "no_go"]),
    reasons: z.array(z.string()).optional(),
    no_go_reason: z.string().nullable().optional(),
  })
  .passthrough();
export type CoveragePrecheck = z.infer<typeof coveragePrecheckSchema>;

export const measureResponseSchema = z
  .object({
    precheck: coveragePrecheckSchema.optional(),
    parcel: parcelSchema.nullable().optional(),
    measurement: measurementSchema.nullable().optional(),
    crosscheck: z.any().optional(),
    independent_crosscheck: independentCrosscheckSchema.nullable().optional(),
    confidence: confidenceSchema.nullable().optional(),
    basemap: basemapSchema.nullable().optional(),
    degraded: z.string().nullable().optional(),
    flags: z.array(z.string()).optional(),
    facets: z.array(facetSchema).nullable().optional(),
    area_source: z.string().nullable().optional(),
    _meta: z
      .object({
        elapsed_seconds: z.number(),
        result_type: z.string(),
        version: z.string(),
      })
      .optional(),
  })
  .passthrough();
export type MeasureResponse = z.infer<typeof measureResponseSchema>;

export const healthResponseSchema = z.object({
  ok: z.boolean(),
  api_url: z.string().nullable(),
  api_reachable: z.boolean(),
  api_version: z.string().nullable(),
  api_token_configured: z.boolean().optional(),
  error: z.string().nullable().optional(),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;
