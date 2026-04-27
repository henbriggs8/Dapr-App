import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Star, ChevronLeft, CheckCircle2, Loader2 } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Booking, Service } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@clerk/clerk-react";

const ACCENT = "#8c52ff";
const ACCENT_BG = "#f3eeff";

const TIP_PRESETS = [
  { label: "15%", pct: 0.15 },
  { label: "20%", pct: 0.20 },
  { label: "25%", pct: 0.25 },
];

export default function PostServiceReview() {
  const [, params] = useRoute("/review/:bookingId");
  const [, setLocation] = useLocation();
  const { getToken } = useAuth();

  const bookingId = parseInt(params?.bookingId ?? "0");
  const urlParams = new URLSearchParams(window.location.search);
  const tipPaid = urlParams.get("tip_paid") === "1";

  const [stars, setStars] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [tipChoice, setTipChoice] = useState<"none" | "custom" | number>("none");
  const [customTip, setCustomTip] = useState("");
  const [done, setDone] = useState(false);
  const [tipConfirmed, setTipConfirmed] = useState(false);
  const [confirmingTip, setConfirmingTip] = useState(tipPaid);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When Square redirects back with tip_paid=1, ask the server to verify the order
  // via Square and persist the tip. Success state is gated on a 200 response.
  useEffect(() => {
    if (tipPaid && bookingId > 0) {
      setConfirmingTip(true);
      getToken().then((token) => {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        fetch(`/api/bookings/${bookingId}/tip/confirm`, {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify({}),
        })
          .then((res) => {
            setConfirmingTip(false);
            if (res.ok) {
              setTipConfirmed(true);
              setDone(true);
            } else {
              setError("We couldn't confirm your tip yet — Square may still be processing. Please try again shortly.");
            }
          })
          .catch((err) => {
            console.error("Tip confirm error:", err);
            setConfirmingTip(false);
            setError("Network error confirming tip. Please try again.");
          });
      });
    }
  }, [tipPaid, bookingId]);

  const { data: booking } = useQuery<Booking>({
    queryKey: [`/api/bookings/${bookingId}`],
    queryFn: async () => {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/bookings/${bookingId}`, { headers, credentials: "include" });
      if (!res.ok) throw new Error("Failed to load booking");
      return res.json();
    },
    enabled: bookingId > 0,
  });

  const { data: services } = useQuery<Service[]>({ queryKey: ["/api/services"] });
  const service = services?.find((s) => s.id === booking?.serviceId);

  const basePrice = booking?.totalPrice ?? booking?.amount ?? service?.price ?? 0;

  function getTipCents(): number {
    if (tipChoice === "none") return 0;
    if (tipChoice === "custom") {
      const val = parseFloat(customTip);
      return isNaN(val) || val <= 0 ? 0 : Math.round(val * 100);
    }
    return Math.round(basePrice * (tipChoice as number));
  }

  const tipCents = getTipCents();
  const tipDollars = (tipCents / 100).toFixed(2);

  async function handleSubmit() {
    if (stars === 0) {
      setError("Please select a star rating before submitting.");
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      const token = await getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // Save rating
      const ratingRes = await fetch(`/api/bookings/${bookingId}/rating`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ rating: stars, comment: comment.trim() || undefined }),
      });
      if (!ratingRes.ok) throw new Error("Failed to save rating");

      // If tip selected, create Square checkout and redirect
      if (tipCents > 0) {
        const tipRes = await fetch(`/api/bookings/${bookingId}/tip`, {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify({ tipAmountCents: tipCents }),
        });
        if (!tipRes.ok) throw new Error("Failed to create tip checkout");
        const { url } = await tipRes.json();
        window.location.href = url;
        return;
      }

      setDone(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmingTip) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <Icon icon={Loader2} size="xl" style={{ color: ACCENT }} className="animate-spin mb-4" />
        <p className="text-[15px] text-[#888]">Confirming your tip with Square…</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full mb-6"
          style={{ background: ACCENT_BG }}
        >
          <Icon icon={CheckCircle2} size="xl" style={{ color: ACCENT }} />
        </div>
        <h1 className="text-[24px] font-bold text-[#111] mb-2">Thank you!</h1>
        <p className="text-[15px] text-[#888] leading-relaxed max-w-xs">
          {tipConfirmed
            ? "Your tip has been processed and your rating has been saved."
            : "Your feedback helps us keep our providers accountable and our service excellent."}
        </p>
        <button
          onClick={() => setLocation("/")}
          className="mt-8 px-8 py-3 rounded-full text-[14px] font-bold text-white"
          style={{ background: ACCENT }}
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-white"
      style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
    >
      {/* Header */}
      <div className="flex items-center px-4 pt-12 pb-4">
        <button
          onClick={() => setLocation("/activity")}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5f5f5] active:bg-[#ebebeb] transition mr-3"
        >
          <Icon icon={ChevronLeft} size="sm" className="text-[#333]" />
        </button>
        <h1 className="text-[18px] font-bold text-[#111] tracking-tight">Rate your service</h1>
      </div>

      <div className="px-4 space-y-6">
        {/* Service summary */}
        {service && (
          <div className="rounded-2xl border border-[#efefef] bg-[#fafafa] px-4 py-3.5 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#111]">{service.name}</p>
              <p className="text-[12px] text-[#999] mt-0.5">Booking #{bookingId}</p>
            </div>
            {basePrice > 0 && (
              <p className="text-[14px] font-bold text-[#111] shrink-0">
                ${(basePrice / 100).toFixed(2)}
              </p>
            )}
          </div>
        )}

        {/* Star rating */}
        <div>
          <p className="text-[13px] font-semibold text-[#111] mb-3">How was your experience?</p>
          <div className="flex items-center gap-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onMouseEnter={() => setHovered(n)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setStars(n)}
                className="transition active:scale-90"
                aria-label={`${n} star${n !== 1 ? "s" : ""}`}
              >
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill={n <= (hovered || stars) ? ACCENT : "none"}
                  stroke={n <= (hovered || stars) ? ACCENT : "#d1d1d6"}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </button>
            ))}
          </div>
          {stars > 0 && (
            <p className="mt-2 text-[12px]" style={{ color: ACCENT }}>
              {["", "Poor", "Fair", "Good", "Great", "Excellent"][stars]}
            </p>
          )}
        </div>

        {/* Comment */}
        <div>
          <p className="text-[13px] font-semibold text-[#111] mb-2">Leave a note (optional)</p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us what you loved or what we could improve…"
            rows={3}
            className="w-full rounded-2xl border border-[#efefef] bg-[#fafafa] px-4 py-3 text-[14px] text-[#111] placeholder:text-[#bbb] resize-none focus:outline-none focus:border-[#c8b4ff] transition"
          />
        </div>

        {/* Tip section */}
        <div>
          <p className="text-[13px] font-semibold text-[#111] mb-1">Leave a tip</p>
          <p className="text-[12px] text-[#999] mb-3">100% goes directly to your provider.</p>

          <div className="flex gap-2 flex-wrap">
            {/* No tip */}
            <button
              onClick={() => setTipChoice("none")}
              className={`px-4 py-2.5 rounded-full text-[13px] font-semibold border transition ${
                tipChoice === "none"
                  ? "border-[#8c52ff] text-white"
                  : "border-[#e2e2e2] text-[#555] bg-white"
              }`}
              style={tipChoice === "none" ? { background: ACCENT, borderColor: ACCENT } : {}}
            >
              No tip
            </button>

            {TIP_PRESETS.map(({ label, pct }) => {
              const active = tipChoice === pct;
              const amt = basePrice > 0 ? `$${(basePrice * pct / 100).toFixed(2)}` : "";
              return (
                <button
                  key={label}
                  onClick={() => setTipChoice(pct)}
                  className={`px-4 py-2.5 rounded-full text-[13px] font-semibold border transition ${
                    active
                      ? "border-[#8c52ff] text-white"
                      : "border-[#e2e2e2] text-[#555] bg-white"
                  }`}
                  style={active ? { background: ACCENT, borderColor: ACCENT } : {}}
                >
                  {label}{amt ? ` · ${amt}` : ""}
                </button>
              );
            })}

            {/* Custom */}
            <button
              onClick={() => setTipChoice("custom")}
              className={`px-4 py-2.5 rounded-full text-[13px] font-semibold border transition ${
                tipChoice === "custom"
                  ? "border-[#8c52ff] text-white"
                  : "border-[#e2e2e2] text-[#555] bg-white"
              }`}
              style={tipChoice === "custom" ? { background: ACCENT, borderColor: ACCENT } : {}}
            >
              Custom
            </button>
          </div>

          {tipChoice === "custom" && (
            <div className="mt-3 flex items-center gap-2 rounded-2xl border border-[#efefef] bg-[#fafafa] px-4 py-3">
              <span className="text-[15px] font-semibold text-[#555]">$</span>
              <input
                type="number"
                inputMode="decimal"
                min="1"
                step="0.01"
                value={customTip}
                onChange={(e) => setCustomTip(e.target.value)}
                placeholder="0.00"
                className="flex-1 bg-transparent text-[15px] text-[#111] focus:outline-none"
              />
            </div>
          )}

          {tipCents > 0 && (
            <p className="mt-2 text-[12px] font-semibold" style={{ color: ACCENT }}>
              Tip: ${tipDollars}
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="text-[13px] text-red-500 font-medium">{error}</p>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-[15px] font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
          style={{ background: ACCENT }}
        >
          {submitting ? (
            <Icon icon={Loader2} size="sm" className="animate-spin text-white" />
          ) : tipCents > 0 ? (
            `Submit & Pay $${tipDollars} tip →`
          ) : (
            "Submit review"
          )}
        </button>
      </div>
    </div>
  );
}
