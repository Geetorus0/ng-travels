import React, { useState } from "react";
import { Settings, Save, CheckCircle2, Building, Phone, Mail, IndianRupee, Globe, Smartphone, ShieldCheck, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface SettingsPageProps {
  settings: any;
  onSaveSettings: (updated: any) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ settings = {}, onSaveSettings }) => {
  const [company, setCompany] = useState(settings.company || "NG Travels Operations");
  const [mobile, setMobile] = useState(settings.mobile || "+91 98450 21867");
  const [email, setEmail] = useState(settings.email || "operations@ngtravels.in");
  const [defaultRate, setDefaultRate] = useState(settings.defaultRate || 18);
  const [minimumKmPerDay, setMinimumKmPerDay] = useState(settings.minimumKmPerDay || 250);
  const [driverBataPerDay, setDriverBataPerDay] = useState(settings.driverBataPerDay || 500);
  const [billingDayPolicy, setBillingDayPolicy] = useState(settings.billingDayPolicy || "CALENDAR_DAYS");
  const [terms, setTerms] = useState(settings.terms || "1. Toll, parking and state permit charges are customer payable at actuals.\n2. Billing starts and ends from garage to garage.\n3. AC will be switched off while driving in hill terrain.");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      company,
      mobile,
      email,
      defaultRate: Number(defaultRate),
      minimumKmPerDay: Number(minimumKmPerDay),
      driverBataPerDay: Number(driverBataPerDay),
      billingDayPolicy,
      terms,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
          <Settings className="w-5 h-5 text-amber-400" />
          Business Profile & Operations Configuration
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Configure business legal name, contact desk, default commercial rates, and booking voucher terms.
        </p>
      </div>

      {/* Brand Identity Card */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex items-center gap-4 shadow-lg">
        <img
          src="/logo.png"
          alt="NG Travels Logo"
          className="w-16 h-16 rounded-xl object-contain bg-black border border-amber-500/40 p-1 flex-shrink-0 shadow-md shadow-amber-500/10"
        />
        <div>
          <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">OFFICIAL BRAND ASSET</div>
          <h3 className="text-base font-bold text-zinc-100">NG Travels</h3>
          <p className="text-xs text-zinc-400 mt-0.5">Travel with Comfort & Safety</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4 bg-zinc-900/70 p-6 rounded-xl border border-zinc-800 text-xs">
        <div>
          <label className="text-xs text-zinc-300 font-semibold block mb-1">Company / Brand Name</label>
          <Input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="bg-zinc-900 border-zinc-800 text-xs"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-300 font-semibold block mb-1">Operations Contact Number</label>
            <Input
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-xs"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-300 font-semibold block mb-1">Official Support Email</label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-zinc-300 font-semibold block mb-1">Commercial Rate / KM (₹)</label>
            <Input
              type="number"
              value={defaultRate}
              onChange={(e) => setDefaultRate(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-xs font-mono font-bold text-amber-400"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-300 font-semibold block mb-1">Minimum KM Rule / Day</label>
            <Input
              type="number"
              value={minimumKmPerDay}
              onChange={(e) => setMinimumKmPerDay(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-xs font-mono font-bold text-sky-400"
            />
            <span className="text-[10px] text-zinc-500 mt-0.5 block">e.g. 250 km/day for round trips</span>
          </div>
          <div>
            <label className="text-xs text-zinc-300 font-semibold block mb-1">Driver Bata / Day (₹)</label>
            <Input
              type="number"
              value={driverBataPerDay}
              onChange={(e) => setDriverBataPerDay(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-xs font-mono font-bold text-emerald-400"
            />
            <span className="text-[10px] text-zinc-500 mt-0.5 block">e.g. ₹500/day</span>
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-300 font-semibold block mb-1">Multi-Day Billing Policy</label>
          <select
            value={billingDayPolicy}
            onChange={(e) => setBillingDayPolicy(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-400"
          >
            <option value="CALENDAR_DAYS">Calendar Days (e.g. 04 Sep to 06 Sep = 3 full billing days)</option>
            <option value="24_HOUR_PERIODS">24-Hour Periods (rolling 24hr blocks)</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-zinc-300 font-semibold block mb-1">Booking Terms & Customer Conditions</label>
          <Textarea
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            className="bg-zinc-900 border-zinc-800 text-xs font-mono"
            rows={4}
          />
        </div>

        <div className="pt-2 flex items-center justify-between">
          <Button type="submit" className="bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs py-5 px-6 cursor-pointer">
            <Save className="w-3.5 h-3.5 mr-1.5" /> Save Configuration
          </Button>

          {saved && (
            <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Settings updated successfully
            </span>
          )}
        </div>
      </form>

      {/* Standalone APK Downloads (Owner & Driver) */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono">
          Standalone Android Applications (v1.0)
        </h3>
        
        {/* Owner APK Card */}
        <div className="bg-gradient-to-r from-amber-950/40 via-zinc-900 to-zinc-900 p-5 rounded-xl border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-amber-400 uppercase bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              <ShieldCheck className="w-3 h-3" /> OWNER / ADMIN APK
            </div>
            <h4 className="text-sm font-bold text-zinc-100">NG Travels Owner App</h4>
            <p className="text-xs text-zinc-400 max-w-md">
              Complete Operations Command Desk, booking dispatch, customer vouchers, live GPS radar, and revenue reports.
            </p>
          </div>
          <a href="/NG-Travels-Owner.apk" download="NG-Travels-Owner-v1.0.apk">
            <Button className="bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs py-5 px-5 shadow-lg shadow-amber-400/20 flex items-center gap-2 cursor-pointer whitespace-nowrap">
              <Smartphone className="w-4 h-4" /> Download Owner APK
            </Button>
          </a>
        </div>

        {/* Driver APK Card */}
        <div className="bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-zinc-900 p-5 rounded-xl border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-400 uppercase bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              <Car className="w-3 h-3" /> DRIVER / PILOT APK
            </div>
            <h4 className="text-sm font-bold text-zinc-100">NG Travels Driver App</h4>
            <p className="text-xs text-zinc-400 max-w-md">
              Driver cockpit HUD, today's journey roster, starting/ending odometer capture, fuel/toll claims, and turn-by-turn navigation.
            </p>
          </div>
          <a href="/NG-Travels-Driver.apk" download="NG-Travels-Driver-v1.0.apk">
            <Button className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs py-5 px-5 shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer whitespace-nowrap">
              <Smartphone className="w-4 h-4" /> Download Driver APK
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
};
