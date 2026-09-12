import tollPlazasRaw from "../data/toll-plazas-india.json";

/**
 * NHAI toll-plaza rates + coordinates, community-maintained from NHAI's own
 * RajMargyatra portal (https://github.com/ForceGT/india-toll-plazas,
 * "Government Open Data"-style reuse — no formal OSS license, confirm terms
 * with counsel if this needs to be airtight for billing). Re-vendor
 * periodically; rates revise roughly annually.
 */
interface TollPlaza {
  id: number;
  name: string;
  state: string | null;
  nh: string | null;
  lat: number;
  lon: number;
  carSingle: number;
  carReturn: number;
}

const tollPlazas = tollPlazasRaw as TollPlaza[];

export interface TollMatch {
  id: number;
  name: string;
  state: string | null;
  rate: number;
  distanceMeters: number;
}

export interface TollEstimateResult {
  totalToll: number;
  plazas: TollMatch[];
}

const EARTH_RADIUS_M = 6371000;
const MAX_MATCH_DISTANCE_M = 750;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

/**
 * Approximate min distance from a point to a polyline segment, in meters.
 * Treats short segments as locally flat (fine at highway-segment scale).
 */
function distanceToSegmentMeters(
  pLat: number,
  pLon: number,
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number,
): number {
  const latScale = 110574; // meters per degree latitude (roughly constant)
  const lonScale = 111320 * Math.cos(toRad(pLat)); // meters per degree longitude at this latitude

  const ax = (aLon - pLon) * lonScale;
  const ay = (aLat - pLat) * latScale;
  const bx = (bLon - pLon) * lonScale;
  const by = (bLat - pLat) * latScale;

  const abx = bx - ax;
  const aby = by - ay;
  const lenSq = abx * abx + aby * aby;

  let t = lenSq > 0 ? -(ax * abx + ay * aby) / lenSq : 0;
  t = Math.max(0, Math.min(1, t));

  const cx = ax + t * abx;
  const cy = ay + t * aby;
  return Math.sqrt(cx * cx + cy * cy);
}

function minDistanceToRoute(plazaLat: number, plazaLon: number, coordinates: [number, number][]): number {
  if (coordinates.length === 0) return Infinity;
  if (coordinates.length === 1) {
    return haversineMeters(plazaLat, plazaLon, coordinates[0][0], coordinates[0][1]);
  }
  let min = Infinity;
  for (let i = 0; i < coordinates.length - 1; i++) {
    const [aLat, aLon] = coordinates[i];
    const [bLat, bLon] = coordinates[i + 1];
    const d = distanceToSegmentMeters(plazaLat, plazaLon, aLat, aLon, bLat, bLon);
    if (d < min) min = d;
    if (min < 50) break; // close enough, stop early
  }
  return min;
}

/**
 * Estimate toll cost for a driving route by matching NHAI toll plazas whose
 * coordinates fall within MAX_MATCH_DISTANCE_M of the route polyline.
 *
 * `carSingle` for a one-way leg; `carReturn` when the same road is being
 * billed as a same-day round trip (NHAI's return rate is a discounted
 * same-booth rate, not 2x single — e.g. often ~1.5x, not 2x).
 */
export function estimateTollForRoute(
  coordinates: [number, number][],
  isRoundTrip: boolean,
): TollEstimateResult {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return { totalToll: 0, plazas: [] };
  }

  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
  for (const [lat, lon] of coordinates) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
  }
  const pad = 0.02; // ~2km bounding-box pad, cheap prefilter before the real distance check

  const matches: TollMatch[] = [];
  for (const plaza of tollPlazas) {
    if (plaza.lat < minLat - pad || plaza.lat > maxLat + pad) continue;
    if (plaza.lon < minLon - pad || plaza.lon > maxLon + pad) continue;

    const distanceMeters = minDistanceToRoute(plaza.lat, plaza.lon, coordinates);
    if (distanceMeters <= MAX_MATCH_DISTANCE_M) {
      matches.push({
        id: plaza.id,
        name: plaza.name,
        state: plaza.state,
        rate: isRoundTrip ? plaza.carReturn : plaza.carSingle,
        distanceMeters: Math.round(distanceMeters),
      });
    }
  }

  const totalToll = matches.reduce((sum, m) => sum + m.rate, 0);
  return { totalToll, plazas: matches };
}
