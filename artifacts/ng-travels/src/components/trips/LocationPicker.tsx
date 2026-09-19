import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Search, Map as MapIcon, Link2, LocateFixed, Loader, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/apiFetch";
import { getAccuratePosition } from "@/lib/nativeGeo";

export interface PickedPlace {
  placeId?: string;
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

interface LocationPickerProps {
  label: string;
  accent: "emerald" | "amber";
  searchPlaceholder: string;
  value: string;
  onInputChange: (text: string) => void;
  onSelect: (place: PickedPlace) => void;
}

const ACCENT = {
  emerald: { text: "text-emerald-700 dark:text-emerald-400", ring: "focus-visible:ring-emerald-400", tabActive: "bg-emerald-400 text-zinc-950", border: "border-emerald-300 dark:border-emerald-500/40" },
  amber: { text: "text-amber-700 dark:text-amber-400", ring: "focus-visible:ring-amber-400", tabActive: "bg-amber-400 text-zinc-950", border: "border-amber-300 dark:border-amber-500/40" },
} as const;

type Mode = "search" | "map" | "coords";

const pinIcon = L.divIcon({
  className: "",
  html: `<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:#f59e0b;border:2px solid #fff;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,0.5)"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 22],
});

export const LocationPicker: React.FC<LocationPickerProps> = ({
  label,
  accent,
  searchPlaceholder,
  value,
  onInputChange,
  onSelect,
}) => {
  const colors = ACCENT[accent];
  const [mode, setMode] = useState<Mode>("search");

  // --- Search mode state ---
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const skipNextFetch = useRef(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode !== "search") return;
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }
    if (!value || value.length < 2) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await apiFetch(`/api/maps/places/autocomplete?input=${encodeURIComponent(value)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
      } catch (err: any) {
        if (err.name !== "AbortError") setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, mode]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setSuggestions([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const pickSuggestion = (place: any) => {
    skipNextFetch.current = true;
    onInputChange(place.formattedAddress || place.name);
    setSuggestions([]);
    onSelect(place);
  };

  // --- Coordinates / URL mode state ---
  const [coordsInput, setCoordsInput] = useState("");
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const handleResolveLocation = async () => {
    const text = coordsInput.trim();
    if (!text) return;
    setResolving(true);
    setResolveError(null);
    try {
      const res = await apiFetch("/api/maps/resolve-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResolveError(data?.error || "Could not resolve that location.");
        return;
      }
      onInputChange(data.formattedAddress || data.name);
      onSelect(data);
    } catch {
      setResolveError("Network error — unable to reach the server.");
    } finally {
      setResolving(false);
    }
  };

  // --- Map mode state ---
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [mapResolving, setMapResolving] = useState(false);
  const [pinCoords, setPinCoords] = useState<{ lat: number; lng: number } | null>(null);

  // --- In-map search state (find a place, then drop/move the pin on it) ---
  const [mapSearchQuery, setMapSearchQuery] = useState("");
  const [mapSuggestions, setMapSuggestions] = useState<any[]>([]);
  const [mapSearching, setMapSearching] = useState(false);
  const mapSearchBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode !== "map") return;
    if (!mapSearchQuery || mapSearchQuery.length < 2) {
      setMapSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setMapSearching(true);
      try {
        const res = await apiFetch(`/api/maps/places/autocomplete?input=${encodeURIComponent(mapSearchQuery)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setMapSuggestions(Array.isArray(data) ? data : []);
      } catch (err: any) {
        if (err.name !== "AbortError") setMapSuggestions([]);
      } finally {
        setMapSearching(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [mapSearchQuery, mode]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mapSearchBoxRef.current && !mapSearchBoxRef.current.contains(e.target as Node)) {
        setMapSuggestions([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const reverseGeocodePin = async (lat: number, lng: number) => {
    setMapResolving(true);
    try {
      const res = await apiFetch(`/api/maps/reverse-geocode?lat=${lat}&lng=${lng}`);
      const data = await res.json();
      onInputChange(data.formattedAddress || data.name);
      onSelect(data);
    } catch {
      const fallback: PickedPlace = {
        name: "Pinned Location",
        formattedAddress: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        latitude: lat,
        longitude: lng,
        lat,
        lng,
      };
      onInputChange(fallback.formattedAddress);
      onSelect(fallback);
    } finally {
      setMapResolving(false);
    }
  };

  const placeMarker = (lat: number, lng: number) => {
    setPinCoords({ lat, lng });
    if (!mapInstanceRef.current) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { icon: pinIcon, draggable: true }).addTo(mapInstanceRef.current);
      markerRef.current.on("dragend", () => {
        const pos = markerRef.current!.getLatLng();
        setPinCoords({ lat: pos.lat, lng: pos.lng });
        reverseGeocodePin(pos.lat, pos.lng);
      });
    }
    // The map container can be resized/repositioned by surrounding layout (e.g. a
    // multi-step wizard dialog) after Leaflet first measured it — refresh its cached
    // size before panning, or setView can silently compute the wrong pixel offset
    // and the view will look like it never moved.
    mapInstanceRef.current.invalidateSize();
    mapInstanceRef.current.setView([lat, lng], Math.max(mapInstanceRef.current.getZoom(), 13));
  };

  useEffect(() => {
    if (mode !== "map" || !mapContainerRef.current || mapInstanceRef.current) return;
    const startLat = 12.9716, startLng = 77.5946; // Bengaluru default center
    const map = L.map(mapContainerRef.current, { zoomControl: true, attributionControl: false }).setView([startLat, startLng], 11);
    L.tileLayer(`https://maps.geoapify.com/v1/tile/klokantech-basic/{z}/{x}/{y}.png?apiKey=fccc330705934d6abd2be56e77dff380`, {
      maxZoom: 20,
    }).addTo(map);
    map.on("click", (e: L.LeafletMouseEvent) => {
      placeMarker(e.latlng.lat, e.latlng.lng);
      reverseGeocodePin(e.latlng.lat, e.latlng.lng);
    });
    mapInstanceRef.current = map;

    // Re-measure once the surrounding layout (dialog animation, wizard step
    // transition) has settled, so Leaflet doesn't cache a stale container size.
    const resizeTimer = setTimeout(() => map.invalidateSize(), 250);

    return () => {
      clearTimeout(resizeTimer);
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const pickMapSuggestion = (place: any) => {
    setMapSearchQuery("");
    setMapSuggestions([]);
    if (typeof place.lat === "number" && typeof place.lng === "number") {
      placeMarker(place.lat, place.lng);
    }
    onInputChange(place.formattedAddress || place.name);
    onSelect(place);
  };

  const useMyLocation = async () => {
    try {
      const pos = await getAccuratePosition();
      placeMarker(pos.latitude, pos.longitude);
      reverseGeocodePin(pos.latitude, pos.longitude);
    } catch {
      setResolveError("Unable to get your current location — check location permissions.");
    }
  };

  const tabs: { id: Mode; label: string; icon: React.ReactNode }[] = [
    { id: "search", label: "Search", icon: <Search className="w-3 h-3" /> },
    { id: "map", label: "Map", icon: <MapIcon className="w-3 h-3" /> },
    { id: "coords", label: "URL / Lat,Lng", icon: <Link2 className="w-3 h-3" /> },
  ];

  return (
    <div className="space-y-1.5 relative" ref={boxRef}>
      <div className="flex items-center justify-between gap-2">
        <label className={`text-xs font-semibold text-foreground flex items-center gap-1.5`}>
          <MapPin className={`w-3.5 h-3.5 ${colors.text}`} /> {label}
        </label>
        <div className="flex gap-0.5 bg-background border border-border rounded-lg p-0.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setMode(t.id)}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                mode === t.id ? colors.tabActive : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {mode === "search" && (
        <div className="relative">
          <Input
            placeholder={searchPlaceholder}
            value={value}
            onChange={(e) => {
              onInputChange(e.target.value);
            }}
            className={`bg-card border-border text-xs h-10 placeholder:text-muted-foreground ${colors.ring}`}
          />
          {searching && <span className="text-[10px] text-muted-foreground absolute right-3 top-3">Searching...</span>}
          {suggestions.length > 0 && (
            <div className="absolute z-20 left-0 right-0 top-11 bg-card border border-border rounded-xl overflow-hidden shadow-2xl max-h-48 overflow-y-auto">
              {suggestions.map((place, idx) => (
                <div
                  key={idx}
                  onClick={() => pickSuggestion(place)}
                  className="p-2.5 hover:bg-muted text-xs text-foreground cursor-pointer border-b border-border/60 last:border-0"
                >
                  <div className="font-semibold">{place.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{place.formattedAddress}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {mode === "coords" && (
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <Input
              placeholder="Paste a Google Maps link, or 'latitude, longitude'"
              value={coordsInput}
              onChange={(e) => setCoordsInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleResolveLocation()}
              className={`bg-card border-border text-xs h-10 placeholder:text-muted-foreground min-w-0 flex-1 ${colors.ring}`}
            />
            <Button
              type="button"
              onClick={handleResolveLocation}
              disabled={resolving || !coordsInput.trim()}
              className="h-10 px-3 bg-muted hover:bg-muted text-foreground shrink-0"
            >
              {resolving ? <Loader className="w-3.5 h-3.5 animate-spin" /> : "Locate"}
            </Button>
          </div>
          {resolveError && (
            <div className="text-[10px] text-rose-700 dark:text-rose-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {resolveError}
            </div>
          )}
          {value && !resolveError && (
            <div className="text-[10px] text-muted-foreground truncate">Current: {value}</div>
          )}
        </div>
      )}

      {mode === "map" && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">Type &amp; press Enter, pick a result, click, or drag the pin</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={useMyLocation}
              className="h-6 px-2 text-[10px] border-border text-foreground hover:bg-muted"
            >
              <LocateFixed className="w-3 h-3 mr-1" /> My Location
            </Button>
          </div>
          <div className="relative" ref={mapSearchBoxRef}>
            <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${colors.text}`} strokeWidth={2.5} />
            <Input
              placeholder="Find a place on the map (e.g. a city, landmark, or address)..."
              value={mapSearchQuery}
              onChange={(e) => setMapSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && mapSuggestions.length > 0) {
                  e.preventDefault();
                  pickMapSuggestion(mapSuggestions[0]);
                }
              }}
              className={`bg-card border-border text-xs h-9 pl-9 placeholder:text-muted-foreground ${colors.ring}`}
            />
            {mapSearching && <span className="text-[10px] text-muted-foreground absolute right-3 top-2.5">Searching...</span>}
            {mapSuggestions.length > 0 && (
              <div className="absolute z-30 left-0 right-0 top-10 bg-card border border-border rounded-xl overflow-hidden shadow-2xl max-h-48 overflow-y-auto">
                {mapSuggestions.map((place, idx) => (
                  <div
                    key={idx}
                    onClick={() => pickMapSuggestion(place)}
                    className="p-2.5 hover:bg-muted text-xs text-foreground cursor-pointer border-b border-border/60 last:border-0"
                  >
                    <div className="font-semibold">{place.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{place.formattedAddress}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div
            ref={mapContainerRef}
            className={`relative isolate z-0 w-full h-48 rounded-xl border ${colors.border} overflow-hidden bg-card`}
          />
          {mapResolving && <div className="text-[10px] text-muted-foreground">Resolving address...</div>}
          {pinCoords && !mapResolving && (
            <div className="text-[10px] text-muted-foreground truncate">
              {value || `${pinCoords.lat.toFixed(5)}, ${pinCoords.lng.toFixed(5)}`}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
