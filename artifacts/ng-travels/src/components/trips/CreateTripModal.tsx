import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  calculateCommercialFare,
  calculateBillableDays,
  formatINR,
  formatKM,
} from "@/lib/fareEngine";
import {
  User, Calendar, MapPin, Navigation, IndianRupee, ShieldCheck, CheckCircle2,
  Plus, Trash2, ArrowRight, ArrowLeft, Sparkles, AlertTriangle,
  Clock, Car, Search, Calculator, Receipt, CreditCard
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

const WIZARD_STEPS = [
  "Customer",
  "Trip Schedule",
  "Route & Distance",
  "Fare Calculation",
  "Driver & Dispatch",
];

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

  // Step 1: Customer (Clean initial state - zero autofill)
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerMobile, setNewCustomerMobile] = useState("");
  const [newCustomerWhatsapp, setNewCustomerWhatsapp] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");
  const [isCreatingNewCustomer, setIsCreatingNewCustomer] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");

  // Step 2: Trip Type & Schedule (Clean initial state)
  const [tripType, setTripType] = useState<"single_trip" | "round_trip" | "outstation_round_trip" | "outstation_one_way" | "local_rental" | "airport_transfer">("single_trip");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("08:00");
  const [returnDate, setReturnDate] = useState(new Date().toISOString().slice(0, 10));
  const [returnTime, setReturnTime] = useState("20:00");
  const [passengerCount, setPassengerCount] = useState(1);
  const [notes, setNotes] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");

  // Step 3: Route & Direct Distance (Zero autofill)
  const [pickupInput, setPickupInput] = useState("");
  const [pickupLocation, setPickupLocation] = useState<any>(null);
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [searchingPickup, setSearchingPickup] = useState(false);

  const [destInput, setDestInput] = useState("");
  const [destLocation, setDestLocation] = useState<any>(null);
  const [destSuggestions, setDestSuggestions] = useState<any[]>([]);
  const [searchingDest, setSearchingDest] = useState(false);

  const [stops, setStops] = useState<{ name: string; address: string }[]>([]);
  const [stopInput, setStopInput] = useState("");

  // Real-time Road Distance in KM (Directly editable & optional auto-estimate)
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [outboundKm, setOutboundKm] = useState<number>(0);
  const [returnKm, setReturnKm] = useState<number>(0);
  const [calculatingDistance, setCalculatingDistance] = useState(false);

  // Step 4: Commercial Pricing Parameters
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

  // Step 5: Driver & Vehicle Assignment & Advance Collection
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [paymentReference, setPaymentReference] = useState("");

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

  // Autocomplete for Pickup (debounced)
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
        if (err.name !== "AbortError") setPickupSuggestions([]);
      } finally {
        setSearchingPickup(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [pickupInput]);

  // Autocomplete for Destination (debounced)
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
        if (err.name !== "AbortError") setDestSuggestions([]);
      } finally {
        setSearchingDest(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [destInput]);

  // Optional: Auto-Estimate Distance from Driving Network in background
  const handleAutoEstimateDistance = async () => {
    if (!pickupInput.trim() || !destInput.trim()) {
      alert("Please enter both pickup and destination places to estimate distance.");
      return;
    }
    setCalculatingDistance(true);
    try {
      const pLoc = pickupLocation || { name: pickupInput, address: pickupInput };
      const dLoc = destLocation || { name: destInput, address: destInput };
      const res = await fetch("/api/maps/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickup: pLoc,
          destination: dLoc,
          stops,
          tripType,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const totKm = Math.round(Number(data.totalDistanceKm || data.totalRoadKm || 0));
        const outKm = Math.round(Number(data.outboundDistanceKm || 0));
        const retKm = Math.round(Number(data.returnDistanceKm || 0));
        if (totKm > 0) {
          setDistanceKm(totKm);
          setOutboundKm(outKm || totKm);
          setReturnKm(retKm || 0);
          if (data.estimatedToll && finalToll === 0) {
            setFinalToll(data.estimatedToll);
          }
        }
      }
    } catch (err) {
      console.warn("Background distance calculation unavailable, enter KM manually:", err);
    } finally {
      setCalculatingDistance(false);
    }
  };

  // Sync enquiry data if provided
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

  // Reset defaults on modal open
  useEffect(() => {
    if (isOpen) {
      setRatePerKm(defaultRate);
      setMinimumKmPerDay(defaultMinimumKm);
      setDriverBataPerDay(defaultDriverBata);
      setBillingDayPolicy(defaultBillingDayPolicy);
    }
  }, [isOpen, defaultRate, defaultMinimumKm, defaultDriverBata, defaultBillingDayPolicy]);

  // 100% Dynamic, Authoritative Commercial Fare Calculation
  const isRound = tripType.toLowerCase().includes("round");
  const effectiveOutboundKm = outboundKm > 0 ? outboundKm : (isRound ? Math.round(distanceKm / 2) : distanceKm);
  const effectiveReturnKm = returnKm > 0 ? returnKm : (isRound ? Math.round(distanceKm / 2) : 0);

  const commercialFare = calculateCommercialFare({
    tripType,
    outboundDistanceKm: effectiveOutboundKm,
    returnDistanceKm: effectiveReturnKm,
    totalRoadDistanceKm: distanceKm,
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
    tollAvailable: finalToll > 0,
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
  const billableDays = commercialFare.billableDays;

  const handleNext = () => {
    if (step === 1) {
      if (!isCreatingNewCustomer && !selectedCustomerId) {
        alert("Please select an existing customer or click '+ Add New Customer'");
        return;
      }
      if (isCreatingNewCustomer && (!newCustomerName.trim() || !newCustomerMobile.trim())) {
        alert("Please enter customer name and 10-digit mobile number");
        return;
      }
    }
    if (step === 3) {
      if (!pickupInput.trim() || !destInput.trim()) {
        alert("Please specify both pickup and destination locations");
        return;
      }
      if (distanceKm <= 0) {
        const proceed = confirm("Road Distance is currently 0 KM. Would you like to enter a distance in KM now?");
        if (proceed) return;
      }
    }
    setStep((prev) => Math.min(prev + 1, 5));
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleAddStop = () => {
    if (stopInput.trim()) {
      setStops([...stops, { name: stopInput.trim(), address: stopInput.trim() }]);
      setStopInput("");
    }
  };

  const handleRemoveStop = (idx: number) => {
    setStops(stops.filter((_, i) => i !== idx));
  };

  const handleSubmitBooking = async () => {
    setLoading(true);
    try {
      let customerId = selectedCustomerId;

      if (isCreatingNewCustomer) {
        const custRes = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newCustomerName.trim(),
            mobile: newCustomerMobile.trim(),
            whatsapp: newCustomerWhatsapp.trim() || newCustomerMobile.trim(),
            address: newCustomerAddress.trim() || (pickupLocation?.address || pickupInput),
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

      const payload = {
        customerId,
        tripType,
        pickup: pickupLocation || { name: pickupInput, address: pickupInput },
        destination: destLocation || { name: destInput, address: destInput },
        stops,
        startDate,
        startTime,
        returnDate: isRound ? returnDate : null,
        returnTime: isRound ? returnTime : null,
        passengerCount,
        notes,
        specialInstructions,
        outboundMapKm: effectiveOutboundKm,
        returnMapKm: effectiveReturnKm,
        totalMapKm: distanceKm,
        routeDurationMinutes: 0,
        outboundDurationMinutes: 0,
        returnDurationMinutes: 0,
        routeSummary: `${pickupInput} ➔ ${destInput}`,
        selectedRouteSummary: `${pickupInput} ➔ ${destInput}`,
        routeOptions: [],
        estimatedToll: finalToll,
        billingKm: commercialFare.totalBillableDistance,
        ratePerKm,
        minimumKmPerDay: isRound ? minimumKmPerDay : 0,
        driverBataPerDay: isRound ? driverBataPerDay : 0,
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
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || errJson.error || "Failed to create trip");
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
                STEP {step}/5
              </span>
            </div>

            {/* 5-Step Process Indicator */}
            <div className="flex items-center gap-1 sm:gap-1.5 mt-2 sm:mt-3">
              {WIZARD_STEPS.map((label, idx) => (
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
              ))}
            </div>
          </DialogHeader>

          <div className="py-4 space-y-6">
            {/* STEP 1: CUSTOMER SELECTION */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-200">Customer Identification</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">Select an existing corporate profile or quickly register a new client.</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsCreatingNewCustomer(!isCreatingNewCustomer)}
                    className="border-amber-500/40 text-amber-300 text-xs h-8 cursor-pointer"
                  >
                    {isCreatingNewCustomer ? "Select Existing Customer" : "+ Add New Customer"}
                  </Button>
                </div>

                {!isCreatingNewCustomer ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                      <Input
                        placeholder="Search customer by name, mobile, or company (e.g. Rajesh, 98450)..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="pl-9 bg-zinc-900 border-zinc-800 text-xs h-10 placeholder:text-zinc-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                      {filteredCustomers.length === 0 ? (
                        <div className="col-span-2 text-center py-8 text-zinc-500 text-xs bg-zinc-900/40 rounded-xl border border-zinc-800">
                          No matching customer accounts. Click "+ Add New Customer" above to register.
                        </div>
                      ) : (
                        filteredCustomers.map((cust: any) => {
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
                        })
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 bg-zinc-900/40 p-4 rounded-xl border border-zinc-800">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">Customer Full Name *</label>
                        <Input
                          placeholder="e.g. Rajesh Sharma / Infosys Corporate"
                          value={newCustomerName}
                          onChange={(e) => setNewCustomerName(e.target.value)}
                          className="bg-zinc-900 border-zinc-800 text-xs h-9 placeholder:text-zinc-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">Mobile Number *</label>
                        <Input
                          placeholder="e.g. +91 98450 12345 (10 digits)"
                          value={newCustomerMobile}
                          onChange={(e) => setNewCustomerMobile(e.target.value)}
                          className="bg-zinc-900 border-zinc-800 text-xs h-9 font-mono placeholder:text-zinc-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">WhatsApp Number</label>
                        <Input
                          placeholder="e.g. +91 98450 12345 (for booking updates)"
                          value={newCustomerWhatsapp}
                          onChange={(e) => setNewCustomerWhatsapp(e.target.value)}
                          className="bg-zinc-900 border-zinc-800 text-xs h-9 font-mono placeholder:text-zinc-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">Customer Address</label>
                        <Input
                          placeholder="e.g. #42, 100ft Road, Indiranagar, Bengaluru - 560038"
                          value={newCustomerAddress}
                          onChange={(e) => setNewCustomerAddress(e.target.value)}
                          className="bg-zinc-900 border-zinc-800 text-xs h-9 placeholder:text-zinc-500"
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
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-200">Trip Category & Schedule</h3>
                  {isRound && (
                    <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded border border-amber-400/30">
                      Calculated Billable Days: {billableDays} Day(s)
                    </span>
                  )}
                </div>

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
                        <div className="font-bold text-xs flex items-center justify-between">
                          <span>{t.label}</span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-1">{t.desc}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Dates & Times */}
                <div className="bg-zinc-900/40 p-4 rounded-xl border border-zinc-800 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" /> Start Date & Time *
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="bg-zinc-900 border-zinc-800 text-xs h-9"
                        />
                        <Input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="bg-zinc-900 border-zinc-800 text-xs h-9"
                        />
                      </div>
                    </div>

                    {isRound && (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-purple-400" /> Return Date & Time *
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="date"
                            value={returnDate}
                            onChange={(e) => setReturnDate(e.target.value)}
                            className="bg-zinc-900 border-zinc-800 text-xs h-9"
                          />
                          <Input
                            type="time"
                            value={returnTime}
                            onChange={(e) => setReturnTime(e.target.value)}
                            className="bg-zinc-900 border-zinc-800 text-xs h-9"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">Passenger Count</label>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={passengerCount}
                        onChange={(e) => setPassengerCount(Number(e.target.value))}
                        className="bg-zinc-900 border-zinc-800 text-xs h-9 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">Special Passenger Instructions</label>
                      <Input
                        placeholder="e.g. Keep AC turned on, 2 mineral water bottles, passenger luggage assistance"
                        value={specialInstructions}
                        onChange={(e) => setSpecialInstructions(e.target.value)}
                        className="bg-zinc-900 border-zinc-800 text-xs h-9 placeholder:text-zinc-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: ROUTE & DIRECT DISTANCE (No Map - 100% Dynamic & Editable) */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-200">Route & Driving Distance</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">Enter pickup, destination, stops, and specify the road distance in KM.</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAutoEstimateDistance}
                    disabled={calculatingDistance}
                    className="border-amber-500/40 text-amber-300 text-xs h-8 flex items-center gap-1.5 cursor-pointer hover:bg-amber-400/10"
                  >
                    {calculatingDistance ? (
                      <ButtonLoader label="Calculating..." />
                    ) : (
                      <>
                        <Calculator className="w-3.5 h-3.5" /> Auto-Estimate Distance
                      </>
                    )}
                  </Button>
                </div>

                {/* Pickup & Destination Inputs (Zero autofill) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-900/40 p-4 rounded-xl border border-zinc-800">
                  <div className="space-y-1.5 relative">
                    <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Pickup Location *
                    </label>
                    <Input
                      placeholder="Type pickup place (e.g. Kempegowda Airport, Indiranagar, MG Road)..."
                      value={pickupInput}
                      onChange={(e) => {
                        setPickupInput(e.target.value);
                        setPickupLocation(null);
                      }}
                      className="bg-zinc-900 border-zinc-800 text-xs h-10 placeholder:text-zinc-500"
                    />
                    {searchingPickup && <span className="text-[10px] text-zinc-500 absolute right-3 top-9">Searching...</span>}
                    {pickupSuggestions.length > 0 && (
                      <div className="absolute z-20 left-0 right-0 top-16 bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden shadow-2xl max-h-48 overflow-y-auto">
                        {pickupSuggestions.map((place, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              setPickupInput(place.formattedAddress || place.name);
                              setPickupLocation(place);
                              setPickupSuggestions([]);
                            }}
                            className="p-2.5 hover:bg-zinc-800 text-xs text-zinc-200 cursor-pointer border-b border-zinc-800/60 last:border-0"
                          >
                            <div className="font-semibold">{place.name}</div>
                            <div className="text-[10px] text-zinc-400 truncate">{place.formattedAddress}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 relative">
                    <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" /> Destination *
                    </label>
                    <Input
                      placeholder="Type destination (e.g. Mysore Palace, Ooty, Coorg, Chennai Central)..."
                      value={destInput}
                      onChange={(e) => {
                        setDestInput(e.target.value);
                        setDestLocation(null);
                      }}
                      className="bg-zinc-900 border-zinc-800 text-xs h-10 placeholder:text-zinc-500"
                    />
                    {searchingDest && <span className="text-[10px] text-zinc-500 absolute right-3 top-9">Searching...</span>}
                    {destSuggestions.length > 0 && (
                      <div className="absolute z-20 left-0 right-0 top-16 bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden shadow-2xl max-h-48 overflow-y-auto">
                        {destSuggestions.map((place, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              setDestInput(place.formattedAddress || place.name);
                              setDestLocation(place);
                              setDestSuggestions([]);
                            }}
                            className="p-2.5 hover:bg-zinc-800 text-xs text-zinc-200 cursor-pointer border-b border-zinc-800/60 last:border-0"
                          >
                            <div className="font-semibold">{place.name}</div>
                            <div className="text-[10px] text-zinc-400 truncate">{place.formattedAddress}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Intermediate Stops */}
                <div className="space-y-2 bg-zinc-900/40 p-4 rounded-xl border border-zinc-800">
                  <label className="text-xs font-semibold text-zinc-300 block">Waypoints & Intermediate Stops (Optional)</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add intermediate stop (e.g. Mandya, Maddur Tiffany's, Channapatna Toys)..."
                      value={stopInput}
                      onChange={(e) => setStopInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddStop())}
                      className="bg-zinc-900 border-zinc-800 text-xs h-9 placeholder:text-zinc-500"
                    />
                    <Button
                      size="sm"
                      type="button"
                      onClick={handleAddStop}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs h-9 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add
                    </Button>
                  </div>

                  {stops.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {stops.map((stop, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 bg-zinc-800/90 text-zinc-200 px-2.5 py-1 rounded-lg text-xs border border-zinc-700">
                          <span className="text-[10px] text-amber-400 font-mono">#{idx + 1}</span>
                          <span>{stop.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveStop(idx)}
                            className="text-zinc-400 hover:text-rose-400 cursor-pointer ml-1"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Direct Editable Road Distance & Billing KM */}
                <div className="bg-zinc-900/60 p-4 rounded-xl border border-amber-500/40 bg-amber-950/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Calculator className="w-4 h-4" /> Road Distance & Billable Volume
                    </span>
                    <span className="text-[11px] font-mono text-zinc-400">
                      Minimum Billable: {commercialFare.minimumBillableKm} KM
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] text-zinc-300 block mb-1">
                        Total Road Distance (KM) *
                      </label>
                      <Input
                        type="number"
                        min={0}
                        value={distanceKm || ""}
                        onChange={(e) => setDistanceKm(Math.max(0, Number(e.target.value)))}
                        placeholder="e.g. 350"
                        className="bg-zinc-900 border-zinc-800 text-sm h-10 font-mono font-bold text-amber-400 placeholder:text-zinc-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">
                        Effective Billable KM
                      </label>
                      <div className="h-10 px-3 flex items-center font-mono font-bold text-sm bg-zinc-950 border border-zinc-800 rounded-md text-emerald-400">
                        {commercialFare.totalBillableDistance} KM
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">
                        Toll Charge (₹)
                      </label>
                      <Input
                        type="number"
                        min={0}
                        value={finalToll || ""}
                        onChange={(e) => setFinalToll(Math.max(0, Number(e.target.value)))}
                        placeholder="e.g. 450"
                        className="bg-zinc-900 border-zinc-800 text-sm h-10 font-mono font-bold text-zinc-200 placeholder:text-zinc-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: COMMERCIAL FARE ENGINE & TRANSPARENT BREAKDOWN */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                      <IndianRupee className="w-4 h-4 text-amber-400" />
                      Commercial Pricing Engine & Transparent Calculation
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      100% dynamic distance-rate calculation with minimum KM policy, driver bata, state permits, and real tolls.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left Column: Editable Rates & Surcharges */}
                  <div className="space-y-3 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 text-xs">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                      Commercial Rate Parameters
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
                        <label className="text-[11px] text-zinc-300 block mb-1">State Permit (₹)</label>
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

                  {/* Right Column: Live Itemized Fare Ledger */}
                  <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between text-xs space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                        <span className="font-bold text-zinc-200">Billable Volume:</span>
                        <span className="font-mono text-zinc-300">
                          {commercialFare.totalBillableDistance} KM @ ₹{ratePerKm}/km
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-zinc-400">
                        <span>Base Distance Fare:</span>
                        <span className="font-mono text-zinc-200">{formatINR(baseFare)}</span>
                      </div>
                      {isRound && (
                        <div className="flex justify-between items-center text-zinc-400">
                          <span>Driver Bata ({billableDays} Days):</span>
                          <span className="font-mono text-zinc-200">{formatINR(commercialFare.driverBata)}</span>
                        </div>
                      )}
                      {(finalToll > 0 || permitCharge > 0) && (
                        <div className="flex justify-between items-center text-zinc-400">
                          <span>Toll & Permit:</span>
                          <span className="font-mono text-zinc-200">{formatINR(finalToll + permitCharge)}</span>
                        </div>
                      )}
                      {(parking > 0 || waitingCharge > 0) && (
                        <div className="flex justify-between items-center text-zinc-400">
                          <span>Parking & Waiting:</span>
                          <span className="font-mono text-zinc-200">{formatINR(parking + waitingCharge)}</span>
                        </div>
                      )}
                      {discount > 0 && (
                        <div className="flex justify-between items-center text-rose-400">
                          <span>Discount Applied:</span>
                          <span className="font-mono">- {formatINR(discount)}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-zinc-800 space-y-2">
                      <div className="flex justify-between items-center text-zinc-400">
                        <span>Subtotal:</span>
                        <span className="font-mono font-bold text-zinc-200">{formatINR(commercialFare.subtotal)}</span>
                      </div>
                      <div className="flex justify-between items-center bg-zinc-950 p-3 rounded-lg border border-amber-500/30">
                        <span className="font-black text-xs text-amber-400 uppercase">Customer Total Fare:</span>
                        <span className="text-xl font-black font-mono text-emerald-400">{formatINR(customerTotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: DRIVER, FLEET ASSIGNMENT & DISPATCH */}
            {step === 5 && (
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
                    <label className="text-[11px] text-zinc-400 block mb-1">Payment Reference / UTR</label>
                    <Input
                      placeholder="e.g. UPI Ref / UTR: 429188201992"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      className="bg-zinc-900 border-zinc-800 text-xs h-9 font-mono placeholder:text-zinc-500"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono">
                  <div>
                    <span className="text-zinc-400 block">Total Fare: {formatINR(customerTotal)}</span>
                    <span className="text-emerald-400 block">Advance Paid: {formatINR(advanceAmount)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-400 text-[10px] block uppercase">Remaining Balance Due</span>
                    <span className="text-amber-300 font-bold text-base">{formatINR(remainingBalance)}</span>
                  </div>
                </div>

                {/* Final Route & Schedule Summary */}
                <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/80 text-xs space-y-1">
                  <div className="text-zinc-300 font-medium flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-amber-400" />
                    <span>{pickupInput} ➔ {destInput}</span>
                  </div>
                  <div className="text-zinc-500 text-[11px]">
                    {startDate} at {startTime} • {tripType.replaceAll("_", " ")} • {commercialFare.totalBillableDistance} Billable KM
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dialog Action Buttons */}
          <div className="flex justify-between items-center pt-3 border-t border-zinc-800">
            {step > 1 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBack}
                className="border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs h-9 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="border-zinc-800 text-zinc-400 text-xs h-9 cursor-pointer"
              >
                Cancel
              </Button>
            )}

            {step < 5 ? (
              <Button
                size="sm"
                onClick={handleNext}
                className="bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs h-9 px-4 cursor-pointer shadow-lg shadow-amber-400/20"
              >
                Next Step <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleSubmitBooking}
                className="bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-black text-xs h-9 px-5 cursor-pointer shadow-lg shadow-emerald-400/20"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> DISPATCH TRIP
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
