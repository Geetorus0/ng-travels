// =============================================================
// NG TRAVELS ERP - EMBEDDED STANDALONE OFFLINE ENGINE
// Allows full standalone execution on any device, network, or offline.
// Persists local state to localStorage so updates survive restarts.
// =============================================================

export interface OfflineTripLocation {
  address: string;
  lat?: number;
  lng?: number;
}

export interface OfflineDriver {
  id: number;
  driverCode: string;
  name: string;
  mobile: string;
  email?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  emergencyContact?: string;
  status: "active" | "inactive" | "on_leave";
  availability: "available" | "on_trip" | "offline" | "on_leave";
  rating: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfflineVehicle {
  id: number;
  vehicleNumber: string;
  vehicleType: string;
  brand: string;
  model: string;
  year?: number | null;
  capacity: number;
  fuelType?: string | null;
  rcNumber?: string | null;
  insurancePolicy?: string | null;
  insuranceExpiry?: string | null;
  permitNumber?: string | null;
  permitExpiry?: string | null;
  fitnessCertNumber?: string | null;
  fitnessExpiry?: string | null;
  pollutionCertNumber?: string | null;
  pollutionExpiry?: string | null;
  assignedDriverId?: number | null;
  status: "active" | "inactive" | "maintenance";
  maintenanceStatus: "good" | "service_due" | "under_maintenance";
  lastServiceDate?: string | null;
  nextServiceDate?: string | null;
  currentOdometerKm: string;
  notes?: string | null;
  hasExpiringDocuments?: boolean;
  expiringDocCount?: number;
  insuranceStatus?: string;
  permitStatus?: string;
  fitnessStatus?: string;
  pollutionStatus?: string;
  createdAt: string;
  updatedAt: string;
}

function enrichOfflineVehicle(v: OfflineVehicle) {
  const now = new Date();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  let expiringCount = 0;
  const checkExpiry = (dateStr?: string | null) => {
    if (!dateStr) return "valid";
    const d = new Date(dateStr);
    const diff = d.getTime() - now.getTime();
    if (diff < 0) { expiringCount++; return "expired"; }
    if (diff < thirtyDays) { expiringCount++; return "expiring_soon"; }
    return "valid";
  };
  const insuranceStatus = checkExpiry(v.insuranceExpiry);
  const permitStatus = checkExpiry(v.permitExpiry);
  const fitnessStatus = checkExpiry(v.fitnessExpiry);
  const pollutionStatus = checkExpiry(v.pollutionExpiry);
  return {
    ...v,
    hasExpiringDocuments: expiringCount > 0,
    expiringDocCount: expiringCount,
    insuranceStatus,
    permitStatus,
    fitnessStatus,
    pollutionStatus,
  };
}

export interface OfflineCustomer {
  id: number;
  customerCode: string;
  name: string;
  mobile: string;
  whatsapp?: string;
  alternateNumber?: string;
  email?: string;
  address?: string;
  notes?: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OfflineTrip {
  id: number;
  bookingId: string;
  customerId: number;
  driverId?: number | null;
  driverName?: string | null;
  driverMobile?: string | null;
  tripType: string;
  pickup: OfflineTripLocation;
  destination: OfflineTripLocation;
  stops?: OfflineTripLocation[];
  startDate: string;
  startTime: string;
  returnDate?: string | null;
  returnTime?: string | null;
  passengerCount: number;
  notes?: string | null;
  specialInstructions?: string | null;
  status: string;
  mapDistanceKm: string;
  outboundMapKm?: string | null;
  returnMapKm?: string | null;
  totalMapKm?: string | null;
  routeDurationMinutes?: number | null;
  routeSummary?: string | null;
  apiEstimatedToll?: string | null;
  estimatedToll?: string | null;
  finalToll: string;
  billingKm: string;
  ratePerKm: string;
  baseFare: string;
  toll: string;
  parking: string;
  permitCharge: string;
  customerTotal: string;
  totalPaid: string;
  remainingBalance: string;
  credit: string;
  startingKm?: string | null;
  startKmTime?: string | null;
  endingKm?: string | null;
  endKmTime?: string | null;
  actualKm?: string | null;
  garageToGarageKm?: string | null;
  garageCloseTime?: string | null;
  pickupOdometerKm?: string | null;
  dropOdometerKm?: string | null;
  driverNotes?: string | null;
  startOdometerPhotoUrl?: string | null;
  endOdometerPhotoUrl?: string | null;
  driverBata?: string | null;
  waitingCharge?: string | null;
  nightCharge?: string | null;
  discount?: string | null;
  tax?: string | null;
  billableDays?: number | null;
  minimumKm?: string | null;
  billingDayPolicy?: string | null;
  routeSnapshot?: any | null;
  paymentStatus: "unpaid" | "partial" | "paid";
  settlementStatus: "pending" | "settled";
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OfflinePayment {
  id: number;
  tripId: number;
  amount: string;
  paymentMethod: string;
  transactionReference?: string | null;
  collectedBy: "driver" | "office";
  notes?: string | null;
  paymentDate: string;
  createdAt: string;
}

export interface OfflineExpense {
  id: number;
  tripId: number;
  driverId?: number | null;
  category: string;
  amount: string;
  receiptUrl?: string | null;
  notes?: string | null;
  status: "pending" | "approved" | "rejected";
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  location?: string | null;
  recordedBy?: string | null;
  createdAt: string;
}

export interface OfflineNotification {
  id: number;
  audience: "owner" | "driver";
  driverId?: number | null;
  title: string;
  message: string;
  kind: string;
  tripId?: number | null;
  isRead: boolean;
  createdAt: string;
}

export interface OfflineAuditLog {
  id: number;
  action: string;
  entity: string;
  entityId: string;
  actorName: string;
  oldValue?: string | null;
  newValue?: string | null;
  createdAt: string;
}

export interface OfflineEnquiry {
  id: number;
  enquiryCode: string;
  customerName: string;
  customerMobile: string;
  customerEmail?: string | null;
  pickup: string;
  destination: string;
  tripType: string;
  startDate: string;
  passengerCount: number;
  estimatedBudget?: string | null;
  quotedFare?: string | null;
  status: "pending" | "quoted" | "converted" | "lost";
  notes?: string | null;
  convertedTripId?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface OfflineSettings {
  company: string;
  mobile: string;
  email: string;
  currency: string;
  timezone: string;
  defaultRate: number;
  terms: string;
}

const STORAGE_KEY = "ng_offline_store_v1";

function getTodayString(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

function getInitialState() {
  const today = getTodayString();
  const drivers: OfflineDriver[] = [
    {
      id: 1,
      driverCode: "DRV-101",
      name: "Suresh K",
      mobile: "+91 98450 11223",
      email: "suresh.driver@ngtravels.in",
      licenseNumber: "DL-KA01-2018004921",
      licenseExpiry: "2029-12-31",
      emergencyContact: "+91 98450 99887 (Wife)",
      status: "active",
      availability: "on_trip",
      rating: "4.9",
      notes: "Senior driver. Expert in Bangalore-Mysore-Coorg outstation routes.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 2,
      driverCode: "DRV-102",
      name: "Ramesh Babu",
      mobile: "+91 98765 22334",
      email: "ramesh.driver@ngtravels.in",
      licenseNumber: "DL-KA05-2019001822",
      licenseExpiry: "2030-05-15",
      emergencyContact: "+91 98765 88776 (Brother)",
      status: "active",
      availability: "available",
      rating: "4.8",
      notes: "Punctual, speaks English & Hindi. Ideal for airport transfers.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 3,
      driverCode: "DRV-103",
      name: "Anand V",
      mobile: "+91 91234 33445",
      email: "anand.driver@ngtravels.in",
      licenseNumber: "DL-KA03-2020008811",
      licenseExpiry: "2031-08-20",
      emergencyContact: "+91 91234 77665 (Father)",
      status: "active",
      availability: "available",
      rating: "4.7",
      notes: "Corporate vehicle specialist.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const customers: OfflineCustomer[] = [
    {
      id: 1,
      customerCode: "CUST-001",
      name: "Rajesh Sharma",
      mobile: "+91 98451 23456",
      whatsapp: "+91 98451 23456",
      email: "rajesh.sharma@infosys.com",
      address: "Prestige Tech Park, Marathahalli, Bangalore",
      notes: "Corporate client. Prefers Innova Crysta for airport pickups.",
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 2,
      customerCode: "CUST-002",
      name: "Priya Nair",
      mobile: "+91 98860 34567",
      whatsapp: "+91 98860 34567",
      email: "priya.nair@wipro.com",
      address: "Indiranagar 100ft Road, Bangalore",
      notes: "Regular family weekend traveler to Coorg and Ooty.",
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 3,
      customerCode: "CUST-003",
      name: "Vikram Malhotra",
      mobile: "+91 99001 45678",
      whatsapp: "+91 99001 45678",
      email: "vikram.m@accenture.com",
      address: "Electronic City Phase 1, Bangalore",
      notes: "Requires formal GST invoice for all business journeys.",
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const trips: OfflineTrip[] = [
    {
      id: 1,
      bookingId: "TRP-2026-001",
      customerId: 1,
      driverId: 1,
      driverName: "Suresh K",
      driverMobile: "+91 98450 11223",
      tripType: "round_trip",
      pickup: { address: "Indiranagar, Bangalore", lat: 12.9719, lng: 77.6412 },
      destination: { address: "Madikeri, Coorg", lat: 12.4244, lng: 75.7382 },
      stops: [{ address: "Mysore Palace (Stopover)", lat: 12.3051, lng: 76.6551 }],
      startDate: today,
      startTime: "06:00",
      returnDate: today,
      returnTime: "22:00",
      passengerCount: 4,
      notes: "VIP Client - ensure pristine vehicle and mineral water bottles.",
      status: "started",
      mapDistanceKm: "560",
      outboundMapKm: "280",
      returnMapKm: "280",
      totalMapKm: "560",
      routeDurationMinutes: 540,
      routeSummary: "via NH75 & Mysore-Madikeri Rd",
      finalToll: "420",
      billingKm: "560",
      ratePerKm: "18",
      baseFare: "10080",
      toll: "420",
      parking: "150",
      permitCharge: "0",
      customerTotal: "10650",
      totalPaid: "5000",
      remainingBalance: "5650",
      credit: "0",
      startingKm: "45200",
      startKmTime: new Date().toISOString(),
      paymentStatus: "partial",
      settlementStatus: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 2,
      bookingId: "TRP-2026-002",
      customerId: 2,
      driverId: 2,
      driverName: "Ramesh Babu",
      driverMobile: "+91 98765 22334",
      tripType: "one_way",
      pickup: { address: "Koramangala 4th Block, Bangalore", lat: 12.9352, lng: 77.6245 },
      destination: { address: "Kempegowda International Airport (BLR)", lat: 13.1986, lng: 77.7066 },
      startDate: today,
      startTime: "14:30",
      passengerCount: 2,
      notes: "Airport Transfer. Flight at 17:45. Punctuality critical.",
      status: "upcoming",
      mapDistanceKm: "44",
      finalToll: "115",
      billingKm: "44",
      ratePerKm: "22",
      baseFare: "968",
      toll: "115",
      parking: "0",
      permitCharge: "0",
      customerTotal: "1083",
      totalPaid: "1083",
      remainingBalance: "0",
      credit: "0",
      paymentStatus: "paid",
      settlementStatus: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 3,
      bookingId: "TRP-2026-003",
      customerId: 3,
      driverId: 1,
      driverName: "Suresh K",
      driverMobile: "+91 98450 11223",
      tripType: "one_way",
      pickup: { address: "Whitefield ITPL, Bangalore", lat: 12.9863, lng: 77.7314 },
      destination: { address: "Mysore City Center", lat: 12.2958, lng: 76.6394 },
      startDate: today,
      startTime: "18:00",
      passengerCount: 3,
      notes: "Evening corporate drop.",
      status: "upcoming",
      mapDistanceKm: "165",
      finalToll: "320",
      billingKm: "165",
      ratePerKm: "18",
      baseFare: "2970",
      toll: "320",
      parking: "50",
      permitCharge: "0",
      customerTotal: "3340",
      totalPaid: "1000",
      remainingBalance: "2340",
      credit: "0",
      paymentStatus: "partial",
      settlementStatus: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ];

  const payments: OfflinePayment[] = [
    {
      id: 1,
      tripId: 1,
      amount: "5000",
      paymentMethod: "upi",
      transactionReference: "UPI/2026/0903/129841",
      collectedBy: "office",
      notes: "Booking advance via GPay",
      paymentDate: today,
      createdAt: new Date().toISOString(),
    },
    {
      id: 2,
      tripId: 2,
      amount: "1083",
      paymentMethod: "card",
      transactionReference: "POS/TXN/889211",
      collectedBy: "office",
      notes: "Full payment prepaid",
      paymentDate: today,
      createdAt: new Date().toISOString(),
    },
  ];

  const expenses: OfflineExpense[] = [
    {
      id: 1,
      tripId: 1,
      driverId: 1,
      category: "Fuel",
      amount: "2500",
      notes: "Diesel fill at Shell Bellary Road",
      status: "approved",
      approvedBy: "Operations Admin",
      approvedAt: new Date().toISOString(),
      location: "Bangalore Outer Ring",
      recordedBy: "Suresh K (Driver)",
      createdAt: new Date().toISOString(),
    },
    {
      id: 2,
      tripId: 1,
      driverId: 1,
      category: "Toll",
      amount: "420",
      notes: "Fastag toll charges Mysore Expressway",
      status: "approved",
      approvedBy: "Operations Admin",
      approvedAt: new Date().toISOString(),
      location: "Bidadi Toll Plaza",
      recordedBy: "Suresh K (Driver)",
      createdAt: new Date().toISOString(),
    },
  ];

  const notifications: OfflineNotification[] = [
    {
      id: 1,
      audience: "driver",
      driverId: 1,
      title: "Active Trip Ready",
      message: "Indiranagar to Madikeri trip is scheduled for today. Starting KM verified.",
      kind: "trip_assigned",
      tripId: 1,
      isRead: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 2,
      audience: "owner",
      title: "Trip Started",
      message: "Driver Suresh K started Trip TRP-2026-001 at odometer 45,200 km.",
      kind: "trip_started",
      tripId: 1,
      isRead: true,
      createdAt: new Date().toISOString(),
    },
  ];

  const auditLogs: OfflineAuditLog[] = [
    {
      id: 1,
      action: "TRIP_STARTED",
      entity: "trip",
      entityId: "1",
      actorName: "Suresh K (Driver)",
      oldValue: "upcoming",
      newValue: "started",
      createdAt: new Date().toISOString(),
    },
  ];

  const enquiries: OfflineEnquiry[] = [
    {
      id: 1,
      enquiryCode: "ENQ-1001",
      customerName: "Sanjay Singhania",
      customerMobile: "+91 97410 88776",
      customerEmail: "sanjay@techcorp.in",
      pickup: "Koramangala, Bangalore",
      destination: "Chikmagalur",
      tripType: "round_trip",
      startDate: today,
      passengerCount: 5,
      estimatedBudget: "15000",
      quotedFare: "16500",
      status: "quoted",
      notes: "Weekend retreat for family. Needs Ertiga or Innova.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const settings: OfflineSettings = {
    company: "NG Travels Operations",
    mobile: "+91 98450 21867",
    email: "operations@ngtravels.in",
    currency: "INR",
    timezone: "Asia/Kolkata",
    defaultRate: 18,
    terms: "1. Toll, parking and state permit charges are customer payable at actuals.\n2. Billing starts and ends from garage to garage.\n3. AC will be switched off while driving in hill terrain.",
  };

  const vehicles: OfflineVehicle[] = [
    {
      id: 1,
      vehicleNumber: "KA-01-MJ-5050",
      vehicleType: "Innova Crysta",
      brand: "Toyota",
      model: "Innova Crysta 2.4 ZX",
      year: 2023,
      capacity: 7,
      fuelType: "Diesel",
      rcNumber: "RC-KA01-2023-998811",
      insurancePolicy: "HDFC-ERGO-COM-889102",
      insuranceExpiry: "2026-11-20",
      permitNumber: "AITP-KA-2024-5510",
      permitExpiry: "2027-03-31",
      fitnessCertNumber: "FIT-KA01-2024-110",
      fitnessExpiry: "2026-12-15",
      pollutionCertNumber: "PUC-KA-2026-9912",
      pollutionExpiry: "2026-10-10",
      assignedDriverId: 1,
      status: "active",
      maintenanceStatus: "good",
      lastServiceDate: "2026-08-10",
      nextServiceDate: "2026-11-10",
      currentOdometerKm: "45350",
      notes: "Top-tier premium luxury fleet vehicle. Immaculate condition.",
      createdAt: new Date("2024-01-15T10:00:00Z").toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 2,
      vehicleNumber: "KA-05-AB-7744",
      vehicleType: "Sedan",
      brand: "Maruti Suzuki",
      model: "Dzire VXI",
      year: 2022,
      capacity: 4,
      fuelType: "CNG/Petrol",
      rcNumber: "RC-KA05-2022-441100",
      insurancePolicy: "ICICI-LOMB-778811",
      insuranceExpiry: "2026-09-28",
      permitNumber: "KA-STATE-2023-441",
      permitExpiry: "2026-10-05",
      fitnessCertNumber: "FIT-KA05-2023-881",
      fitnessExpiry: "2027-05-20",
      pollutionCertNumber: "PUC-KA-2026-5522",
      pollutionExpiry: "2026-09-15",
      assignedDriverId: 2,
      status: "active",
      maintenanceStatus: "good",
      lastServiceDate: "2026-07-20",
      nextServiceDate: "2026-10-20",
      currentOdometerKm: "68200",
      notes: "Punctual airport transfer vehicle. High fuel economy.",
      createdAt: new Date("2024-02-10T11:00:00Z").toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 3,
      vehicleNumber: "KA-03-MM-1234",
      vehicleType: "SUV",
      brand: "Maruti Suzuki",
      model: "Ertiga ZXI",
      year: 2024,
      capacity: 6,
      fuelType: "Petrol",
      rcNumber: "RC-KA03-2024-112233",
      insurancePolicy: "TATA-AIG-665544",
      insuranceExpiry: "2027-02-15",
      permitNumber: "AITP-KA-2024-9912",
      permitExpiry: "2027-08-30",
      fitnessCertNumber: "FIT-KA03-2024-332",
      fitnessExpiry: "2028-02-15",
      pollutionCertNumber: "PUC-KA-2026-3311",
      pollutionExpiry: "2027-02-15",
      assignedDriverId: 3,
      status: "active",
      maintenanceStatus: "good",
      lastServiceDate: "2026-08-25",
      nextServiceDate: "2026-12-25",
      currentOdometerKm: "18400",
      notes: "Corporate vehicle.",
      createdAt: new Date("2024-03-01T09:00:00Z").toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  return {
    drivers,
    vehicles,
    customers,
    trips,
    payments,
    expenses,
    notifications,
    auditLogs,
    enquiries,
    settings,
  };
}

export type OfflineState = ReturnType<typeof getInitialState>;

class OfflineStore {
  private state: OfflineState;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): OfflineState {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.trips) && Array.isArray(parsed.drivers)) {
          const initial = getInitialState();
          return {
            ...initial,
            ...parsed,
            vehicles: Array.isArray(parsed.vehicles) && parsed.vehicles.length > 0
              ? parsed.vehicles
              : initial.vehicles,
            auditLogs: Array.isArray(parsed.auditLogs) && parsed.auditLogs.length > 0
              ? parsed.auditLogs
              : initial.auditLogs,
            settings: parsed.settings || initial.settings,
          };
        }
      }
    } catch (e) {
      console.warn("[OfflineStore] Failed to load from localStorage:", e);
    }
    const initial = getInitialState();
    this.saveState(initial);
    return initial;
  }

  private saveState(state?: OfflineState) {
    if (state) this.state = state;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn("[OfflineStore] Failed to persist to localStorage:", e);
    }
    this.notify();
  }

  public resetToDemoData(): void {
    const initial = getInitialState();
    this.saveState(initial);
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error("[OfflineStore] Listener error:", err);
      }
    }
  }

  // -------------------------------------------------------------
  // HANDLERS FOR ALL FRONTEND /api ROUTES IN STANDALONE MODE
  // -------------------------------------------------------------

  public async handleRequest(urlStr: string, options: RequestInit = {}): Promise<Response> {
    const url = new URL(urlStr, "http://localhost");
    const pathname = url.pathname;
    const method = (options.method || "GET").toUpperCase();
    const body = options.body ? (typeof options.body === "string" ? JSON.parse(options.body) : options.body) : null;

    // 1. Health
    if (pathname === "/api/health") {
      return this.json({ status: "healthy", mode: "standalone_offline", timestamp: new Date().toISOString() });
    }

    // 2. Settings
    if (pathname === "/api/settings") {
      if (method === "GET") {
        return this.json(this.state.settings);
      }
      if (method === "PUT" || method === "PATCH") {
        this.state.settings = { ...this.state.settings, ...body };
        this.saveState();
        return this.json(this.state.settings);
      }
    }

    // 3. Dashboard
    if (pathname === "/api/dashboard") {
      const today = getTodayString();
      const todayTrips = this.state.trips.filter((t) => t.startDate === today);
      const activeTrips = this.state.trips.filter((t) => ["started", "reached_pickup", "customer_picked_up", "in_progress"].includes(t.status));
      const todayRevenue = todayTrips.reduce((acc, t) => acc + (parseFloat(t.customerTotal) || 0), 0);
      const todayCollection = todayTrips.reduce((acc, t) => acc + (parseFloat(t.totalPaid) || 0), 0);
      const todayExpenses = this.state.expenses
        .filter((e) => e.status === "approved")
        .reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0);

      const metrics = {
        todaysTrips: todayTrips.length,
        upcomingTrips: this.state.trips.filter((t) => ["upcoming", "confirmed", "ready"].includes(t.status)).length,
        started: this.state.trips.filter((t) => t.status === "started").length,
        inProgress: activeTrips.length,
        completedToday: todayTrips.filter((t) => t.status === "completed").length,
        paymentPending: this.state.trips.filter((t) => Number(t.remainingBalance || 0) > 0).length,
        todaysRevenue: Math.round(todayRevenue * 100) / 100,
        todaysCollection: Math.round(todayCollection * 100) / 100,
        todaysExpenses: Math.round(todayExpenses * 100) / 100,
        todaysProfit: Math.round((todayRevenue - todayExpenses) * 100) / 100,
      };

      const enrichedTrips = this.state.trips.map((t) => {
        const cust = this.state.customers.find((c) => c.id === t.customerId);
        const driver = this.state.drivers.find((d) => d.id === t.driverId);
        return {
          ...t,
          customerName: cust?.name || "Corporate Customer",
          customerMobile: cust?.mobile || "",
          driverName: driver?.name || null,
          driverMobile: driver?.mobile || null,
        };
      });

      return this.json({
        metrics,
        schedule: enrichedTrips.filter((t) => t.startDate >= today).slice(0, 10),
        recentActivity: enrichedTrips.slice(0, 10),
      });
    }

    // 4. Trips
    if (pathname === "/api/trips") {
      const enrichedTrips = this.state.trips.map((t) => {
        const cust = this.state.customers.find((c) => c.id === t.customerId);
        const driver = this.state.drivers.find((d) => d.id === t.driverId);
        return {
          ...t,
          customerName: cust?.name || "Corporate Customer",
          customerMobile: cust?.mobile || "",
          driverName: driver?.name || null,
          driverMobile: driver?.mobile || null,
        };
      });
      if (method === "GET") {
        return this.json({ items: enrichedTrips, total: enrichedTrips.length });
      }
      if (method === "POST") {
        const id = (this.state.trips.reduce((max, t) => Math.max(max, t.id), 0) || 0) + 1;
        const bookingId = `TRP-2026-${String(id).padStart(3, "0")}`;
        const newTrip: OfflineTrip = {
          id,
          bookingId,
          customerId: body.customerId || 1,
          driverId: body.driverId || null,
          driverName: body.driverName || (body.driverId ? this.state.drivers.find((d) => d.id === body.driverId)?.name : null),
          driverMobile: body.driverId ? this.state.drivers.find((d) => d.id === body.driverId)?.mobile : null,
          tripType: body.tripType || "round_trip",
          pickup: body.pickup || { address: "Bangalore" },
          destination: body.destination || { address: "Mysore" },
          stops: body.stops || [],
          startDate: body.startDate || getTodayString(),
          startTime: body.startTime || "09:00",
          returnDate: body.returnDate || null,
          returnTime: body.returnTime || null,
          passengerCount: Number(body.passengerCount) || 1,
          notes: body.notes || "",
          status: "upcoming",
          mapDistanceKm: String(body.mapDistanceKm || body.billingKm || "100"),
          finalToll: String(body.finalToll || body.toll || "0"),
          billingKm: String(body.billingKm || "100"),
          ratePerKm: String(body.ratePerKm || "18"),
          baseFare: String(body.baseFare || (Number(body.billingKm || 100) * Number(body.ratePerKm || 18))),
          toll: String(body.toll || "0"),
          parking: String(body.parking || "0"),
          permitCharge: String(body.permitCharge || "0"),
          driverBata: String(body.driverBata || "0"),
          waitingCharge: String(body.waitingCharge || "0"),
          nightCharge: String(body.nightCharge || "0"),
          discount: String(body.discount || "0"),
          tax: String(body.tax || "0"),
          billableDays: body.billableDays ? Number(body.billableDays) : 1,
          minimumKm: body.minimumKm ? String(body.minimumKm) : null,
          billingDayPolicy: body.billingDayPolicy || "CALENDAR_DAYS",
          routeSnapshot: body.routeSnapshot || null,
          customerTotal: String(body.customerTotal || "2000"),
          totalPaid: String(body.advancePaid || "0"),
          remainingBalance: String(Number(body.customerTotal || 2000) - Number(body.advancePaid || 0)),
          credit: "0",
          paymentStatus: Number(body.advancePaid || 0) > 0 ? "partial" : "unpaid",
          settlementStatus: "pending",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (Number(body.advancePaid || 0) > 0) {
          this.state.payments.unshift({
            id: Date.now(),
            tripId: id,
            amount: String(body.advancePaid),
            paymentMethod: body.advancePaymentMethod || "cash",
            collectedBy: "office",
            notes: "Initial advance on booking creation",
            paymentDate: getTodayString(),
            createdAt: new Date().toISOString(),
          });
        }

        this.state.trips.unshift(newTrip);
        this.saveState();
        return this.json(newTrip, 201);
      }
    }

    // Specific trip routes
    const tripMatch = pathname.match(/^\/api\/trips\/(\d+)$/);
    if (tripMatch) {
      const tripId = Number(tripMatch[1]);
      const trip = this.state.trips.find((t) => t.id === tripId);
      if (!trip) return this.json({ error: "Trip not found" }, 404);

      if (method === "GET") return this.json(trip);
      if (method === "PATCH" || method === "PUT") {
        Object.assign(trip, body, { updatedAt: new Date().toISOString() });
        this.saveState();
        return this.json(trip);
      }
      if (method === "DELETE") {
        this.state.trips = this.state.trips.filter((t) => t.id !== tripId);
        this.saveState();
        return this.json({ success: true });
      }
    }

    // Trip Cancel
    const cancelMatch = pathname.match(/^\/api\/trips\/(\d+)\/cancel$/);
    if (cancelMatch && method === "POST") {
      const tripId = Number(cancelMatch[1]);
      const trip = this.state.trips.find((t) => t.id === tripId);
      if (trip) {
        trip.status = "cancelled";
        trip.cancellationReason = body?.reason || "Cancelled by user";
        trip.cancelledAt = new Date().toISOString();
        this.saveState();
      }
      return this.json(trip || { success: true });
    }

    // Trip Payments
    const tripPaymentsMatch = pathname.match(/^\/api\/trips\/(\d+)\/payments$/);
    if (tripPaymentsMatch) {
      const tripId = Number(tripPaymentsMatch[1]);
      if (method === "GET") {
        return this.json(this.state.payments.filter((p) => p.tripId === tripId));
      }
      if (method === "POST") {
        const pId = Date.now();
        const payment: OfflinePayment = {
          id: pId,
          tripId,
          amount: String(body.amount),
          paymentMethod: body.paymentMethod || "cash",
          transactionReference: body.transactionReference || null,
          collectedBy: body.collectedBy || "office",
          notes: body.notes || "",
          paymentDate: body.paymentDate || getTodayString(),
          createdAt: new Date().toISOString(),
        };
        this.state.payments.unshift(payment);

        const trip = this.state.trips.find((t) => t.id === tripId);
        if (trip) {
          const totalPaid = this.state.payments
            .filter((p) => p.tripId === tripId)
            .reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);
          trip.totalPaid = String(totalPaid);
          trip.remainingBalance = String(Math.max(0, parseFloat(trip.customerTotal) - totalPaid));
          trip.paymentStatus = totalPaid >= parseFloat(trip.customerTotal) ? "paid" : "partial";
        }
        this.saveState();
        return this.json(payment, 201);
      }
    }

    // Trip Expenses
    const tripExpensesMatch = pathname.match(/^\/api\/trips\/(\d+)\/expenses$/);
    if (tripExpensesMatch) {
      const tripId = Number(tripExpensesMatch[1]);
      if (method === "GET") {
        return this.json(this.state.expenses.filter((e) => e.tripId === tripId));
      }
      if (method === "POST") {
        const expense: OfflineExpense = {
          id: Date.now(),
          tripId,
          driverId: body.driverId || 1,
          category: body.category || "Fuel",
          amount: String(body.amount),
          receiptUrl: body.receiptUrl || null,
          notes: body.notes || "",
          status: "pending",
          location: body.location || "En route",
          recordedBy: body.recordedBy || "Driver",
          createdAt: new Date().toISOString(),
        };
        this.state.expenses.unshift(expense);
        this.saveState();
        return this.json(expense, 201);
      }
    }

    // Expense approve/reject
    const expenseApproveMatch = pathname.match(/^\/api\/expenses\/(\d+)\/approve$/);
    if (expenseApproveMatch && method === "PATCH") {
      const eId = Number(expenseApproveMatch[1]);
      const exp = this.state.expenses.find((e) => e.id === eId);
      if (exp) {
        exp.status = "approved";
        exp.approvedBy = "Operations Admin";
        exp.approvedAt = new Date().toISOString();
        this.saveState();
      }
      return this.json(exp || { success: true });
    }

    const expenseRejectMatch = pathname.match(/^\/api\/expenses\/(\d+)\/reject$/);
    if (expenseRejectMatch && method === "PATCH") {
      const eId = Number(expenseRejectMatch[1]);
      const exp = this.state.expenses.find((e) => e.id === eId);
      if (exp) {
        exp.status = "rejected";
        exp.rejectionReason = body?.reason || "Rejected by owner";
        this.saveState();
      }
      return this.json(exp || { success: true });
    }

    // 5. Driver API
    if (pathname === "/api/driver/today") {
      const today = getTodayString();
      const driverTrips = this.state.trips.filter((t) => t.driverId === 1 || t.startDate === today);
      return this.json(driverTrips);
    }

    if (pathname === "/api/driver/current-trip") {
      const current = this.state.trips.find((t) => t.driverId === 1 && (t.status === "started" || t.status === "upcoming"));
      return this.json(current || null);
    }

    if (pathname === "/api/driver/vehicle") {
      const v = (this.state.vehicles || []).find((veh) => veh.assignedDriverId === 1) || this.state.vehicles?.[0] || null;
      return this.json(v ? enrichOfflineVehicle(v) : null);
    }

    const driverStartMatch = pathname.match(/^\/api\/driver\/trips\/(\d+)\/start$/);
    if (driverStartMatch && method === "POST") {
      const tripId = Number(driverStartMatch[1]);
      const trip = this.state.trips.find((t) => t.id === tripId);
      if (trip) {
        trip.status = "started";
        trip.startingKm = String(body.startingKm || "45000");
        trip.startKmTime = new Date().toISOString();
        if (body.notes) trip.driverNotes = body.notes;
        const driver = this.state.drivers.find((d) => d.id === (trip.driverId || 1));
        if (driver) driver.availability = "on_trip";
        this.saveState();
      }
      return this.json(trip || { success: true });
    }

    const driverCompleteMatch = pathname.match(/^\/api\/driver\/trips\/(\d+)\/complete$/);
    if (driverCompleteMatch && method === "POST") {
      const tripId = Number(driverCompleteMatch[1]);
      const trip = this.state.trips.find((t) => t.id === tripId);
      if (trip) {
        trip.status = "completed";
        trip.endingKm = String(body.endingKm || Number(trip.startingKm || 45000) + 120);
        trip.endKmTime = new Date().toISOString();
        trip.actualKm = String(Number(trip.endingKm) - Number(trip.startingKm || 0));
        if (body.notes) trip.driverNotes = body.notes;
        const driver = this.state.drivers.find((d) => d.id === (trip.driverId || 1));
        if (driver) driver.availability = "available";
        this.saveState();
      }
      return this.json(trip || { success: true });
    }

    // 6. Customers, Drivers, Enquiries, Notifications, Audit Logs
    if (pathname === "/api/customers") {
      if (method === "GET") return this.json(this.state.customers);
      if (method === "POST") {
        const newCust: OfflineCustomer = {
          id: Date.now(),
          customerCode: `CUST-${String(this.state.customers.length + 1).padStart(3, "0")}`,
          name: body.name,
          mobile: body.mobile,
          whatsapp: body.whatsapp || body.mobile,
          email: body.email || null,
          address: body.address || null,
          notes: body.notes || null,
          archived: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        this.state.customers.unshift(newCust);
        this.saveState();
        return this.json(newCust, 201);
      }
    }

    if (pathname === "/api/drivers") {
      if (method === "GET") return this.json(this.state.drivers);
      if (method === "POST") {
        const newDriver: OfflineDriver = {
          id: Date.now(),
          driverCode: `DRV-${String(this.state.drivers.length + 1).padStart(3, "0")}`,
          name: body.name,
          mobile: body.mobile,
          email: body.email || null,
          licenseNumber: body.licenseNumber || null,
          status: "active",
          availability: "available",
          rating: "5.0",
          notes: body.notes || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        this.state.drivers.unshift(newDriver);
        this.saveState();
        return this.json(newDriver, 201);
      }
    }

    if (pathname === "/api/enquiries") {
      if (method === "GET") return this.json(this.state.enquiries);
      if (method === "POST") {
        const newEnq: OfflineEnquiry = {
          id: Date.now(),
          enquiryCode: `ENQ-${String(this.state.enquiries.length + 1).padStart(4, "0")}`,
          customerName: body.customerName,
          customerMobile: body.customerMobile,
          customerEmail: body.customerEmail || null,
          pickup: body.pickup,
          destination: body.destination,
          tripType: body.tripType || "round_trip",
          startDate: body.startDate || getTodayString(),
          passengerCount: Number(body.passengerCount) || 1,
          estimatedBudget: body.estimatedBudget ? String(body.estimatedBudget) : null,
          quotedFare: body.quotedFare ? String(body.quotedFare) : null,
          status: "pending",
          notes: body.notes || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        this.state.enquiries.unshift(newEnq);
        this.saveState();
        return this.json(newEnq, 201);
      }
    }

    if (pathname === "/api/payments") {
      return this.json(this.state.payments);
    }

    if (pathname === "/api/expenses") {
      return this.json(this.state.expenses);
    }

    if (pathname === "/api/notifications") {
      return this.json(this.state.notifications);
    }

    if (pathname === "/api/notifications/read-all") {
      (this.state.notifications || []).forEach((n) => (n.isRead = true));
      this.saveState();
      return this.json({ success: true });
    }

    const notifReadMatch = pathname.match(/^\/api\/notifications\/(\d+)\/read$/);
    if (notifReadMatch) {
      const nId = Number(notifReadMatch[1]);
      const n = (this.state.notifications || []).find((notif) => notif.id === nId);
      if (n) {
        n.isRead = true;
        this.saveState();
      }
      return this.json(n || { success: true });
    }

    if (pathname === "/api/audit-logs") {
      return this.json(this.state.auditLogs || []);
    }

    if (pathname === "/api/settings") {
      if (method === "GET") return this.json(this.state.settings);
      if (method === "POST" || method === "PATCH" || method === "PUT") {
        this.state.settings = { ...this.state.settings, ...body };
        this.saveState();
        return this.json(this.state.settings);
      }
    }

    const driverMilestoneMatch = pathname.match(/^\/api\/driver\/trips\/(\d+)\/milestone$/);
    if (driverMilestoneMatch && method === "POST") {
      const tripId = Number(driverMilestoneMatch[1]);
      const trip = this.state.trips.find((t) => t.id === tripId);
      if (trip) {
        trip.status = body.status || trip.status;
        if (body.note) trip.driverNotes = body.note;
        this.saveState();
      }
      return this.json(trip || { success: true });
    }

    const driverLocationMatch = pathname.match(/^\/api\/driver\/trips\/(\d+)\/location$/);
    if (driverLocationMatch && method === "POST") {
      return this.json({ success: true, timestamp: new Date().toISOString() });
    }

    // 7. Vehicles API
    if (pathname === "/api/vehicles") {
      if (method === "GET") {
        return this.json((this.state.vehicles || []).map(enrichOfflineVehicle));
      }
      if (method === "POST") {
        const newVehicle: OfflineVehicle = {
          id: Date.now(),
          vehicleNumber: body.vehicleNumber,
          vehicleType: body.vehicleType || "Sedan",
          brand: body.brand || "Maruti Suzuki",
          model: body.model || "Dzire",
          year: body.year ? Number(body.year) : null,
          capacity: Number(body.capacity || 4),
          fuelType: body.fuelType || "Diesel",
          rcNumber: body.rcNumber || null,
          insurancePolicy: body.insurancePolicy || null,
          insuranceExpiry: body.insuranceExpiry || null,
          permitNumber: body.permitNumber || null,
          permitExpiry: body.permitExpiry || null,
          fitnessCertNumber: body.fitnessCertNumber || null,
          fitnessExpiry: body.fitnessExpiry || null,
          pollutionCertNumber: body.pollutionCertNumber || null,
          pollutionExpiry: body.pollutionExpiry || null,
          assignedDriverId: body.assignedDriverId ? Number(body.assignedDriverId) : null,
          status: body.status || "active",
          maintenanceStatus: body.maintenanceStatus || "good",
          lastServiceDate: body.lastServiceDate || null,
          nextServiceDate: body.nextServiceDate || null,
          currentOdometerKm: String(body.currentOdometerKm || "0"),
          notes: body.notes || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        if (!this.state.vehicles) this.state.vehicles = [];
        this.state.vehicles.unshift(newVehicle);
        this.saveState();
        return this.json(enrichOfflineVehicle(newVehicle), 201);
      }
    }

    if (pathname === "/api/vehicles/expiry-alerts") {
      const enriched = (this.state.vehicles || []).map(enrichOfflineVehicle);
      return this.json(enriched.filter((v) => v.hasExpiringDocuments));
    }

    const vehicleIdMatch = pathname.match(/^\/api\/vehicles\/(\d+)$/);
    if (vehicleIdMatch) {
      const vId = Number(vehicleIdMatch[1]);
      if (method === "GET") {
        const v = (this.state.vehicles || []).find((veh) => veh.id === vId);
        if (!v) return this.json({ error: "Vehicle not found" }, 404);
        return this.json(enrichOfflineVehicle(v));
      }
      if (method === "PATCH") {
        const v = (this.state.vehicles || []).find((veh) => veh.id === vId);
        if (!v) return this.json({ error: "Vehicle not found" }, 404);
        Object.assign(v, body, { updatedAt: new Date().toISOString() });
        this.saveState();
        return this.json(enrichOfflineVehicle(v));
      }
      if (method === "DELETE") {
        this.state.vehicles = (this.state.vehicles || []).filter((veh) => veh.id !== vId);
        this.saveState();
        return this.json({ success: true });
      }
    }

    // Default 200 OK for other /api endpoints
    return this.json({ success: true });
  }

  private json(data: any, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const offlineStore = new OfflineStore();
