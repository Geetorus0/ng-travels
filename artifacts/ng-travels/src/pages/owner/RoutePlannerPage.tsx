import React, { useState, useEffect, useRef } from "react";
import {
  MapPin, Navigation, Plus, Trash2, IndianRupee, Clock, ArrowRight,
  Sparkles, Compass, ShieldCheck, Car, Search, AlertCircle, CheckCircle2, RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/lib/fareEngine";
import { RealtimeFleetMap } from "@/components/maps/RealtimeFleetMap";
import { ButtonLoader } from "@/components/loading";

interface RoutePlannerPageProps {
  onOpenTripWizardWithRoute?: (routeData: any) => void;
}

interface PlaceSuggestion {
  placeId: string;
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
}

export const RoutePlannerPage: React.FC<RoutePlannerPageProps> = ({ onOpenTripWizardWithRoute }) => {
  const [pickupInput, setPickupInput] = useState("");
  const [selectedPickup, setSelectedPickup] = useState<PlaceSuggestion | null>(null);
  const [pickupSuggestions, setPickupSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searchingPickup, setSearchingPickup] = useState(false);

  const [destInput, setDestInput] = useState("");
  const [selectedDest, setSelectedDest] = useState<PlaceSuggestion | null>(null);
  const [destSuggestions, setDestSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searchingDest, setSearchingDest] = useState(false);

  const [stops, setStops] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [tripType, setTripType] = useState<"single" | "round">("round");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Route calculation results
  const [routes, setRoutes] = useState<any[]>([]);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  const [outboundMapKm, setOutboundMapKm] = useState(0);
  const [returnMapKm, setReturnMapKm] = useState(0);
  const [totalMapKm, setTotalMapKm] = useState(0);
  const [outboundDurationMinutes, setOutboundDurationMinutes] = useState(0);
  const [returnDurationMinutes, setReturnDurationMinutes] = useState(0);
  const [outboundCoordinates, setOutboundCoordinates] = useState<[number, number][]>([]);
  const [returnCoordinates, setReturnCoordinates] = useState<[number, number][]>([]);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [tollStatus, setTollStatus] = useState<string>("Unavailable / At Actuals");
  const [estimatedToll, setEstimatedToll] = useState<number>(0);

  const reqIdRef = useRef(0);

  // Debounced autocomplete for Pickup
  useEffect(() => {
    if (!pickupInput || pickupInput.length < 2) {
      setPickupSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearchingPickup(true);
      try {
        const res = await fetch(`/api/maps/places/autocomplete?input=${encodeURIComponent(pickupInput)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setPickupSuggestions(Array.isArray(data) ? data : []);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setPickupSuggestions([]);
        }
      } finally {
        setSearchingPickup(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [pickupInput]);

  // Debounced autocomplete for Destination
  useEffect(() => {
    if (!destInput || destInput.length < 2) {
      setDestSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearchingDest(true);
      try {
        const res = await fetch(`/api/maps/places/autocomplete?input=${encodeURIComponent(destInput)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setDestSuggestions(Array.isArray(data) ? data : []);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setDestSuggestions([]);
        }
      } finally {
        setSearchingDest(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [destInput]);

  // Calculate Real Driving Route
  const handleCalculate = async () => {
    setLoading(true);
    setErrorMessage(null);
    const thisReqId = ++reqIdRef.current;

    try {
      const payload = {
        pickup: selectedPickup ? {
          name: selectedPickup.name,
          address: selectedPickup.formattedAddress,
          lat: selectedPickup.lat,
          lng: selectedPickup.lng,
          placeId: selectedPickup.placeId,
          city: selectedPickup.city,
          state: selectedPickup.state,
          country: selectedPickup.country,
        } : { name: pickupInput, address: pickupInput },
        destination: selectedDest ? {
          name: selectedDest.name,
          address: selectedDest.formattedAddress,
          lat: selectedDest.lat,
          lng: selectedDest.lng,
          placeId: selectedDest.placeId,
          city: selectedDest.city,
          state: selectedDest.state,
          country: selectedDest.country,
        } : { name: destInput, address: destInput },
        stops: stops.filter((s) => s.trim() !== "").map((s) => ({ name: s, address: s })),
        tripType: tripType === "round" ? "round_trip" : "single_trip",
      };

      const res = await fetch("/api/maps/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (thisReqId !== reqIdRef.current) return; // Discard stale response

      const data = await res.json();

      if (!res.ok || !data.routes || data.routes.length === 0) {
        setErrorMessage(data.error || "Unable to calculate the driving route. Please verify the pickup and destination.");
        return;
      }

      setRoutes(data.routes);
      setSelectedRouteIdx(0);
      setOutboundMapKm(data.outboundMapKm || data.routes[0].distanceKm);
      setReturnMapKm(data.returnMapKm || 0);
      setTotalMapKm(data.totalMapKm || data.routes[0].distanceKm);
      setOutboundDurationMinutes(data.outboundLeg?.durationMinutes || data.routes[0].durationMinutes);
      setReturnDurationMinutes(data.returnLeg?.durationMinutes || 0);
      setOutboundCoordinates(data.outboundCoordinates || []);
      setReturnCoordinates(data.returnCoordinates || []);
      setRouteCoordinates(data.routeCoordinates || []);
      setTollStatus(data.tollStatus || "Unavailable / At Actuals");
      setEstimatedToll(data.apiEstimatedToll || 0);
    } catch (err: any) {
      if (thisReqId === reqIdRef.current) {
        setErrorMessage("Network error calculating driving route. Please check connection and try again.");
      }
    } finally {
      if (thisReqId === reqIdRef.current) {
        setLoading(false);
      }
    }
  };

  // Initial calculation on mount
  useEffect(() => {
    handleCalculate();
  }, [tripType]);

  const selected = routes[selectedRouteIdx] || routes[0];

  const handleSelectPickup = (p: PlaceSuggestion) => {
    setSelectedPickup(p);
    setPickupInput(p.formattedAddress || p.name);
    setPickupSuggestions([]);
  };

  const handleSelectDest = (p: PlaceSuggestion) => {
    setSelectedDest(p);
    setDestInput(p.formattedAddress || p.name);
    setDestSuggestions([]);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-zinc-100 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-amber-400" />
            Google Maps Route Intelligence & Live GPS Planner
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real driving highway routing, independent outbound & return legs, authentic road coordinates, and verified commercial mileage.
          </p>
        </div>

        {onOpenTripWizardWithRoute && (
          <Button
            size="sm"
            onClick={() => onOpenTripWizardWithRoute({
              pickup: selectedPickup ? { name: selectedPickup.name, address: selectedPickup.formattedAddress, latitude: selectedPickup.lat, longitude: selectedPickup.lng, placeId: selectedPickup.placeId } : { name: pickupInput, address: pickupInput },
              destination: selectedDest ? { name: selectedDest.name, address: selectedDest.formattedAddress, latitude: selectedDest.lat, longitude: selectedDest.lng, placeId: selectedDest.placeId } : { name: destInput, address: destInput },
              billingKm: totalMapKm || selected?.distanceKm || 0,
              outboundMapKm,
              returnMapKm,
              totalMapKm,
              estimatedToll,
              routeSummary: selected?.summary || "",
              tripType: tripType === "round" ? "round_trip" : "single_trip",
            })}
            className="bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs h-9 px-4 shadow-lg shadow-amber-400/20 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Dispatch Trip With This Route
          </Button>
        )}
      </div>

      {errorMessage && (
        <div className="bg-rose-950/40 border border-rose-500/40 text-rose-300 p-3.5 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Route Parameters */}
        <div className="lg:col-span-4 space-y-4 bg-zinc-900/80 p-5 rounded-2xl border border-zinc-800 shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Itinerary Configuration</h2>
            <div className="flex bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
              <button
                type="button"
                onClick={() => setTripType("single")}
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  tripType === "single" ? "bg-amber-400 text-zinc-950 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                One Way
              </button>
              <button
                type="button"
                onClick={() => setTripType("round")}
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  tripType === "round" ? "bg-amber-400 text-zinc-950 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Round Trip
              </button>
            </div>
          </div>

          {/* Pickup Autocomplete */}
          <div className="relative">
            <label className="text-[11px] text-emerald-400 font-bold uppercase block mb-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Origin / Pickup Location
            </label>
            <div className="relative">
              <Input
                value={pickupInput}
                onChange={(e) => {
                  setPickupInput(e.target.value);
                  setSelectedPickup(null);
                }}
                placeholder="Type pickup place, city, or airport (e.g. Bengaluru, Indiranagar)..."
                className="bg-zinc-950 border-zinc-800 text-xs h-10 pr-8"
              />
              {searchingPickup && (
                <div className="absolute right-2.5 top-2.5">
                  <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {selectedPickup && (
              <div className="mt-1 flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
                <CheckCircle2 className="w-3 h-3" />
                <span>Verified: {selectedPickup.lat.toFixed(4)}, {selectedPickup.lng.toFixed(4)}</span>
              </div>
            )}

            {pickupSuggestions.length > 0 && (
              <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-zinc-950 border border-zinc-700 rounded-xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-zinc-800">
                {pickupSuggestions.map((s, idx) => (
                  <div
                    key={s.placeId || idx}
                    onClick={() => handleSelectPickup(s)}
                    className="p-2.5 hover:bg-zinc-900 cursor-pointer text-xs transition-colors"
                  >
                    <div className="font-bold text-zinc-200 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span>{s.name}</span>
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate pl-5">{s.formattedAddress}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Intermediate Stops */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[11px] text-purple-400 font-bold uppercase flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-400" /> Intermediate Waypoints
              </label>
              <Button size="sm" variant="ghost" onClick={() => setStops([...stops, ""])} className="text-xs text-amber-400 h-6 px-2 hover:bg-amber-950/20">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Stop
              </Button>
            </div>
            {stops.map((stop, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <Input
                  value={stop}
                  onChange={(e) => {
                    const next = [...stops];
                    next[idx] = e.target.value;
                    setStops(next);
                  }}
                  placeholder={`Waypoint ${idx + 1} (e.g. Mandya, Maddur, Mysore Road)...`}
                  className="bg-zinc-950 border-zinc-800 text-xs h-9 flex-1"
                />
                <Button size="sm" variant="ghost" onClick={() => setStops(stops.filter((_, i) => i !== idx))} className="text-rose-400 hover:bg-rose-950/20 h-8 w-8 p-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>

          {/* Destination Autocomplete */}
          <div className="relative">
            <label className="text-[11px] text-amber-400 font-bold uppercase block mb-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> Destination Dropoff Point
            </label>
            <div className="relative">
              <Input
                value={destInput}
                onChange={(e) => {
                  setDestInput(e.target.value);
                  setSelectedDest(null);
                }}
                placeholder="Type destination city or landmark (e.g. Mysore Palace, Ooty, Chennai)..."
                className="bg-zinc-950 border-zinc-800 text-xs h-10 pr-8"
              />
              {searchingDest && (
                <div className="absolute right-2.5 top-2.5">
                  <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {selectedDest && (
              <div className="mt-1 flex items-center gap-1.5 text-[10px] text-amber-400 font-mono">
                <CheckCircle2 className="w-3 h-3" />
                <span>Verified: {selectedDest.lat.toFixed(4)}, {selectedDest.lng.toFixed(4)}</span>
              </div>
            )}

            {destSuggestions.length > 0 && (
              <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-zinc-950 border border-zinc-700 rounded-xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-zinc-800">
                {destSuggestions.map((s, idx) => (
                  <div
                    key={s.placeId || idx}
                    onClick={() => handleSelectDest(s)}
                    className="p-2.5 hover:bg-zinc-900 cursor-pointer text-xs transition-colors"
                  >
                    <div className="font-bold text-zinc-200 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      <span>{s.name}</span>
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate pl-5">{s.formattedAddress}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Calculate CTA */}
          <Button
            onClick={handleCalculate}
            disabled={loading}
            className="w-full bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs h-11 shadow-lg shadow-amber-400/20 cursor-pointer"
          >
            {loading ? (
              <ButtonLoader label="Computing Driving Routes..." />
            ) : (
              <>
                <Navigation className="w-4 h-4 mr-1.5" /> Calculate Real Road Route
              </>
            )}
          </Button>

          {/* Round Trip Distance Card (Section 9) */}
          {tripType === "round" && totalMapKm > 0 && (
            <div className="bg-zinc-950 p-4 rounded-xl border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase text-amber-400 flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" /> ROUND TRIP BREAKDOWN
                </span>
                <span className="text-[10px] font-mono bg-amber-400/10 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                  REAL ROAD LEGS
                </span>
              </div>

              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between items-center text-zinc-300">
                  <span className="text-zinc-400">Outbound Leg</span>
                  <span className="font-bold text-sky-400">{outboundMapKm} km</span>
                </div>
                <div className="flex justify-between items-center text-zinc-300">
                  <span className="text-zinc-400">Return Leg</span>
                  <span className="font-bold text-purple-400">{returnMapKm} km</span>
                </div>
                <div className="border-t border-zinc-800 pt-1.5 flex justify-between items-center font-bold text-zinc-100">
                  <span>Total Billable Distance</span>
                  <span className="text-amber-400 text-sm">{totalMapKm} km</span>
                </div>
              </div>

              <div className="border-t border-zinc-850 pt-2 text-[11px] font-mono text-zinc-400 space-y-1">
                <div className="flex justify-between">
                  <span>Outbound Time:</span>
                  <span className="text-zinc-200">~{Math.floor(outboundDurationMinutes / 60)}h {outboundDurationMinutes % 60}m</span>
                </div>
                <div className="flex justify-between">
                  <span>Return Time:</span>
                  <span className="text-zinc-200">~{Math.floor(returnDurationMinutes / 60)}h {returnDurationMinutes % 60}m</span>
                </div>
                <div className="flex justify-between">
                  <span>Highway Toll:</span>
                  <span className="text-emerald-400 font-bold">
                    {estimatedToll > 0 ? formatINR(estimatedToll) : tollStatus}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Route Options Selector */}
          {routes.length > 0 && (
            <div className="pt-2 space-y-2.5">
              <div className="text-[11px] font-bold text-zinc-400 uppercase">Available Route Options ({routes.length})</div>
              {routes.map((opt, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedRouteIdx(idx)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all space-y-2 ${
                    selectedRouteIdx === idx
                      ? "bg-amber-950/30 border-amber-400 ring-1 ring-amber-400/50"
                      : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-bold text-xs text-zinc-200">{opt.summary}</span>
                    <span className="text-[9px] bg-zinc-900 text-amber-300 px-2 py-0.5 rounded font-mono font-bold whitespace-nowrap">
                      {opt.via}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs font-mono pt-1">
                    <div>
                      <span className="text-[9px] text-zinc-500 block uppercase">Distance</span>
                      <span className="font-bold text-zinc-100">{opt.distanceKm} KM</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-500 block uppercase">Travel Time</span>
                      <span className="font-bold text-sky-300">~{Math.floor(opt.durationMinutes / 60)}h {opt.durationMinutes % 60}m</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-500 block uppercase">Toll Fee</span>
                      <span className="font-bold text-emerald-400">
                        {opt.estimatedToll > 0 ? formatINR(opt.estimatedToll) : (opt.tollStatus || "At Actuals")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Interactive Real-Time Map Canvas */}
        <div className="lg:col-span-8 space-y-4">
          <RealtimeFleetMap
            pickup={{
              name: selectedPickup ? selectedPickup.name : pickupInput,
              address: selectedPickup ? selectedPickup.formattedAddress : pickupInput,
              lat: selectedPickup?.lat,
              lng: selectedPickup?.lng,
            }}
            destination={{
              name: selectedDest ? selectedDest.name : destInput,
              address: selectedDest ? selectedDest.formattedAddress : destInput,
              lat: selectedDest?.lat,
              lng: selectedDest?.lng,
            }}
            stops={stops.filter((s) => s.trim() !== "").map((s) => ({ name: s, address: s }))}
            selectedRouteSummary={selected?.summary}
            billingKm={totalMapKm || selected?.distanceKm || 0}
            outboundMapKm={outboundMapKm}
            returnMapKm={returnMapKm}
            totalMapKm={totalMapKm}
            tripType={tripType === "round" ? "round_trip" : "single_trip"}
            outboundCoordinates={outboundCoordinates}
            returnCoordinates={returnCoordinates}
            routeCoordinates={routeCoordinates}
            estimatedToll={estimatedToll}
            height="520px"
          />

          {/* Quick Route Summary Card */}
          {selected && (
            <div className="bg-gradient-to-r from-amber-950/30 via-zinc-900 to-zinc-900/90 border border-amber-500/30 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
              <div className="space-y-1">
                <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider font-mono">
                  {tripType === "round" ? "ROUND TRIP REAL ROAD ROUTE" : "ONE WAY REAL ROAD ROUTE"}
                </div>
                <h3 className="font-black text-zinc-100 text-sm sm:text-base">
                  {pickupInput.split(",")[0]} {tripType === "round" ? "⇄" : "➔"} {destInput.split(",")[0]} ({totalMapKm || selected.distanceKm} km)
                </h3>
                <p className="text-xs text-zinc-400">
                  Highway Time: ~{Math.floor((outboundDurationMinutes + returnDurationMinutes || selected.durationMinutes) / 60)}h {(outboundDurationMinutes + returnDurationMinutes || selected.durationMinutes) % 60}m • Toll: <strong className="text-emerald-400">{estimatedToll > 0 ? formatINR(estimatedToll) : tollStatus}</strong>
                </p>
              </div>

              {onOpenTripWizardWithRoute && (
                <Button
                  onClick={() => onOpenTripWizardWithRoute({
                    pickup: selectedPickup ? { name: selectedPickup.name, address: selectedPickup.formattedAddress, latitude: selectedPickup.lat, longitude: selectedPickup.lng, placeId: selectedPickup.placeId } : { name: pickupInput, address: pickupInput },
                    destination: selectedDest ? { name: selectedDest.name, address: selectedDest.formattedAddress, latitude: selectedDest.lat, longitude: selectedDest.lng, placeId: selectedDest.placeId } : { name: destInput, address: destInput },
                    billingKm: totalMapKm || selected.distanceKm,
                    outboundMapKm,
                    returnMapKm,
                    totalMapKm,
                    estimatedToll,
                    routeSummary: selected.summary,
                    tripType: tripType === "round" ? "round_trip" : "single_trip",
                  })}
                  className="bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs h-10 px-5 shadow-xl shadow-amber-400/25 flex items-center gap-1.5 cursor-pointer w-full sm:w-auto flex-shrink-0"
                >
                  <Plus className="w-4 h-4" /> Book This Route
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

