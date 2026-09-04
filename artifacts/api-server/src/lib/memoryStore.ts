import type { TripLocation, RouteAlternative } from "@workspace/db";

export interface MemDriver {
  id: number;
  driverCode: string;
  name: string;
  mobile: string;
  email?: string | null;
  licenseNumber?: string | null;
  licenseExpiry?: string | null;
  emergencyContact?: string | null;
  status: "active" | "inactive" | "on_leave";
  availability: "available" | "on_trip" | "offline" | "on_leave";
  rating: string;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemVehicle {
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
  createdAt: Date;
  updatedAt: Date;
}

export interface MemDriverLocation {
  id: number;
  driverId: number;
  tripId?: number | null;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  batteryLevel?: number | null;
  timestamp: Date;
}

export interface MemCustomer {
  id: number;
  customerCode: string;
  name: string;
  mobile: string;
  whatsapp?: string | null;
  alternateNumber?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemEnquiry {
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
  createdAt: Date;
  updatedAt: Date;
}

export interface MemTrip {
  id: number;
  bookingId: string;
  customerId: number;
  driverId?: number | null;
  driverName?: string | null;
  driverMobile?: string | null;
  vehicleId?: number | null;
  vehicleNumber?: string | null;
  idempotencyKey?: string | null;
  tripType: string;
  pickup: TripLocation;
  destination: TripLocation;
  stops: TripLocation[];
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
  outboundDurationMinutes?: number | null;
  returnDurationMinutes?: number | null;
  routeSummary?: string | null;
  routeOptions?: RouteAlternative[];
  selectedRouteSummary?: string | null;
  apiEstimatedToll?: string | null;
  estimatedToll?: string | null;
  finalToll: string;
  outboundTollEstimate?: string | null;
  returnTollEstimate?: string | null;
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
  startKmTime?: Date | null;
  startKmLocation?: string | null;
  startKmPhoto?: string | null;
  endingKm?: string | null;
  endKmTime?: Date | null;
  endKmLocation?: string | null;
  endKmPhoto?: string | null;
  actualKm?: string | null;
  expenseTotal: string;
  cancellationReason?: string | null;
  cancelledAt?: Date | null;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemPayment {
  id: number;
  tripId: number;
  amount: string;
  method: string;
  paymentType: string;
  paymentDate: string;
  reference?: string | null;
  notes?: string | null;
  recordedBy?: string | null;
  createdAt: Date;
}

export interface MemRefund {
  id: number;
  tripId: number;
  paymentId?: number | null;
  amount: string;
  reason: string;
  method: string;
  reference?: string | null;
  refundDate: string;
  recordedBy?: string | null;
  createdAt: Date;
}

export interface MemExpense {
  id: number;
  tripId: number;
  driverId?: number | null;
  category: string;
  amount: string;
  expenseDate: string;
  receiptPath?: string | null;
  notes?: string | null;
  status: "pending" | "approved" | "rejected";
  approvedBy?: string | null;
  approvedAt?: Date | null;
  rejectionReason?: string | null;
  location?: string | null;
  recordedBy?: string | null;
  createdAt: Date;
}

export interface MemNotification {
  id: number;
  audience: "owner" | "driver";
  driverId?: number | null;
  title: string;
  message: string;
  kind: string;
  tripId?: number | null;
  isRead: boolean;
  createdAt: Date;
}

export interface MemAuditLog {
  id: number;
  action: string;
  entity: string;
  entityId: string;
  actorName: string;
  oldValue?: string | null;
  newValue?: string | null;
  createdAt: Date;
}

const todayStr = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
}).format(new Date());

export const memDrivers: MemDriver[] = [
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
    createdAt: new Date("2024-01-10T10:00:00Z"),
    updatedAt: new Date(),
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
    createdAt: new Date("2024-03-15T09:30:00Z"),
    updatedAt: new Date(),
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
    createdAt: new Date("2024-06-01T11:00:00Z"),
    updatedAt: new Date(),
  },
  {
    id: 4,
    driverCode: "DRV-104",
    name: "Rajesh M",
    mobile: "+91 99887 44556",
    email: "rajesh.driver@ngtravels.in",
    licenseNumber: "DL-KA04-2017006655",
    licenseExpiry: "2028-11-10",
    emergencyContact: "+91 99887 66554 (Brother)",
    status: "on_leave",
    availability: "on_leave",
    rating: "4.9",
    notes: "On medical leave until next week.",
    createdAt: new Date("2023-11-20T08:00:00Z"),
    updatedAt: new Date(),
  },
];

