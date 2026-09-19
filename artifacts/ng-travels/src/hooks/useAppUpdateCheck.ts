import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";

export interface AppUpdateInfo {
  updateAvailable: boolean;
  currentVersionName?: string;
  latestVersionName?: string;
  downloadUrl?: string;
  releaseNotes?: string;
}

/**
 * Checks the installed native app's version against /api/app/version and
 * flags when a newer APK is available. No-ops entirely on the web (only
 * Capacitor.isNativePlatform() triggers the check) — a browser tab has no
 * "installed version" to compare.
 */
export function useAppUpdateCheck(): AppUpdateInfo {
  const [info, setInfo] = useState<AppUpdateInfo>({ updateAvailable: false });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const Capacitor = (window as any).Capacitor;
      if (!Capacitor?.isNativePlatform?.()) return;

      try {
        // Lazy import: @capacitor/app is only meaningful (and only bundled
        // for) the native build, no reason to pull it into the web bundle path.
        const { App } = await import("@capacitor/app");
        const appInfo = await App.getInfo();

        // appInfo.id is the applicationId — "com.ngtravels.owner" or
        // "com.ngtravels.driver" — which tells us which manifest entry to
        // check without depending on the separate (racier) NG_APP_ROLE
        // injection from MainActivity.
        const role = appInfo.id.includes("driver") ? "driver" : "owner";
        const currentVersionCode = Number(appInfo.build);

        const res = await apiFetch("/api/app/version");
        if (!res.ok) return;
        const manifest = await res.json();
        const latest = manifest?.[role];
        if (!latest || cancelled) return;

        if (Number(latest.versionCode) > currentVersionCode) {
          setInfo({
            updateAvailable: true,
            currentVersionName: appInfo.version,
            latestVersionName: latest.versionName,
            downloadUrl: latest.url,
            releaseNotes: latest.releaseNotes,
          });
        }
      } catch (err) {
        console.warn("[useAppUpdateCheck] Unable to check for app update:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return info;
}
