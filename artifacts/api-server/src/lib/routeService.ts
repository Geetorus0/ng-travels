import type { TripLocation, RouteAlternative } from "@workspace/db/schema";

export interface PlaceSearchResult {
  placeId: string;
  name: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  lat: number;
  lng: number;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
}

export interface DrivingLegResult {
  distanceMeters: number;
  distanceKm: number;
  durationSeconds: number;
  durationMinutes: number;
  encodedPolyline?: string;
  coordinates: [number, number][]; // [latitude, longitude][]
  summary: string;
  estimatedToll: number | null;
  tollAvailable: boolean;
}

export interface ComputedRouteOptions {
  provider: "google_routes" | "geoapify";
  tripType: "single_trip" | "round_trip";
  outbound: DrivingLegResult;
  return?: DrivingLegResult;
  totalRoadDistanceKm: number;
  totalDurationMinutes: number;
  estimatedToll: number | null;
  tollAvailable: boolean;
  alternatives: RouteAlternative[];
}

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_ROUTES_API_KEY || "";
const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY || "fccc330705934d6abd2be56e77dff380";

// Route Cache to avoid redundant external network roundtrips (TTL 1 hour)
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}
const routeCache = new Map<string, CacheEntry<DrivingLegResult>>();
const autocompleteCache = new Map<string, CacheEntry<PlaceSearchResult[]>>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Standard Polyline Decoding (used for Google Routes API encodedPolyline)
 */
export function decodeGooglePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([Math.round((lat / 1e5) * 1e6) / 1e6, Math.round((lng / 1e5) * 1e6) / 1e6]);
  }
  return points;
}

/**
 * Real Location Search / Autocomplete
 * Uses Google Places API if GOOGLE_API_KEY is configured, else Geoapify Places Autocomplete
 */
