export interface FareCalculationInput {
  billingKm: number;
  ratePerKm: number;
  toll?: number;
  finalToll?: number;
  parking?: number;
  permitCharge?: number;
  totalPaid?: number;
}

export interface FareCalculationResult {
  baseFare: number;
  toll: number;
  finalToll: number;
  parking: number;
  permitCharge: number;
  customerTotal: number;
  totalPaid: number;
  remainingBalance: number;
  credit: number;
  paymentStatus: "unpaid" | "partially_paid" | "fully_paid" | "overpaid";
}

export type BillingDayPolicy = "CALENDAR_DAYS" | "24_HOUR_PERIODS" | "PER_DAY_MINIMUM";

export interface CommercialFareInput {
  tripType: string;
  outboundDistanceKm: number;
  returnDistanceKm?: number;
  totalRoadDistanceKm: number;
  ratePerKm: number;
  startDate: string;
  returnDate?: string | null;
  startTime?: string;
  returnTime?: string | null;
  billingDayPolicy?: BillingDayPolicy;
  minimumKmPerDay?: number;
  driverBataPerDay?: number;
  nightBata?: number;
  permitCharge?: number;
  toll?: number;
  tollAvailable?: boolean;
  parking?: number;
  waiting?: number;
  nightCharges?: number;
  discount?: number;
  taxPercent?: number;
  totalPaid?: number;
}

export interface CommercialFareBreakdown {
  tripType: string;
  outboundDistanceKm: number;
  returnDistanceKm: number;
  totalRoadDistanceKm: number;
  billableDays: number;
  billingDayPolicy: BillingDayPolicy;
  minimumKmPerDay: number;
  minimumBillableKm: number;
  totalBillableDistance: number;
  ratePerKm: number;
  distanceFare: number;
  driverBataPerDay: number;
  driverBata: number;
  nightBata: number;
  permitCharge: number;
  toll: number;
  tollAvailable: boolean;
  parking: number;
  waiting: number;
  nightCharges: number;
  subtotal: number;
  taxPercent: number;
  tax: number;
  discount: number;
  customerTotal: number;
  totalPaid: number;
  remainingBalance: number;
  credit: number;
  paymentStatus: "unpaid" | "partially_paid" | "fully_paid" | "overpaid";
}

/**
 * Calculates billable days accurately based on configured business policy.
 * For CALENDAR_DAYS:
 * 04 Sep to 06 Sep = 3 full calendar days (04, 05, 06).
 */
export function calculateBillableDays(
  startDateStr: string,
  returnDateStr?: string | null,
  startTimeStr?: string | null,
  returnTimeStr?: string | null,
  policy: BillingDayPolicy = "CALENDAR_DAYS",
): number {
  if (!returnDateStr || !startDateStr) return 1;

  const sDate = startDateStr.slice(0, 10);
  const rDate = returnDateStr.slice(0, 10);
  const sTime = startTimeStr || "06:00";
  const rTime = returnTimeStr || "22:00";

  if (sDate === rDate) return 1;

  if (policy === "24_HOUR_PERIODS") {
    try {
      const start = new Date(`${sDate}T${sTime}:00`);
      const end = new Date(`${rDate}T${rTime}:00`);
      const diffMs = end.getTime() - start.getTime();
      if (diffMs <= 0) return 1;
      const hours = diffMs / (1000 * 60 * 60);
      return Math.max(1, Math.ceil(hours / 24));
    } catch {
      // Fallback to calendar days
    }
  }

  // Default: CALENDAR_DAYS (inclusive days)
  const d1 = new Date(`${sDate}T00:00:00Z`);
  const d2 = new Date(`${rDate}T00:00:00Z`);
  const diffTime = d2.getTime() - d1.getTime();
  if (diffTime < 0) return 1;

  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
}

/**
 * Authoritative Commercial Fare Engine for Frontend live estimates
 */
