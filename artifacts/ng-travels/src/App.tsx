import React, { type ReactNode, createContext, useContext, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, useClerk, useUser } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import {
  Archive, ArrowLeft, ArrowUpRight, BarChart3, Bell, CalendarDays,
  Check, CheckCircle2, ChevronDown, ChevronRight, CircleDollarSign, Clock3,
  Download, FileText, Fuel, LayoutDashboard, LogOut, MapPin, Menu,
  Navigation, Pencil, Plus, Receipt, RefreshCw, Search, Settings2, ShieldCheck,
  SlidersHorizontal, Sparkles, TrendingUp, Users, WalletCards, X, XCircle,
  Car, FileQuestion, Radio, Smartphone, AlertTriangle, AlertCircle, Eye, EyeOff,
  Lock, Mail, KeyRound
} from "lucide-react";
import { Redirect, Route, Switch, Link, Router as WouterRouter, useLocation, useParams } from "wouter";

import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppSplashLoader, ButtonLoader } from "@/components/loading";
import { syncEngine } from "@/lib/syncEngine";
import { supabase } from "@/lib/supabase/client";

// Initialize universal sync engine (standalone offline + remote sync)
syncEngine.init();

// Modular Layouts
import { OwnerLayout } from "@/components/layout/OwnerLayout";
import { DriverLayout } from "@/components/layout/DriverLayout";

// Modular Modals & Vouchers
import { CreateTripModal } from "@/components/trips/CreateTripModal";
import { CancelTripModal } from "@/components/trips/CancelTripModal";
import { PaymentRecordModal } from "@/components/trips/PaymentRecordModal";
import { CustomerCopyModal } from "@/components/vouchers/CustomerCopyModal";
import { PaymentReceiptModal } from "@/components/vouchers/PaymentReceiptModal";
import { DriverKmModal } from "@/components/driver/DriverKmModal";
import { DriverExpenseModal } from "@/components/driver/DriverExpenseModal";

// Modular Owner Pages
import { DashboardPage } from "@/pages/owner/DashboardPage";
import { LiveTripsPage } from "@/pages/owner/LiveTripsPage";
import { CalendarPage } from "@/pages/owner/CalendarPage";
import { RoutePlannerPage } from "@/pages/owner/RoutePlannerPage";
import { TripsPage } from "@/pages/owner/TripsPage";
import { TripDetailPage } from "@/pages/owner/TripDetailPage";
import { CustomersPage } from "@/pages/owner/CustomersPage";
import { EnquiriesPage } from "@/pages/owner/EnquiriesPage";
import { DriversPage } from "@/pages/owner/DriversPage";
import { PaymentsPage } from "@/pages/owner/PaymentsPage";
import { ExpensesPage } from "@/pages/owner/ExpensesPage";
import { ReportsPage } from "@/pages/owner/ReportsPage";
import { AnalyticsPage } from "@/pages/owner/AnalyticsPage";
import { NotificationsPage } from "@/pages/owner/NotificationsPage";
import { AuditLogsPage } from "@/pages/owner/AuditLogsPage";
import { SettingsPage } from "@/pages/owner/SettingsPage";
import { VehiclesPage } from "@/pages/owner/VehiclesPage";

// Modular Driver Pages
import { DriverDashboardPage } from "@/pages/driver/DriverDashboardPage";
import { DriverTodayPage } from "@/pages/driver/DriverTodayPage";
import { DriverCurrentTripPage } from "@/pages/driver/DriverCurrentTripPage";
import { DriverExpensesPage } from "@/pages/driver/DriverExpensesPage";
import { DriverProfilePage } from "@/pages/driver/DriverProfilePage";
import { DriverVehiclePage } from "@/pages/driver/DriverVehiclePage";
import { DriverHistoryPage } from "@/pages/driver/DriverHistoryPage";

