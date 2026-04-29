import { useLocation } from "wouter";
import {
  Bell, MoreHorizontal, Clock, Heart, Loader2, Droplets,
  Gauge, CarFront, Sparkles, Search, Home, Navigation,
  ChevronRight, ChevronDown, CheckCircle2, type LucideIcon,
} from "lucide-react";
import { Icon } from "@/components/ui/icon";
import React, { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { LocationBottomSheet } from "@/components/location-bottom-sheet";

const ACCENT = "#8c52ff";
const ACCENT_BG = "#f3eeff";

const TIME_OPTIONS = [
  { id: "now",      label: "Arrive now",        sub: "Get a pro in ~10 min" },
  { id: "later",    label: "Arrive later",       sub: "Later today" },
  { id: "schedule", label: "Schedule for later", sub: "Pick a date & time" },
] as const;

function parseAddress(address: string | null | undefined) {
  if (!address) return { street: "Set location", full: null };
  const parts = address.split(",").map((p) => p.trim());
  const street = parts[0] || address;
  return { street, full: address };
}

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
  const street = [house, road].filter(Boolean).join(" ");
  return [street, city, [state, zip].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
}

export default function HomeScreen() {
  const [, setLocation] = useLocation();
  const [locating, setLocating] = useState(false);
  const [timeOpt, setTimeOpt] = useState<(typeof TIME_OPTIONS)[number]>(TIME_OPTIONS[0]);
  const [timeOpen, setTimeOpen] = useState(false);
  const [mode, setMode] = useState<"personal" | "fleet">("personal");
  const [addrSheetOpen, setAddrSheetOpen] = useState(false);
  const timePopRef = useRef<HTMLDivElement | null>(null);
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!timeOpen) return;
    const onClick = (e: MouseEvent) => {
      if (timePopRef.current && !timePopRef.current.contains(e.target as Node)) {
        setTimeOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [timeOpen]);

  const { data: user } = useQuery<{ address?: string | null }>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/user", { headers, credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: bookings } = useQuery<{ serviceLocation: string; scheduledDate: string }[]>({
    queryKey: ["/api/bookings"],
    queryFn: async () => {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/bookings", { headers, credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  async function detectLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const address = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          const token = await getToken();
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (token) headers["Authorization"] = `Bearer ${token}`;
          await fetch("/api/user/profile", {
            method: "PATCH",
            headers,
            credentials: "include",
            body: JSON.stringify({ address }),
          });
          queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        } finally {
          setLocating(false);
        }
      },
      () => { setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function saveAddress(address: string) {
    try {
      const token = await getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      await fetch("/api/user/profile", {
        method: "PATCH",
        headers,
        credentials: "include",
        body: JSON.stringify({ address }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    } catch {}
  }

  const { street, full } = parseAddress(user?.address);
  const lastServiceLocation = bookings && bookings.length > 0 ? bookings[0].serviceLocation : null;
  const lastServiceStreet = lastServiceLocation ? parseAddress(lastServiceLocation).street : null;

  const categories: { icon: LucideIcon; label: string; route: string }[] = [
    { icon: Gauge,         label: "Interior",    route: "/booking" },
    { icon: CarFront,      label: "Exterior",    route: "/booking" },
    { icon: Sparkles,      label: "Full Detail", route: "/booking" },
    { icon: MoreHorizontal,label: "More",        route: "/services" },
  ];

  const serviceCards = [
    {
      id: 1,
      image: "/exterior-wash.jpg",
      reward: "5 washes until $50 reward",
      title: "Essential Wash",
      price: "$39",
      duration: "15–30 min",
    },
    {
      id: 2,
      image: "/interior-detail.jpg",
      title: "Interior Detail",
      price: "$89",
      duration: "45–90 min",
    },
    {
      id: 3,
      image: "/dapper-lambo.jpg",
      title: "Refresh Detail",
      price: "$149",
      duration: "30–45 min",
    },
    {
      id: 4,
      image: "/dapper-van-house.jpg",
      title: "Reserve Ahead",
      price: "From $39",
      duration: "Schedule anytime",
    },
  ];

  return (
    <div
      className="min-h-screen bg-white"
      style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }}
    >
      {/* ── Header: location + bell ─────────────────────────────────── */}
      <div className="px-4 pt-12 pb-0">
        <div className="flex items-center justify-between mb-3">
          {/* Address dropdown trigger */}
          <button
            onClick={() => setAddrSheetOpen(true)}
            className="flex items-start gap-1.5 active:opacity-70 transition max-w-[75%] text-left"
          >
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-[#999] uppercase tracking-wide leading-none mb-0.5 text-left">Vehicle location</p>
              <div className="flex items-center gap-1">
                <p className="text-[15px] font-bold text-[#111] truncate leading-tight">{street}</p>
                <Icon icon={ChevronDown} size="xs" className="text-[#555] shrink-0 mt-px" />
              </div>
            </div>
          </button>

          {/* Bell */}
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5f5f5] active:bg-[#ebebeb] transition shrink-0">
            <Icon icon={Bell} size="sm" className="text-[#333]" />
          </button>
        </div>

        {/* ── Search bar ──────────────────────────────────────────────── */}
        <button
          onClick={() => setAddrSheetOpen(true)}
          className="w-full flex items-center gap-3 rounded-2xl bg-[#f7f7f7] border border-[#efefef] px-4 py-3.5 active:bg-[#f0f0f0] transition"
        >
          <Icon icon={Search} size="sm" className="text-[#aaa] shrink-0" />
          <span className="flex-1 text-left text-[14px] text-[#aaa]">
            {full ? street : "Search address or vehicle location"}
          </span>
        </button>

        {/* ── Mode row: time chip + Personal/Fleet toggle ──────────────── */}
        <div className="flex items-center gap-2 mt-2.5">
          {/* Time chip */}
          <div className="relative" ref={timePopRef}>
            <button
              onClick={() => setTimeOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-full border border-[#e2e2e2] bg-white px-3 py-2 shadow-[0_1px_3px_rgba(0,0,0,0.06)] active:scale-[0.98] transition"
              aria-haspopup="listbox"
              aria-expanded={timeOpen}
            >
              <Icon icon={Clock} size="xs" style={{ color: ACCENT }} />
              <span className="text-[12px] font-semibold text-[#111]">{timeOpt.label}</span>
              <Icon icon={ChevronDown} size="xs" className={`text-[#999] transition-transform ${timeOpen ? "rotate-180" : ""}`} />
            </button>

            {timeOpen && (
              <div
                className="absolute top-full mt-1.5 left-0 z-40 w-60 bg-white border border-[#efefef] rounded-2xl shadow-[0_8px_30px_-4px_rgba(0,0,0,0.14)] overflow-hidden py-1"
                role="listbox"
              >
                {TIME_OPTIONS.map((opt) => {
                  const active = timeOpt.id === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => { setTimeOpt(opt); setTimeOpen(false); }}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition ${active ? "bg-[#f3eeff]" : "active:bg-[#fafafa]"}`}
                      role="option"
                      aria-selected={active}
                    >
                      <div>
                        <p className={`text-[13px] font-semibold ${active ? "text-[#8c52ff]" : "text-[#111]"}`}>{opt.label}</p>
                        <p className="text-[11px] text-[#999] mt-0.5">{opt.sub}</p>
                      </div>
                      {active && <Icon icon={CheckCircle2} size="sm" style={{ color: ACCENT }} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Personal / Fleet segmented control */}
          <div className="flex items-center rounded-full bg-[#f0f0f0] p-0.5">
            <button
              onClick={() => setMode("personal")}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition ${
                mode === "personal"
                  ? "bg-white text-[#111] shadow-sm"
                  : "text-[#888]"
              }`}
            >
              Personal
            </button>
            <button
              onClick={() => setMode("fleet")}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition ${
                mode === "fleet"
                  ? "bg-white text-[#111] shadow-sm"
                  : "text-[#888]"
              }`}
            >
              Fleet
            </button>
          </div>
        </div>

        {/* ── Quick-access tiles: Home + Last service ──────────────────── */}
        <div className="flex gap-2.5 mt-3 mb-1">
          {/* Home tile */}
          <button
            onClick={() => setAddrSheetOpen(true)}
            className="flex-1 flex items-center gap-2.5 rounded-2xl border border-[#efefef] bg-white px-3 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)] active:bg-[#fafafa] transition text-left"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#f3eeff]">
              <Icon icon={Home} size="sm" style={{ color: ACCENT }} />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-[#111] leading-tight">Home</p>
              <p className="text-[11px] text-[#aaa] truncate mt-0.5 leading-tight">
                {full ? street : "Add address"}
              </p>
            </div>
          </button>

          {/* Last service tile */}
          <button
            onClick={() => setLocation("/booking")}
            className="flex-1 flex items-center gap-2.5 rounded-2xl border border-[#efefef] bg-white px-3 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)] active:bg-[#fafafa] transition text-left"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#f5f5f5]">
              {locating ? (
                <Icon icon={Loader2} size="sm" className="animate-spin text-[#bbb]" />
              ) : (
                <Icon icon={Clock} size="sm" className="text-[#bbb]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-[#111] leading-tight">Last service</p>
              <p className="text-[11px] text-[#aaa] truncate mt-0.5 leading-tight">
                {lastServiceStreet || "No recent services"}
              </p>
            </div>
            {!lastServiceLocation && (
              <button
                onClick={(e) => { e.stopPropagation(); detectLocation(); }}
                className="shrink-0 p-1"
                aria-label="Detect location"
              >
                <Icon icon={Navigation} size="xs" style={{ color: ACCENT }} />
              </button>
            )}
          </button>
        </div>
      </div>

      {/* ── For you ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <h2 className="text-[18px] font-bold text-[#111] tracking-tight">For you</h2>
        <button className="flex items-center gap-0.5 text-[12px] font-semibold" style={{ color: ACCENT }}>
          See all
          <Icon icon={ChevronRight} size="xs" style={{ color: ACCENT }} />
        </button>
      </div>

      {/* ── Primary: Car Wash CTA ─────────────────────────────────────── */}
      <div className="px-4 pb-4">
        <button
          onClick={() => setLocation("/booking")}
          className="w-full flex items-center gap-3.5 rounded-2xl border border-[#ececec] bg-white px-4 py-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.06)] active:scale-[0.99] transition"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: ACCENT_BG }}>
            <Icon icon={Droplets} size="lg" style={{ color: ACCENT }} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[16px] font-bold text-[#111]">Car Wash</p>
            <p className="text-[12px] text-[#999] mt-0.5">Pro at your vehicle in ~10 min</p>
          </div>
          <div
            className="shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-bold text-white"
            style={{ background: ACCENT }}
          >
            Book
          </div>
        </button>
      </div>

      {/* ── Category icon chips ───────────────────────────────────────── */}
      <div className="flex items-start justify-around px-4 pb-5">
        {categories.map(({ icon: IconComp, label, route }) => (
          <button
            key={label}
            onClick={() => setLocation(route)}
            className="flex flex-col items-center gap-1.5 active:opacity-70 transition"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: ACCENT_BG }}>
              <Icon icon={IconComp} size="md" style={{ color: ACCENT }} />
            </div>
            <span className="text-[11px] font-medium text-[#666]">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Promo card ───────────────────────────────────────────────── */}
      <div className="mx-4 mb-5 rounded-2xl overflow-hidden flex items-center px-4 py-3.5 gap-3.5 border border-[#e8dcff]" style={{ background: ACCENT_BG }}>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: ACCENT }}>Member offer</p>
          <p className="text-[14px] font-bold text-[#111] leading-snug">
            Save on every wash with a Dapper Plan
          </p>
          <button
            onClick={() => setLocation("/booking")}
            className="mt-2.5 inline-flex items-center gap-1 text-[12px] font-semibold text-[#111] border border-[#ccc] rounded-full px-3 py-1.5 bg-white"
          >
            Browse plans →
          </button>
        </div>
        <div className="w-24 h-20 rounded-xl overflow-hidden shrink-0">
          <img src="/dapper-van-house.jpg" className="w-full h-full object-cover" alt="Dapper service" />
        </div>
      </div>

      {/* ── Services section header ───────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pb-3">
        <h2 className="text-[18px] font-bold text-[#111] tracking-tight">Services</h2>
      </div>

      {/* ── Service cards ─────────────────────────────────────────────── */}
      <div className="px-4 flex flex-col gap-3 pb-4">
        {serviceCards.map((card) => (
          <button
            key={card.id}
            onClick={() => setLocation("/booking")}
            className="w-full flex items-center gap-3.5 text-left active:opacity-90 transition rounded-2xl border border-[#f0f0f0] bg-white p-3 shadow-[0_1px_4px_rgba(0,0,0,0.05)]"
          >
            {/* Thumbnail */}
            <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0">
              {card.reward && (
                <div
                  className="absolute inset-x-0 bottom-0 z-10 px-1.5 py-1 text-[9px] font-bold text-white text-center leading-tight"
                  style={{ background: "linear-gradient(to top, rgba(140,82,255,0.95), transparent)" }}
                >
                  🎁 Reward
                </div>
              )}
              <img src={card.image} alt={card.title} className="w-full h-full object-cover" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-[#111]">{card.title}</p>
              <div className="flex items-center gap-1 mt-1">
                <Icon icon={Clock} size="xs" className="text-[#bbb]" />
                <p className="text-[12px] text-[#999]">{card.duration}</p>
              </div>
            </div>

            {/* Price */}
            <div className="shrink-0 text-right">
              <p className="text-[14px] font-bold text-[#111]">{card.price}</p>
              <div
                className="mt-1 flex items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-bold text-white"
                style={{ background: ACCENT }}
              >
                Book
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* ── See all services ─────────────────────────────────────────── */}
      <div className="px-4 pb-4">
        <button
          onClick={() => setLocation("/services")}
          className="w-full flex items-center justify-center gap-2 rounded-2xl border border-[#ececec] bg-white py-4 shadow-[0_1px_4px_rgba(0,0,0,0.05)] active:bg-[#fafafa] transition"
        >
          <span className="text-[14px] font-semibold text-[#111]">See all Services</span>
          <Icon icon={ChevronRight} size="sm" className="text-[#aaa]" />
        </button>
      </div>

      {/* ── Location bottom sheet ─────────────────────────────────────── */}
      <LocationBottomSheet
        isOpen={addrSheetOpen}
        onClose={() => setAddrSheetOpen(false)}
        currentAddress={user?.address}
        recentAddresses={bookings?.map((b) => b.serviceLocation).filter(Boolean) as string[]}
        onSelect={saveAddress}
      />
    </div>
  );
}
