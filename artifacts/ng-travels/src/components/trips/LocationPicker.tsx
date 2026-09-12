import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Search, Map as MapIcon, Link2, LocateFixed, Loader, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/apiFetch";

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
  emerald: { text: "text-emerald-400", ring: "focus-visible:ring-emerald-400", tabActive: "bg-emerald-400 text-zinc-950", border: "border-emerald-500/40" },
  amber: { text: "text-amber-400", ring: "focus-visible:ring-amber-400", tabActive: "bg-amber-400 text-zinc-950", border: "border-amber-500/40" },
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
    mapInstanceRef.current.setView([lat, lng], Math.max(mapInstanceRef.current.getZoom(), 13));
  };

  useEffect(() => {
    if (mode !== "map" || !mapContainerRef.current || mapInstanceRef.current) return;
    const startLat = 12.9716, startLng = 77.5946; // Bengaluru default center
    const map = L.map(mapContainerRef.current, { zoomControl: true, attributionControl: false }).setView([startLat, startLng], 11);
    L.tileLayer(`https://maps.geoapify.com/v1/tile/dark-matter-purple-roads/{z}/{x}/{y}.png?apiKey=fccc330705934d6abd2be56e77dff380`, {
      maxZoom: 20,
    }).addTo(map);
    map.on("click", (e: L.LeafletMouseEvent) => {
      placeMarker(e.latlng.lat, e.latlng.lng);
      reverseGeocodePin(e.latlng.lat, e.latlng.lng);
    });
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setResolveError("Geolocation isn't available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        placeMarker(latitude, longitude);
        reverseGeocodePin(latitude, longitude);
      },
      () => setResolveError("Unable to get your current location — check location permissions."),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const tabs: { id: Mode; label: string; icon: React.ReactNode }[] = [
    { id: "search", label: "Search", icon: <Search className="w-3 h-3" /> },
    { id: "map", label: "Map", icon: <MapIcon className="w-3 h-3" /> },
    { id: "coords", label: "URL / Lat,Lng", icon: <Link2 className="w-3 h-3" /> },
  ];

  return (
    <div className="space-y-1.5 relative" ref={boxRef}>
      <div className="flex items-center justify-between gap-2">
        <label className={`text-xs font-semibold text-zinc-300 flex items-center gap-1.5`}>
          <MapPin className={`w-3.5 h-3.5 ${colors.text}`} /> {label}
        </label>
        <div className="flex gap-0.5 bg-zinc-950 border border-zinc-800 rounded-lg p-0.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setMode(t.id)}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                mode === t.id ? colors.tabActive : "text-zinc-500 hover:text-zinc-300"
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
            className={`bg-zinc-900 border-zinc-800 text-xs h-10 placeholder:text-zinc-500 ${colors.ring}`}
          />
          {searching && <span className="text-[10px] text-zinc-500 absolute right-3 top-3">Searching...</span>}
          {suggestions.length > 0 && (
            <div className="absolute z-20 left-0 right-0 top-11 bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden shadow-2xl max-h-48 overflow-y-auto">
              {suggestions.map((place, idx) => (
                <div
                  key={idx}
                  onClick={() => pickSuggestion(place)}
                  className="p-2.5 hover:bg-zinc-800 text-xs text-zinc-200 cursor-pointer border-b border-zinc-800/60 last:border-0"
                >
                  <div className="font-semibold">{place.name}</div>
                  <div className="text-[10px] text-zinc-400 truncate">{place.formattedAddress}</div>
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
              className={`bg-zinc-900 border-zinc-800 text-xs h-10 placeholder:text-zinc-500 ${colors.ring}`}
            />
            <Button
              type="button"
              onClick={handleResolveLocation}
              disabled={resolving || !coordsInput.trim()}
              className="h-10 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 shrink-0"
            >
              {resolving ? <Loader className="w-3.5 h-3.5 animate-spin" /> : "Locate"}
            </Button>
          </div>
          {resolveError && (
            <div className="text-[10px] text-rose-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {resolveError}
            </div>
          )}
          {value && !resolveError && (
            <div className="text-[10px] text-zinc-400 truncate">Current: {value}</div>
          )}
        </div>
      )}

      {mode === "map" && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-500">Click or drag the pin to set the exact spot</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={useMyLocation}
              className="h-6 px-2 text-[10px] border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              <LocateFixed className="w-3 h-3 mr-1" /> My Location
            </Button>
          </div>
          <div
            ref={mapContainerRef}
            className={`w-full h-48 rounded-xl border ${colors.border} overflow-hidden bg-zinc-900`}
          />
          {mapResolving && <div className="text-[10px] text-zinc-500">Resolving address...</div>}
          {pinCoords && !mapResolving && (
            <div className="text-[10px] text-zinc-400 truncate">
              {value || `${pinCoords.lat.toFixed(5)}, ${pinCoords.lng.toFixed(5)}`}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
