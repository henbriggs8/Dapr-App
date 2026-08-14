import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  MapPin,
  Navigation,
  Calendar,
  Clock,
  Car,
  Shield,
  Star,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  Zap,
  Users,
  BarChart3,
  X,
} from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { useAuth } from "@/hooks/use-auth";
import SiteNav from "@/components/site-nav";
import ProductJourneySection from "@/components/product-journey";

const dapprLogo = "/dapr-logo.svg";

// ─── Address autocomplete ────────────────────────────────────────────────────
type AddrSuggestion = { label: string; sub: string };

function useAddressAutocomplete() {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<AddrSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const suppressRef = useRef(false);

  useEffect(() => {
    if (suppressRef.current) { suppressRef.current = false; return; }
    const q = input.trim();
    if (q.length < 3) { setSuggestions([]); setLoading(false); return; }
    setLoading(true);
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5&lang=en`,
          { signal: ctrl.signal },
        );
        if (!res.ok) throw new Error("geocode failed");
        const data: { features?: Array<{ properties: Record<string, string> }> } = await res.json();
        const items = (data.features ?? []).map((f) => {
          const p = f.properties || {};
          const street = [p.housenumber, p.street].filter(Boolean).join(" ");
          const city = [p.city || p.town || p.village, p.state, p.country].filter(Boolean).join(", ");
          return { label: street || p.name || city, sub: street ? city : "" };
        }).filter((s) => s.label);
        setSuggestions(items);
        setOpen(items.length > 0);
        setActiveIdx(-1);
      } catch (e) {
        if ((e as Error).name !== "AbortError") { setSuggestions([]); setOpen(false); }
      } finally { setLoading(false); }
    }, 250);
    return () => { ctrl.abort(); clearTimeout(timer); };
  }, [input]);

  const pick = (s: AddrSuggestion) => {
    suppressRef.current = true;
    setInput(s.sub ? `${s.label}, ${s.sub}` : s.label);
    setSuggestions([]); setOpen(false); setActiveIdx(-1);
  };

  return { input, setInput, suggestions, open, setOpen, loading, activeIdx, setActiveIdx, pick };
}

// ─── Booking widget ───────────────────────────────────────────────────────────
function BookingWidget() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [timing, setTiming] = useState<"asap" | "schedule">("asap");
  const [vehicle, setVehicle] = useState("");
  const addr = useAddressAutocomplete();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!addr.open) return;
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) addr.setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [addr.open]);

  const handleBook = () => {
    if (user) {
      setLocation("/services");
    } else {
      // Persist widget state so it survives the auth round-trip.
      if (addr.input.trim()) localStorage.setItem("userAddress", addr.input.trim());

      // Parse free-text vehicle ("2022 Tesla Model 3") into the canonical
      // { year, make, model } object that BookingDialog reads from "userVehicle".
      // Only write if parsing succeeds; never overwrite a richer existing profile.
      const rawVehicle = vehicle.trim();
      if (rawVehicle && !localStorage.getItem("userVehicle")) {
        const parts = rawVehicle.split(/\s+/);
        const yr = Number(parts[0]);
        if (parts.length >= 3 && yr >= 1900 && yr <= 2100) {
          localStorage.setItem(
            "userVehicle",
            JSON.stringify({ year: yr, make: parts[1], model: parts.slice(2).join(" ") })
          );
        }
      }

      setLocation("/auth?context=booking&redirect=%2Fservices");
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 w-full max-w-md">
      {/* Location field */}
      <div className="relative mb-3" ref={boxRef}>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Where should we come?
        </label>
        <div className="relative flex items-center border border-gray-200 rounded-2xl px-4 py-3.5 focus-within:border-[#8c52ff] focus-within:ring-2 focus-within:ring-[#8c52ff]/10 transition-all bg-gray-50/50">
          <Icon icon={MapPin} size="sm" className="text-gray-400 mr-3 shrink-0" />
          <input
            type="text"
            value={addr.input}
            onChange={(e) => addr.setInput(e.target.value)}
            onFocus={() => { if (addr.suggestions.length > 0) addr.setOpen(true); }}
            placeholder="Home, work, or anywhere your car is"
            className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder:text-gray-400"
            data-testid="widget-location"
            autoComplete="off"
            onKeyDown={(e) => {
              if (addr.open && addr.suggestions.length > 0) {
                if (e.key === "ArrowDown") { e.preventDefault(); addr.setActiveIdx((i) => (i + 1) % addr.suggestions.length); }
                if (e.key === "ArrowUp") { e.preventDefault(); addr.setActiveIdx((i) => (i <= 0 ? addr.suggestions.length - 1 : i - 1)); }
                if (e.key === "Enter" && addr.activeIdx >= 0) { e.preventDefault(); addr.pick(addr.suggestions[addr.activeIdx]); return; }
                if (e.key === "Escape") { e.preventDefault(); addr.setOpen(false); }
              }
              if (e.key === "Enter") handleBook();
            }}
          />
          {addr.input && (
            <button onClick={() => { addr.setInput(""); addr.setOpen(false); }} className="text-gray-300 hover:text-gray-500 ml-2">
              <Icon icon={X} size="xs" />
            </button>
          )}
        </div>
        {addr.open && (addr.suggestions.length > 0 || addr.loading) && (
          <div className="absolute top-full mt-1 left-0 right-0 z-30 bg-white border border-gray-100 rounded-2xl shadow-lg overflow-hidden py-1">
            {addr.loading && addr.suggestions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400">Searching…</div>
            ) : addr.suggestions.map((s, idx) => (
              <button
                key={`${s.label}-${idx}`}
                onMouseEnter={() => addr.setActiveIdx(idx)}
                onMouseDown={(e) => { e.preventDefault(); addr.pick(s); }}
                className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${idx === addr.activeIdx ? "bg-gray-50" : "hover:bg-gray-50"}`}
              >
                <Icon icon={MapPin} size="sm" className="text-[#8c52ff] mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm text-gray-800">{s.label}</div>
                  {s.sub && <div className="text-xs text-gray-400">{s.sub}</div>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Vehicle field */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Your vehicle
        </label>
        <div className="relative flex items-center border border-gray-200 rounded-2xl px-4 py-3.5 bg-gray-50/50 focus-within:border-[#8c52ff] focus-within:ring-2 focus-within:ring-[#8c52ff]/10 transition-all">
          <Icon icon={Car} size="sm" className="text-gray-400 mr-3 shrink-0" />
          <input
            type="text"
            value={vehicle}
            onChange={(e) => setVehicle(e.target.value)}
            placeholder="Year, make, model (e.g. 2022 Tesla Model 3)"
            className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder:text-gray-400"
            data-testid="widget-vehicle"
          />
        </div>
      </div>

      {/* Timing toggle */}
      <div className="mb-5">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          When?
        </label>
        <div className="grid grid-cols-2 gap-2 bg-gray-100 rounded-2xl p-1">
          <button
            onClick={() => setTiming("asap")}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              timing === "asap" ? "bg-white shadow-sm text-black" : "text-gray-500 hover:text-gray-700"
            }`}
            data-testid="widget-timing-asap"
          >
            <Icon icon={Zap} size="xs" />
            ASAP
          </button>
          <button
            onClick={() => setTiming("schedule")}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              timing === "schedule" ? "bg-white shadow-sm text-black" : "text-gray-500 hover:text-gray-700"
            }`}
            data-testid="widget-timing-schedule"
          >
            <Icon icon={Calendar} size="xs" />
            Schedule
          </button>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={handleBook}
        className="w-full py-4 rounded-2xl bg-black text-white font-bold text-base hover:bg-gray-900 active:scale-[0.98] transition-all"
        data-testid="widget-cta"
      >
        See services &amp; prices
      </button>

      <p className="text-center text-xs text-[#8c52ff] font-semibold mt-3">
        Vetted Pros · At Home · On-Demand
      </p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function HomeDesktop() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const goBook = () => setLocation(user ? "/services" : "/auth?context=booking&redirect=%2Fservices");
  const goServices = () => setLocation("/services");
  const goCorporate = () => setLocation("/corporate");
  const goBecomePro = () => setLocation("/become-a-pro");

  return (
    // overflow-x-clip (not hidden) — `hidden` turns this div into a scroll
    // container, which breaks position:sticky for descendants (the product
    // journey phone). `clip` clips identically without doing that.
    <div className="min-h-screen bg-white text-gray-900 font-sans overflow-x-clip">
      <SiteNav active="home" />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="pt-20 pb-12 lg:pt-32 lg:pb-24">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            {/* Left */}
            <div>
              <div className="inline-flex items-center gap-2 text-sm font-medium text-[#8c52ff] mb-4 lg:mb-6">
                <Icon icon={MapPin} size="xs" />
                Car care where you are
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight leading-[1.15] text-black mb-4 lg:mb-5">
                <span className="block">Your Car.</span>
                <span className="block">Cleaned Where</span>
                <span className="block">You Are.</span>
              </h1>
              <p className="text-base lg:text-xl text-gray-500 mb-6 lg:mb-8 leading-relaxed max-w-lg">
                Book trusted local car care at home, work, or wherever you're parked.
              </p>

              {/* ── App Store strip — mobile only ───────────────────────── */}
              <a
                href="https://apps.apple.com/app/id6784130029"
                className="lg:hidden flex items-center gap-3 bg-black text-white rounded-2xl px-4 py-3 mb-6 w-fit hover:bg-gray-900 active:scale-[0.98] transition-all"
                aria-label="Download Dapr on the App Store"
              >
                {/* Apple logo */}
                <svg viewBox="0 0 814 1000" className="w-6 h-6 fill-white shrink-0" aria-hidden="true">
                  <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-47.4-150.1-110.7C60.7 728.8 27.5 637.3 27.5 549.9c0-151.3 98.7-231.3 196.3-231.3 52 0 95.2 34.2 127.7 34.2 31.1 0 79.7-36.5 139.5-36.5 22.3 0 108.2 2 164.2 86.9zm-125.6-156.4c27.3-32.4 45.8-77.4 45.8-122.4 0-6.3-.6-12.7-1.9-18.4-43.2 1.7-93.3 28.7-124.8 65.4-23.3 26.2-46.5 71-46.5 116.7 0 7 1.3 14.1 1.9 16.3 2.6.4 6.7 1.1 10.8 1.1 38.7 0 85.5-25.3 114.7-58.7z" />
                </svg>
                <div>
                  <p className="text-[10px] font-medium text-white/70 leading-none mb-0.5">Download on the</p>
                  <p className="text-base font-bold leading-none">App Store</p>
                </div>
              </a>

              <BookingWidget />
            </div>

            {/* Right — hero photo */}
            <div className="relative rounded-[2rem] overflow-hidden aspect-video sm:aspect-[4/3] lg:aspect-auto lg:h-[620px] bg-gray-900 shadow-xl">
              <img
                src="/hero-exterior-wash.jpg"
                alt="Dapr Pro washing a black Mercedes G-Wagon"
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
              {/* Dark gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/10" />

              {/* Floating "arriving" card */}
              <div className="absolute top-3 left-3 sm:top-6 sm:left-6 bg-white rounded-xl sm:rounded-2xl shadow-lg px-3 py-2 sm:px-4 sm:py-3 flex items-center gap-2 sm:gap-3">
                <div className="w-9 h-9 rounded-full bg-[#8c52ff]/10 flex items-center justify-center">
                  <Icon icon={Clock} size="sm" className="text-[#8c52ff]" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Arriving in</p>
                  <p className="text-sm font-bold text-black">12 minutes</p>
                </div>
              </div>

              {/* Floating pro card */}
              <div className="absolute bottom-3 right-3 sm:bottom-6 sm:right-6 bg-white rounded-xl sm:rounded-2xl shadow-lg px-3 py-2 sm:px-4 sm:py-3 flex items-center gap-2 sm:gap-3">
                <div className="relative w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  <Icon icon={Users} size="sm" className="text-gray-500" />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-black">Marcus T.</p>
                  <div className="flex items-center gap-1">
                    <Icon icon={Star} size="xs" className="text-[#8c52ff] fill-[#8c52ff]" />
                    <span className="text-xs text-gray-500">4.98 · Dapr Pro</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust bar ─────────────────────────────────────────────────────── */}
      <section className="py-6 lg:py-8 border-y border-gray-100 bg-gray-50/50">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-4 sm:gap-10 lg:gap-20 text-xs sm:text-sm font-semibold text-gray-400">
            {["4.9★ average rating", "10,000+ services completed", "Vetted & insured Pros", "No waiting — comes to you"].map((item) => (
              <span key={item} className="text-center">{item}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── How Dapr works: Book → Match → Track ─────────────────────────── */}
      <ProductJourneySection />

      {/* ── Services ──────────────────────────────────────────────────────── */}
      <section className="py-14 lg:py-28 bg-gray-50/60 border-y border-gray-100">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 lg:mb-12 gap-4 lg:gap-6">
            <div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-black mb-3">Services</h2>
              <p className="text-gray-500 text-base lg:text-lg">From a quick refresh to a full detail — professional care for every car.</p>
            </div>
            <button
              onClick={goServices}
              className="flex items-center gap-2 text-sm font-bold text-black hover:text-[#8c52ff] transition-colors whitespace-nowrap"
              data-testid="all-services"
            >
              See all services <Icon icon={ChevronRight} size="sm" />
            </button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                name: "Essential Wash",
                price: "$39",
                time: "30 min",
                desc: "A fast, gentle hand wash to keep your car looking sharp.",
                popular: false,
              },
              {
                name: "Interior Detail",
                price: "$89",
                time: "60 min",
                desc: "A focused interior reset — vacuum, surfaces, seats, and windows.",
                popular: false,
              },
              {
                name: "Refresh Detail",
                price: "$149",
                time: "90 min",
                desc: "Full inside-and-out refresh. Our most popular complete service.",
                popular: true,
              },
              {
                name: "Dapr Black Label",
                price: "$299",
                time: "3 hrs",
                desc: "Showroom-finish results from a senior detailer. Our flagship service.",
                popular: false,
              },
            ].map((s) => (
              <div
                key={s.name}
                className={`rounded-3xl p-6 flex flex-col bg-white border transition-shadow hover:shadow-md ${
                  s.popular ? "border-[#8c52ff]/30 ring-1 ring-[#8c52ff]/20" : "border-gray-100"
                }`}
              >
                {s.popular && (
                  <span className="text-xs font-bold text-[#8c52ff] uppercase tracking-wider mb-3">Most Popular</span>
                )}
                <h3 className="font-bold text-black text-base mb-1">{s.name}</h3>
                <p className="text-gray-500 text-xs leading-relaxed mb-4 flex-1">{s.desc}</p>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-2xl font-extrabold text-black">{s.price}</span>
                  <span className="text-xs text-gray-400">{s.time}</span>
                </div>
                <button
                  onClick={goBook}
                  className={`w-full py-2.5 rounded-xl text-sm font-bold transition-colors ${
                    s.popular
                      ? "bg-[#8c52ff] text-white hover:bg-[#7a42e5]"
                      : "border border-gray-200 text-black hover:bg-gray-50"
                  }`}
                >
                  Book {s.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Explore Dapr ──────────────────────────────────────────────────── */}
      <section className="py-14 lg:py-28">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-black mb-3">Explore Dapr</h2>
          <p className="text-gray-500 mb-8 lg:mb-10 text-base lg:text-lg">Everything you need for your car, at your door.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: Car,
                title: "Get your car cared for",
                desc: "Book mobile detailing from a vetted Dapr Pro.",
                cta: "Book now",
                action: goBook,
                accent: "#8c52ff",
                bg: "bg-[#8c52ff]/5",
              },
              {
                icon: Calendar,
                title: "Schedule ahead",
                desc: "Choose a date and time that works for you.",
                cta: "See times",
                action: goBook,
                accent: "#0a0a0a",
                bg: "bg-gray-50",
              },
              {
                icon: BarChart3,
                title: "Fleet care",
                desc: "Manage recurring vehicle care for your business.",
                cta: "Learn more",
                action: goCorporate,
                accent: "#0a0a0a",
                bg: "bg-gray-50",
              },
              {
                icon: Shield,
                title: "Become a Dapr Pro",
                desc: "Earn money providing professional car care on your schedule.",
                cta: "Apply now",
                action: goBecomePro,
                accent: "#0a0a0a",
                bg: "bg-gray-50",
              },
            ].map((card) => (
              <div
                key={card.title}
                className={`${card.bg} rounded-3xl p-6 flex flex-col hover:shadow-md transition-shadow border border-gray-100/50`}
              >
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: card.accent === "#8c52ff" ? "#8c52ff18" : "#0a0a0a0e" }}
                >
                  <card.icon size={20} style={{ color: card.accent }} />
                </div>
                <h3 className="font-bold text-black text-base mb-2">{card.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed flex-1">{card.desc}</p>
                <button
                  onClick={card.action}
                  className="mt-5 flex items-center gap-1.5 text-sm font-bold text-black hover:gap-2.5 transition-all"
                >
                  {card.cta} <Icon icon={ArrowRight} size="xs" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Schedule-ahead ────────────────────────────────────────────────── */}
      <section className="py-14 lg:py-28 bg-gray-50/60 border-y border-gray-100">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-black mb-8 lg:mb-10">Plan ahead</h2>
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* Scheduling card */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
              <h3 className="text-xl font-bold text-black mb-6">Schedule your Dapr Pro</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Date</label>
                  <div className="flex items-center border border-gray-200 rounded-2xl px-4 py-3.5 bg-gray-50/50 gap-3">
                    <Icon icon={Calendar} size="sm" className="text-gray-400" />
                    <input type="date" className="flex-1 bg-transparent outline-none text-sm text-gray-700" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Time</label>
                  <div className="flex items-center border border-gray-200 rounded-2xl px-4 py-3.5 bg-gray-50/50 gap-3">
                    <Icon icon={Clock} size="sm" className="text-gray-400" />
                    <select className="flex-1 bg-transparent outline-none text-sm text-gray-700 appearance-none">
                      {["8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Location</label>
                  <div className="flex items-center border border-gray-200 rounded-2xl px-4 py-3.5 bg-gray-50/50 gap-3">
                    <Icon icon={MapPin} size="sm" className="text-gray-400" />
                    <input type="text" placeholder="Enter address" className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder:text-gray-400" />
                  </div>
                </div>
                <button
                  onClick={goBook}
                  className="w-full py-4 rounded-2xl bg-black text-white font-bold text-sm hover:bg-gray-900 active:scale-[0.98] transition-all mt-2"
                  data-testid="schedule-cta"
                >
                  See availability
                </button>
              </div>
            </div>

            {/* Benefits card */}
            <div className="space-y-4">
              <p className="text-gray-500 text-lg leading-relaxed mb-6">
                Book in advance and get a Dapr Pro exactly when your schedule allows — no waiting, no surprises.
              </p>
              {[
                {
                  icon: Calendar,
                  title: "Choose a time that works for you",
                  desc: "Book your service in advance. Morning, afternoon, or weekend — we fit your schedule.",
                },
                {
                  icon: Navigation,
                  title: "Your Pro comes to you",
                  desc: "Home, work, apartment, or another approved location. We bring everything needed.",
                },
                {
                  icon: Shield,
                  title: "Vetted Dapr Pros",
                  desc: "Providers are screened and approved before joining the platform.",
                },
              ].map((b) => (
                <div key={b.title} className="flex gap-4 bg-white rounded-2xl p-5 border border-gray-100">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                    <b.icon size={18} className="text-[#8c52ff]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-black text-sm mb-1">{b.title}</h4>
                    <p className="text-gray-500 text-sm leading-relaxed">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How Dapr works ────────────────────────────────────────────────── */}
      <section className="py-14 lg:py-28">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10 lg:mb-14">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-black mb-4">How Dapr works</h2>
            <p className="text-gray-500 text-base lg:text-lg">Three simple steps to a cleaner car.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                num: "01",
                icon: Car,
                title: "Book your car",
                desc: "Choose your vehicle, service, location, and time. Takes under two minutes.",
              },
              {
                num: "02",
                icon: Navigation,
                title: "Meet your Pro",
                desc: "A vetted Dapr Pro comes to your location fully equipped. Track them live.",
              },
              {
                num: "03",
                icon: Star,
                title: "Get back to your day",
                desc: "Track your appointment, get notified when done, and enjoy a clean car.",
              },
            ].map((step) => (
              <div key={step.num} className="bg-gray-50 rounded-3xl p-6 sm:p-8 hover:bg-gray-100/60 transition-colors">
                <div className="text-4xl font-extrabold text-gray-200 mb-4 leading-none">{step.num}</div>
                <div className="w-10 h-10 rounded-2xl bg-[#8c52ff]/10 flex items-center justify-center mb-4">
                  <step.icon size={18} className="text-[#8c52ff]" />
                </div>
                <h3 className="font-bold text-black text-lg mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ── Dapr for Fleets ───────────────────────────────────────────────── */}
      <section className="py-14 lg:py-28">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-black rounded-[2rem] overflow-hidden">
            <div className="grid lg:grid-cols-2 gap-0">
              {/* Text side */}
              <div className="p-8 sm:p-10 lg:p-14 flex flex-col justify-center">
                <span className="text-xs font-bold text-[#8c52ff] uppercase tracking-widest mb-4">For Business</span>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight mb-5">
                  Dapr for Fleets
                </h2>
                <p className="text-gray-400 text-base lg:text-lg leading-relaxed mb-8">
                  Keep your entire fleet spotless without lifting a finger. Recurring schedules, centralized billing, and dedicated support — built for growing businesses.
                </p>
                <div className="space-y-3 mb-10">
                  {[
                    "Recurring scheduled service",
                    "Multi-vehicle management",
                    "Centralized invoicing & reporting",
                    "Dedicated account manager",
                  ].map((f) => (
                    <div key={f} className="flex items-center gap-3 text-gray-300 text-sm">
                      <Icon icon={CheckCircle2} size="sm" className="text-[#8c52ff] shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
                <button
                  onClick={goCorporate}
                  className="inline-flex items-center gap-2 self-start bg-white text-black px-6 py-3.5 rounded-full font-bold text-sm hover:bg-gray-100 transition-colors"
                  data-testid="fleets-cta"
                >
                  Explore Dapr for Fleets <Icon icon={ArrowRight} size="xs" />
                </button>
              </div>
              {/* Visual side */}
              <div className="relative hidden lg:flex items-center justify-center bg-white/5 border-l border-white/10 min-h-[360px]">
                <div className="grid grid-cols-2 gap-3 p-10 w-full">
                  {[
                    { label: "Vehicles", value: "24", sub: "Active fleet" },
                    { label: "This month", value: "$1,840", sub: "Saved vs. lot wash" },
                    { label: "Services", value: "96", sub: "Completed YTD" },
                    { label: "Rating", value: "4.97★", sub: "Fleet average" },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-white/5 rounded-2xl p-5 border border-white/10">
                      <p className="text-xs text-gray-500 font-medium mb-1">{stat.label}</p>
                      <p className="text-2xl font-extrabold text-white">{stat.value}</p>
                      <p className="text-xs text-gray-500 mt-1">{stat.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Become a Pro ──────────────────────────────────────────────────── */}
      <section className="py-14 lg:py-28 bg-gray-50/60 border-y border-gray-100">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
            <div>
              <span className="text-xs font-bold text-[#8c52ff] uppercase tracking-widest mb-4 block">For Professionals</span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-black mb-5">
                Your skills.<br />Your schedule.<br />Your business.
              </h2>
              <p className="text-gray-500 text-base lg:text-lg leading-relaxed mb-8">
                Join the Dapr Pro network and earn on your own terms. We connect you with customers — you bring the expertise.
              </p>
              <div className="space-y-4 mb-10">
                {[
                  { icon: Zap, title: "Set your own hours", desc: "Work when you want — full-time or part-time." },
                  { icon: BarChart3, title: "Keep more of what you earn", desc: "Transparent pricing with no surprise deductions." },
                  { icon: Users, title: "Get jobs instantly", desc: "Dapr handles marketing, booking, and payments." },
                ].map((b) => (
                  <div key={b.title} className="flex gap-4">
                    <div className="w-9 h-9 rounded-xl bg-[#8c52ff]/10 flex items-center justify-center shrink-0">
                      <b.icon size={16} className="text-[#8c52ff]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-black text-sm mb-0.5">{b.title}</h4>
                      <p className="text-gray-500 text-sm">{b.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={goBecomePro}
                className="inline-flex items-center gap-2 bg-black text-white px-7 py-4 rounded-full font-bold text-sm hover:bg-gray-900 transition-colors"
                data-testid="become-pro-cta"
              >
                Become a Dapr Pro <Icon icon={ArrowRight} size="xs" />
              </button>
            </div>
            {/* Pro photo */}
            <div className="relative rounded-3xl overflow-hidden bg-gray-900 aspect-[4/3] lg:aspect-auto lg:h-[440px]">
              <img
                src="/become-a-pro-hero.jpg"
                alt="Dapr Pro detailing a Porsche"
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/10" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-gray-100 pt-12 lg:pt-16 pb-10">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 lg:gap-8 mb-10 lg:mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-3 lg:col-span-2">
              <img src={dapprLogo} alt="Dapr" className="h-16 w-auto" />
              <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                Professional mobile car care, delivered to your door. Vetted Pros. On-demand or scheduled.
              </p>
            </div>

            {/* Dapr */}
            <div>
              <h4 className="font-bold text-black text-sm mb-4">Dapr</h4>
              <ul className="space-y-3 text-sm text-gray-500">
                {[
                  { label: "About Us", path: "/about" },
                  { label: "Careers", path: "/careers" },
                  { label: "Blog", path: "/blog" },
                  { label: "Offers", path: "/first-wash-offer" },
                ].map((l) => (
                  <li key={l.label}><button onClick={() => setLocation(l.path)} className="hover:text-black transition-colors">{l.label}</button></li>
                ))}
              </ul>
            </div>

            {/* Customers */}
            <div>
              <h4 className="font-bold text-black text-sm mb-4">Customers</h4>
              <ul className="space-y-3 text-sm text-gray-500">
                {[
                  { label: "Book a service", path: "/auth" },
                  { label: "Help", path: "/faq" },
                  { label: "Account", path: "/auth" },
                ].map((l) => (
                  <li key={l.label}><button onClick={() => setLocation(l.path)} className="hover:text-black transition-colors">{l.label}</button></li>
                ))}
              </ul>
            </div>

            {/* Pros */}
            <div>
              <h4 className="font-bold text-black text-sm mb-4">Pros</h4>
              <ul className="space-y-3 text-sm text-gray-500">
                {[
                  { label: "Become a Pro", path: "/become-a-pro" },
                  { label: "Pro resources", path: "/faq" },
                  { label: "Pro login", path: "/auth" },
                ].map((l) => (
                  <li key={l.label}><button onClick={() => setLocation(l.path)} className="hover:text-black transition-colors">{l.label}</button></li>
                ))}
              </ul>
            </div>

            {/* Business & Legal */}
            <div>
              <h4 className="font-bold text-black text-sm mb-4">Business</h4>
              <ul className="space-y-3 text-sm text-gray-500 mb-6">
                {[{ label: "Fleets", path: "/corporate" }].map((l) => (
                  <li key={l.label}><button onClick={() => setLocation(l.path)} className="hover:text-black transition-colors">{l.label}</button></li>
                ))}
              </ul>
              <h4 className="font-bold text-black text-sm mb-4">Legal</h4>
              <ul className="space-y-3 text-sm text-gray-500">
                {[
                  { label: "Privacy Policy", path: "/privacy" },
                  { label: "Terms of Service", path: "/terms" },
                  { label: "Accessibility", path: "/faq" },
                ].map((l) => (
                  <li key={l.label}><button onClick={() => setLocation(l.path)} className="hover:text-black transition-colors">{l.label}</button></li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400">&copy; {new Date().getFullYear()} Dapr Enterprises, Inc. All rights reserved.</p>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <button onClick={() => setLocation("/privacy")} className="hover:text-black transition-colors">Privacy</button>
              <button onClick={() => setLocation("/terms")} className="hover:text-black transition-colors">Terms</button>
              <button onClick={() => setLocation("/faq")} className="hover:text-black transition-colors">Help</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
