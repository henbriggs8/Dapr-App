import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { Booking } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";

const ACCENT = "#8c52ff";

// Statuses that mean a provider has accepted and we should go to tracking
const TRACKING_STATUSES = new Set(["assigned", "in_progress"]);

function PulsingRing() {
  return (
    <div className="relative flex items-center justify-center w-44 h-44">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border-2"
          style={{ borderColor: ACCENT }}
          initial={{ opacity: 0.6, scale: 0.5 }}
          animate={{ opacity: 0, scale: 1.8 }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            delay: i * 0.7,
            ease: "easeOut",
          }}
        />
      ))}
      <div
        className="relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
        style={{ backgroundColor: ACCENT }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
          <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3" />
          <rect x="9" y="11" width="14" height="10" rx="2" />
          <circle cx="12" cy="16" r="1" fill="white" stroke="none" />
          <circle cx="20" cy="16" r="1" fill="white" stroke="none" />
        </svg>
      </div>
    </div>
  );
}

type Step = { label: string; done: boolean; active: boolean };

function StepRow({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
          step.done
            ? "bg-green-500"
            : step.active
            ? "border-2"
            : "border-2 border-gray-200"
        }`}
        style={step.active && !step.done ? { borderColor: ACCENT } : {}}
      >
        {step.done ? (
          <Icon icon={Check} size="xs" className="text-white" />
        ) : step.active ? (
          <motion.div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: ACCENT }}
            animate={{ scale: [1, 1.4, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        ) : null}
      </div>
      <span
        className={`text-sm font-medium transition-colors duration-500 ${
          step.done ? "text-green-600" : step.active ? "text-gray-900" : "text-gray-400"
        }`}
      >
        {step.label}
      </span>
    </div>
  );
}

export default function MatchingScreen() {
  const [, navigate] = useLocation();

  const bookingId = (() => {
    try {
      const id = new URLSearchParams(window.location.search).get("booking");
      return id ? Number(id) : null;
    } catch {
      return null;
    }
  })();

  const [elapsed, setElapsed] = useState(0);
  const [pollingActive, setPollingActive] = useState(true);

  // Tick a seconds counter for elapsed display
  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Poll the booking every 3 s until a provider is assigned
  const { data: booking } = useQuery<Booking>({
    queryKey: [`/api/bookings/${bookingId}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!bookingId && pollingActive,
    refetchInterval: pollingActive ? 3000 : false,
    staleTime: 0,
  });

  // Navigate to tracking once a provider has accepted
  useEffect(() => {
    if (!booking) return;
    const status = booking.status as string;
    if (TRACKING_STATUSES.has(status) || (booking.providerId && status !== "cancelled")) {
      setPollingActive(false);
      navigate(`/tracking?booking=${booking.id}`);
    }
  }, [booking, navigate]);

  // Stop polling if bookingId is missing
  useEffect(() => {
    if (!bookingId) setPollingActive(false);
  }, [bookingId]);

  const providerAssigned = booking
    ? TRACKING_STATUSES.has(booking.status as string) || !!booking.providerId
    : false;
  const paymentConfirmed = booking ? booking.isPaid : true; // optimistic — we only land here after payment

  const steps: Step[] = [
    { label: "Payment received", done: true, active: false },
    {
      label: "Finding a Detail Pro near you",
      done: providerAssigned,
      active: !providerAssigned,
    },
    {
      label: "Booking confirmed with your Pro",
      done: providerAssigned,
      active: providerAssigned,
    },
  ];

  const waitMinutes = Math.ceil(elapsed / 60);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 pb-12 pt-8 relative">
      {/* Back / close */}
      <button
        className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 transition-colors"
        onClick={() => navigate("/")}
        aria-label="Close"
      >
        <Icon icon={X} size="sm" className="text-gray-400" />
      </button>

      {/* Animation */}
      <PulsingRing />

      {/* Headline */}
      <div className="mt-8 text-center">
        <AnimatePresence mode="wait">
          {!providerAssigned ? (
            <motion.div
              key="searching"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
            >
              <p className="text-xs font-semibold tracking-widest text-green-500 uppercase mb-2">
                Payment confirmed ✓
              </p>
              <h1 className="text-2xl font-bold text-gray-900 leading-snug">
                Finding a Detail Pro
                <br />
                <span style={{ color: ACCENT }}>near you…</span>
              </h1>
            </motion.div>
          ) : (
            <motion.div
              key="found"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <p className="text-xs font-semibold tracking-widest text-green-500 uppercase mb-2">
                Pro found!
              </p>
              <h1 className="text-2xl font-bold text-gray-900">
                Taking you to
                <br />
                <span style={{ color: ACCENT }}>live tracking…</span>
              </h1>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Steps */}
      <div className="mt-10 w-full max-w-xs flex flex-col gap-4">
        {steps.map((s) => (
          <StepRow key={s.label} step={s} />
        ))}
      </div>

      {/* Elapsed / wait hint */}
      {!providerAssigned && (
        <motion.p
          className="mt-8 text-xs text-gray-400 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
        >
          {elapsed < 30
            ? "Connecting with nearby pros…"
            : `Matching in progress · ${waitMinutes} min elapsed`}
        </motion.p>
      )}

      {/* Reassurance copy */}
      {!providerAssigned && elapsed > 15 && (
        <motion.p
          className="mt-3 text-xs text-center text-gray-400 max-w-xs leading-relaxed"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Our Detail Pros are on their way. We'll take you straight to
          live tracking the moment one accepts.
        </motion.p>
      )}

      {/* Long wait reassurance (> 3 min) */}
      {!providerAssigned && elapsed > 180 && (
        <motion.div
          className="mt-6 bg-purple-50 rounded-2xl p-4 max-w-xs text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <p className="text-xs font-semibold text-purple-700 mb-1">Still looking…</p>
          <p className="text-xs text-purple-600 leading-relaxed">
            Demand is high right now. We're still searching — you'll be
            the first to know when a Pro accepts.
          </p>
        </motion.div>
      )}
    </div>
  );
}
