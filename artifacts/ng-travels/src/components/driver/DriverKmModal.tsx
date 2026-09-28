import { apiFetch } from "@/lib/apiFetch";
import React, { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gauge, CheckCircle2, AlertCircle, Camera, X } from "lucide-react";
import { TripActionLoader, ButtonLoader } from "@/components/loading";

export interface DriverKmModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: any;
  mode: "start" | "end";
  onSuccess: (updatedTrip: any) => void | Promise<void>;
}

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export const DriverKmModal: React.FC<DriverKmModalProps> = ({
  isOpen,
  onClose,
  trip,
  mode,
  onSuccess,
}) => {
  const [kmValue, setKmValue] = useState<string>(() => {
    if (mode === "end" && trip?.startingKm) {
      return String(trip.startingKm);
    }
    return "";
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!trip) return null;

  const startKm = Number(trip.startingKm || 0);
  const endKm = Number(kmValue || 0);
  const calculatedActual = mode === "end" && endKm >= startKm ? endKm - startKm : 0;

  const handlePickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-capturing the same shot after removing it
    if (!file) return;

    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      setError("Unsupported photo format — please retake with the camera.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError("That photo is too large — please retake it (must be under 8MB).");
      return;
    }

    setError(null);
    setPhotoFile(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemovePhoto = () => {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoFile(null);
    setPhotoPreviewUrl(null);
  };

  const handleSubmit = async () => {
    setError(null);
    if (!kmValue || isNaN(Number(kmValue)) || Number(kmValue) <= 0) {
      setError("Please enter a valid positive odometer reading.");
      return;
    }

    if (mode === "end" && endKm < startKm) {
      setError(`Ending KM (${endKm}) cannot be less than Starting KM (${startKm}).`);
      return;
    }

    if (!photoFile) {
      setError("Please take a photo of the odometer reading before submitting.");
      return;
    }

    setLoading(true);
    try {
      // Upload the odometer photo first — the KM entry is only recorded
      // once we have a real photo URL to attach to it, same as the driver
      // expense flow requiring a receipt before the claim is submitted.
      const formData = new FormData();
      formData.append("file", photoFile);
      const uploadRes = await apiFetch(`/api/driver/trips/upload-km-photo`, {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => null);
        throw new Error(errData?.error?.message || "Failed to upload the odometer photo.");
      }
      const { url: photoUrl } = await uploadRes.json();

      const endpoint = mode === "start"
        ? `/api/driver/trips/${trip.id}/start`
        : `/api/driver/trips/${trip.id}/complete`;

      const payload = mode === "start"
        ? { startingKm: Number(kmValue), photoUrl }
        : { endingKm: Number(kmValue), photoUrl };

      const res = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        setError(errData.error || "Failed to update odometer.");
        return;
      }

      const updatedTrip = await res.json();
      // Awaited so the spinner (and this modal) stays up until the trip
      // list/current-trip queries actually refetch — otherwise the modal
      // closes and the driver briefly sees the OLD stage/button underneath
      // until the background refetch lands.
      await onSuccess(updatedTrip);
      handleRemovePhoto();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Network error while submitting odometer reading.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading && (
        <TripActionLoader action={mode === "start" ? "start" : "complete"} />
      )}

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-sm bg-background text-foreground border-border p-5 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Gauge className="w-5 h-5 text-amber-700 dark:text-amber-400" />
              {mode === "start" ? "Enter Starting Odometer KM" : "Enter Ending Odometer KM"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            <div className="bg-card/60 p-3 rounded-lg border border-border space-y-1">
              <div className="text-muted-foreground">Booking: <span className="font-mono text-amber-700 dark:text-amber-400 font-bold">{trip.bookingId}</span></div>
              <div className="text-foreground font-medium">{trip.pickup?.name} ➔ {trip.destination?.name}</div>
              {mode === "end" && (
                <div className="text-muted-foreground pt-1 border-t border-border flex justify-between">
                  <span>Recorded Starting KM:</span>
                  <span className="font-mono font-bold text-foreground">{startKm} km</span>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs text-amber-700 dark:text-amber-400 font-semibold uppercase block mb-1.5">
                {mode === "start" ? "Starting Odometer Reading (KM)" : "Ending Odometer Reading (KM)"}
              </label>
              <Input
                type="number"
                value={kmValue}
                onChange={(e) => setKmValue(e.target.value)}
                placeholder="e.g. 82450"
                className="bg-card border-amber-300 dark:border-amber-500/50 text-xl font-mono font-bold text-amber-700 dark:text-amber-400 text-center py-6"
              />
            </div>

            {mode === "end" && (
              <div className="bg-amber-950/20 border border-amber-300 dark:border-amber-500/30 rounded-lg p-3 flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Calculated Actual KM:</span>
                <span className="text-lg font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  {calculatedActual} km
                </span>
              </div>
            )}

            <div>
              <label className="text-xs text-amber-700 dark:text-amber-400 font-semibold uppercase block mb-1.5">
                Upload Odometer Reading Image <span className="text-rose-600 dark:text-rose-400">*</span>
              </label>
              {/* accept="image/*" (no PDF/other types) + capture="environment"
                  together make Android launch the camera app directly with
                  no gallery/file-picker option — this must stay camera-only,
                  not a pick-from-gallery upload. */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePickPhoto}
                className="hidden"
              />

              {!photoFile ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-1.5 py-5 rounded-xl border-2 border-dashed border-amber-300 dark:border-amber-500/40 bg-card/60 text-muted-foreground hover:bg-amber-950/10 hover:border-amber-400 transition-colors cursor-pointer"
                >
                  <Camera className="w-5 h-5 text-amber-700 dark:text-amber-400" />
                  <span className="text-[11px] font-semibold">Tap to photograph the odometer</span>
                  <span className="text-[10px] text-muted-foreground">Camera only · JPG/PNG/HEIC · up to 8MB</span>
                </button>
              ) : (
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-emerald-300 dark:border-emerald-500/40 bg-emerald-950/10">
                  <img src={photoPreviewUrl || undefined} alt="Odometer preview" className="w-12 h-12 object-cover rounded-lg border border-border shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold text-foreground truncate">{photoFile.name}</div>
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Captured
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="text-muted-foreground hover:text-rose-700 hover:dark:text-rose-400 cursor-pointer p-1"
                    title="Retake photo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-rose-950/40 border border-rose-300 dark:border-rose-500/40 rounded p-2.5 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !photoFile}
              className="w-full bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold py-5 text-sm disabled:opacity-50"
            >
              {loading ? (
                <ButtonLoader
                  label={mode === "start" ? "Starting your journey..." : "Completing trip..."}
                />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  {mode === "start" ? "Confirm & Start Trip" : "Validate & Complete Trip"}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
