import React, {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Router, Route, Switch, Redirect, useLocation } from "wouter";
import type { Session } from "@supabase/supabase-js";
import {
  Archive,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Download,
  FileText,
  Fuel,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Navigation,
  Pencil,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Users,
  WalletCards,
  X,
  XCircle,
  Car,
  FileQuestion,
  Radio,
  Smartphone,
  AlertTriangle,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  KeyRound,
} from "lucide-react";
import { syncEngine } from "@/lib/syncEngine";
import { supabase } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/apiFetch";

// Initialize universal sync engine (standalone offline + remote sync)
syncEngine.init();

// Modular Layouts
import { OwnerLayout } from "@/components/layout/OwnerLayout";
import { DriverLayout } from "@/components/layout/DriverLayout";
import { ErrorBoundary } from "@/components/error-boundary";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppSplashLoader, ButtonLoader } from "@/components/loading";

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
  // The account's actual server-side role, from the Supabase session — unlike
  // `role`, this is never overwritten by the cosmetic switchRole() preview
  // toggle, so it can be used to tell whether owner-only actions will really
  // succeed (a driver account previewing the Admin UI still can't approve
  // expenses etc. — the backend checks this same underlying role, not the UI).
  realRole: "owner" | "admin" | "driver";
  driverId?: number | null;
  phone?: string | null;
  email?: string | null;
  primaryEmailAddress?: { emailAddress: string };
}

