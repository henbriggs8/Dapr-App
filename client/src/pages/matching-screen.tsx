import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Shield, Zap, X } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { Booking } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";

const ACCENT = "#8c52ff";

const STATUS_MESSAGES = [
  "Finding nearby Detail Pros…",
  "Checking availability in your area…",
  "Connecting you with the best match…",
  "Looking for the fastest arrival…",
  "Matching you with a top-rated Pro…",
  "Optimizing arrival time…",
  "Searching your area…",
  "Finding someone close to you…",
  "Preparing your service…",
  "Locking in your arrival window…",
  "Confirming equipment availability…",
  "Building the best route…",
  "Finalizing your Detail Pro…",
];

const ETA_RANGES = ["8–12 min", "10–14 min", "7–11 min", "9–13 min", "11–15 min"];

const TRACKING_STATUSES = new Set(["assigned", "in_progress"]);

export default function MatchingScreen() {
  const [, navigate] = useLocation();
  const [msgIndex, setMsgIndex] = useState(0);
  const [etaIndex, setEtaIndex] = useState(0);
  const [pollingActive, setPollingActive] = useState(true);
  const [assigned, setAssigned] = useState(false);
  const assignedRef = useRef(false);
  const proCount = useRef(Math.floor(Math.random() * 4) + 3).current;

  const bookingId = (() => {
    try {
      const id = new URLSearchParams(window.location.search).get("booking");
      return id ? Number(id) : null;
    } catch {
      return null;
    }
  })();

  // Rotate status messages every 3.5 s
  useEffect(() => {
    const t = setInterval(() => setMsgIndex((i) => (i + 1) % STATUS_MESSAGES.length), 3500);
    return () => clearInterval(t);
  }, []);

  // Drift ETA every 8 s
  useEffect(() => {
    const t = setInterval(() => setEtaIndex((i) => (i + 1) % ETA_RANGES.length), 8000);
    return () => clearInterval(t);
  }, []);

  const { data: booking } = useQuery<Booking>({
    queryKey: [`/api/bookings/${bookingId}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!bookingId && pollingActive,
    refetchInterval: pollingActive ? 3000 : false,
    staleTime: 0,
  });

  useEffect(() => {
    if (!booking || assignedRef.current) return;
    const status = booking.status as string;
    if (TRACKING_STATUSES.has(status) || (booking.providerId && status !== "cancelled")) {
      assignedRef.current = true;
      setPollingActive(false);
      setAssigned(true);
      setTimeout(() => navigate(`/tracking?booking=${booking.id}`), 1800);
    }
  }, [booking, navigate]);

  useEffect(() => {
    if (!bookingId) setPollingActive(false);
  }, [bookingId]);

  return (
    <div className="min-h-screen bg-[#080810] flex flex-col items-center justify-between overflow-hidden relative select-none">

      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[140px]"
          style={{ width: 500, height: 500, background: "radial-gradient(circle, rgba(140,82,255,0.15) 0%, transparent 70%)" }}
        />
      </div>

      {/* Top bar */}
      <div className="w-full px-6 pt-14 pb-0 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <motion.div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: ACCENT }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
          <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>
            Live Search
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white/5 rounded-full px-3 py-1.5">
            <Icon icon={Shield} size="xs" className="text-gray-400" />
            <span className="text-[11px] text-gray-400">Verified Pros Only</span>
          </div>
          <button
            onClick={() => navigate("/")}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"
          >
            <Icon icon={X} size="sm" className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Radar animation */}
      <div className="flex-1 flex items-center justify-center relative z-10">
        <div className="relative flex items-center justify-center">

          {/* Expanding pulse rings */}
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{ border: `1px solid rgba(140,82,255,0.25)` }}
              initial={{ width: 90, height: 90, opacity: 0.7 }}
              animate={{ width: 90 + (i + 1) * 95, height: 90 + (i + 1) * 95, opacity: 0 }}
              transition={{ duration: 3.2, repeat: Infinity, delay: i * 0.8, ease: "easeOut" }}
            />
          ))}

          {/* Static grid rings */}
          {[170, 270, 370].map((size) => (
            <div
              key={size}
              className="absolute rounded-full"
              style={{ width: size, height: size, border: "1px solid rgba(255,255,255,0.04)" }}
            />
          ))}

          {/* Pro dots on radar */}
          {Array.from({ length: proCount }).map((_, i) => {
            const angle = (i / proCount) * Math.PI * 2 - Math.PI / 3;
            const r = i % 2 === 0 ? 130 : 178;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            return (
              <motion.div
                key={i}
                className="absolute flex items-center justify-center rounded-full"
                style={{
                  width: 32, height: 32,
                  left: "50%", top: "50%",
                  marginLeft: x - 16, marginTop: y - 16,
                  background: "rgba(140,82,255,0.12)",
                  border: "1px solid rgba(140,82,255,0.35)",
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4 + i * 0.18, type: "spring", stiffness: 200 }}
              >
                <motion.div
                  className="rounded-full"
                  style={{ width: 8, height: 8, backgroundColor: ACCENT }}
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.35 }}
                />
              </motion.div>
            );
          })}

          {/* Center icon */}
          <motion.div
            className="relative z-10 rounded-full flex items-center justify-center shadow-2xl"
            style={{
              width: 88, height: 88,
              background: `linear-gradient(135deg, ${ACCENT}, #6a3adb)`,
              boxShadow: `0 0 60px rgba(140,82,255,0.45)`,
            }}
            animate={{ scale: [1, 1.045, 1] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v5" />
              <circle cx="16" cy="17" r="2" />
              <circle cx="7" cy="17" r="2" />
              <path d="M3 9h4M3 7h9l2 5" />
            </svg>
          </motion.div>
        </div>
      </div>

      {/* Bottom info section */}
      <div className="w-full px-6 pb-16 space-y-5 relative z-10">

        {/* Status message */}
        <div className="text-center min-h-[52px] flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={assigned ? "assigned" : msgIndex}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4 }}
              className="text-[18px] font-semibold text-white leading-snug text-center"
            >
              {assigned ? "Detail Pro matched!" : STATUS_MESSAGES[msgIndex]}
            </motion.p>
          </AnimatePresence>
          {!assigned && (
            <motion.p
              className="text-[12px] text-gray-500 mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
            >
              We'll jump straight to live tracking the moment they accept
            </motion.p>
          )}
        </div>

        {/* Stats pills */}
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-1.5 bg-white/6 border border-white/8 rounded-full px-4 py-2">
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-green-400"
              animate={{ opacity: [1, 0.25, 1] }}
              transition={{ duration: 1.3, repeat: Infinity }}
            />
            <span className="text-[13px] text-gray-300 font-medium">{proCount} Pros nearby</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/6 border border-white/8 rounded-full px-4 py-2">
            <Icon icon={Zap} size="xs" className="text-yellow-400" />
            <AnimatePresence mode="wait">
              <motion.span
                key={etaIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="text-[13px] text-gray-300 font-medium"
              >
                {ETA_RANGES[etaIndex]}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>

        {/* Trust row */}
        <div className="flex items-center justify-center gap-5">
          <div className="flex items-center gap-1.5">
            <Icon icon={Star} size="xs" className="text-yellow-400" />
            <span className="text-[11px] text-gray-500">4.9 avg rating</span>
          </div>
          <div className="w-px h-3 bg-white/10" />
          <div className="flex items-center gap-1.5">
            <Icon icon={Shield} size="xs" className="text-green-400" />
            <span className="text-[11px] text-gray-500">Insured & vetted</span>
          </div>
          <div className="w-px h-3 bg-white/10" />
          <span className="text-[11px] text-gray-500">Free cancellation</span>
        </div>

        {/* Assigned toast */}
        <AnimatePresence>
          {assigned && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="rounded-2xl overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${ACCENT}, #6a3adb)`, boxShadow: `0 8px 40px rgba(140,82,255,0.5)` }}
            >
              <div className="px-5 py-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Icon icon={Star} size="sm" className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Detail Pro matched!</p>
                  <p className="text-xs text-white/70">Opening live tracking…</p>
                </div>
                <motion.div
                  className="ml-auto w-5 h-5 rounded-full border-2 border-white/30"
                  style={{ borderTopColor: "white" }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