export const memVehicles: MemVehicle[] = [
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
    createdAt: new Date("2024-01-15T10:00:00Z"),
    updatedAt: new Date(),
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
    createdAt: new Date("2024-02-10T11:00:00Z"),
    updatedAt: new Date(),
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
    createdAt: new Date("2024-03-01T09:00:00Z"),
    updatedAt: new Date(),
  },
];

export const memDriverLocations: MemDriverLocation[] = [];

export const memCustomers: MemCustomer[] = [
  {
    id: 1,
    customerCode: "CUS-1002341",
    name: "Rajesh Sharma",
    mobile: "+91 98450 12345",
    whatsapp: "+91 98450 12345",
    email: "rajesh.sharma@example.com",
    address: "Indiranagar, 100 Feet Rd, Bengaluru",
    notes: "VIP Corporate client. Prefers premium sedan.",
    archived: false,
    createdAt: new Date("2026-08-15T09:00:00Z"),
    updatedAt: new Date("2026-08-15T09:00:00Z"),
  },
  {
    id: 2,
    customerCode: "CUS-1002342",
    name: "Priya Patel",
    mobile: "+91 98765 43210",
    whatsapp: "+91 98765 43210",
    email: "priya.p@techcorp.in",
    address: "Whitefield, ITPL Main Rd, Bengaluru",
    notes: "Regular airport transfer traveller.",
    archived: false,
    createdAt: new Date("2026-08-18T11:30:00Z"),
    updatedAt: new Date("2026-08-18T11:30:00Z"),
  },
  {
    id: 3,
    customerCode: "CUS-1002343",
    name: "Bangalore Tech Solutions",
    mobile: "+91 91234 56780",
    whatsapp: "+91 91234 56780",
    email: "logistics@bangaloretech.in",
    address: "Electronic City Phase 1, Bengaluru",
    notes: "Monthly billing account.",
    archived: false,
    createdAt: new Date("2026-08-20T14:15:00Z"),
    updatedAt: new Date("2026-08-20T14:15:00Z"),
  },
  {
    id: 4,
    customerCode: "CUS-1002344",
    name: "Anita Rao",
    mobile: "+91 99887 76655",
    whatsapp: "+91 99887 76655",
    email: "anita.rao@gmail.com",
    address: "Koramangala 4th Block, Bengaluru",
    notes: "Family weekend outstation booking.",
    archived: false,
    createdAt: new Date("2026-08-25T16:00:00Z"),
    updatedAt: new Date("2026-08-25T16:00:00Z"),
  },
  {
    id: 5,
    customerCode: "CUS-1002345",
    name: "Vikram Malhotra",
    mobile: "+91 97654 32190",
    whatsapp: "+91 97654 32190",
    email: "vikram.m@cloudventures.co",
    address: "MG Road, Bengaluru",
    notes: "Requires English speaking driver with clean car.",
    archived: false,
    createdAt: new Date("2026-08-28T10:00:00Z"),
    updatedAt: new Date("2026-08-28T10:00:00Z"),
  },
];