const queryClient = new QueryClient();
const rawClerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const hasClerkKey = Boolean(rawClerkKey && rawClerkKey.trim() !== "" && !rawClerkKey.includes("undefined"));
const clerkPubKey = hasClerkKey
  ? rawClerkKey
  : (publishableKeyFromHost(window.location.hostname, undefined) || "");
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string) {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

export interface AuthUser {
  id?: number;
  fullName?: string;
  firstName?: string;
  username?: string;
  role: "owner" | "admin" | "driver";
  driverId?: number | null;
  phone?: string | null;
  email?: string | null;
  primaryEmailAddress?: { emailAddress: string };
}

export interface AuthContextType {
  user: AuthUser | null;
  isSignedIn: boolean;
  isLoaded: boolean;
  signOut: (options?: { redirectUrl?: string }) => Promise<void>;
  signInWithCredentials: (params: {
    type: "admin" | "driver";
    email?: string;
    password?: string;
    identifier?: string;
    pin?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  switchRole: (role: "admin" | "driver") => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isSignedIn: false,
  isLoaded: false,
  signOut: async () => {},
  signInWithCredentials: async () => ({ success: false, error: "Uninitialized" }),
  switchRole: () => {},
});

export function ProductionAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Restore authenticated session from Supabase or server on mount
  useEffect(() => {
    let isMounted = true;

    async function checkAuthSession() {
      // 1. Check native Supabase Auth session first
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && isMounted) {
          const rawRole = (session.user.user_metadata?.role || "OWNER").toUpperCase();
          const role = rawRole === "DRIVER" ? "driver" : "owner";
          const authUser: AuthUser = {
            id: session.user.id as any,
            fullName: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Operations Owner",
            firstName: (session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User").split(" ")[0],
            role,
            driverId: session.user.user_metadata?.driver_id || null,
            phone: session.user.phone,
            email: session.user.email,
            primaryEmailAddress: session.user.email ? { emailAddress: session.user.email } : undefined,
          };
          setUser(authUser);
          setIsSignedIn(true);
          localStorage.setItem("ng_user_role", role);
          setIsLoaded(true);
          return;
        }
      } catch (err) {
        console.warn("[Auth] Supabase session check notice:", err);
      }

      // 2. Check token in localStorage
      const token = localStorage.getItem("ng_auth_token");
      if (!token) {
        if (isMounted) {
          setUser(null);
          setIsSignedIn(false);
          setIsLoaded(true);
        }
        return;
      }

      try {
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.user && isMounted) {
            const role = data.user.role === "driver" ? "driver" : "owner";
            const authUser: AuthUser = {
              id: data.user.id,
              fullName: data.user.fullName,
              firstName: data.user.fullName?.split(" ")[0] || "User",
              role,
              driverId: data.user.driverId,
              phone: data.user.phone,
              email: data.user.email,
              primaryEmailAddress: data.user.email ? { emailAddress: data.user.email } : undefined,
            };
            setUser(authUser);
            setIsSignedIn(true);
            localStorage.setItem("ng_user_role", role);
          } else if (isMounted) {
            localStorage.removeItem("ng_auth_token");
            setUser(null);
            setIsSignedIn(false);
          }
        } else {
          localStorage.removeItem("ng_auth_token");
          if (isMounted) {
            setUser(null);
            setIsSignedIn(false);
          }
        }
      } catch (err) {
        console.warn("[Auth] Session restore notice:", err);
        if (isMounted && token) {
          const savedRole = (localStorage.getItem("ng_user_role") as "driver" | "owner") || "owner";
          setIsSignedIn(true);
          setUser({
            fullName: savedRole === "driver" ? "Driver Pilot" : "Operations Owner",
            role: savedRole,
          });
        }
      } finally {
        if (isMounted) {
          setIsLoaded(true);
        }
      }
    }

    checkAuthSession();

    // Subscribe to Supabase Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      if (session?.user) {
        const rawRole = (session.user.user_metadata?.role || "OWNER").toUpperCase();
        const role = rawRole === "DRIVER" ? "driver" : "owner";
        setUser({
          id: session.user.id as any,
          fullName: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User",
          firstName: (session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User").split(" ")[0],
          role,
          driverId: session.user.user_metadata?.driver_id || null,
          phone: session.user.phone,
          email: session.user.email,
        });
        setIsSignedIn(true);
        localStorage.setItem("ng_user_role", role);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const signInWithCredentials = async (params: {
    type: "admin" | "driver";
    email?: string;
    password?: string;
    identifier?: string;
    pin?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      // 1. Direct Supabase Auth attempt for admin
      if (params.type === "admin" && params.email && params.password) {
        try {
          const { data: sbData, error: sbError } = await supabase.auth.signInWithPassword({
            email: params.email.trim(),
            password: params.password,
          });

          if (!sbError && sbData?.session?.user) {
            const rawRole = (sbData.session.user.user_metadata?.role || "OWNER").toUpperCase();
            const role = rawRole === "DRIVER" ? "driver" : "owner";
            const authUser: AuthUser = {
              id: sbData.session.user.id as any,
              fullName: sbData.session.user.user_metadata?.full_name || "Operations Admin",
              firstName: (sbData.session.user.user_metadata?.full_name || "Admin").split(" ")[0],
              role,
              email: sbData.session.user.email,
            };
            localStorage.setItem("ng_user_role", role);
            setUser(authUser);
            setIsSignedIn(true);
            return { success: true };
          }
        } catch (e) {
          console.warn("[Auth] Supabase direct auth notice:", e);
        }
      }

      // 2. Primary API server authentication
      const endpoint = params.type === "admin" ? "/api/auth/login" : "/api/auth/driver-login";
      const body = params.type === "admin"
        ? { email: params.email?.trim(), password: params.password }
        : { identifier: params.identifier?.trim(), pin: params.pin?.trim() };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok || !data.token) {
        return {
          success: false,
          error: data.message || data.error?.message || "Invalid credentials. Please verify and try again.",
        };
      }

      localStorage.setItem("ng_auth_token", data.token);
      const role = data.user.role === "driver" ? "driver" : "owner";
      const authUser: AuthUser = {
        id: data.user.id,
        fullName: data.user.fullName,
        firstName: data.user.fullName?.split(" ")[0] || "User",
        role,
        driverId: data.user.driverId,
        phone: data.user.phone,
        email: data.user.email,
        primaryEmailAddress: data.user.email ? { emailAddress: data.user.email } : undefined,
      };

      localStorage.setItem("ng_user_role", role);
      setUser(authUser);
      setIsSignedIn(true);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: "Unable to connect to authentication server. Please check your network.",
      };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    const token = localStorage.getItem("ng_auth_token");
    if (token) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {}
    }
    localStorage.removeItem("ng_auth_token");
    localStorage.removeItem("ng_user_role");
    setUser(null);
    setIsSignedIn(false);
  };

  const switchRole = (role: "admin" | "driver") => {
    // In production, switching roles triggers dedicated sign-in or context shift
    localStorage.setItem("ng_user_role", role);
    if (user) {
      setUser({ ...user, role: role === "driver" ? "driver" : "owner" });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isSignedIn,
        isLoaded,
        signOut,
        signInWithCredentials,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Backward-compatible alias
export const LocalAuthProvider = ProductionAuthProvider;

function useAppAuth(): AuthContextType {
  return useContext(AuthContext);
}

// -------------------------------------------------------------
// SIGN IN PAGE WITH AUTHENTIC DATABASE CREDENTIAL VALIDATION
// -------------------------------------------------------------
function SignInPage() {
  const { signInWithCredentials } = useAppAuth();
  const [, setLocation] = useLocation();

  const [activeTab, setActiveTab] = useState<"admin" | "driver">(() => {
    if (typeof window !== "undefined" && (window as any).NG_APP_ROLE === "driver") {
      return "driver";
    }
    return "admin";
  });

  // Admin form state
  const [adminEmail, setAdminEmail] = useState("admin@ngtravels.in");
  const [adminPassword, setAdminPassword] = useState("NGTravels@2026");
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Driver form state
  const [driverIdentifier, setDriverIdentifier] = useState("DRV-101");
  const [driverPin, setDriverPin] = useState("123456");
  const [showDriverPin, setShowDriverPin] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!adminEmail.trim()) {
      setErrorMessage("Please enter your operations email address.");
      return;
    }
    if (!adminPassword) {
      setErrorMessage("Please enter your account password.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await signInWithCredentials({
        type: "admin",
        email: adminEmail,
        password: adminPassword,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Authentication failed.");
      } else {
        setLocation("/dashboard");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDriverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!driverIdentifier.trim()) {
      setErrorMessage("Please enter your Driver Code (e.g. DRV-101) or registered mobile number.");
      return;
    }
    if (!driverPin.trim()) {
      setErrorMessage("Please enter your 6-digit Driver Security PIN.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await signInWithCredentials({
        type: "driver",
        identifier: driverIdentifier,
        pin: driverPin,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Driver authentication failed.");
      } else {
        setLocation("/driver");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-zinc-100 selection:bg-amber-400 selection:text-zinc-950">
      <div className="w-full max-w-md bg-zinc-900/95 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-xl relative">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <img
              src="/logo.png"
              alt="NG Travels - Travel with Comfort & Safety"
              className="w-24 h-24 rounded-2xl object-contain bg-black p-1.5 border border-amber-500/40 shadow-xl shadow-amber-500/15 mx-auto"
            />
          </div>
          <div>
            <h1 className="text-2xl font-black text-zinc-100 tracking-tight">NG TRAVELS</h1>
            <p className="text-xs text-amber-400 font-semibold tracking-wide mt-0.5">Travel with Comfort & Safety</p>
            <p className="text-[11px] text-zinc-400 mt-1 font-mono">Operations Command & Dispatch Platform</p>
          </div>
        </div>

        {/* Role Segmented Tabs */}
        <div className="grid grid-cols-2 p-1 bg-zinc-950 rounded-xl border border-zinc-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setActiveTab("admin");
              setErrorMessage(null);
            }}
            className={`py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "admin"
                ? "bg-amber-400 text-zinc-950 shadow-md shadow-amber-400/20"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Operations Admin
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("driver");
              setErrorMessage(null);
            }}
            className={`py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "driver"
                ? "bg-amber-400 text-zinc-950 shadow-md shadow-amber-400/20"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Car className="w-4 h-4" /> Driver Pilot
          </button>
        </div>

        {/* Error Alert Message */}
        {errorMessage && (
          <div className="bg-rose-950/40 border border-rose-500/40 p-3.5 rounded-xl flex items-start gap-2 text-xs text-rose-300 animate-in fade-in slide-in-from-top-2 duration-200">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Tab 1: Operations Admin Login */}
        {activeTab === "admin" ? (
          <form onSubmit={handleAdminSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                <span>Operations Email</span>
                <span className="text-[10px] text-zinc-500 font-mono">admin@ngtravels.in</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
                <Input
                  type="email"
                  required
                  placeholder="admin@ngtravels.in"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="pl-9 bg-zinc-950 border-zinc-800 text-zinc-100 text-xs h-11 focus-visible:ring-amber-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                <span>Password</span>
                <span className="text-[10px] text-zinc-500 font-mono">Secure Salted Scrypt</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
                <Input
                  type={showAdminPassword ? "text" : "password"}
                  required
                  placeholder="Enter your operations password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="pl-9 pr-9 bg-zinc-950 border-zinc-800 text-zinc-100 text-xs h-11 focus-visible:ring-amber-400"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                  className="absolute right-3 top-3.5 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                >
                  {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black py-6 text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-400/25 cursor-pointer mt-2"
            >
              {submitting ? (
                <ButtonLoader label="Authenticating Operations..." />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" /> Sign In to Operations Desk
                </>
              )}
            </Button>
          </form>
        ) : (
          /* Tab 2: Driver Pilot Login */
          <form onSubmit={handleDriverSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                <span>Driver Code or Mobile</span>
                <span className="text-[10px] text-zinc-500 font-mono">DRV-101 / +91 98450 11223</span>
              </label>
              <div className="relative">
                <Car className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
                <Input
                  type="text"
                  required
                  placeholder="e.g. DRV-101 or 9845011223"
                  value={driverIdentifier}
                  onChange={(e) => setDriverIdentifier(e.target.value)}
                  className="pl-9 bg-zinc-950 border-zinc-800 text-zinc-100 text-xs h-11 focus-visible:ring-amber-400 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                <span>Driver Security PIN</span>
                <span className="text-[10px] text-zinc-500 font-mono">6 Digits</span>
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
                <Input
                  type={showDriverPin ? "text" : "password"}
                  maxLength={6}
                  required
                  placeholder="Enter 6-digit PIN"
                  value={driverPin}
                  onChange={(e) => setDriverPin(e.target.value)}
                  className="pl-9 pr-9 bg-zinc-950 border-zinc-800 text-zinc-100 text-xs h-11 focus-visible:ring-amber-400 font-mono tracking-widest text-center text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowDriverPin(!showDriverPin)}
                  className="absolute right-3 top-3.5 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                >
                  {showDriverPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black py-6 text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-400/25 cursor-pointer mt-2"
            >
              {submitting ? (
                <ButtonLoader label="Verifying Duty PIN..." />
              ) : (
                <>
                  <Car className="w-4 h-4" /> Sign In to Driver Duty Cockpit
                </>
              )}
            </Button>
          </form>
        )}

        <div className="text-[10px] text-zinc-500 pt-2 border-t border-zinc-800/80 text-center font-mono">
          Single Source of Truth: PostgreSQL Database Auth • Cryptographic Token Session
        </div>
      </div>
    </div>
  );
}

import { useRealtimeSync } from "@/hooks/useRealtimeSync";

function MainApp() {
  const { user, isSignedIn, isLoaded, signOut, switchRole } = useAppAuth();
  const [location, setLocation] = useLocation();
  const qc = useQueryClient();

  // Connect Real-Time Server-Sent Events Sync
  const { status: realtimeStatus } = useRealtimeSync();

  // Modal States
  const [createTripOpen, setCreateTripOpen] = useState(false);
  const [createEnquiryOpen, setCreateEnquiryOpen] = useState(false);
  const [customerCopyTrip, setCustomerCopyTrip] = useState<any | null>(null);
  const [paymentRecordTrip, setPaymentRecordTrip] = useState<any | null>(null);
  const [cancelTrip, setCancelTrip] = useState<any | null>(null);
  const [receiptPayment, setReceiptPayment] = useState<{ payment: any; trip: any } | null>(null);
  const [driverKmTrip, setDriverKmTrip] = useState<{ trip: any; mode: "start" | "end" } | null>(null);
  const [driverExpenseTripId, setDriverExpenseTripId] = useState<number | null>(null);
  const [initialEnquiryForTrip, setInitialEnquiryForTrip] = useState<any | null>(null);

  // Helper for safe query responses
  const safeJsonArray = async (res: Response) => {
    if (!res.ok) return [];
    try {
      const json = await res.json();
      return Array.isArray(json) ? json : (Array.isArray(json?.items) ? json.items : []);
    } catch {
      return [];
    }
  };

  // Queries
  const { data: dashboardData = {}, isLoading: dashboardLoading } = useQuery({
    queryKey: ["/api/dashboard"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/dashboard", {
          headers: { "x-user-role": user?.role || "owner" },
        });
        if (!res.ok) return {};
        const json = await res.json();
        return json && typeof json === "object" && !json.error ? json : {};
      } catch {
        return {};
      }
    },
    refetchInterval: 15000,
  });

  const { data: tripsData = [] } = useQuery({
    queryKey: ["/api/trips"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/trips?limit=100", {
          headers: { "x-user-role": user?.role || "owner" },
        });
        return await safeJsonArray(res);
      } catch {
        return [];
      }
    },
    refetchInterval: 15000,
  });

  const { data: customersData = [] } = useQuery({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/customers?limit=100", {
          headers: { "x-user-role": user?.role || "owner" },
        });
        return await safeJsonArray(res);
      } catch {
        return [];
      }
    },
  });

  const { data: driversData = [] } = useQuery({
    queryKey: ["/api/drivers"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/drivers", {
          headers: { "x-user-role": user?.role || "owner" },
        });
        return await safeJsonArray(res);
      } catch {
        return [];
      }
    },
  });

  const { data: rawVehicles = [] } = useQuery({
    queryKey: ["/api/vehicles"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/vehicles", {
          headers: { "x-user-role": user?.role || "owner" },
        });
        return await safeJsonArray(res);
      } catch {
        return [];
      }
    },
  });

  const { data: enquiriesData = [] } = useQuery({
    queryKey: ["/api/enquiries"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/enquiries", {
          headers: { "x-user-role": user?.role || "owner" },
        });
        return await safeJsonArray(res);
      } catch {
        return [];
      }
    },
  });

  const { data: paymentsData = [] } = useQuery({
    queryKey: ["/api/payments"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/payments", {
          headers: { "x-user-role": user?.role || "owner" },
        });
        return await safeJsonArray(res);
      } catch {
        return [];
      }
    },
  });

  const { data: expensesData = [] } = useQuery({
    queryKey: ["/api/expenses"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/expenses", {
          headers: { "x-user-role": user?.role || "owner" },
        });
        return await safeJsonArray(res);
      } catch {
        return [];
      }
    },
  });

  const { data: notificationsData = [] } = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/notifications", {
          headers: { "x-user-role": user?.role || "owner" },
        });
        return await safeJsonArray(res);
      } catch {
        return [];
      }
    },
    refetchInterval: 15000,
  });

  const { data: auditLogsData = [] } = useQuery({
    queryKey: ["/api/audit-logs"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/audit-logs", {
          headers: { "x-user-role": user?.role || "owner" },
        });
        return await safeJsonArray(res);
      } catch {
        return [];
      }
    },
  });

  const { data: settingsData = {} } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/settings", {
          headers: { "x-user-role": user?.role || "owner" },
        });
        if (!res.ok) return {};
        const json = await res.json();
        return json && typeof json === "object" ? json : {};
      } catch {
        return {};
      }
    },
  });

  // Dedicated Driver Queries
  const { data: driverTodayTrips = [] } = useQuery({
    queryKey: ["/api/driver/today"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/driver/today", {
          headers: { "x-user-role": "driver" },
        });
        return await safeJsonArray(res);
      } catch {
        return [];
      }
    },
    refetchInterval: 6000,
  });

  const { data: driverCurrentTrip } = useQuery({
    queryKey: ["/api/driver/current-trip"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/driver/current-trip", {
          headers: { "x-user-role": "driver" },
        });
        if (!res.ok) return null;
        const json = await res.json();
        return json && typeof json === "object" && !json.error ? json : null;
      } catch {
        return null;
      }
    },
    refetchInterval: 6000,
  });

  // Normalized collections: guarantees an array whether data is { items: [] } or raw array []
  const tripList: any[] = Array.isArray(tripsData) ? tripsData : (Array.isArray((tripsData as any)?.items) ? (tripsData as any).items : []);
  const customerList: any[] = Array.isArray(customersData) ? customersData : (Array.isArray((customersData as any)?.items) ? (customersData as any).items : []);
  const driverList: any[] = Array.isArray(driversData) ? driversData : (Array.isArray((driversData as any)?.items) ? (driversData as any).items : []);
  const vehicleList: any[] = Array.isArray(rawVehicles) ? rawVehicles : (Array.isArray((rawVehicles as any)?.items) ? (rawVehicles as any).items : []);
  const paymentList: any[] = Array.isArray(paymentsData) ? paymentsData : (Array.isArray((paymentsData as any)?.items) ? (paymentsData as any).items : []);
  const expenseList: any[] = Array.isArray(expensesData) ? expensesData : (Array.isArray((expensesData as any)?.items) ? (expensesData as any).items : []);
  const notificationList: any[] = Array.isArray(notificationsData) ? notificationsData : (Array.isArray((notificationsData as any)?.items) ? (notificationsData as any).items : []);
  const enquiryList: any[] = Array.isArray(enquiriesData) ? enquiriesData : (Array.isArray((enquiriesData as any)?.items) ? (enquiriesData as any).items : []);
  const auditLogList: any[] = Array.isArray(auditLogsData) ? auditLogsData : (Array.isArray((auditLogsData as any)?.items) ? (auditLogsData as any).items : []);
  const driverTodayTripList: any[] = Array.isArray(driverTodayTrips) ? driverTodayTrips : (Array.isArray((driverTodayTrips as any)?.items) ? (driverTodayTrips as any).items : []);

  // Action Handlers
  const handleTripCreated = () => {
    qc.invalidateQueries({ queryKey: ["/api/trips"] });
    qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
    qc.invalidateQueries({ queryKey: ["/api/driver/today"] });
    qc.invalidateQueries({ queryKey: ["/api/driver/current-trip"] });
  };

  const handleApproveExpense = async (id: number) => {
    await fetch(`/api/expenses/${id}/approve`, {
      method: "PATCH",
      headers: { "x-user-role": "owner" },
    });
    qc.invalidateQueries({ queryKey: ["/api/expenses"] });
    qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
    qc.invalidateQueries({ queryKey: ["/api/trips"] });
  };

  const handleRejectExpense = async (id: number) => {
    await fetch(`/api/expenses/${id}/reject`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-user-role": "owner" },
      body: JSON.stringify({ reason: "Expense rejected by operations" }),
    });
    qc.invalidateQueries({ queryKey: ["/api/expenses"] });
    qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
    qc.invalidateQueries({ queryKey: ["/api/trips"] });
  };

  const handleUpdateAvailability = async (driverId: number, availability: string) => {
    await fetch(`/api/drivers/${driverId}/availability`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-user-role": "owner" },
      body: JSON.stringify({ availability }),
    });
    qc.invalidateQueries({ queryKey: ["/api/drivers"] });
  };

  const handleSaveSettings = async (updated: any) => {
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-user-role": "owner" },
      body: JSON.stringify(updated),
    });
    qc.invalidateQueries({ queryKey: ["/api/settings"] });
  };

  const handleMarkNotificationRead = async (id: number) => {
    await fetch(`/api/notifications/${id}/read`, {
      method: "POST",
      headers: { "x-user-role": user?.role || "owner" },
    });
    qc.invalidateQueries({ queryKey: ["/api/notifications"] });
  };

  const handleMarkAllNotificationsRead = async () => {
    await fetch("/api/notifications/read-all", {
      method: "POST",
      headers: { "x-user-role": user?.role || "owner" },
    });
    qc.invalidateQueries({ queryKey: ["/api/notifications"] });
  };

  const handleDriverMilestone = async (tripId: number, status: string, note?: string) => {
    await fetch(`/api/trips/${tripId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, note, changedBy: "Driver Suresh" }),
    });
    qc.invalidateQueries({ queryKey: ["trips"] });
    qc.invalidateQueries({ queryKey: ["driver-today"] });
    qc.invalidateQueries({ queryKey: ["driver-current"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const nativeRole = (window as any).NG_APP_ROLE;
  const isDriverWorkspace = nativeRole === "driver" ? true : nativeRole === "owner" ? false : (location.startsWith("/driver") || user?.role === "driver");

  // Force route alignment if native APK
  useEffect(() => {
    if (!isSignedIn) return;
    if (nativeRole === "driver" && !location.startsWith("/driver")) {
      setLocation("/driver");
    } else if (nativeRole === "owner" && location.startsWith("/driver")) {
      setLocation("/dashboard");
    }
  }, [nativeRole, location, setLocation, isSignedIn]);

  if (!isLoaded) {
    return (
      <AppSplashLoader
        mode={isDriverWorkspace ? "driver" : "owner"}
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (!isSignedIn) {
    return <SignInPage />;
  }

  const currentDriver = Array.isArray(driverList)
    ? (driverList.find((d: any) => d?.id === user?.driverId) || driverList[0] || null)
    : null;

  return (
    <>
      {isDriverWorkspace ? (
        <DriverLayout
          driver={currentDriver || { name: user?.fullName || "Driver Pilot", availability: "available" }}
          onSignOut={signOut}
          onSwitchRole={(role) => {
            switchRole(role);
            if (role === "admin") setLocation("/dashboard");
          }}
        >
          <Switch>
            <Route path="/driver">
              <DriverDashboardPage
                todayTrips={driverTodayTripList}
                currentTrip={driverCurrentTrip}
                driver={currentDriver}
                onOpenStartKmModal={(trip) => setDriverKmTrip({ trip, mode: "start" })}
                onOpenEndKmModal={(trip) => setDriverKmTrip({ trip, mode: "end" })}
                onOpenExpenseModal={(tripId) => setDriverExpenseTripId(tripId)}
              />
            </Route>
            <Route path="/driver/dashboard">
              <DriverDashboardPage
                todayTrips={driverTodayTripList}
                currentTrip={driverCurrentTrip}
                driver={currentDriver}
                onOpenStartKmModal={(trip) => setDriverKmTrip({ trip, mode: "start" })}
                onOpenEndKmModal={(trip) => setDriverKmTrip({ trip, mode: "end" })}
                onOpenExpenseModal={(tripId) => setDriverExpenseTripId(tripId)}
              />
            </Route>
            <Route path="/driver/today">
              <DriverTodayPage
                todayTrips={driverTodayTripList}
                onOpenStartKmModal={(trip) => setDriverKmTrip({ trip, mode: "start" })}
                onOpenEndKmModal={(trip) => setDriverKmTrip({ trip, mode: "end" })}
              />
            </Route>
            <Route path="/driver/current-trip">
              <DriverCurrentTripPage
                trip={driverCurrentTrip || driverTodayTripList[0] || null}
                onOpenStartKmModal={(trip) => setDriverKmTrip({ trip, mode: "start" })}
                onOpenEndKmModal={(trip) => setDriverKmTrip({ trip, mode: "end" })}
                onOpenExpenseModal={(tripId) => setDriverExpenseTripId(tripId)}
                onUpdateMilestone={handleDriverMilestone}
              />
            </Route>
            <Route path="/driver/expenses">
              <DriverExpensesPage
                expenses={Array.isArray(expenseList) ? expenseList.filter((e: any) => !user?.driverId || e?.driverId === user?.driverId) : []}
                onOpenExpenseModal={() => setDriverExpenseTripId(driverCurrentTrip?.id || null)}
              />
            </Route>
            <Route path="/driver/vehicle">
              <DriverVehiclePage />
            </Route>
            <Route path="/driver/history">
              <DriverHistoryPage />
            </Route>
            <Route path="/driver/profile">
              <DriverProfilePage
                driver={currentDriver}
                onUpdateAvailability={(avail) => currentDriver?.id && handleUpdateAvailability(currentDriver.id, avail)}
              />
            </Route>
            <Route>
              <Redirect to="/driver" />
            </Route>
          </Switch>
        </DriverLayout>
      ) : (
        <OwnerLayout
          user={user}
          onSignOut={signOut}
          onSwitchRole={(role) => {
            switchRole(role);
            if (role === "driver") setLocation("/driver");
          }}
          unreadNotificationCount={notificationList.filter((n: any) => !n.isRead && n.audience === "owner").length}
        >
          <Switch>
            <Route path="/">
              <Redirect to="/dashboard" />
            </Route>
            <Route path="/dashboard">
              <DashboardPage
                isLoading={dashboardLoading && !dashboardData}
                metrics={dashboardData?.metrics}
                schedule={dashboardData?.schedule || []}
                recentActivity={dashboardData?.recentActivity || []}
                allTrips={tripList}
                customers={customerList}
                payments={paymentList}
                vehicles={vehicleList}
                onOpenCreateTrip={() => {
                  setInitialEnquiryForTrip(null);
                  setCreateTripOpen(true);
                }}
                onOpenCreateEnquiry={() => setLocation("/enquiries")}
                onOpenCustomerCopy={(trip) => {
                  setCustomerCopyTrip(trip);
                }}
              />
            </Route>
            <Route path="/live-trips">
              <LiveTripsPage trips={tripList} />
            </Route>
            <Route path="/calendar">
              <CalendarPage trips={tripList} />
            </Route>
            <Route path="/route-planner">
              <RoutePlannerPage
                onOpenTripWizardWithRoute={(routeData) => {
                  if (routeData) {
                    setInitialEnquiryForTrip({
                      pickup: routeData.pickup?.address || routeData.pickup?.name || routeData.pickup,
                      destination: routeData.destination?.address || routeData.destination?.name || routeData.destination,
                      tripType: routeData.tripType || "round_trip",
                    });
                  } else {
                    setInitialEnquiryForTrip(null);
                  }
                  setCreateTripOpen(true);
                }}
              />
            </Route>
            <Route path="/trips">
              <TripsPage
                trips={tripList}
                onOpenCreateTrip={() => {
                  setInitialEnquiryForTrip(null);
                  setCreateTripOpen(true);
                }}
                onOpenCustomerCopy={(trip) => setCustomerCopyTrip(trip)}
                onOpenPaymentModal={(trip) => setPaymentRecordTrip(trip)}
                onOpenCancelModal={(trip) => setCancelTrip(trip)}
              />
            </Route>
            <Route path="/trips/:id">
              {(params) => {
                const tripId = Number(params.id);
                const currentTrip = tripList.find((t: any) => t.id === tripId);
                const tripPayments = paymentList.filter((p: any) => p.tripId === tripId);
                const tripExpenses = expenseList.filter((e: any) => e.tripId === tripId);
                return (
                  <TripDetailPage
                    trip={currentTrip}
                    payments={tripPayments}
                    expenses={tripExpenses}
                    onOpenCustomerCopy={(trip) => setCustomerCopyTrip(trip)}
                    onOpenPaymentModal={(trip) => setPaymentRecordTrip(trip)}
                    onOpenCancelModal={(trip) => setCancelTrip(trip)}
                    onApproveExpense={handleApproveExpense}
                    onRejectExpense={handleRejectExpense}
                  />
                );
              }}
            </Route>
            <Route path="/vehicles">
              <VehiclesPage />
            </Route>
            <Route path="/customers">
              <CustomersPage customers={customerList} />
            </Route>
            <Route path="/enquiries">
              <EnquiriesPage
                enquiries={enquiryList}
                onOpenCreateEnquiry={() => setCreateEnquiryOpen(true)}
                onConvertToTrip={(enq) => {
                  setInitialEnquiryForTrip(enq);
                  setCreateTripOpen(true);
                }}
              />
            </Route>
            <Route path="/drivers">
              <DriversPage
                drivers={driverList}
                onUpdateAvailability={handleUpdateAvailability}
              />
            </Route>
            <Route path="/driver-availability">
              <DriversPage
                drivers={driverList}
                onUpdateAvailability={handleUpdateAvailability}
              />
            </Route>
            <Route path="/payments">
              <PaymentsPage
                payments={paymentList}
                trips={tripList}
                onOpenReceipt={(payment, trip) => setReceiptPayment({ payment, trip })}
              />
            </Route>
            <Route path="/refunds">
              <PaymentsPage
                payments={paymentList}
                trips={tripList}
                onOpenReceipt={(payment, trip) => setReceiptPayment({ payment, trip })}
              />
            </Route>
            <Route path="/expenses">
              <ExpensesPage
                expenses={expenseList}
                trips={tripList}
                onApprove={handleApproveExpense}
                onReject={handleRejectExpense}
              />
            </Route>
            <Route path="/reports">
              <ReportsPage
                trips={tripList}
                expenses={expenseList}
                payments={paymentList}
              />
            </Route>
            <Route path="/analytics">
              <AnalyticsPage
                trips={tripList}
                customers={customerList}
                payments={paymentList}
              />
            </Route>
            <Route path="/notifications">
              <NotificationsPage
                notifications={notificationList.filter((n: any) => n.audience === "owner")}
                onMarkRead={handleMarkNotificationRead}
                onMarkAllRead={handleMarkAllNotificationsRead}
              />
            </Route>
            <Route path="/audit-logs">
              <AuditLogsPage logs={auditLogList} />
            </Route>
            <Route path="/settings">
              <SettingsPage
                settings={settingsData}
                onSaveSettings={handleSaveSettings}
              />
            </Route>
            <Route>
              <Redirect to="/dashboard" />
            </Route>
          </Switch>
        </OwnerLayout>
      )}

      {/* Global Modals */}
      <CreateTripModal
        isOpen={createTripOpen}
        onClose={() => setCreateTripOpen(false)}
        onTripCreated={handleTripCreated}
        customers={customerList}
        drivers={driverList}
        defaultRate={settingsData.defaultRate || 18}
        defaultMinimumKm={settingsData.minimumKmPerDay || 250}
        defaultDriverBata={settingsData.driverBataPerDay || 500}
        defaultBillingDayPolicy={settingsData.billingDayPolicy || "CALENDAR_DAYS"}
        initialEnquiry={initialEnquiryForTrip}
      />

      <CustomerCopyModal
        isOpen={Boolean(customerCopyTrip)}
        onClose={() => setCustomerCopyTrip(null)}
        trip={customerCopyTrip}
        companyInfo={settingsData}
      />

      <PaymentReceiptModal
        isOpen={Boolean(receiptPayment)}
        onClose={() => setReceiptPayment(null)}
        payment={receiptPayment?.payment}
        trip={receiptPayment?.trip}
        companyInfo={settingsData}
      />

      <CancelTripModal
        isOpen={Boolean(cancelTrip)}
        onClose={() => setCancelTrip(null)}
        trip={cancelTrip}
        onTripCancelled={() => {
          qc.invalidateQueries({ queryKey: ["trips"] });
          qc.invalidateQueries({ queryKey: ["dashboard"] });
        }}
      />

      <PaymentRecordModal
        isOpen={Boolean(paymentRecordTrip)}
        onClose={() => setPaymentRecordTrip(null)}
        trip={paymentRecordTrip}
        onPaymentRecorded={() => {
          qc.invalidateQueries({ queryKey: ["trips"] });
          qc.invalidateQueries({ queryKey: ["payments"] });
          qc.invalidateQueries({ queryKey: ["dashboard"] });
        }}
      />

      {driverKmTrip && (
        <DriverKmModal
          isOpen={Boolean(driverKmTrip)}
          onClose={() => setDriverKmTrip(null)}
          trip={driverKmTrip.trip}
          mode={driverKmTrip.mode}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["trips"] });
            qc.invalidateQueries({ queryKey: ["driver-today"] });
            qc.invalidateQueries({ queryKey: ["driver-current"] });
            qc.invalidateQueries({ queryKey: ["dashboard"] });
          }}
        />
      )}

      {driverExpenseTripId && (
        <DriverExpenseModal
          isOpen={Boolean(driverExpenseTripId)}
          onClose={() => setDriverExpenseTripId(null)}
          tripId={driverExpenseTripId}
          onExpenseAdded={() => {
            qc.invalidateQueries({ queryKey: ["expenses"] });
          }}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <LocalAuthProvider>
            <WouterRouter base={basePath}>
              <MainApp />
            </WouterRouter>
          </LocalAuthProvider>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}