export function calculateCommercialFare(input: CommercialFareInput): CommercialFareBreakdown {
  const isRoundTrip = input.tripType.toLowerCase().includes("round");
  const outboundDist = Math.max(0, Number(input.outboundDistanceKm || 0));
  const returnDist = isRoundTrip ? Math.max(0, Number(input.returnDistanceKm || 0)) : 0;

  // Real road distance is Outbound + Return (or just outbound for one-way)
  const totalRoadDistanceKm = isRoundTrip
    ? Math.round((outboundDist + returnDist) * 10) / 10
    : outboundDist;

  const policy = input.billingDayPolicy || "CALENDAR_DAYS";
  const billableDays = isRoundTrip
    ? calculateBillableDays(input.startDate, input.returnDate, input.startTime, input.returnTime, policy)
    : 1;

  const minimumKmPerDay = Math.max(0, Number(input.minimumKmPerDay ?? (isRoundTrip ? 250 : 0)));
  const minimumBillableKm = minimumKmPerDay * billableDays;

  // Billable KM cannot be less than configured daily minimum
  const totalBillableDistance = Math.max(totalRoadDistanceKm, minimumBillableKm);

  const ratePerKm = Math.max(0, Number(input.ratePerKm || 0));
  const distanceFare = Math.round(totalBillableDistance * ratePerKm * 100) / 100;

  const driverBataPerDay = Math.max(0, Number(input.driverBataPerDay ?? (isRoundTrip ? 500 : 0)));
  const nightBata = Math.max(0, Number(input.nightBata || 0));
  const driverBata = Math.round((driverBataPerDay * billableDays + nightBata) * 100) / 100;

  const permitCharge = Math.max(0, Math.round(Number(input.permitCharge || 0) * 100) / 100);
  const toll = Math.max(0, Math.round(Number(input.toll || 0) * 100) / 100);
  const tollAvailable = !!input.tollAvailable;
  const parking = Math.max(0, Math.round(Number(input.parking || 0) * 100) / 100);
  const waiting = Math.max(0, Math.round(Number(input.waiting || 0) * 100) / 100);
  const nightCharges = Math.max(0, Math.round(Number(input.nightCharges || 0) * 100) / 100);

  const subtotal = Math.round(
    (distanceFare + driverBata + permitCharge + toll + parking + waiting + nightCharges) * 100,
  ) / 100;

  const taxPercent = Math.max(0, Number(input.taxPercent || 0));
  const tax = Math.round(subtotal * (taxPercent / 100) * 100) / 100;
  const discount = Math.max(0, Math.round(Number(input.discount || 0) * 100) / 100);

  const customerTotal = Math.max(0, Math.round((subtotal + tax - discount) * 100) / 100);
  const totalPaid = Math.max(0, Math.round(Number(input.totalPaid || 0) * 100) / 100);
  const remainingBalance = Math.max(0, Math.round((customerTotal - totalPaid) * 100) / 100);
  const credit = Math.max(0, Math.round((totalPaid - customerTotal) * 100) / 100);

  let paymentStatus: "unpaid" | "partially_paid" | "fully_paid" | "overpaid" = "unpaid";
  if (totalPaid <= 0) {
    paymentStatus = "unpaid";
  } else if (remainingBalance > 0) {
    paymentStatus = "partially_paid";
  } else if (credit > 0) {
    paymentStatus = "overpaid";
  } else {
    paymentStatus = "fully_paid";
  }

  return {
    tripType: input.tripType,
    outboundDistanceKm: outboundDist,
    returnDistanceKm: returnDist,
    totalRoadDistanceKm,
    billableDays,
    billingDayPolicy: policy,
    minimumKmPerDay,
    minimumBillableKm,
    totalBillableDistance,
    ratePerKm,
    distanceFare,
    driverBataPerDay,
    driverBata,
    nightBata,
    permitCharge,
    toll,
    tollAvailable,
    parking,
    waiting,
    nightCharges,
    subtotal,
    taxPercent,
    tax,
    discount,
    customerTotal,
    totalPaid,
    remainingBalance,
    credit,
    paymentStatus,
  };
}

export function calculateBaseFare(billingKm: number, ratePerKm: number): number {
  const bKm = Math.max(0, Number(billingKm || 0));
  const rate = Math.max(0, Number(ratePerKm || 0));
  return Math.round(bKm * rate * 100) / 100;
}

export function calculateCustomerTotal(
  baseFare: number,
  finalToll: number,
  parking: number,
  permitCharge: number,
): number {
  const bf = Math.max(0, Number(baseFare || 0));
  const t = Math.max(0, Number(finalToll || 0));
  const p = Math.max(0, Number(parking || 0));
  const pm = Math.max(0, Number(permitCharge || 0));
  return Math.round((bf + t + p + pm) * 100) / 100;
}

export function calculateFare(input: FareCalculationInput): FareCalculationResult {
  const billingKm = Math.max(0, Number(input.billingKm || 0));
  const ratePerKm = Math.max(0, Number(input.ratePerKm || 0));
  const baseFare = calculateBaseFare(billingKm, ratePerKm);
  const finalToll = Math.max(
    0,
    Math.round(Number(input.finalToll != null ? input.finalToll : input.toll || 0) * 100) / 100,
  );
  const parking = Math.max(0, Math.round(Number(input.parking || 0) * 100) / 100);
  const permitCharge = Math.max(0, Math.round(Number(input.permitCharge || 0) * 100) / 100);

  const customerTotal = calculateCustomerTotal(baseFare, finalToll, parking, permitCharge);
  const totalPaid = Math.max(0, Math.round(Number(input.totalPaid || 0) * 100) / 100);
  const remainingBalance = Math.max(0, Math.round((customerTotal - totalPaid) * 100) / 100);
  const credit = Math.max(0, Math.round((totalPaid - customerTotal) * 100) / 100);

  let paymentStatus: "unpaid" | "partially_paid" | "fully_paid" | "overpaid" = "unpaid";
  if (totalPaid <= 0) {
    paymentStatus = "unpaid";
  } else if (remainingBalance > 0) {
    paymentStatus = "partially_paid";
  } else if (credit > 0) {
    paymentStatus = "overpaid";
  } else {
    paymentStatus = "fully_paid";
  }

  return {
    baseFare,
    toll: finalToll,
    finalToll,
    parking,
    permitCharge,
    customerTotal,
    totalPaid,
    remainingBalance,
    credit,
    paymentStatus,
  };
}

export function formatINR(amount: number | string | undefined | null): string {
  const val = Number(amount || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(val);
}

export function formatKM(km: number | string | undefined | null): string {
  const val = Number(km || 0);
  return `${val.toLocaleString("en-IN", { maximumFractionDigits: 1 })} km`;
}

export function validateOdometer(
  startingKm: number,
  endingKm: number,
): { valid: boolean; actualKm: number; error?: string } {
  if (startingKm < 0) {
    return { valid: false, actualKm: 0, error: "Starting KM cannot be negative" };
  }
  if (endingKm < startingKm) {
    return {
      valid: false,
      actualKm: 0,
      error: `Ending KM (${endingKm}) cannot be less than Starting KM (${startingKm})`,
    };
  }
  const actualKm = Math.round((endingKm - startingKm) * 100) / 100;
  return { valid: true, actualKm };
}