export const memEnquiries: MemEnquiry[] = [
  {
    id: 1,
    enquiryCode: "ENQ-2026-001",
    customerName: "Dr. Arvind Swaminathan",
    customerMobile: "+91 98451 99221",
    customerEmail: "arvind.doc@apollo.org",
    pickup: "Jayanagar 4th Block, Bengaluru",
    destination: "Ooty Botanical Gardens, Nilgiris",
    tripType: "outstation_round_trip",
    startDate: todayStr,
    passengerCount: 4,
    estimatedBudget: "20000.00",
    quotedFare: "18500.00",
    status: "quoted",
    notes: "Wants Innova Crysta for 3 days sightseeing.",
    createdAt: new Date("2026-09-01T09:00:00Z"),
    updatedAt: new Date(),
  },
  {
    id: 2,
    enquiryCode: "ENQ-2026-002",
    customerName: "Cognizant Logistics Desk",
    customerMobile: "+91 98860 11990",
    customerEmail: "corp.travel@cognizant.com",
    pickup: "Manyata Embassy Tech Park",
    destination: "Electronic City Phase 2",
    tripType: "local_rental",
    startDate: todayStr,
    passengerCount: 6,
    estimatedBudget: "8000.00",
    quotedFare: "7500.00",
    status: "pending",
    notes: "Corporate client VIP delegation transfer.",
    createdAt: new Date("2026-09-02T08:30:00Z"),
    updatedAt: new Date(),
  },
];

