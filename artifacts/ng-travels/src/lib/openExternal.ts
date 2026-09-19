/**
 * Opens a URL outside the app shell. Capacitor's Android WebView does not
 * support `window.open(url, "_blank")` (there's no multi-window support),
 * so on native platforms this silently did nothing — e.g. the WhatsApp
 * buttons never launched anything. `@capacitor/browser`'s Browser.open()
 * uses a native Custom Tabs sheet, which correctly hands off to installed
 * apps like WhatsApp for verified links (wa.me). On the web it falls back
 * to a normal new tab.
 */
export async function openExternalUrl(url: string) {
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url });
  } catch {
    window.open(url, "_blank");
  }
}

export function openWhatsApp(mobile: string, message?: string) {
  const digits = (mobile || "").replace(/\D/g, "");
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return openExternalUrl(`https://wa.me/${digits}${text}`);
}
