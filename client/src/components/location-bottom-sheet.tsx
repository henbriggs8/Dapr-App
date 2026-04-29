import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, Navigation, Clock, Home, X, Loader2 } from "lucide-react";
import { Icon } from "@/components/ui/icon";

const ACCENT = "#8c52ff";

// ── Photon (OSM-backed) autocomplete ──────────────────────────────────────────
interface PhotonFeature {
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  geometry: { coordinates: [number, number] };
}

function formatPhotonAddress(f: PhotonFeature): string {
  const p = f.properties;
  const streetNum = [p.housenumber, p.street || p.name].filter(Boolean).join(" ");
  const city = p.city || p.county || "";
  const stateZip = [p.state, p.postcode].filter(Boolean).join(" ");
  return [streetNum, city, stateZip].filter(Boolean).join(", ");
}

async function fetchPhotonSuggestions(query: string): Promise<{ label: string; coords: [number, number] }[]> {
  if (!query.trim() || query.length < 3) return [];
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lang=en&bbox=-125,24,-66,50`; // US bbox
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.features as PhotonFeature[]).map((f) => ({
    label: formatPhotonAddress(f),
    coords: f.geometry.coordinates,
  }));
}

// ── Nominatim reverse geocode ─────────────────────────────────────────────────
async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  if (!res.ok) throw new Error("Geocoding failed");
  const data = await res.json();
  const a = data.address || {};
  const house = a.house_number || "";
  const road = a.road || a.pedestrian || a.path || "";
  const city = a.city || a.town || a.village || a.county || "";
  const state = a.state || "";
  const zip = a.postcode || "";
  return [[house, road].filter(Boolean).join(" "), city, [state, zip].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
}

// ── Props ─────────────────────────────────────────────────────────────────────
export interface LocationBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentAddress?: string | null;
  recentAddresses?: string[];
  onSelect: (address: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function LocationBottomSheet({
  isOpen,
  onClose,
  currentAddress,
  recentAddresses = [],
  onSelect,
}: LocationBottomSheetProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<{ label: string; coords: [number, number] }[]>([]);
  const [sugLoading, setSugLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-focus input when sheet opens
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSuggestions([]);
      setGpsError(null);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Debounced Photon lookup
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || query.length < 3) {
      setSuggestions([]);
      return;
    }
    setSugLoading(true);
    debounceRef.current = setTimeout(async () => {
      const results = await fetchPhotonSuggestions(query);
      setSuggestions(results);
      setSugLoading(false);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const handleSelect = useCallback((address: string) => {
    onSelect(address);
    onClose();
  }, [onSelect, onClose]);

  const handleGPS = useCallback(() => {
    if (!navigator.geolocation) { setGpsError("Location not available."); return; }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const addr = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          handleSelect(addr);
        } catch {
          setGpsError("Couldn't resolve your location. Try typing an address.");
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        setGpsLoading(false);
        setGpsError(
          err.code === err.PERMISSION_DENIED
            ? "Location access denied. Please enable it in Settings."
            : "Couldn't get your location. Try typing an address."
        );
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }, [handleSelect]);

  // Unique recent addresses (exclude the current saved address)
  const recentUnique = Array.from(new Set(recentAddresses))
    .filter((a) => a && a !== currentAddress)
    .slice(0, 3);

  const showSuggestions = suggestions.length > 0 || sugLoading;
  const showRecents = !showSuggestions && recentUnique.length > 0;
  const showHome = !showSuggestions && currentAddress;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onPointerDown={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl overflow-hidden"
            style={{ maxHeight: "85vh" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-2 pb-3">
              <h2 className="text-[17px] font-bold text-gray-900">Vehicle location</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200 transition"
                aria-label="Close"
              >
                <Icon icon={X} size="xs" className="text-gray-500" />
              </button>
            </div>

            {/* Search input */}
            <div className="px-4 pb-3">
              <div className="flex items-center gap-3 bg-gray-100 rounded-2xl px-4 py-3.5">
                {sugLoading ? (
                  <Icon icon={Loader2} size="sm" className="text-gray-400 shrink-0 animate-spin" />
                ) : (
                  <Icon icon={Search} size="sm" className="text-gray-400 shrink-0" />
                )}
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search address or location…"
                  className="flex-1 bg-transparent text-[14px] text-gray-900 placeholder:text-gray-400 outline-none"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="words"
                  spellCheck={false}
                />
                {query.length > 0 && (
                  <button
                    onClick={() => { setQuery(""); setSuggestions([]); }}
                    className="shrink-0"
                    aria-label="Clear"
                  >
                    <Icon icon={X} size="xs" className="text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable results area */}
            <div className="overflow-y-auto" style={{ maxHeight: "calc(85vh - 160px)" }}>

              {/* GPS row */}
              <button
                onClick={handleGPS}
                disabled={gpsLoading}
                className="w-full flex items-center gap-4 px-5 py-3.5 active:bg-gray-50 transition"
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: "#eef2ff" }}
                >
                  {gpsLoading ? (
                    <Icon icon={Loader2} size="sm" className="animate-spin" style={{ color: ACCENT }} />
                  ) : (
                    <Icon icon={Navigation} size="sm" style={{ color: ACCENT }} />
                  )}
                </div>
                <div className="text-left">
                  <p className="text-[14px] font-semibold text-gray-900">Use current location</p>
                  {gpsError && <p className="text-[11px] text-red-500 mt-0.5">{gpsError}</p>}
                </div>
              </button>

              {/* Photon suggestions */}
              {showSuggestions && (
                <div className="px-4 pb-2">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-1 mb-1.5">Suggestions</p>
                  {sugLoading && suggestions.length === 0 ? (
                    <div className="space-y-2 py-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex gap-3 px-1 py-2 animate-pulse">
                          <div className="w-9 h-9 rounded-xl bg-gray-100 shrink-0" />
                          <div className="flex-1 space-y-2 py-1">
                            <div className="h-3 bg-gray-100 rounded w-3/4" />
                            <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    suggestions.map((s, i) => {
                      const [main, ...rest] = s.label.split(", ");
                      return (
                        <button
                          key={i}
                          onClick={() => handleSelect(s.label)}
                          className="w-full flex items-center gap-3 rounded-xl px-1 py-2.5 active:bg-gray-50 transition text-left"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                            <Icon icon={MapPin} size="sm" className="text-gray-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[14px] font-medium text-gray-900 truncate">{main}</p>
                            {rest.length > 0 && (
                              <p className="text-[12px] text-gray-400 truncate">{rest.join(", ")}</p>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {/* Saved home address */}
              {showHome && (
                <div className="px-4 pb-1">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-1 mb-1.5">Saved</p>
                  <button
                    onClick={() => handleSelect(currentAddress!)}
                    className="w-full flex items-center gap-3 rounded-xl px-1 py-2.5 active:bg-gray-50 transition text-left"
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: "#f3eeff" }}
                    >
                      <Icon icon={Home} size="sm" style={{ color: ACCENT }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-gray-900 truncate">Home</p>
                      <p className="text-[12px] text-gray-400 truncate">{currentAddress}</p>
                    </div>
                  </button>
                </div>
              )}

              {/* Recent addresses */}
              {showRecents && (
                <div className="px-4 pb-4">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-1 mb-1.5">Recent</p>
                  {recentUnique.map((addr, i) => {
                    const [main, ...rest] = addr.split(", ");
                    return (
                      <button
                        key={i}
                        onClick={() => handleSelect(addr)}
                        className="w-full flex items-center gap-3 rounded-xl px-1 py-2.5 active:bg-gray-50 transition text-left"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                          <Icon icon={Clock} size="sm" className="text-gray-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[14px] font-medium text-gray-900 truncate">{main}</p>
                          {rest.length > 0 && (
                            <p className="text-[12px] text-gray-400 truncate">{rest.join(", ")}</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Safe-area spacer */}
              <div style={{ height: "env(safe-area-inset-bottom, 16px)" }} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