export const memTrips: MemTrip[] = [
  {
    id: 1,
    bookingId: "TRP-2026-001",
    customerId: 1,
    driverId: 1,
    driverName: "Suresh K",
    driverMobile: "+91 98450 11223",
    tripType: "outstation_round_trip",
    pickup: { name: "Indiranagar", address: "100 Feet Rd, Indiranagar, Bengaluru", latitude: 12.9784, longitude: 77.6408, placeId: "ChIJbU60yXA_rjsR4E9Va5PzK5I" },
    destination: { name: "Mysore Palace", address: "Sayyaji Rao Rd, Mysuru", latitude: 12.3051, longitude: 76.6551, placeId: "ChIJbX0i3K5prjsR3GkF3K4B5KI" },
    stops: [{ name: "Mandya Woodlands", address: "Bangalore-Mysore Expressway", latitude: 12.5238, longitude: 76.8961 }],
    startDate: todayStr,
    startTime: "07:30",
    returnDate: todayStr,
    returnTime: "21:00",
    passengerCount: 3,
    notes: "Sightseeing day tour.",
    specialInstructions: "Driver allowance included. Keep water bottles ready.",
    status: "in_progress",
    mapDistanceKm: "310.00",
    routeDurationMinutes: 240,
    routeSummary: "Via NH275 Bengaluru-Mysuru Expressway",
    selectedRouteSummary: "NH275 Expressway (Fastest)",
    routeOptions: [
      { routeIndex: 0, summary: "Via NH275 Expressway", distanceKm: 310, durationMinutes: 240, estimatedToll: 350, via: "NH275" },
      { routeIndex: 1, summary: "Via NH948 & Kanakapura", distanceKm: 335, durationMinutes: 300, estimatedToll: 120, via: "NH948" },
    ],
    billingKm: "320.00",
    ratePerKm: "18.00",
    baseFare: "5760.00",
    toll: "350.00",
    finalToll: "350.00",
    parking: "100.00",
    permitCharge: "500.00",
    customerTotal: "6710.00",
    totalPaid: "3000.00",
    remainingBalance: "3710.00",
    credit: "0.00",
    startingKm: "45120.00",
    expenseTotal: "1200.00",
    isLocked: false,
    createdAt: new Date("2026-09-01T08:00:00Z"),
    updatedAt: new Date(),
  },
  {
    id: 2,
    bookingId: "TRP-2026-002",
    customerId: 2,
    driverId: 2,
    driverName: "Ramesh Babu",
    driverMobile: "+91 98765 22334",
    tripType: "airport_transfer",
    pickup: { name: "Whitefield", address: "ITPL Main Rd, Whitefield, Bengaluru", latitude: 12.9698, longitude: 77.7499 },
    destination: { name: "Kempegowda Intl Airport", address: "Devanahalli, Bengaluru", latitude: 13.1986, longitude: 77.7066 },
    stops: [],
    startDate: todayStr,
    startTime: "14:00",
    passengerCount: 1,
    notes: "Flight AI 504 departure at 17:30.",
    specialInstructions: "AC must be on high.",
    status: "upcoming",
    mapDistanceKm: "42.00",
    routeDurationMinutes: 65,
    routeSummary: "Via SH 104 and Airport Rd",
    billingKm: "45.00",
    ratePerKm: "24.00",
    baseFare: "1080.00",
    toll: "115.00",
    finalToll: "115.00",
    parking: "0.00",
    permitCharge: "0.00",
    customerTotal: "1195.00",
    totalPaid: "1195.00",
    remainingBalance: "0.00",
    credit: "0.00",
    expenseTotal: "0.00",
    isLocked: false,
    createdAt: new Date("2026-09-01T10:00:00Z"),
    updatedAt: new Date(),
  },
  {
    id: 3,
    bookingId: "TRP-2026-003",
    customerId: 3,
    driverId: 3,
    driverName: "Anand V",
    driverMobile: "+91 91234 33445",
    tripType: "local_rental",
    pickup: { name: "Electronic City Phase 1", address: "Infosys Gate 1, Bengaluru", latitude: 12.8399, longitude: 77.6770 },
    destination: { name: "Manyata Tech Park", address: "Nagavara, Bengaluru", latitude: 13.0475, longitude: 77.6200 },
    stops: [{ name: "Koramangala", address: "Sony World Junction", latitude: 12.9352, longitude: 77.6245 }],
    startDate: todayStr,
    startTime: "09:00",
    passengerCount: 4,
    notes: "Client delegate visits.",
    status: "completed",
    mapDistanceKm: "68.00",
    routeDurationMinutes: 120,
    routeSummary: "Via Outer Ring Rd",
    billingKm: "80.00",
    ratePerKm: "20.00",
    baseFare: "1600.00",
    toll: "0.00",
    finalToll: "0.00",
    parking: "150.00",
    permitCharge: "0.00",
    customerTotal: "1750.00",
    totalPaid: "1750.00",
    remainingBalance: "0.00",
    credit: "0.00",
    startingKm: "23400.00",
    endingKm: "23485.00",
    actualKm: "85.00",
    expenseTotal: "550.00",
    isLocked: true,
    createdAt: new Date("2026-09-01T12:00:00Z"),
    updatedAt: new Date(),
  },
  {
    id: 4,
    bookingId: "TRP-2026-004",
    customerId: 4,
    driverId: 1,
    driverName: "Suresh K",
    driverMobile: "+91 98450 11223",
    tripType: "outstation_one_way",
    pickup: { name: "Koramangala 4th Block", address: "100 Feet Rd, Bengaluru", latitude: 12.9345, longitude: 77.6265 },
    destination: { name: "Madikeri, Coorg", address: "Madikeri Town Centre, Kodagu", latitude: 12.4244, longitude: 75.7382 },
    stops: [],
    startDate: todayStr,
    startTime: "06:00",
    passengerCount: 4,
    notes: "Family holiday trip.",
    status: "completed",
    mapDistanceKm: "255.00",
    routeDurationMinutes: 320,
    routeSummary: "Via NH75 & SH88",
    billingKm: "260.00",
    ratePerKm: "22.00",
    baseFare: "5720.00",
    toll: "280.00",
    finalToll: "280.00",
    parking: "0.00",
    permitCharge: "400.00",
    customerTotal: "6400.00",
    totalPaid: "6400.00",
    remainingBalance: "0.00",
    credit: "0.00",
    startingKm: "78200.00",
    endingKm: "78465.00",
    actualKm: "265.00",
    expenseTotal: "2100.00",
    isLocked: true,
    createdAt: new Date("2026-08-30T15:00:00Z"),
    updatedAt: new Date(),
  },
  {
    id: 5,
    bookingId: "TRP-2026-005",
    customerId: 5,
    driverId: 2,
    driverName: "Ramesh Babu",
    driverMobile: "+91 98765 22334",
    tripType: "local_transfer",
    pickup: { name: "MG Road Metro", address: "MG Road, Bengaluru", latitude: 12.9756, longitude: 77.6066 },
    destination: { name: "Bengaluru Golf Club", address: "Sankey Rd, Bengaluru", latitude: 12.9936, longitude: 77.5855 },
    stops: [],
    startDate: todayStr,
    startTime: "16:30",
    passengerCount: 2,
    notes: "Evening appointment.",
    status: "upcoming",
    mapDistanceKm: "12.00",
    routeDurationMinutes: 30,
    routeSummary: "Via Raj Bhavan Rd",
    billingKm: "15.00",
    ratePerKm: "25.00",
    baseFare: "375.00",
    toll: "0.00",
    finalToll: "0.00",
    parking: "50.00",
    permitCharge: "0.00",
    customerTotal: "425.00",
    totalPaid: "0.00",
    remainingBalance: "425.00",
    credit: "0.00",
    expenseTotal: "0.00",
    isLocked: false,
    createdAt: new Date("2026-09-02T06:00:00Z"),
    updatedAt: new Date(),
  },
];

