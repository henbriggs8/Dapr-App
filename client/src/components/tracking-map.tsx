import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Clock, Navigation, Car, Phone, Star, CheckCircle, ChevronDown, Droplets, Sparkles, Wind, Package, Paintbrush, Eye, Award } from "lucide-react";
import { Booking } from "@shared/schema";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const ACCENT = "#8c52ff";

interface TrackingMapProps {
  bookingId: number;
  onClose?: () => void;
}

interface TrackingInfo {
  providerLocation: { lat: number; lng: number } | null;
  customerLocation: { lat: number; lng: number } | null;
  eta: string | null;
  distance: number | null;
  lastUpdate: string | null;
}

interface ArrivalStatus {
  arrived: boolean;
  arrivalTime: string | null;
  estimatedCompletionTime: string | null;
  extraTimeMinutes: number;
  adjustmentDetails: Array<{ label: string; minutes: number }>;
  providerNotes?: string;
}

const SERVICE_STAGES = [
  { key: "arrived",           label: "Arrived",                    icon: MapPin,      color: "#10b981" },
  { key: "setting_up",        label: "Setting Up Equipment",       icon: Package,     color: ACCENT },
  { key: "exterior_washing",  label: "Exterior Wash In Progress",  icon: Droplets,    color: "#3b82f6" },
  { key: "interior_cleaning", label: "Interior Detail In Progress",icon: Sparkles,    color: ACCENT },
  { key: "finishing",         label: "Final Touches",              icon: Paintbrush,  color: "#f59e0b" },
  { key: "quality_check",     label: "Quality Check",              icon: Eye,         color: "#06b6d4" },
  { key: "completed",         label: "Service Complete",           icon: Award,       color: "#10b981" },
];

function formatETA(eta: string | null): string | null {
  if (!eta) return null;
  const diff = Math.round((new Date(eta).getTime() - Date.now()) / 60000);
  if (diff <= 0) return "Arriving now";
  if (diff < 60) return `${diff} min`;
  return `${Math.floor(diff / 60)}h ${diff % 60}m`;
}

function formatDistance(d: number | null): string | null {
  if (!d) return null;
  return d < 1 ? `${(d * 5280).toFixed(0)} ft` : `${d.toFixed(1)} mi`;
}