export async function searchPlaces(input: string): Promise<PlaceSearchResult[]> {
  const q = input.trim();
  if (!q || q.length < 2) return [];

  const cacheKey = q.toLowerCase();
  const cached = autocompleteCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  // 1. If Google Maps is configured, use Google Places API
  if (GOOGLE_API_KEY) {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        q,
      )}&components=country:in&key=${GOOGLE_API_KEY}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = (await res.json()) as any;
        if (json.predictions && json.predictions.length > 0) {
          // Fetch place details for coordinates
          const detailedPromises = json.predictions.slice(0, 7).map(async (pred: any) => {
            const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${pred.place_id}&fields=name,formatted_address,geometry,address_components&key=${GOOGLE_API_KEY}`;
            const detailRes = await fetch(detailUrl);
            if (!detailRes.ok) return null;
            const detailJson = (await detailRes.json()) as any;
            const result = detailJson.result;
            if (!result || !result.geometry) return null;

            let city: string | undefined;
            let district: string | undefined;
            let state: string | undefined;
            let country: string | undefined;

            if (Array.isArray(result.address_components)) {
              for (const comp of result.address_components) {
                if (comp.types.includes("locality")) city = comp.long_name;
                if (comp.types.includes("administrative_area_level_2")) district = comp.long_name;
                if (comp.types.includes("administrative_area_level_1")) state = comp.long_name;
                if (comp.types.includes("country")) country = comp.long_name;
              }
            }

            const latVal = result.geometry.location.lat;
            const lngVal = result.geometry.location.lng;
            return {
              placeId: pred.place_id,
              name: result.name || pred.structured_formatting?.main_text || pred.description,
              formattedAddress: result.formatted_address || pred.description,
              latitude: latVal,
              longitude: lngVal,
              lat: latVal,
              lng: lngVal,
              city: city || district,
              district,
              state,
              country: country || "India",
            } as PlaceSearchResult;
          });

          const results = (await Promise.all(detailedPromises)).filter(
            (p): p is PlaceSearchResult => p !== null,
          );
          if (results.length > 0) {
            autocompleteCache.set(cacheKey, { data: results, expiresAt: Date.now() + CACHE_TTL_MS });
            return results;
          }
        }
      }
    } catch (err) {
      console.error("[routeService] Google Places Autocomplete error:", err);
    }
  }

  // 2. Geoapify Places Autocomplete
  try {
    const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(
      q,
    )}&apiKey=${GEOAPIFY_API_KEY}&countrycode=in`;
    const res = await fetch(url);
    if (res.ok) {
      const data = (await res.json()) as any;
      if (data.features && Array.isArray(data.features) && data.features.length > 0) {
        const results: PlaceSearchResult[] = data.features.map((f: any) => {
          const props = f.properties || {};
          const coords = f.geometry?.coordinates || [77.5946, 12.9716];
          const latVal = props.lat != null ? Number(props.lat) : coords[1];
          const lonVal = props.lon != null ? Number(props.lon) : coords[0];
          return {
            placeId: props.place_id || `geo_${props.lat}_${props.lon}`,
            name: props.name || props.address_line1 || props.city || q,
            formattedAddress: props.formatted || `${props.name || q}, India`,
            latitude: latVal,
            longitude: lonVal,
            lat: latVal,
            lng: lonVal,
            city: props.city || props.county,
            district: props.state_district || props.county,
            state: props.state,
            country: props.country || "India",
          };
        });

        autocompleteCache.set(cacheKey, { data: results, expiresAt: Date.now() + CACHE_TTL_MS });
        return results;
      }
    }
  } catch (err) {
    console.error("[routeService] Geoapify Autocomplete error:", err);
  }

  return [];
}

/**
 * Single Leg Driving Route Calculation
 * Calculates exact road route between origin and destination with optional waypoints
 */
export async function calculateSingleDrivingLeg(
  origin: { lat: number; lng: number; name?: string; placeId?: string },
  destination: { lat: number; lng: number; name?: string; placeId?: string },
  waypoints: Array<{ lat: number; lng: number }> = [],
  options: { avoidTolls?: boolean; avoidHighways?: boolean } = {},
): Promise<DrivingLegResult> {
  const cacheKey = `${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}->${destination.lat.toFixed(
    5,
  )},${destination.lng.toFixed(5)}|wp:${waypoints.map((w) => `${w.lat.toFixed(4)},${w.lng.toFixed(4)}`).join(";")}|tolls:${options.avoidTolls}`;

  const cached = routeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  // 1. Google Routes API (Directions API v2)
  if (GOOGLE_API_KEY) {
    try {
      const bodyPayload = {
        origin: origin.placeId
          ? { placeId: origin.placeId }
          : { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
        destination: destination.placeId
          ? { placeId: destination.placeId }
          : { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
        intermediates: waypoints.map((w) => ({
          location: { latLng: { latitude: w.lat, longitude: w.lng } },
        })),
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        routeModifiers: {
          avoidTolls: !!options.avoidTolls,
          avoidHighways: !!options.avoidHighways,
        },
      };

      const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_API_KEY,
          "X-Goog-FieldMask":
            "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.description,routes.travelAdvisory.tollInfo",
        },
        body: JSON.stringify(bodyPayload),
      });

      if (res.ok) {
        const json = (await res.json()) as any;
        if (json.routes && json.routes.length > 0) {
          const route = json.routes[0];
          const distanceMeters = Number(route.distanceMeters || 0);
          const durationSeconds = parseInt(String(route.duration || "0").replace("s", ""), 10);
          const distanceKm = Math.round((distanceMeters / 1000) * 10) / 10;
          const durationMinutes = Math.round(durationSeconds / 60);
          const encoded = route.polyline?.encodedPolyline || "";
          const coordinates = encoded ? decodeGooglePolyline(encoded) : [];

          // Real toll extraction if supported
          let estimatedToll: number | null = null;
          let tollAvailable = false;
          if (route.travelAdvisory?.tollInfo?.estimatedPrice) {
            const price = route.travelAdvisory.tollInfo.estimatedPrice[0];
            if (price && price.units) {
              estimatedToll = Number(price.units);
              tollAvailable = true;
            }
          }

          const result: DrivingLegResult = {
            distanceMeters,
            distanceKm,
            durationSeconds,
            durationMinutes,
            encodedPolyline: encoded,
            coordinates,
            summary: route.description || `Fastest Highway Route (${distanceKm} km)`,
            estimatedToll,
            tollAvailable,
          };

          routeCache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
          return result;
        }
      }
    } catch (err) {
      console.error("[routeService] Google Routes API error:", err);
    }
  }

  // 2. Geoapify Driving Routing
  try {
    const allPoints = [{ lat: origin.lat, lon: origin.lng }, ...waypoints.map((w) => ({ lat: w.lat, lon: w.lng })), { lat: destination.lat, lon: destination.lng }];
    const wpStr = allPoints.map((p) => `${p.lat},${p.lon}`).join("|");
    let url = `https://api.geoapify.com/v1/routing?waypoints=${wpStr}&mode=drive&apiKey=${GEOAPIFY_API_KEY}&details=route_details`;
    if (options.avoidTolls) {
      url += "&avoid=tolls";
    }

    const res = await fetch(url);
    if (res.ok) {
      const json = (await res.json()) as any;
      if (json.features && json.features.length > 0) {
        const feat = json.features[0];
        const props = feat.properties || {};
        const distanceMeters = Number(props.distance || 0);
        const durationSeconds = Number(props.time || 0);
        const distanceKm = Math.round((distanceMeters / 1000) * 10) / 10;
        const durationMinutes = Math.round(durationSeconds / 60);

        // Coordinates from Geoapify are in [lon, lat] format; convert to [lat, lon]
        const rawCoords: [number, number][] = feat.geometry?.coordinates?.[0] || [];
        const coordinates: [number, number][] = rawCoords.map((c: [number, number]) => [c[1], c[0]]);

        const result: DrivingLegResult = {
          distanceMeters,
          distanceKm,
          durationSeconds,
          durationMinutes,
          coordinates,
          summary: `Expressway Driving Route (${distanceKm} km)`,
          estimatedToll: null, // Do not invent fake tolls
          tollAvailable: false,
        };

        routeCache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
        return result;
      }
    }
  } catch (err) {
    console.error("[routeService] Geoapify Routing API error:", err);
  }

  throw new Error("Unable to calculate driving route between specified locations. Please verify coordinates.");
}