export const memPayments: MemPayment[] = [
  {
    id: 1,
    tripId: 1,
    amount: "3000.00",
    method: "UPI",
    paymentType: "advance",
    paymentDate: todayStr,
    reference: "UPI/260902/894102",
    notes: "Advance payment received via GPay",
    recordedBy: "Operations Admin",
    createdAt: new Date(),
  },
  {
    id: 2,
    tripId: 2,
    amount: "1195.00",
    method: "Card",
    paymentType: "full",
    paymentDate: todayStr,
    reference: "POS/TXN-49210",
    notes: "Full payment prepaid online",
    recordedBy: "Operations Admin",
    createdAt: new Date(),
  },
  {
    id: 3,
    tripId: 3,
    amount: "1750.00",
    method: "Bank Transfer",
    paymentType: "full",
    paymentDate: todayStr,
    reference: "NEFT/TECHCORP/0921",
    notes: "Corporate payment",
    recordedBy: "Operations Admin",
    createdAt: new Date(),
  },
  {
    id: 4,
    tripId: 4,
    amount: "6400.00",
    method: "Cash",
    paymentType: "full",
    paymentDate: todayStr,
    reference: "CASH-REC-108",
    notes: "Paid in full at pickup",
    recordedBy: "Driver Suresh",
    createdAt: new Date(),
  },
];

export const memRefunds: MemRefund[] = [];

export const memExpenses: MemExpense[] = [
  {
    id: 1,
    tripId: 1,
    driverId: 1,
    category: "Fuel",
    amount: "1200.00",
    expenseDate: todayStr,
    notes: "Indian Oil Petrol Pump, Mysore Rd - 12.5L Diesel",
    receiptPath: null,
    status: "approved",
    approvedBy: "Operations Admin",
    approvedAt: new Date(),
    location: "Mysore Expressway Indian Oil",
    recordedBy: "Driver Suresh",
    createdAt: new Date(),
  },
  {
    id: 2,
    tripId: 3,
    driverId: 3,
    category: "Parking",
    amount: "150.00",
    expenseDate: todayStr,
    notes: "Manyata Tech Park visitor multi-level parking",
    receiptPath: null,
    status: "approved",
    approvedBy: "Operations Admin",
    approvedAt: new Date(),
    location: "Manyata Tech Park",
    recordedBy: "Driver Anand",
    createdAt: new Date(),
  },
  {
    id: 3,
    tripId: 4,
    driverId: 1,
    category: "Fuel",
    amount: "1800.00",
    expenseDate: todayStr,
    notes: "HPCL Nelamangala - 18.2L Diesel",
    receiptPath: null,
    status: "approved",
    approvedBy: "Operations Admin",
    approvedAt: new Date(),
    location: "Nelamangala Highway HPCL",
    recordedBy: "Driver Suresh",
    createdAt: new Date(),
  },
  {
    id: 4,
    tripId: 4,
    driverId: 1,
    category: "Toll",
    amount: "300.00",
    expenseDate: todayStr,
    notes: "Fastag toll charges",
    receiptPath: null,
    status: "approved",
    approvedBy: "Operations Admin",
    approvedAt: new Date(),
    location: "Kushalnagar Toll Plaza",
    recordedBy: "Driver Suresh",
    createdAt: new Date(),
  },
  {
    id: 5,
    tripId: 1,
    driverId: 1,
    category: "Food",
    amount: "250.00",
    expenseDate: todayStr,
    notes: "Driver breakfast at Mandya Woodlands",
    receiptPath: null,
    status: "pending",
    location: "Mandya Woodlands",
    recordedBy: "Driver Suresh",
    createdAt: new Date(),
  },
];

