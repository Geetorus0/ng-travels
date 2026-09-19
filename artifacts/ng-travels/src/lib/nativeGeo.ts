/**
 * Android WebView's navigator.geolocation is often backed by the network
 * location provider (cell/wifi triangulation) rather than a true GPS fix,
 * even with enableHighAccuracy:true — accuracy can land in the 50-100m+
 * range. @capacitor/geolocation talks directly to the OS location APIs
 * (FusedLocationProviderClient on Android) and gets genuine GPS-grade
 * fixes. We prefer it on native and fall back to the Web API everywhere
 * else (including if the native plugin/permission fails for any reason).
 */

export interface GeoPosition {
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  accuracy: number;
}

interface RawCoords {
  latitude: number;
  longitude: number;
  speed?: number | null;
  heading?: number | null;
  accuracy: number;
}

function toGeoPosition(pos: { coords: RawCoords }): GeoPosition {
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    speed: pos.coords.speed ?? null,
    heading: pos.coords.heading ?? null,
    accuracy: pos.coords.accuracy,
  };
}

function isNative(): boolean {
  return Boolean((window as any).Capacitor?.isNativePlatform?.());
}

function watchWebPosition(
  onPosition: (pos: GeoPosition) => void,
  onError?: (message: string) => void,
): () => void {
  if (!("geolocation" in navigator)) {
    onError?.("Geolocation isn't available in this browser.");
    return () => {};
  }
  const watchId = navigator.geolocation.watchPosition(
    (pos) => onPosition(toGeoPosition(pos)),
    (err) => onError?.(err.message),
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 },
  );
  return () => navigator.geolocation.clearWatch(watchId);
}

/** Starts a continuous location watch. Returns a promise resolving to a stop function. */
export async function watchAccuratePosition(
  onPosition: (pos: GeoPosition) => void,
  onError?: (message: string) => void,
): Promise<() => void> {
  if (isNative()) {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      const perm = await Geolocation.requestPermissions();
      if (perm.location === "granted" || perm.coarseLocation === "granted") {
        const watchId = await Geolocation.watchPosition(
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 },
          (pos, err) => {
            if (err) {
              onError?.(err.message);
              return;
            }
            if (pos) onPosition(toGeoPosition(pos));
          },
        );
        return () => {
          Geolocation.clearWatch({ id: watchId }).catch(() => {});
        };
      }
      onError?.("Location permission denied");
    } catch (err: any) {
      onError?.(err?.message || "Native geolocation unavailable");
    }
  }
  return watchWebPosition(onPosition, onError);
}

/** One-shot location fix (e.g. "Use My Location" buttons). */
export async function getAccuratePosition(): Promise<GeoPosition> {
  if (isNative()) {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      await Geolocation.requestPermissions();
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
      return toGeoPosition(pos);
    } catch {
      // Fall through to the Web API below.
    }
  }
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation isn't available in this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(toGeoPosition(pos)),
      (err) => reject(new Error(err.message)),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}
