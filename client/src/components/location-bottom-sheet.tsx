import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, MapPin, Navigation, Clock, Home, X, Loader2,
  ArrowLeft, ChevronRight, ChevronDown, Droplets, Sparkles, Wand2, Crown,
  Check, CheckCircle2, Gift, Car, Plus, Tag, CreditCard, type LucideIcon,
} from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { WalletLogo } from "@/components/wallet-logo";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { resolveUrl } from "@/lib/queryClient";
import { Capacitor } from "@capacitor/core";
import { type Service, type TimeSlot, type Vehicle } from "@shared/schema";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements, CardElement, PaymentRequestButtonElement,
  useStripe, useElements,
} from "@stripe/react-stripe-js";
import type { PaymentRequestPaymentMethodEvent } from "@stripe/stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

// ── Saved card type ────────────────────────────────────────────────────────────
interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

function cardBrandLabel(brand: string): string {
  const map: Record<string, string> = {
    visa: "Visa", mastercard: "Mastercard", amex: "Amex",
    discover: "Discover", jcb: "JCB", unionpay: "UnionPay",
  };
  return map[brand.toLowerCase()] ?? brand.charAt(0).toUpperCase() + brand.slice(1);
}

// ── Stripe Payment Form (inner — must be inside <Elements>) ───────────────────
function StripePaymentForm({
  onSuccess,
  amountCents,
  clientSecret,
  savedCards,
  saveCard,
}: {
  onSuccess: () => void;
  amountCents: number;
  clientSecret: string;
  savedCards: SavedCard[];
  saveCard: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [method, setMethod] = useState<"credit" | "debit" | null>(null);
  const [cardReady, setCardReady] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [prApple, setPrApple] = useState<ReturnType<NonNullable<typeof stripe>["paymentRequest"]> | null>(null);
  const [prGoogle, setPrGoogle] = useState<ReturnType<NonNullable<typeof stripe>["paymentRequest"]> | null>(null);
  const [applePayAvailable, setApplePayAvailable] = useState(false);
  const [googlePayAvailable, setGooglePayAvailable] = useState(false);
  const [stripeLoaded, setStripeLoaded] = useState(false);
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null);

  useEffect(() => {
    if (!stripe || !amountCents) return;
    setStripeLoaded(true);

    // Reset states before re-checking
    setApplePayAvailable(false);
    setGooglePayAvailable(false);
    setPrApple(null);
    setPrGoogle(null);

    const makePR = () => stripe.paymentRequest({
      country: "US",
      currency: "usd",
      total: { label: "Dapr Car Wash", amount: amountCents },
      requestPayerName: false,
      requestPayerEmail: false,
    });

    const attachHandler = (s: NonNullable<typeof stripe>, pr: ReturnType<typeof makePR>) => {
      pr.on("paymentmethod", async (ev) => {
        const { paymentIntent, error: err1 } = await s.confirmCardPayment(
          clientSecret,
          { payment_method: ev.paymentMethod.id },
          { handleActions: false }
        );
        if (err1) {
          ev.complete("fail");
          setPayError(err1.message || "Payment failed.");
        } else if (paymentIntent?.status === "requires_action") {
          const { error: err2 } = await s.confirmCardPayment(clientSecret);
          if (err2) {
            ev.complete("fail");
            setPayError(err2.message || "Payment failed.");
          } else {
            ev.complete("success");
            onSuccess();
          }
        } else {
          ev.complete("success");
          onSuccess();
        }
      });
    };

    // Separate instance for Apple Pay
    const pA = makePR();
    pA.canMakePayment().then((result) => {
      if (result?.applePay) {
        setApplePayAvailable(true);
        attachHandler(stripe, pA);
        setPrApple(pA);
      }
    });

    // Separate instance for Google Pay
    const pG = makePR();
    pG.canMakePayment().then((result) => {
      if (result?.googlePay) {
        setGooglePayAvailable(true);
        attachHandler(stripe, pG);
        setPrGoogle(pG);
      }
    });
  }, [stripe, amountCents, clientSecret, onSuccess]);

  async function handleCardPay() {
    if (!stripe || !elements) return;
    const cardEl = elements.getElement(CardElement);
    if (!cardEl) return;
    setPaying(true);
    setPayError(null);
    const { error } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: cardEl },
    });
    if (error) {
      setPayError(error.message || "Payment failed. Please try again.");
      setPaying(false);
    } else {
      onSuccess();
    }
  }

  async function handleSavedCardPay() {
    if (!stripe || !selectedSavedId) return;
    setPaying(true);
    setPayError(null);
    const { error } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: selectedSavedId,
    });
    if (error) {
      setPayError(error.message || "Payment failed. Please try again.");
      setPaying(false);
    } else {
      onSuccess();
    }
  }

  if (!stripeLoaded) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Icon icon={Loader2} size="lg" className="animate-spin" style={{ color: "#8c52ff" }} />
        <p className="text-[13px] text-gray-400">Loading payment options…</p>
      </div>
    );
  }

  const dollarAmount = (amountCents / 100).toFixed(2);
  const showNewCardSection = !selectedSavedId;

  return (
    <div className="flex flex-col gap-5">
      {/* Amount summary */}
      <div className="rounded-2xl bg-gray-50 px-4 py-3.5 flex items-center justify-between">
        <span className="text-[14px] text-gray-500 font-medium">Total due</span>
        <span className="text-[17px] font-bold text-gray-900">${dollarAmount}</span>
      </div>

      {/* Saved cards */}
      {savedCards.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-1">Saved cards</p>
          <div className="space-y-2">
            {savedCards.map((card) => {
              const selected = selectedSavedId === card.id;
              return (
                <button
                  key={card.id}
                  onClick={() => setSelectedSavedId(selected ? null : card.id)}
                  className="w-full flex items-center gap-3 rounded-2xl border-2 px-4 py-3 transition-all text-left"
                  style={{
                    borderColor: selected ? "#8c52ff" : "#e5e7eb",
                    background: selected ? "#f3eeff" : "#fff",
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: selected ? "#e9d8ff" : "#f3f4f6" }}
                  >
                    <Icon icon={CreditCard} size="sm" style={{ color: selected ? "#8c52ff" : "#6b7280" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold" style={{ color: selected ? "#8c52ff" : "#111827" }}>
                      {cardBrandLabel(card.brand)} •••• {card.last4}
                    </p>
                    <p className="text-[12px] text-gray-400">Expires {card.expMonth}/{String(card.expYear).slice(-2)}</p>
                  </div>
                  <div
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition"
                    style={selected ? { borderColor: "#8c52ff", backgroundColor: "#8c52ff" } : { borderColor: "#d1d5db" }}
                  >
                    {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-3 pt-1">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-[12px] text-gray-400 font-medium">or enter new card</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
        </div>
      )}

      {/* Apple Pay / Google Pay buttons — only shows on supported devices */}
      {showNewCardSection && (applePayAvailable || googlePayAvailable) && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-1">
            {applePayAvailable && !googlePayAvailable && (
              <WalletLogo wallet="apple" />
            )}
            {googlePayAvailable && !applePayAvailable && (
              <WalletLogo wallet="google" />
            )}
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
              {applePayAvailable && !googlePayAvailable
                ? "Pay with Apple Pay"
                : googlePayAvailable && !applePayAvailable
                ? "Pay with Google Pay"
                : "Express checkout"}
            </p>
          </div>
          {applePayAvailable && prApple && (
            <PaymentRequestButtonElement
              options={{
                paymentRequest: prApple,
                style: { paymentRequestButton: { type: "buy", theme: "dark", height: "52px" } },
              }}
            />
          )}
          {googlePayAvailable && prGoogle && (
            <PaymentRequestButtonElement
              options={{
                paymentRequest: prGoogle,
                style: { paymentRequestButton: { type: "buy", theme: "dark", height: "52px" } },
              }}
            />
          )}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-[12px] text-gray-400 font-medium">or pay with card</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
        </div>
      )}

      {/* New card method picker */}
      {showNewCardSection && (
        <div className="grid grid-cols-2 gap-3">
          {(["credit", "debit"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMethod(m); setCardReady(false); }}
              className="flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border-2 transition-all"
              style={{
                borderColor: method === m ? "#8c52ff" : "#e5e7eb",
                background: method === m ? "#f3eeff" : "#fff",
              }}
            >
              <span className="text-2xl">{m === "credit" ? "💳" : "🏦"}</span>
              <span
                className="text-[13px] font-semibold capitalize"
                style={{ color: method === m ? "#8c52ff" : "#374151" }}
              >
                {m === "credit" ? "Credit Card" : "Debit Card"}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Card input */}
      {showNewCardSection && method && (
        <div className="rounded-2xl border border-gray-200 px-4 py-4" style={{ background: "#fafafa" }}>
          {!cardReady && (
            <div className="flex items-center gap-2 py-2">
              <Icon icon={Loader2} size="sm" className="animate-spin text-gray-400" />
              <span className="text-[13px] text-gray-400">Loading card fields…</span>
            </div>
          )}
          <div style={{ display: cardReady ? "block" : "none" }}>
            <CardElement
              onReady={() => setCardReady(true)}
              options={{
                hidePostalCode: true,
                style: {
                  base: {
                    fontSize: "16px",
                    color: "#111827",
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    "::placeholder": { color: "#9ca3af" },
                  },
                  invalid: { color: "#ef4444" },
                  complete: { color: "#8c52ff" },
                },
              }}
            />
          </div>
        </div>
      )}

      {/* Save card confirmation note */}
      {showNewCardSection && saveCard && method && (
        <div className="flex items-center gap-2 px-1">
          <Icon icon={CreditCard} size="xs" style={{ color: "#8c52ff" }} />
          <span className="text-[12px]" style={{ color: "#8c52ff" }}>This card will be saved for future bookings</span>
        </div>
      )}

      {/* Error */}
      {payError && (
        <div className="rounded-xl bg-red-50 px-4 py-3">
          <p className="text-[13px] text-red-600">{payError}</p>
        </div>
      )}

      {/* Pay with saved card */}
      {selectedSavedId && (
        <button
          onClick={handleSavedCardPay}
          disabled={paying}
          className="w-full py-4 rounded-2xl text-white text-[15px] font-bold flex items-center justify-center gap-2 transition disabled:opacity-60"
          style={{ background: "#8c52ff" }}
        >
          {paying
            ? <><Icon icon={Loader2} size="sm" className="animate-spin text-white" /> Processing…</>
            : <><Icon icon={CheckCircle2} size="sm" className="text-white" /> Pay ${dollarAmount}</>
          }
        </button>
      )}

      {/* Pay with new card */}
      {showNewCardSection && method && cardReady && (
        <button
          onClick={handleCardPay}
          disabled={paying}
          className="w-full py-4 rounded-2xl text-white text-[15px] font-bold flex items-center justify-center gap-2 transition disabled:opacity-60"
          style={{ background: "#8c52ff" }}
        >
          {paying
            ? <><Icon icon={Loader2} size="sm" className="animate-spin text-white" /> Processing…</>
            : <><Icon icon={CheckCircle2} size="sm" className="text-white" /> Pay ${dollarAmount}</>
          }
        </button>
      )}

      {/* Secure badge */}
      <p className="text-center text-[11px] text-gray-400">
        🔒 Payments secured by Stripe
      </p>
    </div>
  );
}

const ACCENT = "#8c52ff";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface LocationBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentAddress?: string | null;
  recentAddresses?: string[];
  onAddressSaved?: (address: string) => void;
  navigateToBookingOnSelect?: boolean;
}

type Step = 0 | 1 | 2;

interface ArrivalWindow {
  id: string;
  label: string;
  subtitle: string;
  badge: string | null;
}

// ── Photon autocomplete ───────────────────────────────────────────────────────
interface PhotonFeature {
  properties: {
    name?: string; street?: string; housenumber?: string;
    city?: string; county?: string; state?: string;
    postcode?: string; country?: string;
  };
  geometry: { coordinates: [number, number] };
}
function formatPhoton(f: PhotonFeature): string {
  const p = f.properties;
  const streetNum = [p.housenumber, p.street || p.name].filter(Boolean).join(" ");
  const city = p.city || p.county || "";
  const stateZip = [p.state, p.postcode].filter(Boolean).join(" ");
  return [streetNum, city, stateZip].filter(Boolean).join(", ");
}
async function fetchSuggestions(query: string) {
  if (!query.trim() || query.length < 3) return [];
  const res = await fetch(
    `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lang=en&bbox=-125,24,-66,50`
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.features as PhotonFeature[]).map((f) => ({ label: formatPhoton(f) }));
}
async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
    { headers: { "Accept-Language": "en" } }
  );
  if (!res.ok) throw new Error("failed");
  const data = await res.json();
  const a = data.address || {};
  const house = a.house_number || "";
  const road = a.road || a.pedestrian || a.path || "";
  const city = a.city || a.town || a.village || a.county || "";
  const state = a.state || "";
  const zip = a.postcode || "";
  return [[house, road].filter(Boolean).join(" "), city, [state, zip].filter(Boolean).join(" ")]
    .filter(Boolean).join(", ");
}

// ── Service helpers ───────────────────────────────────────────────────────────
function iconForService(name: string): LucideIcon {
  const n = name.toLowerCase();
  if (n.includes("interior")) return Sparkles;
  if (n.includes("refresh") || n.includes("standard") || n.includes("maintenance")) return Wand2;
  if (n.includes("black label") || n.includes("signature") || n.includes("premium")) return Crown;
  return Droplets;
}

// ── Arrival windows ───────────────────────────────────────────────────────────
function getArrivalWindows(): ArrivalWindow[] {
  const now = new Date();
  const fmt = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const asapStart = new Date(now.getTime() + 35 * 60000);
  const asapEnd = new Date(now.getTime() + 50 * 60000);
  const nextStart = new Date(now.getTime() + 50 * 60000);
  const nextEnd = new Date(now.getTime() + 65 * 60000);
  const laterBase = new Date(now);
  laterBase.setHours(now.getHours() + 2, 0, 0, 0);
  const laterEnd = new Date(laterBase.getTime() + 60 * 60000);
  return [
    { id: "asap", label: "Book ASAP", subtitle: `Arrives ${fmt(asapStart)} – ${fmt(asapEnd)}`, badge: "Most popular" },
    { id: "next", label: "Next available", subtitle: `Arrives ${fmt(nextStart)} – ${fmt(nextEnd)}`, badge: null },
    { id: "later", label: "Later today", subtitle: `${fmt(laterBase)} – ${fmt(laterEnd)}`, badge: null },
  ];
}

// ── Step header ───────────────────────────────────────────────────────────────
function SheetHeader({ step, onBack, onClose }: { step: Step; onBack?: () => void; onClose: () => void }) {
  const titles: Record<Step, string> = {
    0: "Vehicle location",
    1: "Choose a service",
    2: "Confirm & pay",
  };
  return (
    <div className="flex items-center justify-between px-5 pt-2 pb-3 shrink-0">
      <div className="flex items-center gap-2">
        {step > 0 && onBack && (
          <button
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200 transition -ml-1 mr-1"
            aria-label="Back"
          >
            <Icon icon={ArrowLeft} size="xs" className="text-gray-600" />
          </button>
        )}
        <h2 className="text-[17px] font-bold text-gray-900">{titles[step]}</h2>
      </div>
      <button
        onClick={onClose}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200 transition"
        aria-label="Close"
      >
        <Icon icon={X} size="xs" className="text-gray-500" />
      </button>
    </div>
  );
}

// ── Step 0: Location ──────────────────────────────────────────────────────────
function LocationStep({
  currentAddress, recentAddresses, onSelect,
}: {
  currentAddress?: string | null;
  recentAddresses: string[];
  onSelect: (address: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<{ label: string }[]>([]);
  const [sugLoading, setSugLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery("");
    setSuggestions([]);
    setGpsError(null);
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || query.length < 3) { setSuggestions([]); return; }
    setSugLoading(true);
    debounceRef.current = setTimeout(async () => {
      const results = await fetchSuggestions(query);
      setSuggestions(results);
      setSugLoading(false);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const handleGPS = useCallback(() => {
    if (!navigator.geolocation) { setGpsError("Location not available."); return; }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const addr = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          onSelect(addr);
        } catch { setGpsError("Couldn't resolve your location."); }
        finally { setGpsLoading(false); }
      },
      (err) => {
        setGpsLoading(false);
        setGpsError(
          err.code === err.PERMISSION_DENIED
            ? "Location access denied. Enable it in Settings."
            : "Couldn't get your location. Try typing an address."
        );
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }, [onSelect]);

  const recentUnique = Array.from(new Set(recentAddresses))
    .filter((a) => a && a !== currentAddress)
    .slice(0, 3);

  const showSuggestions = suggestions.length > 0 || sugLoading;

  return (
    <div className="flex flex-col min-h-0">
      {/* Search input */}
      <div className="px-4 pb-3 shrink-0">
        <div className="flex items-center gap-3 bg-gray-100 rounded-2xl px-4 py-3.5">
          {sugLoading
            ? <Icon icon={Loader2} size="sm" className="text-gray-400 shrink-0 animate-spin" />
            : <Icon icon={Search} size="sm" className="text-gray-400 shrink-0" />}
          <input
            ref={inputRef}
            type="text" value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search address or location…"
            className="flex-1 bg-transparent text-[14px] text-gray-900 placeholder:text-gray-400 outline-none"
            autoComplete="off" autoCorrect="off" autoCapitalize="words" spellCheck={false}
          />
          {query.length > 0 && (
            <button onClick={() => { setQuery(""); setSuggestions([]); }} aria-label="Clear">
              <Icon icon={X} size="xs" className="text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable list */}
      <div className="overflow-y-auto flex-1">
        {/* GPS */}
        <button
          onClick={handleGPS} disabled={gpsLoading}
          className="w-full flex items-center gap-4 px-5 py-3.5 active:bg-gray-50 transition"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: "#eef2ff" }}>
            {gpsLoading
              ? <Icon icon={Loader2} size="sm" className="animate-spin" style={{ color: ACCENT }} />
              : <Icon icon={Navigation} size="sm" style={{ color: ACCENT }} />}
          </div>
          <div className="text-left">
            <p className="text-[14px] font-semibold text-gray-900">Use current location</p>
            {gpsError && <p className="text-[11px] text-red-500 mt-0.5">{gpsError}</p>}
          </div>
        </button>

        {/* Suggestions */}
        {showSuggestions && (
          <div className="px-4 pb-2">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-1 mb-1.5">Suggestions</p>
            {sugLoading && suggestions.length === 0
              ? [1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3 px-1 py-2 animate-pulse">
                    <div className="w-9 h-9 rounded-xl bg-gray-100 shrink-0" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-3 bg-gray-100 rounded w-3/4" />
                      <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                ))
              : suggestions.map((s, i) => {
                  const [main, ...rest] = s.label.split(", ");
                  return (
                    <button key={i} onClick={() => onSelect(s.label)}
                      className="w-full flex items-center gap-3 rounded-xl px-1 py-2.5 active:bg-gray-50 transition text-left"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                        <Icon icon={MapPin} size="sm" className="text-gray-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[14px] font-medium text-gray-900 truncate">{main}</p>
                        {rest.length > 0 && <p className="text-[12px] text-gray-400 truncate">{rest.join(", ")}</p>}
                      </div>
                    </button>
                  );
                })}
          </div>
        )}

        {/* Saved home */}
        {!showSuggestions && currentAddress && (
          <div className="px-4 pb-1">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-1 mb-1.5">Saved</p>
            <button onClick={() => onSelect(currentAddress)}
              className="w-full flex items-center gap-3 rounded-xl px-1 py-2.5 active:bg-gray-50 transition text-left"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: "#f3eeff" }}>
                <Icon icon={Home} size="sm" style={{ color: ACCENT }} />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-gray-900 truncate">Home</p>
                <p className="text-[12px] text-gray-400 truncate">{currentAddress}</p>
              </div>
            </button>
          </div>
        )}

        {/* Recent */}
        {!showSuggestions && recentUnique.length > 0 && (
          <div className="px-4 pb-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-1 mb-1.5">Recent</p>
            {recentUnique.map((addr, i) => {
              const [main, ...rest] = addr.split(", ");
              return (
                <button key={i} onClick={() => onSelect(addr)}
                  className="w-full flex items-center gap-3 rounded-xl px-1 py-2.5 active:bg-gray-50 transition text-left"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                    <Icon icon={Clock} size="sm" className="text-gray-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-gray-900 truncate">{main}</p>
                    {rest.length > 0 && <p className="text-[12px] text-gray-400 truncate">{rest.join(", ")}</p>}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div style={{ height: "env(safe-area-inset-bottom, 16px)" }} />
      </div>
    </div>
  );
}

// ── Step 1: Service picker ────────────────────────────────────────────────────
function ServiceStep({
  selectedId, onSelect, onContinue, selectedVehicleId, onVehicleSelect,
}: {
  selectedId: number | null;
  onSelect: (s: Service) => void;
  onContinue: () => void;
  selectedVehicleId: number | null;
  onVehicleSelect: (id: number | null) => void;
}) {
  const [, setLocation] = useLocation();
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const { data: services, isLoading } = useQuery<Service[]>({ queryKey: ["/api/services"] });
  const { data: vehicles } = useQuery<Vehicle[]>({ queryKey: ["/api/vehicles"] });

  const selectedVehicle = vehicles?.find(v => v.id === selectedVehicleId);
  const vehicleLabel = selectedVehicle
    ? `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`
    : "Select vehicle";

  const packages = services
    ?.filter((s) => s.category !== "premium")
    .slice()
    .sort((a, b) => a.price - b.price) ?? [];
  const signature = services?.find((s) => s.category === "premium");

  return (
    <div className="flex flex-col min-h-0">
      {/* Vehicle picker */}
      <div className="px-4 pt-3 pb-2 relative">
        <button
          onClick={() => setVehicleOpen(o => !o)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-gray-50 border border-transparent active:bg-gray-100 transition"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ede9fe]">
            <Icon icon={Car} size="sm" style={{ color: ACCENT }} />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide leading-none mb-0.5">Vehicle</p>
            <p className={`text-[14px] font-semibold truncate ${selectedVehicle ? "text-gray-900" : "text-gray-400"}`}>
              {vehicleLabel}
            </p>
          </div>
          <Icon icon={ChevronDown} size="sm" className={`text-gray-400 shrink-0 transition-transform ${vehicleOpen ? "rotate-180" : ""}`} />
        </button>

        {/* Dropdown */}
        {vehicleOpen && (
          <div className="absolute left-4 right-4 top-full z-10 mt-1 rounded-2xl bg-white shadow-lg border border-gray-100 overflow-hidden">
            {vehicles && vehicles.length > 0 ? (
              vehicles.map(v => (
                <button
                  key={v.id}
                  onClick={() => { onVehicleSelect(v.id); setVehicleOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition hover:bg-gray-50 ${v.id === selectedVehicleId ? "bg-[#f3eeff]" : ""}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-gray-900 truncate">
                      {v.year} {v.make} {v.model}
                    </p>
                    {v.color && <p className="text-[12px] text-gray-400">{v.color}</p>}
                  </div>
                  {v.id === selectedVehicleId && <Icon icon={Check} size="sm" style={{ color: ACCENT }} />}
                </button>
              ))
            ) : (
              <p className="px-4 py-3 text-[13px] text-gray-400">No vehicles saved yet</p>
            )}
            <div className="border-t border-gray-100">
              <button
                onClick={() => { setVehicleOpen(false); setLocation("/profile?tab=vehicles"); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition"
              >
                <Icon icon={Plus} size="sm" style={{ color: ACCENT }} />
                <p className="text-[14px] font-semibold" style={{ color: ACCENT }}>Add new vehicle</p>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-y-auto flex-1 pb-2">
        {isLoading ? (
          <div className="space-y-3 px-4 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 p-3 rounded-2xl animate-pulse bg-gray-50">
                <div className="w-11 h-11 rounded-full bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3.5 bg-gray-200 rounded w-1/2" />
                  <div className="h-2.5 bg-gray-200 rounded w-3/4" />
                </div>
                <div className="h-4 w-10 bg-gray-200 rounded self-center" />
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 pt-1 space-y-2.5">
            {packages.map((service) => {
              const IconComp = iconForService(service.name);
              const selected = selectedId === service.id;
              return (
                <button
                  key={service.id}
                  onClick={() => onSelect(service)}
                  className={`w-full flex items-center gap-3.5 rounded-2xl px-4 py-3.5 text-left transition border ${
                    selected
                      ? "bg-[#f3eeff] border-[#8c52ff]/30"
                      : "bg-gray-50 border-transparent active:bg-gray-100"
                  }`}
                >
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition"
                    style={selected ? { backgroundColor: ACCENT } : { backgroundColor: "#ede9fe" }}
                  >
                    <Icon icon={IconComp} size="sm" style={selected ? { color: "#fff" } : { color: ACCENT }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-gray-900">{service.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Icon icon={Clock} size="xs" className="text-gray-400 shrink-0" />
                      <p className="text-[12px] text-gray-400">{service.duration} min</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <p className="text-[15px] font-bold text-gray-900">${service.price}</p>
                    {selected && <Icon icon={Check} size="sm" style={{ color: ACCENT }} />}
                  </div>
                </button>
              );
            })}

            {/* Signature */}
            {signature && (
              <button
                onClick={() => onSelect(signature)}
                className={`w-full flex items-center gap-3.5 rounded-2xl px-4 py-3.5 text-left transition border ${
                  selectedId === signature.id
                    ? "bg-[#111] border-[#8c52ff]"
                    : "bg-[#111] border-transparent"
                }`}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10">
                  <Icon icon={Crown} size="sm" style={{ color: ACCENT }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-white">{signature.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Icon icon={Clock} size="xs" className="text-gray-500 shrink-0" />
                    <p className="text-[12px] text-gray-500">{signature.duration} min</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <p className="text-[15px] font-bold text-white">${signature.price}</p>
                  {selectedId === signature.id && <Icon icon={Check} size="sm" style={{ color: ACCENT }} />}
                </div>
              </button>
            )}
          </div>
        )}
        <div style={{ height: "env(safe-area-inset-bottom, 16px)" }} />
      </div>

      {/* Sticky continue button */}
      <div className="px-4 pt-3 pb-4 border-t border-gray-100 shrink-0">
        {selectedId !== null && selectedVehicleId === null && (
          <p className="text-center text-[12px] text-gray-400 mb-2">Select a vehicle to continue</p>
        )}
        <button
          onClick={onContinue}
          disabled={selectedId === null || selectedVehicleId === null}
          className={`w-full py-4 rounded-2xl text-[15px] font-bold flex items-center justify-center gap-2 transition ${
            selectedId !== null && selectedVehicleId !== null
              ? "bg-[#111] text-white active:bg-[#222]"
              : "bg-gray-100 text-gray-400"
          }`}
        >
          Continue
          <Icon icon={ChevronRight} size="sm" className={selectedId !== null && selectedVehicleId !== null ? "text-white" : "text-gray-400"} />
        </button>
      </div>
    </div>
  );
}

// ── Step 2: Confirm ───────────────────────────────────────────────────────────
function ConfirmStep({
  address, service, vehicleId, onBooked,
}: {
  address: string;
  service: Service;
  vehicleId: number | null;
  onBooked: () => void;
}) {
  const { getToken } = useClerkAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [arrivalId, setArrivalId] = useState("asap");
  const [useFreeCredit, setUseFreeCredit] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountPercent: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  // Never initialize as submitted — always start fresh so there's no stuck button
  const [submitted, setSubmitted] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [stripeBookingId, setStripeBookingId] = useState<number | null>(null);
  const [stripeAmountCents, setStripeAmountCents] = useState<number>(0);
  const [saveCard, setSaveCard] = useState(false);
  const windows = getArrivalWindows();

  const KNOWN_PROMOS: Record<string, number> = { DAPR99: 99, TEST99: 99 };

  function applyPromo() {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    if (KNOWN_PROMOS[code] !== undefined) {
      setAppliedPromo({ code, discountPercent: KNOWN_PROMOS[code] });
      setPromoError(null);
    } else {
      setPromoError("Invalid promo code");
      setAppliedPromo(null);
    }
  }

  const discountedPrice = appliedPromo
    ? Math.max(service.price * (1 - appliedPromo.discountPercent / 100), 0.50)
    : service.price;
  const [addrLine1, ...addrRest] = address.split(", ");

  const { data: referralInfo } = useQuery<{ credits: number }>({
    queryKey: ["/api/referral/my-code"],
    queryFn: async () => {
      const token = await getToken().catch(() => null);
      const res = await fetch(resolveUrl("/api/referral/my-code"), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) return { credits: 0 };
      return res.json();
    },
  });

  const { data: savedCardsData } = useQuery<{ methods: SavedCard[] }>({
    queryKey: ["/api/payment-methods"],
    queryFn: async () => {
      const token = await getToken().catch(() => null);
      const res = await fetch(resolveUrl("/api/payment-methods"), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) return { methods: [] };
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const availableCredits = referralInfo?.credits ?? 0;

  const mutation = useMutation({
    mutationFn: async () => {
      const token = await getToken().catch(() => null);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // 1. Get a time slot
      const today = new Date().toISOString().split("T")[0];
      const slotsRes = await fetch(resolveUrl(`/api/timeslots?date=${today}`), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      const slots: TimeSlot[] = await slotsRes.json();
      const available = slots.find(
        (s) => s.date === today && s.isAvailable && s.currentBookings < s.maxBookings
      );
      if (!available) throw new Error("No time slots available right now. Try again in a moment.");

      // 2. Create booking
      const bookingRes = await fetch(resolveUrl("/api/bookings"), {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          serviceId: service.id,
          serviceLocation: address,
          serviceLocationType: "address",
          priceTier: service.category,
          timeSlotId: available.id,
          ...(vehicleId ? { vehicleId } : {}),
          timestamp: new Date().toISOString(),
        }),
      });
      if (!bookingRes.ok) {
        const err = await bookingRes.json().catch(() => ({}));
        throw new Error(err.error || `Booking failed (${bookingRes.status})`);
      }
      const booking = await bookingRes.json();

      // 3. Create payment (or redeem free wash credit)
      const payRes = await fetch(resolveUrl(`/api/bookings/${booking.id}/create-payment`), {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify(
          useFreeCredit
            ? { useFreeWashCredit: true }
            : { ...(appliedPromo ? { promoCode: appliedPromo.code } : {}), saveCard }
        ),
      });
      if (!payRes.ok) throw new Error(`Payment setup failed (${payRes.status})`);
      const payData = await payRes.json() as { paymentUrl: string | null; clientSecret: string | null; free?: boolean; amountInCents?: number };

      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/referral/my-code"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });

      return { ...payData, bookingId: booking.id };
    },
    onSuccess: (payData) => {
      if (payData.free) {
        setLocation(`/matching?booking=${payData.bookingId}`);
        return;
      }

      if (!payData.clientSecret) throw new Error("Missing payment client secret.");

      // Show embedded Stripe checkout inside the app
      setStripeClientSecret(payData.clientSecret);
      setStripeBookingId(payData.bookingId);
      setStripeAmountCents(payData.amountInCents ?? Math.round(discountedPrice * 100));
    },
  });

  // ── Embedded Stripe Checkout overlay ────────────────────────────────────────
  if (stripeClientSecret && stripeBookingId) {
    return (
      <div className="flex flex-col min-h-0 h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <button
            onClick={() => { setStripeClientSecret(null); setStripeBookingId(null); setStripeAmountCents(0); }}
            className="flex items-center gap-1 text-[13px] text-gray-500"
          >
            <Icon icon={ArrowLeft} size="sm" /> Back
          </button>
          <p className="text-[15px] font-semibold text-gray-900">Enter payment details</p>
          <div className="w-12" />
        </div>
        <div className="overflow-y-auto flex-1 px-4 py-4">
          <Elements
            stripe={stripePromise}
            options={{ clientSecret: stripeClientSecret, appearance: { theme: "night", variables: { colorPrimary: "#8c52ff" } } }}
          >
            <StripePaymentForm
              amountCents={stripeAmountCents}
              clientSecret={stripeClientSecret}
              savedCards={savedCardsData?.methods ?? []}
              saveCard={saveCard}
              onSuccess={() => {
                const id = stripeBookingId;
                setStripeClientSecret(null);
                setStripeBookingId(null);
                setStripeAmountCents(0);
                queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
                setLocation(`/matching?booking=${id}`);
              }}
            />
          </Elements>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0">
      <div className="overflow-y-auto flex-1 px-4 pb-2 space-y-3 pt-1">

        {/* Location summary */}
        <div className="rounded-2xl bg-gray-50 px-4 py-3.5 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: "#f3eeff" }}>
            <Icon icon={MapPin} size="sm" style={{ color: ACCENT }} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Vehicle location</p>
            <p className="text-[14px] font-semibold text-gray-900 truncate">{addrLine1}</p>
            {addrRest.length > 0 && <p className="text-[12px] text-gray-400 truncate">{addrRest.join(", ")}</p>}
          </div>
        </div>

        {/* Service summary */}
        <div className="rounded-2xl bg-gray-50 px-4 py-3.5 flex items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: "#f3eeff" }}
          >
            <Icon icon={iconForService(service.name)} size="sm" style={{ color: ACCENT }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Service</p>
            <p className="text-[14px] font-semibold text-gray-900">{service.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Icon icon={Clock} size="xs" className="text-gray-400 shrink-0" />
              <p className="text-[12px] text-gray-400">{service.duration} min</p>
            </div>
          </div>
          <div className="flex flex-col items-end shrink-0">
            {appliedPromo && (
              <p className="text-[12px] text-gray-400 line-through">${service.price.toFixed(2)}</p>
            )}
            <p className="text-[17px] font-bold" style={{ color: appliedPromo ? ACCENT : "#111827" }}>
              ${discountedPrice.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Promo code */}
        {!useFreeCredit && (
          <div>
            {appliedPromo ? (
              <div className="flex items-center gap-2 rounded-2xl bg-[#f3eeff] px-4 py-3 border border-[#8c52ff]/20">
                <Icon icon={Tag} size="sm" style={{ color: ACCENT }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold" style={{ color: ACCENT }}>{appliedPromo.code} — {appliedPromo.discountPercent}% off applied</p>
                </div>
                <button
                  onClick={() => { setAppliedPromo(null); setPromoInput(""); }}
                  className="text-[12px] text-gray-400 underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(null); }}
                  onKeyDown={(e) => e.key === "Enter" && applyPromo()}
                  placeholder="Promo code"
                  className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#8c52ff]"
                />
                <button
                  onClick={applyPromo}
                  className="rounded-xl px-4 py-2.5 text-[14px] font-semibold text-white"
                  style={{ backgroundColor: ACCENT }}
                >
                  Apply
                </button>
              </div>
            )}
            {promoError && <p className="text-[12px] text-red-500 mt-1 px-1">{promoError}</p>}
          </div>
        )}

        {/* Arrival selection */}
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-1 mb-2">Arrival time</p>
          <div className="space-y-2">
            {windows.map((w) => {
              const selected = arrivalId === w.id;
              return (
                <button
                  key={w.id}
                  onClick={() => setArrivalId(w.id)}
                  className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition border ${
                    selected ? "bg-[#f3eeff] border-[#8c52ff]/30" : "bg-gray-50 border-transparent active:bg-gray-100"
                  }`}
                >
                  <div
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition"
                    style={selected ? { borderColor: ACCENT, backgroundColor: ACCENT } : { borderColor: "#d1d5db" }}
                  >
                    {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-gray-900">{w.label}</p>
                    <p className="text-[12px] text-gray-400">{w.subtitle}</p>
                  </div>
                  {w.badge && (
                    <span
                      className="shrink-0 text-[10px] font-bold rounded-full px-2 py-0.5 uppercase tracking-wide"
                      style={{ backgroundColor: "#f3eeff", color: ACCENT }}
                    >
                      {w.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Save card for future payments toggle */}
        {!useFreeCredit && (
          <button
            onClick={() => setSaveCard((v) => !v)}
            className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition border ${
              saveCard ? "bg-[#f3eeff] border-[#8c52ff]/30" : "bg-gray-50 border-transparent active:bg-gray-100"
            }`}
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ background: saveCard ? "#e9d8ff" : "#f3eeff" }}
            >
              <Icon icon={CreditCard} size="sm" style={{ color: ACCENT }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-gray-900">Save card for future payments</p>
              <p className="text-[12px] text-gray-400">Skip card entry on your next booking</p>
            </div>
            <div
              className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition"
              style={saveCard ? { borderColor: ACCENT, backgroundColor: ACCENT } : { borderColor: "#d1d5db" }}
            >
              {saveCard && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
          </button>
        )}

        {/* Free wash credit toggle */}
        {availableCredits > 0 && (
          <button
            onClick={() => setUseFreeCredit((v) => !v)}
            className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition border ${
              useFreeCredit ? "bg-[#f0fdf4] border-[#86efac]" : "bg-gray-50 border-transparent active:bg-gray-100"
            }`}
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ background: useFreeCredit ? "#dcfce7" : "#f3eeff" }}
            >
              <Icon icon={Gift} size="sm" style={{ color: useFreeCredit ? "#16a34a" : ACCENT }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-gray-900">Use 1 free wash credit</p>
              <p className="text-[12px] text-gray-400">You have {availableCredits} credit{availableCredits !== 1 ? "s" : ""} — this wash is on us</p>
            </div>
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition`}
              style={useFreeCredit ? { borderColor: "#16a34a", backgroundColor: "#16a34a" } : { borderColor: "#d1d5db" }}
            >
              {useFreeCredit && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
          </button>
        )}

        {/* Error */}
        {mutation.isError && (
          <div className="rounded-xl bg-red-50 px-4 py-3">
            <p className="text-[13px] text-red-600">{(mutation.error as Error)?.message || "Something went wrong."}</p>
          </div>
        )}

        <div style={{ height: "env(safe-area-inset-bottom, 16px)" }} />
      </div>

      {/* CTA */}
      <div className="px-4 pt-3 pb-4 border-t border-gray-100 shrink-0">
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-[13px] text-gray-500">Total</p>
          {useFreeCredit ? (
            <div className="flex items-center gap-2">
              <span className="text-[14px] text-gray-400 line-through">${service.price}</span>
              <span className="text-[17px] font-bold text-[#16a34a]">Free</span>
            </div>
          ) : appliedPromo ? (
            <div className="flex items-center gap-2">
              <span className="text-[14px] text-gray-400 line-through">${service.price.toFixed(2)}</span>
              <span className="text-[17px] font-bold" style={{ color: ACCENT }}>${discountedPrice.toFixed(2)}</span>
            </div>
          ) : (
            <p className="text-[17px] font-bold text-gray-900">${service.price.toFixed(2)}</p>
          )}
        </div>
        <button
          onClick={() => { if (!mutation.isPending) mutation.mutate(); }}
          disabled={mutation.isPending}
          className="w-full py-4 rounded-2xl text-white text-[15px] font-bold flex items-center justify-center gap-2 transition disabled:opacity-60"
          style={{ background: useFreeCredit ? "#16a34a" : "#8c52ff" }}
        >
          {mutation.isPending ? (
            <><Icon icon={Loader2} size="sm" className="text-white animate-spin" /> {useFreeCredit ? "Redeeming…" : "Setting up payment…"}</>
          ) : useFreeCredit ? (
            <><Icon icon={Gift} size="sm" className="text-white" /> Redeem Free Wash</>
          ) : (
            <><Icon icon={CheckCircle2} size="sm" className="text-white" /> Book &amp; Pay</>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Slide animation variants ──────────────────────────────────────────────────
const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0 }),
};

// ── Main sheet ────────────────────────────────────────────────────────────────
export function LocationBottomSheet({
  isOpen, onClose, currentAddress, recentAddresses = [], onAddressSaved, navigateToBookingOnSelect,
}: LocationBottomSheetProps) {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>(0);
  const [direction, setDirection] = useState(1);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const { getToken } = useClerkAuth();
  const queryClient = useQueryClient();

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep(0);
        setSelectedAddress(null);
        setSelectedService(null);
        setSelectedVehicleId(null);
        setDirection(1);
      }, 300);
    }
  }, [isOpen]);

  const goTo = useCallback((next: Step) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  }, [step]);

  // Save address to profile and move to service step (or navigate to booking)
  const handleAddressSelect = useCallback(async (address: string) => {
    setSelectedAddress(address);
    onAddressSaved?.(address);
    // Persist to profile silently
    try {
      const token = await getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      await fetch("/api/user/profile", {
        method: "PATCH", headers, credentials: "include",
        body: JSON.stringify({ address }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    } catch {}
    if (navigateToBookingOnSelect) {
      onClose();
      setLocation(`/booking?address=${encodeURIComponent(address)}`);
    } else {
      goTo(1);
    }
  }, [getToken, queryClient, goTo, onAddressSaved, navigateToBookingOnSelect, onClose, setLocation]);

  // Sheet height (taller for service/confirm steps)
  const sheetH = step === 0 ? "78vh" : "88vh";

  const sheetContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-[9998] bg-black/40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onPointerDown={onClose}
          />

          {/* Sheet — fixed height so flex-1 children have room to grow */}
          <motion.div
            key="sheet"
            className="fixed bottom-0 left-0 right-0 z-[9999] bg-white rounded-t-3xl overflow-hidden"
            style={{ height: sheetH, display: "flex", flexDirection: "column" }}
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {/* Handle */}
            <div style={{ flexShrink: 0, display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 4 }}>
              <div style={{ width: 40, height: 4, borderRadius: 9999, backgroundColor: "#e5e7eb" }} />
            </div>

            {/* Progress dots */}
            <div style={{ flexShrink: 0, display: "flex", justifyContent: "center", gap: 6, paddingBottom: 4 }}>
              {([0, 1, 2] as Step[]).map((s) => (
                <div
                  key={s}
                  style={{
                    width: step === s ? 20 : 6, height: 6, borderRadius: 9999,
                    backgroundColor: step === s ? ACCENT : "#e5e7eb",
                    transition: "width 0.3s, background-color 0.3s",
                  }}
                />
              ))}
            </div>

            {/* Header */}
            <SheetHeader
              step={step}
              onBack={() => goTo((step - 1) as Step)}
              onClose={onClose}
            />

            {/* Carousel: all 3 steps side by side, translate to show current */}
            <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
              <div
                style={{
                  display: "flex",
                  width: "300%",
                  height: "100%",
                  transform: `translateX(${-step * (100 / 3)}%)`,
                  transition: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                {/* Step 0 */}
                <div style={{ width: "33.333%", height: "100%", flexShrink: 0, display: "flex", flexDirection: "column" }}>
                  <LocationStep
                    currentAddress={currentAddress}
                    recentAddresses={recentAddresses}
                    onSelect={handleAddressSelect}
                  />
                </div>

                {/* Step 1 */}
                <div style={{ width: "33.333%", height: "100%", flexShrink: 0, display: "flex", flexDirection: "column" }}>
                  <ServiceStep
                    selectedId={selectedService?.id ?? null}
                    onSelect={setSelectedService}
                    onContinue={() => { if (selectedService) goTo(2); }}
                    selectedVehicleId={selectedVehicleId}
                    onVehicleSelect={setSelectedVehicleId}
                  />
                </div>

                {/* Step 2 */}
                <div style={{ width: "33.333%", height: "100%", flexShrink: 0, display: "flex", flexDirection: "column" }}>
                  {selectedAddress && selectedService ? (
                    <ConfirmStep
                      address={selectedAddress}
                      service={selectedService}
                      vehicleId={selectedVehicleId}
                      onBooked={onClose}
                    />
                  ) : (
                    <div />
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(sheetContent, document.body);
}