/**
 * Real Comprehensive Route Engine (One-Way and Round-Trip)
 * For Round-Trip:
 *  - Calculates Outbound leg: Pickup -> Destination
 *  - Calculates Return leg: Destination -> Pickup
 *  - Total distance = Outbound distance + Return distance (never simply * 2)
 */
export async function calculateRouteJourney(
  pickupOrOptions: TripLocation | { pickup: TripLocation; destination: TripLocation; stops?: TripLocation[]; tripType?: string; options?: { avoidTolls?: boolean; avoidHighways?: boolean } },
  destinationParam?: TripLocation,
  stopsParam: TripLocation[] = [],
  tripTypeParam: string = "single_trip",
  optionsParam: { avoidTolls?: boolean; avoidHighways?: boolean } = {},
): Promise<ComputedRouteOptions> {
  let pickup: TripLocation;
  let destination: TripLocation;
  let stops = stopsParam;
  let tripType = tripTypeParam;
  let options = optionsParam;

  if (pickupOrOptions && "pickup" in pickupOrOptions && "destination" in pickupOrOptions) {
    pickup = (pickupOrOptions as any).pickup;
    destination = (pickupOrOptions as any).destination;
    stops = (pickupOrOptions as any).stops || [];
    tripType = (pickupOrOptions as any).tripType || "single_trip";
    options = (pickupOrOptions as any).options || {};
  } else {
    pickup = pickupOrOptions as TripLocation;
    destination = destinationParam!;
  }

  let pLat = Number(pickup?.latitude ?? (pickup as any)?.lat);
  let pLng = Number(pickup?.longitude ?? (pickup as any)?.lng);
  let dLat = Number(destination?.latitude ?? (destination as any)?.lat);
  let dLng = Number(destination?.longitude ?? (destination as any)?.lng);

  if ((!pLat || !pLng) && (pickup?.address || pickup?.name)) {
    const found = await searchPlaces(pickup.address || pickup.name);
    if (found.length > 0) {
      pLat = found[0].latitude;
      pLng = found[0].longitude;
      pickup.latitude = pLat;
      pickup.longitude = pLng;
      if (!pickup.placeId) pickup.placeId = found[0].placeId;
    }
  }

  if ((!dLat || !dLng) && (destination?.address || destination?.name)) {
    const found = await searchPlaces(destination.address || destination.name);
    if (found.length > 0) {
      dLat = found[0].latitude;
      dLng = found[0].longitude;
      destination.latitude = dLat;
      destination.longitude = dLng;
      if (!destination.placeId) destination.placeId = found[0].placeId;
    }
  }

  if (!pLat || !pLng || !dLat || !dLng) {
    throw new Error("Invalid pickup or destination coordinates for route calculation.");
  }

  const isRoundTrip = tripType.toLowerCase().includes("round");

  const waypoints = stops
    .filter((s) => s.latitude && s.longitude)
    .map((s) => ({ lat: Number(s.latitude), lng: Number(s.longitude) }));

  // 1. Calculate Outbound Leg: Pickup -> Destination
  const outbound = await calculateSingleDrivingLeg(
    { lat: pLat, lng: pLng, name: pickup.name, placeId: pickup.placeId || undefined },
    { lat: dLat, lng: dLng, name: destination.name, placeId: destination.placeId || undefined },
    waypoints,
    options,
  );

  let returnLeg: DrivingLegResult | undefined;
  let totalRoadDistanceKm = outbound.distanceKm;
  let totalDurationMinutes = outbound.durationMinutes;
  let estimatedToll = outbound.estimatedToll;
  let tollAvailable = outbound.tollAvailable;

  // 2. For Round-Trip: Calculate Independent Return Leg (Destination -> Pickup)
  if (isRoundTrip) {
    const returnWaypoints = [...waypoints].reverse();
    returnLeg = await calculateSingleDrivingLeg(
      { lat: dLat, lng: dLng, name: destination.name, placeId: destination.placeId || undefined },
      { lat: pLat, lng: pLng, name: pickup.name, placeId: pickup.placeId || undefined },
      returnWaypoints,
      options,
    );

    // Sum of actual Outbound + actual Return
    totalRoadDistanceKm = Math.round((outbound.distanceKm + returnLeg.distanceKm) * 10) / 10;
    totalDurationMinutes = outbound.durationMinutes + returnLeg.durationMinutes;

    if (outbound.tollAvailable && returnLeg.tollAvailable) {
      estimatedToll = (outbound.estimatedToll || 0) + (returnLeg.estimatedToll || 0);
      tollAvailable = true;
    } else {
      estimatedToll = null;
      tollAvailable = false;
    }
  }

  // 3. Alternatives for UI route selection
  const alternatives: RouteAlternative[] = [
    {
      routeIndex: 0,
      summary: `Primary Expressway (${totalRoadDistanceKm} km, ${Math.floor(totalDurationMinutes / 60)}h ${totalDurationMinutes % 60}m)`,
      distanceKm: totalRoadDistanceKm,
      durationMinutes: totalDurationMinutes,
      estimatedToll: estimatedToll || 0,
      via: isRoundTrip ? "Outbound & Return via National Highway" : "Fastest National Highway",
      polylineCoordinates: outbound.coordinates,
    },
  ];

  return {
    provider: GOOGLE_API_KEY ? "google_routes" : "geoapify",
    tripType: isRoundTrip ? "round_trip" : "single_trip",
    outbound,
    return: returnLeg,
    totalRoadDistanceKm,
    totalDurationMinutes,
    estimatedToll,
    tollAvailable,
    alternatives,
  };
}