export const memNotifications: MemNotification[] = [
  {
    id: 1,
    audience: "owner",
    title: "Trip TRP-2026-001 In Progress",
    message: "Driver Suresh K has departed Indiranagar towards Mysore with 3 passengers.",
    kind: "trip_started",
    tripId: 1,
    isRead: false,
    createdAt: new Date(),
  },
  {
    id: 2,
    audience: "owner",
    title: "Advance Payment Received",
    message: "₹3,000 recorded for booking TRP-2026-001 from Rajesh Sharma.",
    kind: "payment_recorded",
    tripId: 1,
    isRead: false,
    createdAt: new Date(),
  },
  {
    id: 3,
    audience: "owner",
    title: "Trip TRP-2026-003 Completed",
    message: "Local rental for Bangalore Tech Solutions concluded with 85 km clocked.",
    kind: "trip_completed",
    tripId: 3,
    isRead: true,
    createdAt: new Date(Date.now() - 3600000),
  },
  {
    id: 4,
    audience: "driver",
    driverId: 1,
    title: "Assigned to Trip TRP-2026-001",
    message: "You have been assigned to trip to Mysore Palace. Pickup at Indiranagar 07:30 AM.",
    kind: "trip_assigned",
    tripId: 1,
    isRead: false,
    createdAt: new Date(Date.now() - 7200000),
  },
  {
    id: 5,
    audience: "driver",
    driverId: 1,
    title: "Fuel Expense Approved",
    message: "Your ₹1,200 fuel expense has been approved by Operations.",
    kind: "expense_approved",
    tripId: 1,
    isRead: true,
    createdAt: new Date(Date.now() - 1800000),
  },
];

export const memAuditLogs: MemAuditLog[] = [
  {
    id: 1,
    action: "Trip Created",
    entity: "trip",
    entityId: "1",
    actorName: "Operations Admin",
    newValue: JSON.stringify({ bookingId: "TRP-2026-001", customer: "Rajesh Sharma", driver: "Suresh K" }),
    createdAt: new Date(Date.now() - 7200000),
  },
  {
    id: 2,
    action: "Payment Recorded",
    entity: "payment",
    entityId: "1",
    actorName: "Operations Admin",
    newValue: JSON.stringify({ amount: 3000, method: "UPI" }),
    createdAt: new Date(Date.now() - 5400000),
  },
  {
    id: 3,
    action: "Trip Status Updated",
    entity: "trip",
    entityId: "1",
    actorName: "Driver Suresh",
    newValue: JSON.stringify({ status: "in_progress", startingKm: "45120.00" }),
    createdAt: new Date(Date.now() - 1800000),
  },
];

export const memSettings: Record<string, string> = {
  company: "NG Travels Operations",
  mobile: "+91 98450 21867",
  email: "operations@ngtravels.in",
  currency: "INR",
  timezone: "Asia/Kolkata",
  defaultRate: "18",
  terms: "1. Toll, parking and state permit charges are customer payable at actuals.\n2. Billing starts and ends from garage to garage.\n3. AC will be switched off while driving in hill terrain.",
};
