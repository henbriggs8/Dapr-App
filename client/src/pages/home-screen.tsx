import { useLocation } from "wouter";
import { ChevronDown, ChevronUp, SlidersHorizontal, MoreHorizontal, Clock, Heart, MapPin, Loader2 } from "lucide-react";
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
  const [addressOpen, setAddressOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
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

  async function detectLocation() {
    setLocateError(null);
    if (!navigator.geolocation) {
      setLocateError("Location not supported on this device.");
      return;
    }
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
        } catch {
          setLocateError("Could not look up address. Try again.");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocateError("Location permission denied. Enable it in your device settings.");
        } else {
          setLocateError("Could not get your location. Try again.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const { street, full } = parseAddress(user?.address);

  const categories: { icon: React.ElementType | null; image: string | null; label: string; route: string; custom?: React.ReactNode }[] = [
    { icon: null, image: "/carseat.png", label: "Interior", route: "/booking" },
    { icon: null, image: "/car-exterior.png", label: "Exterior", route: "/booking" },
    { icon: null, image: "/sports-car.png", label: "Full Detail", route: "/booking" },
    { icon: MoreHorizontal, image: null, label: "More", route: "/booking" },
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
      {/* ── Location bar ────────────────────────────────────────────── */}
      <div className="px-4 pt-12 pb-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setAddressOpen((o) => !o)}
            className="flex items-center gap-1.5 text-[14px] font-medium text-[#111]"
          >
            Now&nbsp;•&nbsp;{street}
            {addressOpen
              ? <ChevronUp className="h-4 w-4 text-[#555]" />
              : <ChevronDown className="h-4 w-4 text-[#555]" />
            }
          </button>
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f3f3f3]">
            <SlidersHorizontal className="h-4 w-4 text-[#111]" />
          </button>
        </div>

        {/* Expanded address dropdown */}
        {addressOpen && (
          <div className="mt-2 mb-1 rounded-2xl bg-[#f8f8f8] px-4 py-3 flex flex-col gap-2">
            {/* Current saved address */}
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-gray-400" />
              <div>
                <p className="text-[13px] font-semibold text-[#111]">
                  {full || "No address saved yet"}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">Service location from your profile</p>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gray-200" />

            {/* Use current location button */}
            <button
              onClick={detectLocation}
              disabled={locating}
              className="flex items-center gap-2 active:opacity-70 transition"
            >
              {locating ? (
                <Loader2 className="h-4 w-4 animate-spin shrink-0" style={{ color: ACCENT }} />
              ) : (
                <MapPin className="h-4 w-4 shrink-0" style={{ color: ACCENT }} />
              )}
              <span className="text-[13px] font-semibold" style={{ color: ACCENT }}>
                {locating ? "Detecting location…" : "Use current location"}
              </span>
            </button>

            {/* Error message */}
            {locateError && (
              <p className="text-[11px] text-red-500">{locateError}</p>
            )}
          </div>
        )}
      </div>

      {/* ── Headline ────────────────────────────────────────────────── */}
      <div className="px-4 pt-2 pb-3">
        <h1 className="text-[28px] font-bold tracking-tight text-[#111]">Get Your Car Dapper</h1>
      </div>

      {/* ── Service type grid ────────────────────────────────────────── */}
      <div className="px-4 pb-4 grid grid-cols-2 gap-3">
        {/* Car Wash */}
        <button
          onClick={() => setLocation("/booking")}
          className="relative flex items-center gap-3 rounded-2xl border border-[#ededed] bg-white px-4 py-4 shadow-sm active:scale-[0.98] transition"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f3eeff]">
            <img src="/carwashers.png" alt="Car Wash" className="h-7 w-7 object-contain" />
          </div>
          <span className="text-[14px] font-semibold text-[#111]">Car Wash</span>
        </button>

        {/* Fleet */}
        <button
          onClick={() => setLocation("/corporate")}
          className="relative flex items-center gap-3 rounded-2xl border border-[#ededed] bg-white px-4 py-4 shadow-sm active:scale-[0.98] transition"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f3eeff]">
            <img src="/fleet-truck.png" alt="Fleet Wash" className="h-9 w-9 object-contain" />
          </div>
          <span className="text-[14px] font-semibold text-[#111]">Fleet Wash</span>
        </button>
      </div>

      {/* ── Category icons ───────────────────────────────────────────── */}
      <div className="flex items-start justify-around px-6 pb-5">
        {categories.map(({ icon: Icon, image, custom, label, route }) => (
          <button
            key={label}
            onClick={() => setLocation(route)}
            className="flex flex-col items-center gap-2 active:opacity-70 transition"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f3eeff]">
              {custom ? custom : image ? (
                <img src={image} alt={label} className="h-10 w-10 object-contain" />
              ) : Icon ? (
                <Icon className="h-5 w-5" style={{ color: ACCENT }} />
              ) : null}
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
                <Heart className="h-4 w-4 text-[#555]" />
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
                  <Clock className="h-3.5 w-3.5 text-[#aaa]" />
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