function formatTime(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Phase 1 — provider en route
function EnRouteView({
  current,
  lastPing,
  wsConnected,
  providerName,
  providerRating,
  onContactPress,
}: {
  current: TrackingInfo | null;
  lastPing: Date | null;
  wsConnected: boolean;
  providerName: string;
  providerRating: number;
  onContactPress: () => void;
}) {
  const eta = formatETA(current?.eta || null);
  const dist = formatDistance(current?.distance || null);
  const secAgo = lastPing ? Math.round((Date.now() - lastPing.getTime()) / 1000) : null;

  return (
    <div className="flex flex-col min-h-screen bg-[#080810]">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]"
          style={{ width: 400, height: 400, background: "radial-gradient(circle, rgba(140,82,255,0.12) 0%, transparent 70%)" }}
        />
      </div>

      {/* Status bar */}
      <div className="relative z-10 px-5 pt-14 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: wsConnected ? "#10b981" : "#6b7280" }}
            animate={{ opacity: wsConnected ? [1, 0.3, 1] : 1 }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
            {wsConnected ? "Live tracking" : "Connecting…"}
          </span>
          {secAgo !== null && secAgo < 60 && (
            <span className="text-[10px] text-gray-600">· {secAgo}s ago</span>
          )}
        </div>
        <div className="text-[11px] text-gray-600 font-mono">
          #{String(lastPing ? "active" : "waiting")}
        </div>
      </div>

      {/* Big ETA hero */}
      <div className="relative z-10 px-5 pt-4 pb-6">
        <p className="text-[12px] font-semibold uppercase tracking-widest text-gray-500 mb-1">Estimated Arrival</p>
        <div className="flex items-end gap-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={eta || "calc"}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
            >
              <span className="text-[56px] font-black text-white leading-none tracking-tight">
                {eta || "—"}
              </span>
            </motion.div>
          </AnimatePresence>
          {dist && (
            <div className="mb-3">
              <p className="text-[13px] text-gray-400 font-medium">{dist} away</p>
            </div>
          )}
        </div>

        {/* Animated car track */}
        <div className="mt-4 relative h-1.5 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className="absolute top-0 left-0 h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${ACCENT}, #6a3adb)` }}
            animate={{ width: ["20%", "60%", "40%", "75%"] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg flex items-center justify-center"
            style={{ boxShadow: `0 0 12px ${ACCENT}` }}
            animate={{ left: ["18%", "58%", "38%", "73%"] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          >
            <Icon icon={Car} size="xs" className="text-gray-900" />
          </motion.div>
        </div>
      </div>

      {/* Provider card */}
      <div className="relative z-10 mx-5 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="px-4 py-4 flex items-center gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${ACCENT}, #6a3adb)` }}
            >
              {providerName.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 border-2 border-[#080810]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-white truncate">{providerName}</p>
            <div className="flex items-center gap-1 mt-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg key={i} width="10" height="10" viewBox="0 0 10 10" fill={i < Math.floor(providerRating) ? "#facc15" : "rgba(255,255,255,0.15)"}>
                  <path d="M5 0.5l1.1 2.3 2.5.4-1.8 1.7.4 2.6L5 6.4 2.8 7.5l.4-2.6L1.4 3.2l2.5-.4z" />
                </svg>
              ))}
              <span className="text-[11px] text-gray-400 ml-1">{providerRating.toFixed(1)}</span>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">Detail Pro · En route to you</p>
          </div>
          <button
            onClick={onContactPress}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(140,82,255,0.15)", border: "1px solid rgba(140,82,255,0.3)" }}
          >
            <Icon icon={Phone} size="sm" className="text-purple-300" />
          </button>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/5" />

        {/* Stats strip */}
        <div className="px-4 py-3 grid grid-cols-3 divide-x divide-white/5">
          <div className="text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">ETA</p>
            <p className="text-[14px] font-bold text-white mt-0.5">{eta || "Calc…"}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Distance</p>
            <p className="text-[14px] font-bold text-white mt-0.5">{dist || "—"}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">GPS</p>
            <p className="text-[14px] font-bold mt-0.5" style={{ color: current?.providerLocation ? "#10b981" : "#6b7280" }}>
              {current?.providerLocation ? "Live" : "Pending"}
            </p>
          </div>
        </div>
      </div>

      {/* Progress steps */}
      <div className="relative z-10 mx-5 mt-4 rounded-2xl px-4 py-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">Status</p>
        <div className="space-y-0">
          {[
            { label: "Booking confirmed & paid", done: true },
            { label: "Detail Pro en route", done: false, active: true },
            { label: "Service in progress", done: false },
            { label: "Complete", done: false },
          ].map((step, i, arr) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    background: step.done ? "#10b981" : step.active ? ACCENT : "rgba(255,255,255,0.06)",
                    border: step.done || step.active ? "none" : "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  {step.done ? (
                    <Icon icon={CheckCircle} size="xs" className="text-white" />
                  ) : step.active ? (
                    <motion.div
                      className="w-2 h-2 rounded-full bg-white"
                      animate={{ scale: [1, 1.4, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-white/20" />
                  )}
                </div>
                {i < arr.length - 1 && (
                  <div
                    className="w-px mt-1 mb-1"
                    style={{ height: 20, background: step.done ? "#10b981" : "rgba(255,255,255,0.06)" }}
                  />
                )}
              </div>
              <p
                className="text-sm pt-0.5"
                style={{ color: step.done || step.active ? "white" : "rgba(255,255,255,0.3)", fontWeight: step.done || step.active ? 600 : 400 }}
              >
                {step.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1" />
    </div>
  );
}

// Phase 2 — provider arrived, service stages
function ServiceProgressView({
  arrivalStatus,
  currentStage,
  bookingId,
}: {
  arrivalStatus: ArrivalStatus;
  currentStage: string;
  bookingId: number;
}) {
  const stageIndex = SERVICE_STAGES.findIndex((s) => s.key === currentStage);
  const active = stageIndex >= 0 ? stageIndex : 0;
  const completion = formatTime(arrivalStatus.estimatedCompletionTime);

  return (
    <div className="flex flex-col min-h-screen bg-[#080810]">
      {/* Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[25%] left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[100px]"
          style={{ width: 350, height: 350, background: "radial-gradient(circle, rgba(16,185,129,0.10) 0%, transparent 70%)" }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 px-5 pt-14 pb-4">
        <div className="flex items-center gap-2 mb-4">
          <motion.div
            className="w-2 h-2 rounded-full bg-green-400"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-green-400">Service in progress</span>
        </div>

        {/* Current stage hero */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
          >
            <p className="text-[28px] font-black text-white leading-tight">
              {SERVICE_STAGES[active]?.label || "In Progress"}
            </p>
            {completion && (
              <p className="text-[14px] text-gray-400 mt-1">
                Est. complete by <span className="text-white font-semibold">{completion}</span>
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Stage timeline */}
      <div className="relative z-10 mx-5 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="px-4 pt-4 pb-2">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Progress</p>
        </div>
        <div className="px-4 pb-4 space-y-0">
          {SERVICE_STAGES.map((stage, i) => {
            const done = i < active;
            const isActive = i === active;
            const pending = i > active;
            const StageIcon = stage.icon;
            return (
              <div key={stage.key} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <motion.div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{
                      background: done
                        ? "rgba(16,185,129,0.15)"
                        : isActive
                        ? `rgba(140,82,255,0.2)`
                        : "rgba(255,255,255,0.04)",
                      border: done
                        ? "1px solid rgba(16,185,129,0.4)"
                        : isActive
                        ? `1px solid rgba(140,82,255,0.5)`
                        : "1px solid rgba(255,255,255,0.07)",
                    }}
                    animate={isActive ? { scale: [1, 1.06, 1] } : {}}
                    transition={{ duration: 1.8, repeat: Infinity }}
                  >
                    <Icon
                      icon={StageIcon}
                      size="xs"
                      className={done ? "text-green-400" : isActive ? "text-purple-300" : "text-gray-600"}
                    />
                  </motion.div>
                  {i < SERVICE_STAGES.length - 1 && (
                    <motion.div
                      className="w-px mt-1 mb-1"
                      style={{
                        height: 22,
                        background: done
                          ? "rgba(16,185,129,0.4)"
                          : "rgba(255,255,255,0.06)",
                      }}
                    />
                  )}
                </div>
                <div className="pt-1.5 pb-2">
                  <p
                    className="text-[14px] leading-tight"
                    style={{
                      color: done ? "#10b981" : isActive ? "white" : "rgba(255,255,255,0.25)",
                      fontWeight: done || isActive ? 600 : 400,
                    }}
                  >
                    {stage.label}
                  </p>
                  {isActive && (
                    <motion.p
                      className="text-[11px] text-gray-500 mt-0.5"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      In progress…
                    </motion.p>
                  )}
                  {done && (
                    <p className="text-[11px] text-green-600 mt-0.5">Done ✓</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add-on alerts */}
      {arrivalStatus.adjustmentDetails.length > 0 && (
        <div className="relative z-10 mx-5 mt-4 rounded-2xl px-4 py-3" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <p className="text-[10px] font-semibold text-yellow-500 uppercase tracking-widest mb-2">Time Adjustments</p>
          {arrivalStatus.adjustmentDetails.map((adj, i) => (
            <div key={i} className="flex justify-between text-[13px] text-yellow-200/70 py-0.5">
              <span>{adj.label}</span>
              <span>+{adj.minutes}m</span>
            </div>
          ))}
        </div>
      )}

      {arrivalStatus.providerNotes && (
        <div className="relative z-10 mx-5 mt-3 rounded-2xl px-4 py-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1">Note from Pro</p>
          <p className="text-[13px] text-gray-300 italic">"{arrivalStatus.providerNotes}"</p>
        </div>
      )}

      <div className="flex-1" />
    </div>
  );
}

export default function TrackingMap({ bookingId, onClose }: TrackingMapProps) {
  const [wsConnected, setWsConnected] = useState(false);
  const [liveTracking, setLiveTracking] = useState<TrackingInfo | null>(null);
  const [arrivalStatus, setArrivalStatus] = useState<ArrivalStatus>({
    arrived: false,
    arrivalTime: null,
    estimatedCompletionTime: null,
    extraTimeMinutes: 0,
    adjustmentDetails: [],
  });
  const [currentStage, setCurrentStage] = useState("arrived");
  const [lastPing, setLastPing] = useState<Date | null>(null);

  const { data: trackingData } = useQuery<TrackingInfo>({
    queryKey: [`/api/tracking/${bookingId}`],
    refetchInterval: 10000,
  });

  // Poll booking status as a fallback in case the WebSocket provider_arrived message is missed
  const { data: bookingPoll } = useQuery<Booking>({
    queryKey: [`/api/bookings/${bookingId}`],
    refetchInterval: 5000,
    staleTime: 0,
  });

  // Sync arrived state from REST poll (guards against missed WS messages)
  useEffect(() => {
    if (!bookingPoll) return;
    if (bookingPoll.status === "in_progress" || bookingPoll.arrivalTime) {
      setArrivalStatus((prev) => {
        if (prev.arrived) return prev;
        return {
          ...prev,
          arrived: true,
          arrivalTime: bookingPoll.arrivalTime ?? null,
          estimatedCompletionTime: bookingPoll.estimatedCompletionTime ?? null,
        };
      });
    }
  }, [bookingPoll?.status, bookingPoll?.arrivalTime]);

  // Mock provider info (real data would come from booking/assignment API)
  const providerName = "Marcus T.";
  const providerRating = 4.9;

  // WebSocket
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

    socket.onopen = () => setWsConnected(true);

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "location_update" && data.bookingId === bookingId) {
          setLiveTracking((prev) => ({
            providerLocation: { lat: data.latitude, lng: data.longitude },
            customerLocation: prev?.customerLocation || trackingData?.customerLocation || null,
            eta: data.eta,
            distance: data.distance,
            lastUpdate: new Date().toISOString(),
          }));
          setLastPing(new Date());
        }

        if (data.type === "provider_arrived" && data.bookingId === bookingId) {
          setArrivalStatus((prev) => ({
            ...prev,
            arrived: true,
            arrivalTime: data.arrivalTime,
            estimatedCompletionTime: data.estimatedCompletionTime,
          }));
          setCurrentStage("setting_up");
          setLastPing(new Date());
        }

        if (data.type === "stage_update" && data.bookingId === bookingId) {
          if (data.stage) setCurrentStage(data.stage);
          setLastPing(new Date());
        }

        if (data.type === "eta_update" && data.bookingId === bookingId) {
          setArrivalStatus((prev) => ({
            ...prev,
            estimatedCompletionTime: data.estimatedCompletionTime,
            extraTimeMinutes: data.extraTimeMinutes || 0,
            adjustmentDetails: data.adjustments?.filter((a: any) => a.selected) || [],
            providerNotes: data.providerNotes,
          }));
        }
      } catch (err) {
        console.error("Tracking WS error:", err);
      }
    };

    socket.onclose = () => setWsConnected(false);
    return () => socket.close();
  }, [bookingId, trackingData]);

  const current = liveTracking || trackingData;
  const phase = arrivalStatus.arrived ? "service" : "enroute";

  return (
    <div className="min-h-screen bg-[#080810] relative overflow-hidden">
      {/* Close button — always visible */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-5 left-5 z-50 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <Icon icon={ChevronDown} size="sm" className="text-gray-300" />
        </button>
      )}

      <AnimatePresence mode="wait">
        {phase === "enroute" ? (
          <motion.div
            key="enroute"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 overflow-y-auto"
          >
            <EnRouteView
              current={current || null}
              lastPing={lastPing}
              wsConnected={wsConnected}
              providerName={providerName}
              providerRating={providerRating}
              onContactPress={() => {}}
            />
          </motion.div>
        ) : (
          <motion.div
            key="service"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 overflow-y-auto"
          >
            <ServiceProgressView
              arrivalStatus={arrivalStatus}
              currentStage={currentStage}
              bookingId={bookingId}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
