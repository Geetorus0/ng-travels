import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  calculateFare,
  calculateBaseFare,
  calculateCustomerTotal,
  calculateCommercialFare,
  calculateBillableDays,
  formatINR,
  formatKM,
} from "@/lib/fareEngine";
import { RealtimeFleetMap } from "@/components/maps/RealtimeFleetMap";
import {
  User, Calendar, MapPin, Navigation, IndianRupee, ShieldCheck, CheckCircle2,
  Plus, Trash2, ArrowRight, ArrowLeft, Sparkles, AlertTriangle,
  Clock, Car, Search, Map
} from "lucide-react";
import { TripActionLoader, ButtonLoader } from "@/components/loading";

export interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTripCreated: (newTrip: any) => void;
  customers: any[];
  drivers: any[];
  defaultRate?: number;
  defaultMinimumKm?: number;
  defaultDriverBata?: number;
  defaultBillingDayPolicy?: "CALENDAR_DAYS" | "24_HOUR_PERIODS";
  initialEnquiry?: any;
}

export const CreateTripModal: React.FC<CreateTripModalProps> = ({
  isOpen,
  onClose,
  onTripCreated,
  customers,
  drivers,
  defaultRate = 18,
  defaultMinimumKm = 250,
  defaultDriverBata = 500,
  defaultBillingDayPolicy = "CALENDAR_DAYS",
  initialEnquiry,
}) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Customer
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerMobile, setNewCustomerMobile] = useState("");
  const [newCustomerWhatsapp, setNewCustomerWhatsapp] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");
  const [isCreatingNewCustomer, setIsCreatingNewCustomer] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");

  // Step 2: Trip Type & Dates
  const [tripType, setTripType] = useState<"single_trip" | "round_trip" | "outstation_round_trip" | "outstation_one_way" | "local_rental" | "airport_transfer">("single_trip");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("08:00");
  const [returnDate, setReturnDate] = useState(new Date().toISOString().slice(0, 10));
  const [returnTime, setReturnTime] = useState("20:00");
  const [passengerCount, setPassengerCount] = useState(3);
  const [notes, setNotes] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");

  // Step 3 & 4: Places & Google Autocomplete
  const [pickupInput, setPickupInput] = useState("Erode Central");
  const [pickupLocation, setPickupLocation] = useState<any>({ name: "Erode Central", address: "Erode Bus Stand, Erode, Tamil Nadu", latitude: 11.341, longitude: 77.7172 });
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [searchingPickup, setSearchingPickup] = useState(false);

  const [destInput, setDestInput] = useState("Coimbatore Junction");
  const [destLocation, setDestLocation] = useState<any>({ name: "Coimbatore Junction", address: "Gopalapuram, Coimbatore, Tamil Nadu", latitude: 11.0168, longitude: 76.9558 });
  const [destSuggestions, setDestSuggestions] = useState<any[]>([]);
  const [searchingDest, setSearchingDest] = useState(false);

  // Step 5: Stops / Waypoints
  const [stops, setStops] = useState<{ name: string; address: string; latitude?: number; longitude?: number }[]>([]);
  const [stopInput, setStopInput] = useState("");

  // Step 6: Route Calculations
  const [calculatingRoutes, setCalculatingRoutes] = useState(false);
  const [routeOptions, setRouteOptions] = useState<any[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [outboundMapKm, setOutboundMapKm] = useState(0);
  const [returnMapKm, setReturnMapKm] = useState(0);
  const [totalMapKm, setTotalMapKm] = useState(0);
  const [outboundDurationMinutes, setOutboundDurationMinutes] = useState(0);
  const [returnDurationMinutes, setReturnDurationMinutes] = useState(0);
  const [totalDurationMinutes, setTotalDurationMinutes] = useState(0);
  const [outboundCoordinates, setOutboundCoordinates] = useState<[number, number][]>([]);
  const [returnCoordinates, setReturnCoordinates] = useState<[number, number][]>([]);
  const [estimatedToll, setEstimatedToll] = useState(0);
  const [tollAvailable, setTollAvailable] = useState(false);

  // Step 7 & 8: Commercial Fare & Charges
  const [billingKm, setBillingKm] = useState(0);
  const [ratePerKm, setRatePerKm] = useState(defaultRate);
  const [minimumKmPerDay, setMinimumKmPerDay] = useState(defaultMinimumKm);
  const [driverBataPerDay, setDriverBataPerDay] = useState(defaultDriverBata);
  const [nightBata, setNightBata] = useState(0);
  const [finalToll, setFinalToll] = useState(0);
  const [parking, setParking] = useState(0);
  const [permitCharge, setPermitCharge] = useState(0);
  const [waitingCharge, setWaitingCharge] = useState(0);
  const [nightCharge, setNightCharge] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);
  const [billingDayPolicy, setBillingDayPolicy] = useState<"CALENDAR_DAYS" | "24_HOUR_PERIODS">(defaultBillingDayPolicy);

  // Step 9: Driver & Vehicle Assignment
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);

  const { data: rawVehicles = [] } = useQuery<any>({
    queryKey: ["/api/vehicles"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/vehicles");
        if (!res.ok) return [];
        const json = await res.json();
        return Array.isArray(json) ? json : (Array.isArray(json?.items) ? json.items : []);
      } catch {
        return [];
      }
    },
  });

  const vehicles: any[] = Array.isArray(rawVehicles)
    ? rawVehicles
    : Array.isArray((rawVehicles as any)?.items)
    ? (rawVehicles as any).items
    : [];

  // Step 10: Advance Payment
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [paymentReference, setPaymentReference] = useState("");

  // Search pickup places autocomplete with request cancellation
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

  // Search destination places autocomplete with request cancellation
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

  // Pre-fill from initial enquiry if provided
  useEffect(() => {
    if (initialEnquiry) {
      setNewCustomerName(initialEnquiry.customerName || "");
      setNewCustomerMobile(initialEnquiry.customerMobile || "");
      setIsCreatingNewCustomer(true);
      if (initialEnquiry.pickup) {
        setPickupInput(initialEnquiry.pickup);
        setPickupLocation({ name: initialEnquiry.pickup, address: initialEnquiry.pickup });
      }
      if (initialEnquiry.destination) {
        setDestInput(initialEnquiry.destination);
        setDestLocation({ name: initialEnquiry.destination, address: initialEnquiry.destination });
      }
      if (initialEnquiry.tripType) setTripType(initialEnquiry.tripType);
      if (initialEnquiry.startDate) setStartDate(initialEnquiry.startDate);
      if (initialEnquiry.passengerCount) setPassengerCount(initialEnquiry.passengerCount);
    }
  }, [initialEnquiry]);

  // Sync default commercial settings when modal opens
  useEffect(() => {
    if (isOpen) {
      setRatePerKm(defaultRate);
      setMinimumKmPerDay(defaultMinimumKm);
      setDriverBataPerDay(defaultDriverBata);
      setBillingDayPolicy(defaultBillingDayPolicy);
    }
  }, [isOpen, defaultRate, defaultMinimumKm, defaultDriverBata, defaultBillingDayPolicy]);

  // Central Authoritative Commercial Fare calculation
  const isRound = tripType.toLowerCase().includes("round");
  const commercialFare = calculateCommercialFare({
    tripType,
    outboundDistanceKm: outboundMapKm,
    returnDistanceKm: returnMapKm,
    totalRoadDistanceKm: totalMapKm,
    ratePerKm,
    startDate,
    returnDate: isRound ? returnDate : null,
    startTime,
    returnTime,
    billingDayPolicy,
    minimumKmPerDay: isRound ? minimumKmPerDay : 0,
    driverBataPerDay: isRound ? driverBataPerDay : 0,
    nightBata,
    permitCharge,
    toll: finalToll,
    tollAvailable,
    parking,
    waiting: waitingCharge,
    nightCharges: nightCharge,
    discount,
    taxPercent,
    totalPaid: advanceAmount,
  });

  const baseFare = commercialFare.distanceFare;
  const customerTotal = commercialFare.customerTotal;
  const remainingBalance = commercialFare.remainingBalance;

  // Fetch Route from backend
  const fetchRouteAlternatives = async () => {
    setCalculatingRoutes(true);
    try {
      const res = await fetch("/api/maps/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickup: pickupLocation,
          destination: destLocation,
          stops,
          tripType,
        }),
      });
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        setRouteOptions(data.routes);
        setSelectedRouteIndex(0);
        setOutboundMapKm(data.outboundDistanceKm || data.totalDistanceKm || 0);
        setReturnMapKm(data.returnDistanceKm || 0);
        setTotalMapKm(data.totalDistanceKm || 0);
        setOutboundDurationMinutes(data.outboundDurationMinutes || 0);
        setReturnDurationMinutes(data.returnDurationMinutes || 0);
        setTotalDurationMinutes(data.totalDurationMinutes || 0);
        setOutboundCoordinates(data.outboundCoordinates || data.coordinates || []);
        setReturnCoordinates(data.returnCoordinates || []);
        setEstimatedToll(data.estimatedToll || 0);
        setFinalToll(data.estimatedToll || 0);
        setTollAvailable(!!data.tollAvailable);
        setBillingKm(data.totalDistanceKm || 0);
      }
    } catch (err) {
      console.error("Failed to calculate driving routes:", err);
    } finally {
      setCalculatingRoutes(false);
    }
  };

  const handleNext = async () => {
    if (step === 3) {
      await fetchRouteAlternatives();
      setStep(4);
    } else {
      setStep((prev) => Math.min(prev + 1, 7));
    }
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  // Add stop
  const handleAddStop = () => {
    if (stopInput.trim()) {
      setStops([...stops, { name: stopInput.trim(), address: stopInput.trim() }]);
      setStopInput("");
    }
  };

  const handleRemoveStop = (idx: number) => {
    setStops(stops.filter((_, i) => i !== idx));
  };

  // Submit and create trip in database
  const handleSubmitBooking = async () => {
    setLoading(true);
    try {
      let customerId = selectedCustomerId;

      // If creating new customer, create first
      if (isCreatingNewCustomer) {
        const custRes = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newCustomerName,
            mobile: newCustomerMobile,
            whatsapp: newCustomerWhatsapp || newCustomerMobile,
            address: newCustomerAddress || pickupLocation.address,
          }),
        });
        const newCust = await custRes.json();
        customerId = newCust.id;
      }

      if (!customerId) {
        alert("Please select or create a customer");
        setLoading(false);
        return;
      }

      const selectedRoute = routeOptions[selectedRouteIndex] || {
        summary: "Standard Highway Route",
        distanceKm: totalMapKm,
        durationMinutes: 120,
      };

      const payload = {
        customerId,
        tripType,
        pickup: pickupLocation,
        destination: destLocation,
        stops,
        startDate,
        startTime,
        returnDate: tripType.includes("round") ? returnDate : null,
        returnTime: tripType.includes("round") ? returnTime : null,
        passengerCount,
        notes,
        specialInstructions,
        outboundMapKm,
        returnMapKm,
        totalMapKm,
        routeDurationMinutes: totalDurationMinutes || selectedRoute.durationMinutes,
        outboundDurationMinutes,
        returnDurationMinutes,
        routeSummary: selectedRoute.summary,
        selectedRouteSummary: selectedRoute.summary,
        routeOptions,
        estimatedToll,
        billingKm: commercialFare.totalBillableDistance,
        ratePerKm,
        minimumKmPerDay,
        driverBataPerDay,
        nightBata,
        billingDayPolicy,
        finalToll,
        parking,
        permitCharge,
        waitingCharge,
        nightCharge,
        discount,
        taxPercent,
        driverId: selectedDriverId,
        vehicleId: selectedVehicleId,
        advance: advanceAmount,
        paymentMethod,
        paymentReference,
      };

      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to create trip");
      }

      const createdTrip = await res.json();
      onTripCreated(createdTrip);
      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to create trip");
    } finally {
      setLoading(false);
    }
  };

  const customerList = Array.isArray(customers)
    ? customers
    : Array.isArray((customers as any)?.items)
    ? (customers as any).items
    : [];

  const filteredCustomers = customerList.filter(
    (c: any) =>
      c &&
      ((c.name || "").toLowerCase().includes(customerSearch.toLowerCase()) ||
       (c.mobile || "").includes(customerSearch))
  );

  return (
    <>
      {loading && <TripActionLoader action="create" />}

      <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[96vw] max-w-3xl bg-zinc-950 border-zinc-800 text-zinc-100 max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-2xl shadow-2xl">
        <DialogHeader className="border-b border-zinc-800/80 pb-3 sm:pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base sm:text-xl font-black text-amber-400 flex items-center gap-1.5 sm:gap-2">
              <Navigation className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              CREATE TRIP & DISPATCH
            </DialogTitle>
            <span className="text-[10px] sm:text-xs font-mono font-bold px-2 py-0.5 sm:py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
              STEP {step}/7
            </span>
          </div>

          {/* Progress indicators */}
          <div className="flex items-center gap-1 sm:gap-1.5 mt-2 sm:mt-3">
            {["Customer", "Type", "Route", "Tolls", "Fare", "Driver", "Review"].map(
              (label, idx) => (
                <div key={idx} className="flex-1">
                  <div
                    className={`h-1 sm:h-1.5 rounded-full transition-all ${
                      step > idx + 1
                        ? "bg-emerald-400"
                        : step === idx + 1
                        ? "bg-amber-400 animate-pulse"
                        : "bg-zinc-800"
                    }`}
                  />
                  <div className={`text-[9px] sm:text-[10px] font-medium truncate mt-0.5 sm:mt-1 hidden xs:block ${
                    step === idx + 1 ? "text-amber-400 font-bold" : "text-zinc-500"
                  }`}>{label}</div>
                </div>
              )
            )}
          </div>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* STEP 1: CUSTOMER SELECTION */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-200">Customer Identification</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsCreatingNewCustomer(!isCreatingNewCustomer)}
                  className="border-amber-500/40 text-amber-300 text-xs h-8"
                >
                  {isCreatingNewCustomer ? "Select Existing Customer" : "+ Add New Customer"}
                </Button>
              </div>

              {!isCreatingNewCustomer ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                    <Input
                      placeholder="Search customer by name or phone..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-9 bg-zinc-900 border-zinc-800 text-xs h-10"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                    {filteredCustomers.map((cust: any) => {
                      const isSelected = selectedCustomerId === cust.id;
                      return (
                        <div
                          key={cust.id}
                          onClick={() => setSelectedCustomerId(cust.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                            isSelected
                              ? "bg-amber-950/40 border-amber-400 text-zinc-100 shadow-md shadow-amber-400/10"
                              : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-300"
                          }`}
                        >
                          <div className="font-bold text-xs flex items-center justify-between">
                            <span>{cust.name}</span>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                          </div>
                          <div className="text-[11px] text-zinc-400 mt-0.5">{cust.mobile}</div>
                          <div className="text-[10px] text-zinc-500 truncate mt-1">{cust.address || "No address on file"}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 bg-zinc-900/40 p-4 rounded-xl border border-zinc-800">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">Customer Full Name *</label>
                      <Input
                        placeholder="e.g. Anand Kumar"
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        className="bg-zinc-900 border-zinc-800 text-xs h-9"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">Mobile Number *</label>
                      <Input
                        placeholder="e.g. +91 98450 12345"
                        value={newCustomerMobile}
                        onChange={(e) => setNewCustomerMobile(e.target.value)}
                        className="bg-zinc-900 border-zinc-800 text-xs h-9"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">WhatsApp Number</label>
                      <Input
                        placeholder="e.g. +91 98450 12345"
                        value={newCustomerWhatsapp}
                        onChange={(e) => setNewCustomerWhatsapp(e.target.value)}
                        className="bg-zinc-900 border-zinc-800 text-xs h-9"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">Customer Address</label>
                      <Input
                        placeholder="e.g. Indiranagar, Bengaluru"
                        value={newCustomerAddress}
                        onChange={(e) => setNewCustomerAddress(e.target.value)}
                        className="bg-zinc-900 border-zinc-800 text-xs h-9"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: TRIP TYPE & SCHEDULE */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-zinc-200">Trip Category & Schedule</h3>

              {/* Trip Type Selector */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  { id: "single_trip", label: "Single Trip", desc: "Point-to-point one way" },
                  { id: "round_trip", label: "Round Trip", desc: "Return to origin with toll breakdown" },
                  { id: "outstation_round_trip", label: "Outstation Round", desc: "Multi-day outstation" },
                  { id: "outstation_one_way", label: "Outstation Drop", desc: "One-way outstation transfer" },
                  { id: "local_rental", label: "Local Rental", desc: "8 Hr / 80 Km package" },
                  { id: "airport_transfer", label: "Airport Run", desc: "Pickup / drop transfer" },
                ].map((t) => {
                  const isSelected = tripType === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setTripType(t.id as any)}
                      className={`p-3 rounded-xl border cursor-pointer text-left transition-all ${
                        isSelected
                          ? "bg-amber-950/40 border-amber-400 text-zinc-100"
                          : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-400"
                      }`}
                    >
                      <div className="font-bold text-xs text-zinc-100">{t.label}</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">{t.desc}</div>
                    </div>
                  );
                })}
              </div>

              {/* Date & Time Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-900/40 p-4 rounded-xl border border-zinc-800">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-amber-400 block">Departure Timing</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-zinc-400">Date</label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-zinc-900 border-zinc-800 text-xs h-9"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400">Time</label>
                      <Input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="bg-zinc-900 border-zinc-800 text-xs h-9"
                      />
                    </div>
                  </div>
                </div>

                {tripType.includes("round") && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-emerald-400 block">Return Timing</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-zinc-400">Date</label>
                        <Input
                          type="date"
                          value={returnDate}
                          onChange={(e) => setReturnDate(e.target.value)}
                          className="bg-zinc-900 border-zinc-800 text-xs h-9"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-400">Time</label>
                        <Input
                          type="time"
                          value={returnTime}
                          onChange={(e) => setReturnTime(e.target.value)}
                          className="bg-zinc-900 border-zinc-800 text-xs h-9"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Passenger Count</label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={passengerCount}
                    onChange={(e) => setPassengerCount(Number(e.target.value))}
                    className="bg-zinc-900 border-zinc-800 text-xs h-9"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Special Driver Instructions</label>
                  <Input
                    placeholder="e.g. Keep AC on, water bottles ready"
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    className="bg-zinc-900 border-zinc-800 text-xs h-9"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: ROUTE & PLACES AUTOCOMPLETE */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-zinc-200 flex items-center justify-between">
                <span>Route & Location Search (Google Places Autocomplete)</span>
                <span className="text-[10px] text-amber-400 font-mono">Any Place in India/World</span>
              </h3>

              {/* Pickup Place Input */}
              <div className="space-y-1 relative">
                <label className="text-xs font-bold text-amber-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> Pickup Location *
                </label>
                <Input
                  placeholder="Type pickup place, city, airport, landmark..."
                  value={pickupInput}
                  onChange={(e) => setPickupInput(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-xs h-10 font-semibold text-zinc-100"
                />
                {pickupSuggestions.length > 0 && (
                  <div className="absolute top-16 left-0 right-0 z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                    {pickupSuggestions.map((place, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setPickupLocation(place);
                          setPickupInput(place.name);
                          setPickupSuggestions([]);
                        }}
                        className="p-2.5 hover:bg-amber-950/40 cursor-pointer border-b border-zinc-800/60 last:border-0"
                      >
                        <div className="font-bold text-xs text-zinc-100">{place.name}</div>
                        <div className="text-[10px] text-zinc-400">{place.address}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="text-[10px] text-zinc-500">Selected: {pickupLocation.name} ({pickupLocation.address})</div>
              </div>

              {/* Destination Place Input */}
              <div className="space-y-1 relative">
                <label className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> Destination *
                </label>
                <Input
                  placeholder="Type destination city, landmark, hotel..."
                  value={destInput}
                  onChange={(e) => setDestInput(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-xs h-10 font-semibold text-zinc-100"
                />
                {destSuggestions.length > 0 && (
                  <div className="absolute top-16 left-0 right-0 z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                    {destSuggestions.map((place, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setDestLocation(place);
                          setDestInput(place.name);
                          setDestSuggestions([]);
                        }}
                        className="p-2.5 hover:bg-emerald-950/40 cursor-pointer border-b border-zinc-800/60 last:border-0"
                      >
                        <div className="font-bold text-xs text-zinc-100">{place.name}</div>
                        <div className="text-[10px] text-zinc-400">{place.address}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="text-[10px] text-zinc-500">Selected: {destLocation.name} ({destLocation.address})</div>
              </div>

              {/* Stops / Waypoints */}
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <label className="text-xs font-bold text-zinc-400">Via Stops / Enroute Waypoints</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add intermediate stop (e.g. Mandya, Tirupur Bypass)..."
                    value={stopInput}
                    onChange={(e) => setStopInput(e.target.value)}
                    className="bg-zinc-900 border-zinc-800 text-xs h-9"
                  />
                  <Button size="sm" onClick={handleAddStop} className="bg-zinc-800 hover:bg-zinc-700 text-xs">
                    + Add Stop
                  </Button>
                </div>
                {stops.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {stops.map((stop, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded bg-zinc-900 border border-zinc-800 text-xs">
                        <span>Stop #{idx + 1}: <strong>{stop.name}</strong></span>
                        <Button size="sm" variant="ghost" onClick={() => handleRemoveStop(idx)} className="h-6 w-6 p-0 text-rose-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: REAL DRIVING MAP PREVIEW & DISTANCE BREAKDOWN (Phase 52) */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-amber-400" />
                    Real Driving Route & GPS Distance Snapshot
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Live road route calculated via real driving network. No straight lines or fake distances.
                  </p>
                </div>
                {calculatingRoutes && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-mono bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/30">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    Computing live road route...
                  </span>
                )}
              </div>

              {/* Real Interactive Driving Route Map */}
              <RealtimeFleetMap
                pickup={pickupLocation}
                destination={destLocation}
                stops={stops}
                height="300px"
                tripType={tripType}
                outboundCoordinates={outboundCoordinates}
                returnCoordinates={returnCoordinates}
                outboundDistanceKm={outboundMapKm}
                returnDistanceKm={returnMapKm}
                outboundDurationMinutes={outboundDurationMinutes}
                returnDurationMinutes={returnDurationMinutes}
                billingKm={commercialFare.totalBillableDistance}
                className="border-zinc-800"
              />

              {/* Round-Trip / One-Way Official Distance Card */}
              {isRound ? (
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <Car className="w-4 h-4" /> Round-Trip Highway Journey
                    </span>
                    <span className="text-[11px] font-mono text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded">
                      {commercialFare.billableDays} Calendar Days ({startDate} ➔ {returnDate})
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/60">
                      <span className="text-[10px] text-blue-400 uppercase font-bold block">Outbound Leg</span>
                      <div className="text-base font-bold font-mono text-zinc-100">{outboundMapKm} KM</div>
                      <span className="text-[10px] text-zinc-400">
                        {Math.floor(outboundDurationMinutes / 60)}h {outboundDurationMinutes % 60}m
                      </span>
                    </div>
                    <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/60">
                      <span className="text-[10px] text-purple-400 uppercase font-bold block">Return Leg</span>
                      <div className="text-base font-bold font-mono text-zinc-100">{returnMapKm} KM</div>
                      <span className="text-[10px] text-zinc-400">
                        {Math.floor(returnDurationMinutes / 60)}h {returnDurationMinutes % 60}m
                      </span>
                    </div>
                    <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/60">
                      <span className="text-[10px] text-zinc-400 uppercase font-bold block">Total Road KM</span>
                      <div className="text-base font-bold font-mono text-amber-400">{totalMapKm} KM</div>
                      <span className="text-[10px] text-zinc-400">
                        {Math.floor(totalDurationMinutes / 60)}h {totalDurationMinutes % 60}m road time
                      </span>
                    </div>
                    <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/60">
                      <span className="text-[10px] text-emerald-400 uppercase font-bold block">Billable KM</span>
                      <div className="text-base font-bold font-mono text-emerald-400">{commercialFare.totalBillableDistance} KM</div>
                      <span className="text-[10px] text-zinc-400">
                        Min {commercialFare.minimumBillableKm} KM applied
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase font-semibold block">One-Way Road Distance</span>
                    <div className="text-lg font-bold font-mono text-amber-400">{outboundMapKm} KM</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Driving Time</span>
                    <div className="text-lg font-bold font-mono text-zinc-100">
                      {Math.floor(outboundDurationMinutes / 60)}h {outboundDurationMinutes % 60}m
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Estimated Toll</span>
                    <div className="text-lg font-bold font-mono text-emerald-400">
                      {tollAvailable ? formatINR(estimatedToll) : "Unavailable / At Actuals"}
                    </div>
                  </div>
                </div>
              )}

              {/* Route Alternative Cards */}
              <div className="space-y-2">
                {routeOptions.map((opt, idx) => {
                  const isSelected = selectedRouteIndex === idx;
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedRouteIndex(idx);
                        setTotalMapKm(opt.distanceKm);
                        setBillingKm(opt.distanceKm);
                      }}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? "bg-amber-950/40 border-amber-400 text-zinc-100 shadow-md"
                          : "bg-zinc-900/40 border-zinc-800 text-zinc-300 hover:border-zinc-700"
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs text-amber-300 flex items-center gap-1.5">
                          <Navigation className="w-3 h-3 text-amber-400" />
                          {opt.summary}
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">{opt.via}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono font-bold text-zinc-100">{opt.distanceKm} KM</div>
                        <div className="text-[10px] text-zinc-400 font-mono">
                          {Math.floor(opt.durationMinutes / 60)}h {opt.durationMinutes % 60}m
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 5: TRANSPARENT ITEMIZED FARE BREAKDOWN (Phase 52) */}
          {step === 5 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-amber-400" />
                  Commercial Fare Engine & Transparent Breakdown
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Authoritative distance-rate calculation with minimum KM policy, driver bata, state permits, and real tolls.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left: Configurable Fare Inputs */}
                <div className="space-y-3 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 text-xs">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                    Commercial Pricing Parameters
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-zinc-300 block mb-1">Rate Per KM (₹) *</label>
                      <Input
                        type="number"
                        value={ratePerKm}
                        onChange={(e) => setRatePerKm(Number(e.target.value))}
                        className="bg-zinc-900 border-zinc-800 text-xs h-9 font-mono font-bold text-amber-400"
                      />
                    </div>
                    {isRound && (
                      <div>
                        <label className="text-[11px] text-zinc-300 block mb-1">Min KM / Day *</label>
                        <Input
                          type="number"
                          value={minimumKmPerDay}
                          onChange={(e) => setMinimumKmPerDay(Number(e.target.value))}
                          className="bg-zinc-900 border-zinc-800 text-xs h-9 font-mono"
                        />
                      </div>
                    )}
                  </div>

                  {isRound && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-zinc-300 block mb-1">Driver Bata / Day (₹)</label>
                        <Input
                          type="number"
                          value={driverBataPerDay}
                          onChange={(e) => setDriverBataPerDay(Number(e.target.value))}
                          className="bg-zinc-900 border-zinc-800 text-xs h-9 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-300 block mb-1">Night Bata (₹)</label>
                        <Input
                          type="number"
                          value={nightBata}
                          onChange={(e) => setNightBata(Number(e.target.value))}
                          className="bg-zinc-900 border-zinc-800 text-xs h-9 font-mono"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-zinc-300 block mb-1">State Permit Charge (₹)</label>
                      <Input
                        type="number"
                        value={permitCharge}
                        onChange={(e) => setPermitCharge(Number(e.target.value))}
                        className="bg-zinc-900 border-zinc-800 text-xs h-9 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-300 block mb-1">Final Toll (₹)</label>
                      <Input
                        type="number"
                        value={finalToll}
                        onChange={(e) => setFinalToll(Number(e.target.value))}
                        className="bg-zinc-900 border-zinc-800 text-xs h-9 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">Parking (₹)</label>
                      <Input
                        type="number"
                        value={parking}
                        onChange={(e) => setParking(Number(e.target.value))}
                        className="bg-zinc-900 border-zinc-800 text-xs h-8 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">Waiting (₹)</label>
                      <Input
                        type="number"
                        value={waitingCharge}
                        onChange={(e) => setWaitingCharge(Number(e.target.value))}
                        className="bg-zinc-900 border-zinc-800 text-xs h-8 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">Discount (₹)</label>
                      <Input
                        type="number"
                        value={discount}
                        onChange={(e) => setDiscount(Number(e.target.value))}
                        className="bg-zinc-900 border-zinc-800 text-xs h-8 font-mono text-rose-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Right: Transparent Trip Summary Card */}
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between text-xs space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <span className="font-bold text-amber-400 uppercase tracking-wider text-xs">
                        Itemized Trip Summary
                      </span>
                      <span className="text-[11px] font-mono text-zinc-400 uppercase">
                        {isRound ? `Round Trip (${commercialFare.billableDays} Days)` : "One Way"}
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px] font-mono">
                      {isRound && (
                        <>
                          <div className="flex justify-between text-zinc-400">
                            <span>Outbound Leg:</span>
                            <span className="text-zinc-200">{outboundMapKm} km</span>
                          </div>
                          <div className="flex justify-between text-zinc-400">
                            <span>Return Leg:</span>
                            <span className="text-zinc-200">{returnMapKm} km</span>
                          </div>
                          <div className="flex justify-between text-zinc-400">
                            <span>Total Road Distance:</span>
                            <span className="text-zinc-200">{totalMapKm} km</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between text-zinc-300 font-bold">
                        <span>Billable Distance:</span>
                        <span className="text-amber-400">{commercialFare.totalBillableDistance} km</span>
                      </div>
                      <div className="flex justify-between text-zinc-300 border-t border-zinc-800/60 pt-1">
                        <span>Distance Fare ({commercialFare.totalBillableDistance} km × ₹{ratePerKm}):</span>
                        <span>{formatINR(commercialFare.distanceFare)}</span>
                      </div>
                      {isRound && (
                        <div className="flex justify-between text-zinc-300">
                          <span>Driver Bata ({commercialFare.billableDays} days × ₹{driverBataPerDay}):</span>
                          <span>{formatINR(commercialFare.driverBata)}</span>
                        </div>
                      )}
                      {commercialFare.permitCharge > 0 && (
                        <div className="flex justify-between text-zinc-300">
                          <span>Permit Charge:</span>
                          <span>{formatINR(commercialFare.permitCharge)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-zinc-300">
                        <span>Toll:</span>
                        <span>{commercialFare.toll > 0 ? formatINR(commercialFare.toll) : "At Actuals / Customer"}</span>
                      </div>
                      {commercialFare.parking > 0 && (
                        <div className="flex justify-between text-zinc-300">
                          <span>Parking:</span>
                          <span>{formatINR(commercialFare.parking)}</span>
                        </div>
                      )}
                      {commercialFare.waiting > 0 && (
                        <div className="flex justify-between text-zinc-300">
                          <span>Waiting Charge:</span>
                          <span>{formatINR(commercialFare.waiting)}</span>
                        </div>
                      )}
                      {commercialFare.discount > 0 && (
                        <div className="flex justify-between text-rose-400">
                          <span>Discount:</span>
                          <span>-{formatINR(commercialFare.discount)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Grand Customer Total */}
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-amber-300 uppercase font-bold block">Final Customer Total</span>
                      <span className="text-[10px] text-zinc-400">Auditable verified amount</span>
                    </div>
                    <div className="text-2xl font-black font-mono text-amber-400">
                      {formatINR(customerTotal)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: DRIVER ASSIGNMENT & ADVANCE PAYMENT */}
          {step === 6 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-zinc-200">Driver Roster & Advance Payment</h3>

              {/* Driver & Vehicle Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300">Assign Operational Driver</label>
                  <Select
                    value={selectedDriverId ? String(selectedDriverId) : "unassigned"}
                    onValueChange={(val) => {
                      const dId = val === "unassigned" ? null : Number(val);
                      setSelectedDriverId(dId);
                      if (dId) {
                        const matchedV = vehicles.find((v: any) => v.assignedDriverId === dId);
                        if (matchedV) setSelectedVehicleId(matchedV.id);
                      }
                    }}
                  >
                    <SelectTrigger className="bg-zinc-900 border-zinc-800 text-xs h-10">
                      <SelectValue placeholder="Select driver..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                      <SelectItem value="unassigned">Unassigned (Assign Later)</SelectItem>
                      {drivers.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {d.name} ({d.driverCode}) • Rating {d.rating} • Status: {d.availability}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300">Assign Commercial Vehicle</label>
                  <Select
                    value={selectedVehicleId ? String(selectedVehicleId) : "unassigned"}
                    onValueChange={(val) => setSelectedVehicleId(val === "unassigned" ? null : Number(val))}
                  >
                    <SelectTrigger className="bg-zinc-900 border-zinc-800 text-xs h-10">
                      <SelectValue placeholder="Select fleet vehicle..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                      <SelectItem value="unassigned">Unassigned (Assign Later)</SelectItem>
                      {vehicles.map((v: any) => (
                        <SelectItem key={v.id} value={String(v.id)}>
                          {v.vehicleNumber} ({v.brand} {v.model}) • {v.capacity} Seater
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Advance Collection */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-zinc-900/40 p-4 rounded-xl border border-zinc-800">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Advance Amount (₹)</label>
                  <Input
                    type="number"
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                    className="bg-zinc-900 border-zinc-800 text-xs h-9 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Payment Method</label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-800 text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                      <SelectItem value="UPI">UPI / GPay / PhonePe</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Card">Credit / Debit Card</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer (NEFT/IMPS)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Payment Reference</label>
                  <Input
                    placeholder="e.g. UPI/260902/894102"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="bg-zinc-900 border-zinc-800 text-xs h-9"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono">
                <span className="text-zinc-400">Remaining Balance Due:</span>
                <span className="text-amber-300 font-bold text-sm">{formatINR(remainingBalance)}</span>
              </div>
            </div>
          )}

          {/* STEP 7: REVIEW & DISPATCH */}
          {step === 7 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-zinc-200">Review Booking Specifications</h3>

              <div className="space-y-3 bg-zinc-900/60 p-5 rounded-xl border border-zinc-800 text-xs">
                <div className="grid grid-cols-2 gap-4 pb-3 border-b border-zinc-800">
                  <div>
                    <span className="text-zinc-500 block">Customer</span>
                    <strong className="text-zinc-200 text-sm">{isCreatingNewCustomer ? newCustomerName : customers.find(c => c.id === selectedCustomerId)?.name}</strong>
                    <div className="text-zinc-400">{isCreatingNewCustomer ? newCustomerMobile : customers.find(c => c.id === selectedCustomerId)?.mobile}</div>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Trip Type & Timing</span>
                    <strong className="text-amber-400 uppercase">{tripType.replaceAll("_", " ")}</strong>
                    <div className="text-zinc-300">{startDate} at {startTime}</div>
                  </div>
                </div>

                <div className="pb-3 border-b border-zinc-800">
                  <span className="text-zinc-500 block">Route Journey</span>
                  <div className="font-semibold text-zinc-200 text-sm">{pickupLocation.name} ➔ {destLocation.name}</div>
                  <div className="text-zinc-400 text-[11px]">Map Distance: {totalMapKm} KM • Billing: {billingKm} KM @ ₹{ratePerKm}/km</div>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-1 font-mono text-center">
                  <div className="bg-zinc-950 p-2 rounded">
                    <span className="text-[10px] text-zinc-500 block">Base Fare</span>
                    <span className="font-bold text-zinc-200">{formatINR(baseFare)}</span>
                  </div>
                  <div className="bg-zinc-950 p-2 rounded">
                    <span className="text-[10px] text-zinc-500 block">Final Toll</span>
                    <span className="font-bold text-emerald-400">{formatINR(finalToll)}</span>
                  </div>
                  <div className="bg-zinc-950 p-2 rounded">
                    <span className="text-[10px] text-zinc-500 block">Parking</span>
                    <span className="font-bold text-zinc-300">{formatINR(parking)}</span>
                  </div>
                  <div className="bg-zinc-950 p-2 rounded">
                    <span className="text-[10px] text-zinc-500 block">Permit</span>
                    <span className="font-bold text-amber-300">{formatINR(permitCharge)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-zinc-800">
                  <div>
                    <span className="text-zinc-400 block text-xs">Customer Grand Total</span>
                    <span className="text-xl font-black font-mono text-amber-400">{formatINR(customerTotal)}</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-zinc-500 block text-[11px]">Advance Paid: {formatINR(advanceAmount)}</span>
                    <span className="text-amber-300 font-bold">Balance: {formatINR(remainingBalance)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Navigation Buttons */}
        <div className="border-t border-zinc-800/80 pt-4 flex items-center justify-between">
          <Button
            size="sm"
            variant="ghost"
            onClick={step === 1 ? onClose : handleBack}
            className="text-zinc-400 hover:text-zinc-100 text-xs"
          >
            {step === 1 ? "Cancel" : "Back"}
          </Button>

          {step < 7 ? (
            <Button
              size="sm"
              onClick={handleNext}
              className="bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs px-5 flex items-center gap-1.5"
            >
              Next Step <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={loading}
              onClick={handleSubmitBooking}
              className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs px-6 py-2 shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
            >
              {loading ? (
                <ButtonLoader label="Creating Booking..." />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> CONFIRM & DISPATCH TRIP
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};