export interface AuthContextType {
  user: AuthUser | null;
  isSignedIn: boolean;
  isLoaded: boolean;
  isPasswordRecovery: boolean;
  accessToken: string | null;
  signOut: (options?: { redirectUrl?: string }) => Promise<void>;
  signInWithCredentials: (params: {
    type: "admin" | "driver";
    email?: string;
    password?: string;
    identifier?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  requestPasswordReset: (
    email: string,
  ) => Promise<{ success: boolean; error?: string }>;
  completePasswordReset: (
    newPassword: string,
  ) => Promise<{ success: boolean; error?: string }>;
  requestDriverPasswordReset: (
    identifier: string,
    note?: string,
  ) => Promise<{ success: boolean; error?: string }>;
  switchRole: (role: "admin" | "driver") => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isSignedIn: false,
  isLoaded: false,
  isPasswordRecovery: false,
  accessToken: null,
  signOut: async () => {},
  signInWithCredentials: async () => ({
    success: false,
    error: "Uninitialized",
  }),
  requestPasswordReset: async () => ({
    success: false,
    error: "Uninitialized",
  }),
  completePasswordReset: async () => ({
    success: false,
    error: "Uninitialized",
  }),
  requestDriverPasswordReset: async () => ({
    success: false,
    error: "Uninitialized",
  }),
  switchRole: () => {},
});

function authUserFromSession(session: Session): AuthUser {
  const rawRole = (session.user.user_metadata?.role || "owner").toUpperCase();
  const role = rawRole === "DRIVER" ? "driver" : "owner";
  const fullName =
    session.user.user_metadata?.full_name ||
    session.user.email?.split("@")[0] ||
    "Operations User";
  return {
    id: session.user.id as any,
    fullName,
    firstName: fullName.split(" ")[0],
    role,
    realRole: role,
    driverId: session.user.user_metadata?.driver_id || null,
    phone: session.user.phone,
    email: session.user.email,
    primaryEmailAddress: session.user.email
      ? { emailAddress: session.user.email }
      : undefined,
  };
}

export function ProductionAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Restore and track the Supabase Auth session (the single source of truth for identity)
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (isMounted) {
          if (session?.user) {
            setUser(authUserFromSession(session));
            setAccessToken(session.access_token || null);
            setIsSignedIn(true);
          } else {
            setUser(null);
            setAccessToken(null);
            setIsSignedIn(false);
          }
        }
      } catch (err) {
        console.warn("[Auth] Supabase session check notice:", err);
        if (isMounted) {
          setUser(null);
          setAccessToken(null);
          setIsSignedIn(false);
        }
      } finally {
        if (isMounted) setIsLoaded(true);
      }
    }

    restoreSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      if (_event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
      }
      if (session?.user) {
        setUser(authUserFromSession(session));
        setAccessToken(session.access_token || null);
        setIsSignedIn(true);
      } else {
        setUser(null);
        setAccessToken(null);
        setIsSignedIn(false);
      }
      setIsLoaded(true);
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
      if (params.type === "admin") {
        if (!params.email || !params.password) {
          return { success: false, error: "Email and password are required." };
        }
        const { data, error } = await supabase.auth.signInWithPassword({
          email: params.email.trim(),
          password: params.password,
        });
        if (error || !data?.session?.user) {
          return {
            success: false,
            error: error?.message || "Invalid email or password.",
          };
        }
        setUser(authUserFromSession(data.session));
        setIsSignedIn(true);
        return { success: true };
      }

      // Driver: exchange identifier + password for a real Supabase session via the server
      const res = await apiFetch("/api/auth/driver-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: params.identifier?.trim(),
          password: params.password?.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.session?.accessToken) {
        return {
          success: false,
          error:
            data?.error?.message || "Invalid driver credentials or password.",
        };
      }

      const { data: sessionData, error: setErr } =
        await supabase.auth.setSession({
          access_token: data.session.accessToken,
          refresh_token: data.session.refreshToken,
        });
      if (setErr || !sessionData?.session) {
        return {
          success: false,
          error: setErr?.message || "Unable to establish driver session.",
        };
      }

      setUser(authUserFromSession(sessionData.session));
      setIsSignedIn(true);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error:
          "Unable to connect to authentication server. Please check your network.",
      };
    }
  };

  const requestPasswordReset = async (
    email: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const redirectTo = `${window.location.origin}${basePath}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo },
      );
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch {
      return {
        success: false,
        error:
          "Unable to reach the authentication server. Please check your network.",
      };
    }
  };

  const completePasswordReset = async (
    newPassword: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) return { success: false, error: error.message };
      setIsPasswordRecovery(false);
      return { success: true };
    } catch {
      return {
        success: false,
        error: "Unable to update your password. Please check your network.",
      };
    }
  };

  const requestDriverPasswordReset = async (
    identifier: string,
    note?: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await apiFetch("/api/auth/driver-password-reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          note: note?.trim(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        return {
          success: false,
          error: data?.error?.message || "Unable to submit the request.",
        };
      }
      return { success: true };
    } catch {
      return {
        success: false,
        error:
          "Unable to reach the operations desk. Please check your network.",
      };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    setUser(null);
    setIsSignedIn(false);
    setIsPasswordRecovery(false);
  };

  const switchRole = (role: "admin" | "driver") => {
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
        isPasswordRecovery,
        accessToken,
        signOut,
        signInWithCredentials,
        requestPasswordReset,
        completePasswordReset,
        requestDriverPasswordReset,
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
type AdminView = "password" | "forgot";
type DriverView = "password" | "forgot";

function SignInPage() {
  const {
    signInWithCredentials,
    requestPasswordReset,
    requestDriverPasswordReset,
  } = useAppAuth();
  const [, setLocation] = useLocation();

  const [activeTab, setActiveTab] = useState<"admin" | "driver">(() => {
    if (
      typeof window !== "undefined" &&
      (window as any).NG_APP_ROLE === "driver"
    ) {
      return "driver";
    }
    return "admin";
  });

  // Admin form state
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminView, setAdminView] = useState<AdminView>("password");
  const [forgotSent, setForgotSent] = useState(false);

  // Driver form state
  const [driverIdentifier, setDriverIdentifier] = useState("");
  const [driverPassword, setDriverPassword] = useState("");
  const [showDriverPassword, setShowDriverPassword] = useState(false);
  const [driverView, setDriverView] = useState<DriverView>("password");
  const [passwordResetIdentifier, setPasswordResetIdentifier] = useState("");
  const [passwordResetNote, setPasswordResetNote] = useState("");
  const [passwordResetSent, setPasswordResetSent] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetAdminViewState = () => {
    setAdminView("password");
    setForgotSent(false);
    setErrorMessage(null);
  };

  const resetDriverViewState = () => {
    setDriverView("password");
    setPasswordResetSent(false);
    setErrorMessage(null);
  };

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

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!adminEmail.trim()) {
      setErrorMessage("Please enter your operations email address.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await requestPasswordReset(adminEmail);
      if (!res.success) {
        setErrorMessage(res.error || "Unable to send the reset link.");
      } else {
        setForgotSent(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDriverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!driverIdentifier.trim()) {
      setErrorMessage(
        "Please enter your Driver Code (e.g. DRV-101) or registered mobile number.",
      );
      return;
    }
    if (!driverPassword.trim()) {
      setErrorMessage("Please enter your driver password.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await signInWithCredentials({
        type: "driver",
        identifier: driverIdentifier,
        password: driverPassword,
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

  const handleDriverPasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!passwordResetIdentifier.trim()) {
      setErrorMessage(
        "Please enter your Driver Code or registered mobile number.",
      );
      return;
    }
    setSubmitting(true);
    try {
      const res = await requestDriverPasswordReset(
        passwordResetIdentifier,
        passwordResetNote,
      );
      if (!res.success) {
        setErrorMessage(res.error || "Unable to submit the request.");
      } else {
        setPasswordResetSent(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-foreground selection:bg-amber-400 selection:text-zinc-950">
      <div className="w-full max-w-md bg-card/95 border border-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-xl relative">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <img
              src="/logo.png"
              alt="NG Travels - Travel with Comfort & Safety"
              className="w-24 h-24 rounded-2xl object-contain bg-black p-1.5 border border-amber-300 dark:border-amber-500/40 shadow-xl shadow-amber-500/15 mx-auto"
            />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">
              NG TRAVELS
            </h1>
            <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold tracking-wide mt-0.5">
              Travel with Comfort & Safety
            </p>
            <p className="text-[11px] text-muted-foreground mt-1 font-mono">
              Operations Command & Dispatch Platform
            </p>
          </div>
        </div>

        {/* Role Segmented Tabs (hidden while inside a sub-view; use Back to return) */}
        {!(
          (activeTab === "admin" && adminView !== "password") ||
          (activeTab === "driver" && driverView !== "password")
        ) && (
          <div className="grid grid-cols-2 p-1 bg-background rounded-xl border border-border text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setActiveTab("admin");
                resetDriverViewState();
                setErrorMessage(null);
              }}
              className={`py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "admin"
                  ? "bg-amber-400 text-zinc-950 shadow-md shadow-amber-400/20"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShieldCheck className="w-4 h-4" /> Operations Admin
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("driver");
                resetAdminViewState();
                setErrorMessage(null);
              }}
              className={`py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "driver"
                  ? "bg-amber-400 text-zinc-950 shadow-md shadow-amber-400/20"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Car className="w-4 h-4" /> Driver Pilot
            </button>
          </div>
        )}

        {/* Error Alert Message */}
        {errorMessage && (
          <div className="bg-rose-950/40 border border-rose-300 dark:border-rose-500/40 p-3.5 rounded-xl flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300 animate-in fade-in slide-in-from-top-2 duration-200">
            <AlertCircle className="w-4 h-4 text-rose-700 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Tab 1: Operations Admin Login */}
        {activeTab === "admin" ? (
          <>
            {adminView === "password" && (
              <form onSubmit={handleAdminSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Operations Email</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-3.5" />
                    <Input
                      type="email"
                      required
                      placeholder="admin@ngtravels.in"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="pl-9 bg-background border-border text-foreground text-xs h-11 focus-visible:ring-amber-400"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Password</span>
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMessage(null);
                        setForgotSent(false);
                        setAdminView("forgot");
                      }}
                      className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-700 hover:dark:text-amber-300 cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-3.5" />
                    <Input
                      type={showAdminPassword ? "text" : "password"}
                      required
                      placeholder="Enter your operations password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="pl-9 pr-9 bg-background border-border text-foreground text-xs h-11 focus-visible:ring-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showAdminPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
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
                      <ShieldCheck className="w-4 h-4" /> Sign In to Operations
                      Desk
                    </>
                  )}
                </Button>
              </form>
            )}

            {adminView === "forgot" && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={resetAdminViewState}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to password sign-in
                </button>
                {forgotSent ? (
                  <div className="bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 p-3.5 rounded-xl flex items-start gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      If an account exists for{" "}
                      <span className="font-semibold">{adminEmail}</span>, a
                      password reset link has been sent. Check your inbox.
                    </div>
                  </div>
                ) : (
                  <form
                    onSubmit={handleForgotPasswordSubmit}
                    className="space-y-4"
                  >
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Enter your operations email and we'll send a link to reset
                      your password.
                    </p>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        Operations Email
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-3.5" />
                        <Input
                          type="email"
                          required
                          placeholder="admin@ngtravels.in"
                          value={adminEmail}
                          onChange={(e) => setAdminEmail(e.target.value)}
                          className="pl-9 bg-background border-border text-foreground text-xs h-11 focus-visible:ring-amber-400"
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black py-6 text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-400/25 cursor-pointer mt-2"
                    >
                      {submitting ? (
                        <ButtonLoader label="Sending Link..." />
                      ) : (
                        <>Send Reset Link</>
                      )}
                    </Button>
                  </form>
                )}
              </div>
            )}
          </>
        ) : (
          /* Tab 2: Driver Pilot Login */
          <>
            {driverView === "password" && (
              <form onSubmit={handleDriverSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Driver Code or Mobile</span>
                  </label>
                  <div className="relative">
                    <Car className="w-4 h-4 text-muted-foreground absolute left-3 top-3.5" />
                    <Input
                      type="text"
                      required
                      placeholder="e.g. DRV-101 or 9845011223"
                      value={driverIdentifier}
                      onChange={(e) => setDriverIdentifier(e.target.value)}
                      className="pl-9 bg-background border-border text-foreground text-xs h-11 focus-visible:ring-amber-400 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Driver Password</span>
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMessage(null);
                        setPasswordResetSent(false);
                        setPasswordResetIdentifier(driverIdentifier);
                        setDriverView("forgot");
                      }}
                      className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-700 hover:dark:text-amber-300 cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-3.5" />
                    <Input
                      type={showDriverPassword ? "text" : "password"}
                      required
                      placeholder="Enter your driver password"
                      value={driverPassword}
                      onChange={(e) => setDriverPassword(e.target.value)}
                      className="pl-9 pr-9 bg-background border-border text-foreground text-xs h-11 focus-visible:ring-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDriverPassword(!showDriverPassword)}
                      className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showDriverPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black py-6 text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-400/25 cursor-pointer mt-2"
                >
                  {submitting ? (
                    <ButtonLoader label="Authenticating Driver..." />
                  ) : (
                    <>
                      <Car className="w-4 h-4" /> Sign In to Driver Duty Cockpit
                    </>
                  )}
                </Button>
              </form>
            )}

            {driverView === "forgot" && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={resetDriverViewState}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to password sign-in
                </button>
                {passwordResetSent ? (
                  <div className="bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 p-3.5 rounded-xl flex items-start gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      If a driver account exists for{" "}
                      <span className="font-semibold">
                        {passwordResetIdentifier}
                      </span>
                      , the operations desk has been notified and will assist
                      with password reset.
                    </div>
                  </div>
                ) : (
                  <form
                    onSubmit={handleDriverPasswordResetSubmit}
                    className="space-y-4"
                  >
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Enter your driver code or registered mobile number. The
                      operations desk will assist you with password reset.
                    </p>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        Driver Code or Mobile
                      </label>
                      <div className="relative">
                        <Car className="w-4 h-4 text-muted-foreground absolute left-3 top-3.5" />
                        <Input
                          type="text"
                          required
                          placeholder="e.g. DRV-101 or 9845011223"
                          value={passwordResetIdentifier}
                          onChange={(e) =>
                            setPasswordResetIdentifier(e.target.value)
                          }
                          className="pl-9 bg-background border-border text-foreground text-xs h-11 focus-visible:ring-amber-400 font-mono"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        Note (Optional)
                      </label>
                      <div className="relative">
                        <FileText className="w-4 h-4 text-muted-foreground absolute left-3 top-3.5" />
                        <Input
                          type="text"
                          placeholder="Brief description of your issue"
                          value={passwordResetNote}
                          onChange={(e) => setPasswordResetNote(e.target.value)}
                          className="pl-9 bg-background border-border text-foreground text-xs h-11 focus-visible:ring-amber-400"
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black py-6 text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-400/25 cursor-pointer mt-2"
                    >
                      {submitting ? (
                        <ButtonLoader label="Submitting Request..." />
                      ) : (
                        <>Request Password Reset</>
                      )}
                    </Button>
                  </form>
                )}
              </div>
            )}
          </>
        )}

        <div className="text-[10px] text-muted-foreground pt-2 border-t border-border/80 text-center font-mono">
          Secured by Supabase Auth
        </div>
      </div>
    </div>
  );
}

function ResetPasswordPage() {
  const { completePasswordReset, signOut } = useAppAuth();
  const [, setLocation] = useLocation();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await completePasswordReset(newPassword);
      if (!res.success) {
        setErrorMessage(res.error || "Unable to update your password.");
      } else {
        setDone(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-foreground selection:bg-amber-400 selection:text-zinc-950">
      <div className="w-full max-w-md bg-card/95 border border-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-xl relative">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <img
              src="/logo.png"
              alt="NG Travels - Travel with Comfort & Safety"
              className="w-20 h-20 rounded-2xl object-contain bg-black p-1.5 border border-amber-300 dark:border-amber-500/40 shadow-xl shadow-amber-500/15 mx-auto"
            />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground tracking-tight">
              Reset Your Password
            </h1>
            <p className="text-[11px] text-muted-foreground mt-1 font-mono">
              Operations Command & Dispatch Platform
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="bg-rose-950/40 border border-rose-300 dark:border-rose-500/40 p-3.5 rounded-xl flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300 animate-in fade-in slide-in-from-top-2 duration-200">
            <AlertCircle className="w-4 h-4 text-rose-700 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {done ? (
          <div className="space-y-4">
            <div className="bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 p-3.5 rounded-xl flex items-start gap-2 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                Your password has been updated.
              </div>
            </div>
            <Button
              type="button"
              onClick={() => setLocation("/dashboard")}
              className="w-full bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black py-6 text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-400/25 cursor-pointer"
            >
              Continue to Operations Desk
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-3.5" />
                <Input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-9 pr-9 bg-background border-border text-foreground text-xs h-11 focus-visible:ring-amber-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-3.5" />
                <Input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="Re-enter your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-9 bg-background border-border text-foreground text-xs h-11 focus-visible:ring-amber-400"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black py-6 text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-400/25 cursor-pointer mt-2"
            >
              {submitting ? (
                <ButtonLoader label="Updating Password..." />
              ) : (
                <>Update Password</>
              )}
            </Button>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                setLocation("/");
              }}
              className="w-full text-center text-[11px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Cancel and return to sign-in
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { ThemeProvider, useTheme } from "@/hooks/useTheme";

function MainApp() {
  const {
    user,
    isSignedIn,
    isLoaded,
    isPasswordRecovery,
    accessToken,
    signOut,
    switchRole,
  } = useAppAuth();
  const [location, setLocation] = useLocation();
  const qc = useQueryClient();

  // Connect Real-Time Server-Sent Events Sync
  const { status: realtimeStatus } = useRealtimeSync();
  const { theme, toggleTheme } = useTheme();

  // Modal States
  const [createTripOpen, setCreateTripOpen] = useState(false);
  const [createEnquiryOpen, setCreateEnquiryOpen] = useState(false);
  const [customerCopyTrip, setCustomerCopyTrip] = useState<any | null>(null);
  const [paymentRecordTrip, setPaymentRecordTrip] = useState<any | null>(null);
  const [cancelTrip, setCancelTrip] = useState<any | null>(null);
  const [receiptPayment, setReceiptPayment] = useState<{
    payment: any;
    trip: any;
  } | null>(null);
  const [driverKmTrip, setDriverKmTrip] = useState<{
    trip: any;
    mode: "start" | "end";
  } | null>(null);
  const [driverExpenseTripId, setDriverExpenseTripId] = useState<number | null>(
    null,
  );
  const [initialEnquiryForTrip, setInitialEnquiryForTrip] = useState<
    any | null
  >(null);

  // Helper for safe query responses
  const safeJsonArray = async (res: Response) => {
    if (!res.ok) return [];
    try {
      const json = await res.json();
      return Array.isArray(json)
        ? json
        : Array.isArray(json?.items)
          ? json.items
          : [];
    } catch {
      return [];
    }
  };

  // Queries
  const { data: dashboardData = {}, isLoading: dashboardLoading } = useQuery({
    queryKey: ["/api/dashboard"],
    enabled: isSignedIn,
    queryFn: async () => {
      try {
        const res = await apiFetch("/api/dashboard", {
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

  const { data: tripsData = [], isLoading: tripsLoading } = useQuery({
    queryKey: ["/api/trips"],
    enabled: isSignedIn,
    queryFn: async () => {
      try {
        const res = await apiFetch("/api/trips?limit=100", {
          headers: { "x-user-role": user?.role || "owner" },
        });
        return await safeJsonArray(res);
      } catch {
        return [];
      }
    },
    refetchInterval: 15000,
  });

  const { data: customersData = [], isLoading: customersLoading } = useQuery({
    queryKey: ["/api/customers"],
    enabled: isSignedIn,
    queryFn: async () => {
      try {
        const res = await apiFetch("/api/customers?limit=100", {
          headers: { "x-user-role": user?.role || "owner" },
        });
        return await safeJsonArray(res);
      } catch {
        return [];
      }
    },
  });

  const { data: driversData = [], isLoading: driversLoading } = useQuery({
    queryKey: ["/api/drivers"],
    enabled: isSignedIn,
    queryFn: async () => {
      try {
        const res = await apiFetch("/api/drivers", {
          headers: { "x-user-role": user?.role || "owner" },
        });
        return await safeJsonArray(res);
      } catch {
        return [];
      }
    },
  });

  const { data: rawVehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ["/api/vehicles"],
    enabled: isSignedIn,
    queryFn: async () => {
      try {
        const res = await apiFetch("/api/vehicles", {
          headers: { "x-user-role": user?.role || "owner" },
        });
        return await safeJsonArray(res);
      } catch {
        return [];
      }
    },
  });

  const { data: enquiriesData = [], isLoading: enquiriesLoading } = useQuery({
    queryKey: ["/api/enquiries"],
    enabled: isSignedIn,
    queryFn: async () => {
      try {
        const res = await apiFetch("/api/enquiries", {
          headers: { "x-user-role": user?.role || "owner" },
        });
        return await safeJsonArray(res);
      } catch {
        return [];
      }
    },
  });

  const { data: paymentsData = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["/api/payments"],
    enabled: isSignedIn,
    queryFn: async () => {
      try {
        const res = await apiFetch("/api/payments", {
          headers: { "x-user-role": user?.role || "owner" },
        });
        return await safeJsonArray(res);
      } catch {
        return [];
      }
    },
  });

  const { data: expensesData = [], isLoading: expensesLoading } = useQuery({
    queryKey: ["/api/expenses"],
    enabled: isSignedIn,
    queryFn: async () => {
      try {
        const res = await apiFetch("/api/expenses", {
          headers: { "x-user-role": user?.role || "owner" },
        });
        return await safeJsonArray(res);
      } catch {
        return [];
      }
    },
  });

  const { data: notificationsData = [], isLoading: notificationsLoading } = useQuery({
    queryKey: ["/api/notifications"],
    enabled: isSignedIn,
    queryFn: async () => {
      try {
        const res = await apiFetch("/api/notifications", {
          headers: { "x-user-role": user?.role || "owner" },
        });
        return await safeJsonArray(res);
      } catch {
        return [];
      }
    },
    refetchInterval: 15000,
  });

  const { data: auditLogsData = [], isLoading: auditLogsLoading } = useQuery({
    queryKey: ["/api/audit-logs"],
    enabled: isSignedIn,
    queryFn: async () => {
      try {
        const res = await apiFetch("/api/audit-logs", {
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
    enabled: isSignedIn,
    queryFn: async () => {
      try {
        const res = await apiFetch("/api/settings", {
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
  const { data: driverTodayTrips = [], isLoading: driverTodayLoading } = useQuery({
    queryKey: ["/api/driver/today"],
    enabled: isSignedIn,
    queryFn: async () => {
      try {
        const res = await apiFetch("/api/driver/today", {
          headers: { "x-user-role": "driver" },
        });
        return await safeJsonArray(res);
      } catch {
        return [];
      }
    },
    refetchInterval: 6000,
  });

  // The signed-in driver's own profile. /api/drivers is owner-only and 403s
  // for a driver session, so drivers must resolve their own identity here
  // rather than by searching the (inaccessible) fleet-wide driver list.
  const { data: driverMe = null } = useQuery({
    queryKey: ["/api/driver/me"],
    enabled: isSignedIn,
    queryFn: async () => {
      try {
        const res = await apiFetch("/api/driver/me", {
          headers: { "x-user-role": "driver" },
        });
        if (!res.ok) return null;
        const json = await res.json();
        return json && typeof json === "object" && !json.error ? json : null;
      } catch {
        return null;
      }
    },
  });

  const { data: driverCurrentTrip } = useQuery({
    queryKey: ["/api/driver/current-trip"],
    enabled: isSignedIn,
    queryFn: async () => {
      try {
        const res = await apiFetch("/api/driver/current-trip", {
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
  const tripList: any[] = Array.isArray(tripsData)
    ? tripsData
    : Array.isArray((tripsData as any)?.items)
      ? (tripsData as any).items
      : [];
  const customerList: any[] = Array.isArray(customersData)
    ? customersData
    : Array.isArray((customersData as any)?.items)
      ? (customersData as any).items
      : [];
  const driverList: any[] = Array.isArray(driversData)
    ? driversData
    : Array.isArray((driversData as any)?.items)
      ? (driversData as any).items
      : [];
  const vehicleList: any[] = Array.isArray(rawVehicles)
    ? rawVehicles
    : Array.isArray((rawVehicles as any)?.items)
      ? (rawVehicles as any).items
      : [];
  const paymentList: any[] = Array.isArray(paymentsData)
    ? paymentsData
    : Array.isArray((paymentsData as any)?.items)
      ? (paymentsData as any).items
      : [];
  const expenseList: any[] = Array.isArray(expensesData)
    ? expensesData
    : Array.isArray((expensesData as any)?.items)
      ? (expensesData as any).items
      : [];
  const notificationList: any[] = Array.isArray(notificationsData)
    ? notificationsData
    : Array.isArray((notificationsData as any)?.items)
      ? (notificationsData as any).items
      : [];
  const enquiryList: any[] = Array.isArray(enquiriesData)
    ? enquiriesData
    : Array.isArray((enquiriesData as any)?.items)
      ? (enquiriesData as any).items
      : [];
  const auditLogList: any[] = Array.isArray(auditLogsData)
    ? auditLogsData
    : Array.isArray((auditLogsData as any)?.items)
      ? (auditLogsData as any).items
      : [];
  const driverTodayTripList: any[] = Array.isArray(driverTodayTrips)
    ? driverTodayTrips
    : Array.isArray((driverTodayTrips as any)?.items)
      ? (driverTodayTrips as any).items
      : [];

  // Action Handlers
  const handleTripCreated = () => {
    qc.invalidateQueries({ queryKey: ["/api/trips"] });
    qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
    qc.invalidateQueries({ queryKey: ["/api/driver/today"] });
    qc.invalidateQueries({ queryKey: ["/api/driver/current-trip"] });
  };

  const handleApproveExpense = async (id: number) => {
    await apiFetch(`/api/expenses/${id}/approve`, {
      method: "PATCH",
      headers: { "x-user-role": "owner" },
    });
    qc.invalidateQueries({ queryKey: ["/api/expenses"] });
    qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
    qc.invalidateQueries({ queryKey: ["/api/trips"] });
  };

  const handleRejectExpense = async (id: number) => {
    await apiFetch(`/api/expenses/${id}/reject`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-user-role": "owner" },
      body: JSON.stringify({ reason: "Expense rejected by operations" }),
    });
    qc.invalidateQueries({ queryKey: ["/api/expenses"] });
    qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
    qc.invalidateQueries({ queryKey: ["/api/trips"] });
  };

  const handleUpdateAvailability = async (
    driverId: number,
    availability: string,
  ) => {
    await apiFetch(`/api/drivers/${driverId}/availability`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-user-role": "owner" },
      body: JSON.stringify({ availability }),
    });
    qc.invalidateQueries({ queryKey: ["/api/drivers"] });
    qc.invalidateQueries({ queryKey: ["/api/driver/me"] });
    qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
  };

  const handleSaveSettings = async (updated: any) => {
    await apiFetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-user-role": "owner" },
      body: JSON.stringify(updated),
    });
    qc.invalidateQueries({ queryKey: ["/api/settings"] });
  };

  const handleMarkNotificationRead = async (id: number) => {
    await apiFetch(`/api/notifications/${id}/read`, {
      method: "POST",
      headers: { "x-user-role": user?.role || "owner" },
    });
    qc.invalidateQueries({ queryKey: ["/api/notifications"] });
  };

  const handleMarkAllNotificationsRead = async () => {
    await apiFetch("/api/notifications/read-all", {
      method: "POST",
      headers: { "x-user-role": user?.role || "owner" },
    });
    qc.invalidateQueries({ queryKey: ["/api/notifications"] });
  };

  const handleDriverMilestone = async (
    tripId: number,
    status: string,
    note?: string,
  ) => {
    const endpoint =
      status === "accepted"
        ? `/api/driver/trips/${tripId}/accept`
        : status === "driver_arrived"
          ? `/api/driver/trips/${tripId}/arrived`
          : `/api/driver/trips/${tripId}/milestone`;

    const res = await apiFetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, note }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      throw new Error(errData?.error?.message || "Failed to update trip status.");
    }

    qc.invalidateQueries({ queryKey: ["/api/trips"] });
    qc.invalidateQueries({ queryKey: ["/api/driver/today"] });
    qc.invalidateQueries({ queryKey: ["/api/driver/current-trip"] });
    qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
  };

  const nativeRole = (window as any).NG_APP_ROLE;
  const isDriverPath =
    location === "/driver" || location.startsWith("/driver/");
  const isDriverWorkspace =
    nativeRole === "driver"
      ? true
      : nativeRole === "owner"
        ? false
        // A genuine driver account can never render the owner workspace —
        // regardless of path or the cosmetic switchRole() preview state —
        // since owner-only actions there would just 403 against the real
        // server-side role anyway.
        : user?.realRole === "driver"
          ? true
          : isDriverPath || user?.role === "driver";

  // Force route alignment if native APK
  useEffect(() => {
    if (!isSignedIn) return;
    if (nativeRole === "driver" && !isDriverPath) {
      setLocation("/driver");
    } else if (nativeRole === "owner" && isDriverPath) {
      setLocation("/dashboard");
    }
  }, [nativeRole, location, isDriverPath, setLocation, isSignedIn]);

  if (!isLoaded) {
    return (
      <AppSplashLoader
        mode={isDriverWorkspace ? "driver" : "owner"}
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (isPasswordRecovery) {
    return <ResetPasswordPage />;
  }

  if (!isSignedIn) {
    return <SignInPage />;
  }

  const currentDriver =
    driverMe ||
    (Array.isArray(driverList)
      ? driverList.find((d: any) => d?.id === user?.driverId) ||
        driverList[0] ||
        null
      : null);

  return (
    <>
      {isDriverWorkspace ? (
        <DriverLayout
          driver={
            currentDriver || {
              name: user?.fullName || "Driver Pilot",
              availability: "available",
            }
          }
          canSwitchToAdmin={user?.realRole === "owner" || user?.realRole === "admin"}
          onSignOut={signOut}
          onSwitchRole={(role) => {
            switchRole(role);
            if (role === "admin") setLocation("/dashboard");
          }}
          theme={theme}
          onToggleTheme={toggleTheme}
        >
          <Switch>
            <Route path="/driver">
              <DriverDashboardPage
                todayTrips={driverTodayTripList}
                currentTrip={driverCurrentTrip}
                driver={currentDriver}
                isLoading={driverTodayLoading}
                onOpenStartKmModal={(trip) =>
                  setDriverKmTrip({ trip, mode: "start" })
                }
                onOpenEndKmModal={(trip) =>
                  setDriverKmTrip({ trip, mode: "end" })
                }
                onOpenExpenseModal={(tripId) => setDriverExpenseTripId(tripId)}
              />
            </Route>
            <Route path="/driver/dashboard">
              <DriverDashboardPage
                todayTrips={driverTodayTripList}
                currentTrip={driverCurrentTrip}
                driver={currentDriver}
                isLoading={driverTodayLoading}
                onOpenStartKmModal={(trip) =>
                  setDriverKmTrip({ trip, mode: "start" })
                }
                onOpenEndKmModal={(trip) =>
                  setDriverKmTrip({ trip, mode: "end" })
                }
                onOpenExpenseModal={(tripId) => setDriverExpenseTripId(tripId)}
              />
            </Route>
            <Route path="/driver/today">
              <DriverTodayPage
                todayTrips={driverTodayTripList}
                isLoading={driverTodayLoading}
                onOpenStartKmModal={(trip) =>
                  setDriverKmTrip({ trip, mode: "start" })
                }
                onOpenEndKmModal={(trip) =>
                  setDriverKmTrip({ trip, mode: "end" })
                }
              />
            </Route>
            <Route path="/driver/current-trip">
              <DriverCurrentTripPage
                trip={driverCurrentTrip || driverTodayTripList[0] || null}
                onOpenStartKmModal={(trip) =>
                  setDriverKmTrip({ trip, mode: "start" })
                }
                onOpenEndKmModal={(trip) =>
                  setDriverKmTrip({ trip, mode: "end" })
                }
                onOpenExpenseModal={(tripId) => setDriverExpenseTripId(tripId)}
                onUpdateMilestone={handleDriverMilestone}
              />
            </Route>
            <Route path="/driver/expenses">
              <DriverExpensesPage
                expenses={
                  Array.isArray(expenseList)
                    ? expenseList.filter(
                        (e: any) =>
                          !user?.driverId || e?.driverId === user?.driverId,
                      )
                    : []
                }
                isLoading={expensesLoading}
                onOpenExpenseModal={() =>
                  setDriverExpenseTripId(driverCurrentTrip?.id || null)
                }
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
                onUpdateAvailability={(avail) =>
                  currentDriver?.id &&
                  handleUpdateAvailability(currentDriver.id, avail)
                }
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
          theme={theme}
          onToggleTheme={toggleTheme}
          unreadNotificationCount={
            notificationList.filter(
              (n: any) => !n.isRead && n.audience === "owner",
            ).length
          }
        >
          <Switch>
            <Route path="/">
              <Redirect to="/dashboard" />
            </Route>
            <Route path="/dashboard">
              <DashboardPage
                isLoading={dashboardLoading}
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
              <LiveTripsPage trips={tripList} isLoading={tripsLoading} />
            </Route>
            <Route path="/calendar">
              <CalendarPage trips={tripList} />
            </Route>
            <Route path="/route-planner">
              <RoutePlannerPage
                onOpenTripWizardWithRoute={(routeData) => {
                  if (routeData) {
                    setInitialEnquiryForTrip({
                      pickup:
                        routeData.pickup?.address ||
                        routeData.pickup?.name ||
                        routeData.pickup,
                      destination:
                        routeData.destination?.address ||
                        routeData.destination?.name ||
                        routeData.destination,
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
                isLoading={tripsLoading}
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
                const tripPayments = paymentList.filter(
                  (p: any) => p.tripId === tripId,
                );
                const tripExpenses = expenseList.filter(
                  (e: any) => e.tripId === tripId,
                );
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
              <CustomersPage customers={customerList} isLoading={customersLoading} />
            </Route>
            <Route path="/enquiries">
              <EnquiriesPage
                enquiries={enquiryList}
                isLoading={enquiriesLoading}
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
                isLoading={driversLoading}
                onUpdateAvailability={handleUpdateAvailability}
              />
            </Route>
            <Route path="/driver-availability">
              <DriversPage
                drivers={driverList}
                isLoading={driversLoading}
                onUpdateAvailability={handleUpdateAvailability}
              />
            </Route>
            <Route path="/payments">
              <PaymentsPage
                payments={paymentList}
                trips={tripList}
                isLoading={paymentsLoading}
                onOpenReceipt={(payment, trip) =>
                  setReceiptPayment({ payment, trip })
                }
              />
            </Route>
            <Route path="/refunds">
              <PaymentsPage
                payments={paymentList}
                trips={tripList}
                isLoading={paymentsLoading}
                onOpenReceipt={(payment, trip) =>
                  setReceiptPayment({ payment, trip })
                }
              />
            </Route>
            <Route path="/expenses">
              <ExpensesPage
                expenses={expenseList}
                trips={tripList}
                isLoading={expensesLoading}
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
                notifications={notificationList.filter(
                  (n: any) => n.audience === "owner",
                )}
                isLoading={notificationsLoading}
                onMarkRead={handleMarkNotificationRead}
                onMarkAllRead={handleMarkAllNotificationsRead}
              />
            </Route>
            <Route path="/audit-logs">
              <AuditLogsPage logs={auditLogList} isLoading={auditLogsLoading} />
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
        defaultBillingDayPolicy={
          settingsData.billingDayPolicy || "CALENDAR_DAYS"
        }
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
          qc.invalidateQueries({ queryKey: ["/api/trips"] });
          qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
        }}
      />

      <PaymentRecordModal
        isOpen={Boolean(paymentRecordTrip)}
        onClose={() => setPaymentRecordTrip(null)}
        trip={paymentRecordTrip}
        onPaymentRecorded={() => {
          qc.invalidateQueries({ queryKey: ["/api/trips"] });
          qc.invalidateQueries({ queryKey: ["/api/payments"] });
          qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
        }}
      />

      {driverKmTrip && (
        <DriverKmModal
          isOpen={Boolean(driverKmTrip)}
          onClose={() => setDriverKmTrip(null)}
          trip={driverKmTrip.trip}
          mode={driverKmTrip.mode}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["/api/trips"] });
            qc.invalidateQueries({ queryKey: ["/api/driver/today"] });
            qc.invalidateQueries({ queryKey: ["/api/driver/current-trip"] });
            qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
            qc.invalidateQueries({ queryKey: ["/api/drivers"] });
          }}
        />
      )}

      {driverExpenseTripId && (
        <DriverExpenseModal
          isOpen={Boolean(driverExpenseTripId)}
          onClose={() => setDriverExpenseTripId(null)}
          tripId={driverExpenseTripId}
          onExpenseAdded={() => {
            qc.invalidateQueries({ queryKey: ["/api/expenses"] });
          }}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <LocalAuthProvider>
              <Router base={basePath}>
                <MainApp />
              </Router>
            </LocalAuthProvider>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
