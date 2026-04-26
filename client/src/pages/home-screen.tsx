import { useLocation } from "wouter";
import { MoreHorizontal, Clock, Heart, MapPin, Loader2, Droplets, Truck, Gauge, CarFront, Sparkles, Search, Home, Navigation, type LucideIcon } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";

const ACCENT = "#8c52ff";


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
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

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
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const { street, full } = parseAddress(user?.address);
  const lastServiceLocation = bookings && bookings.length > 0 ? bookings[0].serviceLocation : null;
  const lastServiceStreet = lastServiceLocation ? parseAddress(lastServiceLocation).street : null;

  const categories: { icon: LucideIcon; label: string; route: string }[] = [
    { icon: Gauge, label: "Interior", route: "/booking" },
    { icon: CarFront, label: "Exterior", route: "/booking" },
    { icon: Sparkles, label: "Full Detail", route: "/booking" },
    { icon: MoreHorizontal, label: "More", route: "/booking" },
  ];

  const serviceCards = [
    {
      id: 1,
      image: "/dapper-van-house.jpg",
      reward: "5 washes until $50 reward",
      title: "Essential Wash",
      price: "$39",
      duration: "15–30 min",
      route: "/booking",
    },
    {
      id: 2,
      image: "/interior-detail.jpg",
      title: "Interior Detail",
      price: "$89",
      duration: "45–90 min",
      route: "/booking",
    },
    {
      id: 3,
      image: "/exterior-wash.jpg",
      title: "Refresh Detail",
      price: "$149",
      duration: "30–45 min",
      route: "/booking",
    },
    {
      id: 4,
      image: "/dapper-lambo.jpg",
      title: "Reserve Ahead",
      price: "From $39",
      duration: "Schedule anytime",
      route: "/booking",
    },
  ];

  return (
    <div
      className="min-h-screen bg-white"
      style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }}
    >
      {/* ── Location search bar ─────────────────────────────────────── */}
      <div className="px-4 pt-12 pb-1">
        {/* Logo row */}
        <div className="flex items-center justify-end mb-4">
          <img src="/dapper-d-logo.png" alt="Dapper" className="h-9 w-9 object-contain" />
        </div>

        {/* Full-width pill search bar */}
        <button
          onClick={() => setLocation("/booking")}
          className="w-full flex items-center gap-3 rounded-full border border-[#e0e0e0] bg-white px-4 py-3.5 shadow-sm active:scale-[0.99] transition"
        >
          <Icon icon={Search} size="sm" className="text-[#999] shrink-0" />
          <span className="flex-1 text-left text-[15px] text-[#888]">
            {full ? street : "Where are we washing?"}
          </span>
        </button>

        {/* Quick-select rows */}
        <div className="mt-2 rounded-2xl bg-white border border-[#efefef] overflow-hidden shadow-sm">
          {/* Home row */}
          <button
            onClick={() => setLocation("/booking")}
            className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-[#fafafa] transition text-left"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f3eeff]">
              <Icon icon={Home} size="sm" style={{ color: ACCENT }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#111]">Home</p>
              <p className="text-[12px] text-[#999] truncate">
                {full || "Add your home address"}
              </p>
            </div>
          </button>

          {/* Divider */}
          <div className="ml-16 h-px bg-[#f0f0f0]" />

          {/* Last service row */}
          <button
            onClick={() => setLocation("/booking")}
            className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-[#fafafa] transition text-left"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f5f5f5]">
              {locating ? (
                <Icon icon={Loader2} size="sm" className="animate-spin text-[#999]" />
              ) : (
                <Icon icon={Clock} size="sm" className="text-[#999]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#111]">Last service</p>
              <p className="text-[12px] text-[#999] truncate">
                {lastServiceStreet || "No recent services yet"}
              </p>
            </div>
            {!lastServiceLocation && (
              <button
                onClick={(e) => { e.stopPropagation(); detectLocation(); }}
                className="shrink-0 flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-1 border border-[#e5e5e5]"
                style={{ color: ACCENT }}
              >
                <Icon icon={Navigation} size="xs" style={{ color: ACCENT }} />
                Detect
              </button>
            )}
          </button>
        </div>
      </div>

      {/* ── Service type grid ────────────────────────────────────────── */}
      <div className="px-4 pb-4 grid grid-cols-2 gap-3">
        {/* Car Wash */}
        <button
          onClick={() => setLocation("/booking")}
          className="relative flex items-center gap-3 rounded-2xl border border-[#ededed] bg-white px-4 py-4 shadow-sm active:scale-[0.98] transition"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f3eeff]">
            <Icon icon={Droplets} size="lg" style={{ color: ACCENT }} />
          </div>
          <span className="text-[14px] font-semibold text-[#111]">Car Wash</span>
        </button>

        {/* Fleet */}
        <button
          onClick={() => setLocation("/corporate")}
          className="relative flex items-center gap-3 rounded-2xl border border-[#ededed] bg-white px-4 py-4 shadow-sm active:scale-[0.98] transition"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f3eeff]">
            <Icon icon={Truck} size="lg" style={{ color: ACCENT }} />
          </div>
          <span className="text-[14px] font-semibold text-[#111]">Fleet Wash</span>
        </button>
      </div>

      {/* ── Category icons ───────────────────────────────────────────── */}
      <div className="flex items-start justify-around px-6 pb-5">
        {categories.map(({ icon: IconComp, label, route }) => (
          <button
            key={label}
            onClick={() => setLocation(route)}
            className="flex flex-col items-center gap-2 active:opacity-70 transition"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f3eeff]">
              <Icon icon={IconComp} size="lg" style={{ color: ACCENT }} />
            </div>
            <span className="text-[11px] font-medium text-[#555]">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Promo banner ─────────────────────────────────────────────── */}
      <div className="mx-4 mb-4 rounded-2xl overflow-hidden flex items-center bg-[#f3eeff] px-4 py-4 gap-4">
        <div className="flex-1">
          <p className="text-[13px] font-bold text-[#111] leading-tight">
            Save big on any<br />Dapper Maintenance<br />Plan
          </p>
          <button
            onClick={() => setLocation("/booking")}
            className="mt-3 flex items-center gap-1 text-[12px] font-semibold text-[#111] border border-[#ccc] rounded-full px-3 py-1.5 bg-white"
          >
            Browse offer →
          </button>
        </div>
        <div className="w-28 h-20 rounded-xl overflow-hidden shrink-0">
          <img src="/dapper-van-house.jpg" className="w-full h-full object-cover" alt="Dapper van" />
        </div>
      </div>

      {/* ── Service photo cards ──────────────────────────────────────── */}
      <div className="px-4 flex flex-col gap-5">
        {serviceCards.map((card) => (
          <button
            key={card.id}
            onClick={() => setLocation(card.route)}
            className="w-full text-left active:opacity-90 transition"
          >
            {/* Photo */}
            <div className="relative w-full h-48 rounded-2xl overflow-hidden mb-2.5">
              {card.reward && (
                <div
                  className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold text-white"
                  style={{ background: ACCENT }}
                >
                  🎁 {card.reward}
                </div>
              )}
              <div
                role="button"
                tabIndex={0}
                onClick={(e) => e.stopPropagation()}
                className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm cursor-pointer"
              >
                <Icon icon={Heart} size="sm" className="text-[#555]" />
              </div>
              <img
                src={card.image}
                alt={card.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Info row */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[15px] font-semibold text-[#111]">{card.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Icon icon={Clock} size="xs" className="text-[#aaa]" />
                  <p className="text-[12px] text-[#888]">{card.duration}</p>
                </div>
              </div>
              <p className="text-[15px] font-bold text-[#111] mt-0.5">{card.price}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
