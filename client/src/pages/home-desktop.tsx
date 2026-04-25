import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, CheckCircle2, Clock, MapPin, Shield, Star, ChevronRight, Smartphone, ChevronDown, Navigation } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const TIME_OPTIONS = [
  { id: "now", label: "Arrive now" },
  { id: "today", label: "Later today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "schedule", label: "Pick a date & time" },
] as const;

const dapprLogo = "/dapr-logo.svg";

export default function HomeDesktop() {
  const [scrolled, setScrolled] = useState(false);
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const goBook = () => setLocation(user ? "/booking" : "/auth");
  const goServices = () => setLocation(user ? "/services" : "/auth");
  const goLogin = () => setLocation("/auth");
  const goHowItWorks = () => setLocation("/how-it-works");
  const goCorporate = () => setLocation("/corporate");

  const [timeOpt, setTimeOpt] = useState<(typeof TIME_OPTIONS)[number]>(TIME_OPTIONS[0]);
  const [timeOpen, setTimeOpen] = useState(false);
  const [locationInput, setLocationInput] = useState("");
  const timePopRef = useRef<HTMLDivElement | null>(null);

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

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-[#8c52ff] selection:text-white font-sans overflow-hidden">
      {/* Navigation */}
      <nav
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 border-b border-white/5 ${
          scrolled ? "bg-[#050505]/80 backdrop-blur-md py-4" : "bg-transparent py-6"
        }`}
      >
        <div className="max-w-[1280px] mx-auto px-8 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <button onClick={() => setLocation("/")} className="flex items-center" data-testid="link-home" aria-label="Dapper home">
              <img src={dapprLogo} alt="Dapper" className="h-28 w-auto" />
            </button>
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">
              <button onClick={goServices} className="hover:text-white transition-colors" data-testid="link-services">Services</button>
              <button onClick={goHowItWorks} className="hover:text-white transition-colors" data-testid="link-how-it-works">How it Works</button>
              <button onClick={goCorporate} className="hover:text-white transition-colors" data-testid="link-corporate">For Fleets</button>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {user ? (
              <button onClick={() => setLocation("/profile")} className="text-sm font-medium text-white/60 hover:text-white transition-colors" data-testid="link-profile">
                My Account
              </button>
            ) : (
              <button onClick={goLogin} className="text-sm font-medium text-white/60 hover:text-white transition-colors" data-testid="link-login">
                Log in
              </button>
            )}
            <button
              onClick={goBook}
              className="bg-white text-black px-5 py-2.5 rounded-full text-sm font-bold hover:bg-white/90 transition-transform hover:scale-105 active:scale-95"
              data-testid="button-book-nav"
            >
              Book a Wash
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 lg:pt-52 lg:pb-32 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#8c52ff]/20 rounded-full blur-[120px] pointer-events-none opacity-50" />

        <div className="max-w-[1280px] mx-auto px-8 relative z-10 grid lg:grid-cols-2 gap-16 items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-[#8c52ff] mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8c52ff] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#8c52ff]"></span>
              </span>
              Detailers available near you
            </div>
            <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
              The premium car wash that{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8c52ff] to-[#b28cff]">comes to you.</span>
            </h1>
            <p className="text-lg lg:text-xl text-white/60 mb-8 leading-relaxed max-w-xl">
              Book in seconds. Track your detailer live. Return to a showroom-finish car without ever leaving your home or office.
            </p>

            {/* Time selector pill */}
            <div className="relative inline-block mb-4" ref={timePopRef}>
              <button
                onClick={() => setTimeOpen((o) => !o)}
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white rounded-full pl-3 pr-4 py-2.5 text-sm font-semibold border border-white/10 transition-colors"
                data-testid="button-time-picker"
                aria-haspopup="listbox"
                aria-expanded={timeOpen}
              >
                <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5" />
                </span>
                {timeOpt.label}
                <ChevronDown className={`w-4 h-4 transition-transform ${timeOpen ? "rotate-180" : ""}`} />
              </button>
              {timeOpen && (
                <div
                  className="absolute top-full mt-2 left-0 z-30 w-64 bg-[#111] border border-white/10 rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden py-1"
                  role="listbox"
                >
                  {TIME_OPTIONS.map((opt) => {
                    const active = timeOpt.id === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setTimeOpt(opt);
                          setTimeOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 text-sm hover:bg-white/5 flex items-center justify-between transition-colors ${
                          active ? "text-[#8c52ff] font-semibold" : "text-white"
                        }`}
                        role="option"
                        aria-selected={active}
                        data-testid={`time-option-${opt.id}`}
                      >
                        {opt.label}
                        {active && <CheckCircle2 className="w-4 h-4" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Vehicle location input */}
            <div className="bg-white/10 hover:bg-white/15 focus-within:bg-white/15 focus-within:border-[#8c52ff] transition-colors rounded-2xl px-5 py-4 flex items-center gap-4 mb-6 border border-white/10 max-w-xl">
              <div className="w-2.5 h-2.5 rounded-full bg-white shrink-0" />
              <input
                type="text"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                placeholder="Vehicle location"
                className="flex-1 bg-transparent outline-none text-base placeholder:text-white/50"
                data-testid="input-vehicle-location"
                onKeyDown={(e) => {
                  if (e.key === "Enter") goBook();
                }}
              />
              <Navigation className="w-5 h-5 text-white/60 shrink-0" />
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={goBook}
                className="bg-[#8c52ff] text-white px-8 py-4 rounded-full text-base font-bold hover:bg-[#7a42e5] transition-all hover:scale-105 active:scale-95 flex items-center gap-2 shadow-[0_0_40px_-10px_#8c52ff]"
                data-testid="button-book-hero"
              >
                See Prices <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={goServices}
                className="bg-white/5 text-white border border-white/10 px-8 py-4 rounded-full text-base font-bold hover:bg-white/10 transition-all"
                data-testid="button-view-services"
              >
                View Services
              </button>
            </div>

            <div className="mt-12 flex items-center gap-6 border-t border-white/10 pt-8">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full bg-[#1a1a1a] border-2 border-[#050505] flex items-center justify-center overflow-hidden">
                    <img
                      src={`https://api.dicebear.com/7.x/notionists/svg?seed=${i}&backgroundColor=transparent`}
                      alt="Customer"
                      className="w-full h-full object-cover opacity-80"
                    />
                  </div>
                ))}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-4 h-4 fill-[#8c52ff] text-[#8c52ff]" />
                  ))}
                </div>
                <span className="text-sm text-white/60 font-medium">4.9/5 from 10,000+ washes</span>
              </div>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="relative w-full aspect-square lg:aspect-auto lg:h-[700px] rounded-3xl border border-white/10 bg-[#0a0a0a] overflow-hidden shadow-2xl">
            <img
              src="/desktop/hero-car.jpg"
              alt="Dapper Wash"
              className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-luminosity"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />

            <div className="absolute top-8 left-8 right-8 flex justify-between items-start">
              <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 w-64 shadow-2xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#8c52ff]/20 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-[#8c52ff]" />
                  </div>
                  <div>
                    <p className="text-xs text-white/60 font-medium">Arriving in</p>
                    <p className="text-lg font-bold">12 mins</p>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-[#8c52ff] w-3/4 rounded-full" />
                </div>
              </div>
            </div>

            <div className="absolute bottom-8 right-8 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#8c52ff]">
                  <img
                    src="https://api.dicebear.com/7.x/notionists/svg?seed=Marcus&backgroundColor=transparent"
                    alt="Detailer"
                    className="w-full h-full bg-[#1a1a1a]"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-[#8c52ff] w-4 h-4 rounded-full border-2 border-black flex items-center justify-center">
                  <CheckCircle2 className="w-2 h-2 text-white" />
                </div>
              </div>
              <div>
                <p className="text-sm font-bold">Marcus T.</p>
                <p className="text-xs text-white/60">Premium Detailer</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logos Section */}
      <section className="py-10 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-[1280px] mx-auto px-8">
          <p className="text-center text-sm font-medium text-white/40 mb-8 uppercase tracking-widest">
            Trusted by fleets &amp; professionals at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-12 lg:gap-24 opacity-40 grayscale">
            {["Vivint", "Adobe", "Bill.com", "dōTERRA", "Lucid"].map((name, i) => (
              <div key={i} className="text-xl font-bold tracking-tighter">
                {name}
              </div>
            ))}
            <img src="/podium-logo.png" alt="Podium" className="h-6 w-auto invert" />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-32 relative">
        <div className="max-w-[1280px] mx-auto px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl lg:text-5xl font-bold tracking-tight mb-6">Frictionless from tap to shine.</h2>
            <p className="text-lg text-white/60">
              We rebuilt the car wash experience around your time. No waiting in lines, no subpar results. Just seamless technology and expert detailers.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 hover:border-white/10 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-[#8c52ff]/10 text-[#8c52ff] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">1. Book in seconds</h3>
              <p className="text-white/60 leading-relaxed mb-8">
                Select your service, choose a time, and tell us where the car is parked. We handle the rest.
              </p>
              <div className="aspect-[4/3] rounded-2xl bg-[#111] border border-white/5 relative overflow-hidden flex items-center justify-center">
                <div className="w-48 bg-black border border-white/10 rounded-2xl p-4 shadow-xl transform group-hover:-translate-y-2 transition-transform duration-500">
                  <div className="h-4 w-20 bg-white/10 rounded mb-4" />
                  <div className="space-y-2">
                    <div className="h-10 w-full bg-white/5 rounded-lg border border-[#8c52ff]/30 flex items-center px-3">
                      <div className="w-4 h-4 rounded-full border border-[#8c52ff] mr-2 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-[#8c52ff]" />
                      </div>
                      <div className="h-2 w-16 bg-white/40 rounded" />
                    </div>
                    <div className="h-10 w-full bg-white/5 rounded-lg border border-white/5 flex items-center px-3">
                      <div className="w-4 h-4 rounded-full border border-white/20 mr-2" />
                      <div className="h-2 w-24 bg-white/20 rounded" />
                    </div>
                  </div>
                  <div className="mt-4 h-8 w-full bg-[#8c52ff] rounded-lg" />
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 hover:border-white/10 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-[#8c52ff]/10 text-[#8c52ff] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">2. Track live</h3>
              <p className="text-white/60 leading-relaxed mb-8">
                Watch your detailer en route on a live map. We bring our own water, power, and premium supplies.
              </p>
              <div className="aspect-[4/3] rounded-2xl bg-[#111] border border-white/5 relative overflow-hidden">
                <img src="/desktop/dark-map.png" alt="Map" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111] to-transparent" />
                <div className="absolute bottom-4 inset-x-4 bg-black/80 backdrop-blur-md border border-white/10 rounded-xl p-3 flex items-center justify-between transform group-hover:translate-y-0 translate-y-1 transition-transform duration-500">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#8c52ff] flex items-center justify-center">
                      <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                    </div>
                    <div>
                      <div className="h-2 w-12 bg-white/80 rounded mb-1.5" />
                      <div className="h-1.5 w-20 bg-white/40 rounded" />
                    </div>
                  </div>
                  <div className="text-xs font-bold text-[#8c52ff]">4 MIN</div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 hover:border-white/10 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-[#8c52ff]/10 text-[#8c52ff] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Star className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">3. Enjoy the shine</h3>
              <p className="text-white/60 leading-relaxed mb-8">
                Get notified when your car is ready. Pay seamlessly through the app and drive a spotless car.
              </p>
              <div className="aspect-[4/3] rounded-2xl bg-[#111] border border-white/5 relative overflow-hidden">
                <img
                  src="/desktop/sparkling-car.png"
                  alt="Clean Car"
                  className="absolute inset-0 w-full h-full object-cover mix-blend-luminosity opacity-70 group-hover:scale-105 group-hover:mix-blend-normal transition-all duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-[#8c52ff] text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 transform translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500">
                    <CheckCircle2 className="w-4 h-4" /> Wash Complete
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Service Tiers */}
      <section className="py-32 bg-[#020202] border-y border-white/5">
        <div className="max-w-[1280px] mx-auto px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
            <div className="max-w-2xl">
              <h2 className="text-3xl lg:text-5xl font-bold tracking-tight mb-6">Expertise at every level.</h2>
              <p className="text-lg text-white/60">
                From a quick exterior refresh to a comprehensive showroom detail, select the perfect tier for your car's needs.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Basic */}
            <div className="flex flex-col p-8 rounded-3xl bg-[#0a0a0a] border border-white/5">
              <h3 className="text-xl font-bold mb-2">Basic</h3>
              <p className="text-white/60 text-sm mb-6">Essential maintenance wash for a clean exterior.</p>
              <div className="mb-8">
                <span className="text-4xl font-bold">$39</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {["Exterior hand wash", "Wheel & tire cleaning", "Window cleaning (outside)", "Tire shine dressing"].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-white/80">
                    <CheckCircle2 className="w-5 h-5 text-[#8c52ff] shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                onClick={goBook}
                className="w-full py-3 rounded-full border border-white/10 font-bold hover:bg-white hover:text-black transition-colors"
                data-testid="button-tier-basic"
              >
                Select Basic
              </button>
            </div>

            {/* Standard (Highlighted) */}
            <div className="flex flex-col p-8 rounded-3xl bg-gradient-to-b from-[#1a1033] to-[#0a0a0a] border border-[#8c52ff]/30 relative transform md:-translate-y-4 shadow-[0_0_40px_-15px_#8c52ff]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#8c52ff] text-white text-xs font-bold px-3 py-1 rounded-full tracking-wider uppercase">
                Most Popular
              </div>
              <h3 className="text-xl font-bold mb-2">Standard</h3>
              <p className="text-white/60 text-sm mb-6">The perfect inside-out clean for regular upkeep.</p>
              <div className="mb-8">
                <span className="text-4xl font-bold">$89</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {["Everything in Basic", "Interior vacuuming", "Wipe down surfaces", "Window cleaning (inside)", "Door jambs cleaning"].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-white/80">
                    <CheckCircle2 className="w-5 h-5 text-[#8c52ff] shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                onClick={goBook}
                className="w-full py-3 rounded-full bg-[#8c52ff] font-bold hover:bg-[#7a42e5] transition-colors"
                data-testid="button-tier-standard"
              >
                Select Standard
              </button>
            </div>

            {/* Premium */}
            <div className="flex flex-col p-8 rounded-3xl bg-[#0a0a0a] border border-white/5">
              <h3 className="text-xl font-bold mb-2">Premium</h3>
              <p className="text-white/60 text-sm mb-6">Comprehensive detailing for a showroom finish.</p>
              <div className="mb-8">
                <span className="text-4xl font-bold">$149</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {["Everything in Standard", "Spray wax application", "Leather cleaning & conditioning", "Floor mat shampooing", "Deep crevice cleaning"].map(
                  (feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-white/80">
                      <CheckCircle2 className="w-5 h-5 text-[#8c52ff] shrink-0" />
                      {feature}
                    </li>
                  ),
                )}
              </ul>
              <button
                onClick={goBook}
                className="w-full py-3 rounded-full border border-white/10 font-bold hover:bg-white hover:text-black transition-colors"
                data-testid="button-tier-premium"
              >
                Select Premium
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Value Prop / Image Feature */}
      <section className="py-32 relative overflow-hidden">
        <div className="max-w-[1280px] mx-auto px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="relative rounded-3xl overflow-hidden aspect-[4/5] lg:aspect-auto lg:h-[600px] border border-white/10">
              <img src="/desktop/interior-detail.png" alt="Interior Detailing" className="w-full h-full object-cover opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />

              <div className="absolute bottom-8 left-8 right-8 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  <Shield className="w-8 h-8 text-[#8c52ff]" />
                  <h4 className="text-xl font-bold">Vetted Professionals</h4>
                </div>
                <p className="text-white/70 text-sm leading-relaxed">
                  Only the top 5% of detailers make it onto our platform. Fully insured, extensively trained, and equipped with professional-grade tools.
                </p>
              </div>
            </div>

            <div className="max-w-xl">
              <h2 className="text-3xl lg:text-5xl font-bold tracking-tight mb-6">Your driveway is the new detailing studio.</h2>
              <p className="text-lg text-white/60 mb-8 leading-relaxed">
                We bring our own spot-free water and independent power supply. We leave nothing behind but a perfectly clean car. No mess, no hassle, no waiting rooms.
              </p>

              <div className="space-y-6">
                {[
                  { title: "Self-Sufficient Vans", desc: "Our detailers arrive fully equipped with water and power." },
                  { title: "Premium Products", desc: "We use only pH-balanced, high-end detailing chemicals." },
                  { title: "Zero Scratch Guarantee", desc: "Two-bucket wash method and fresh microfibers every time." },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="mt-1 w-6 h-6 rounded-full bg-[#8c52ff]/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-[#8c52ff]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white mb-1">{item.title}</h4>
                      <p className="text-sm text-white/60">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={goHowItWorks}
                className="mt-10 flex items-center gap-2 text-[#8c52ff] font-bold hover:text-white transition-colors"
                data-testid="button-learn-process"
              >
                Learn about our process <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative border-t border-white/5">
        <div className="absolute inset-0 bg-[#8c52ff]/5" />
        <div className="max-w-[1280px] mx-auto px-8 relative z-10 text-center">
          <h2 className="text-4xl lg:text-6xl font-extrabold tracking-tight mb-8">Ready for a Dapper clean?</h2>
          <p className="text-xl text-white/60 max-w-2xl mx-auto mb-12">
            Join thousands of car owners who have upgraded to the most convenient detailing experience available.
          </p>
          <button
            onClick={goBook}
            className="bg-white text-black px-10 py-5 rounded-full text-lg font-bold hover:bg-white/90 transition-transform hover:scale-105 active:scale-95 shadow-[0_0_40px_-10px_rgba(255,255,255,0.5)]"
            data-testid="button-book-cta"
          >
            Book Your First Wash
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-[#020202]">
        <div className="max-w-[1280px] mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <img src={dapprLogo} alt="Dapper" className="h-20 w-auto opacity-80" />
          <div className="flex gap-6 text-sm text-white/40">
            <button onClick={() => setLocation("/faq")} className="hover:text-white transition-colors" data-testid="link-faq">FAQ</button>
            <button onClick={goCorporate} className="hover:text-white transition-colors" data-testid="link-corporate-footer">For Fleets</button>
            <button onClick={goHowItWorks} className="hover:text-white transition-colors" data-testid="link-how-footer">How it Works</button>
          </div>
          <p className="text-sm text-white/40">&copy; {new Date().getFullYear()} Dapper. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
