import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Crown,
  Droplets,
  Leaf,
  Recycle,
  ShieldCheck,
  Sparkles,
  Wand2,
  Plus,
  Star,
  type LucideIcon,
} from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { ADD_ONS } from "@shared/add-ons";

const dapprLogo = "/dapr-logo.svg";

type Tier = {
  slug: string;
  name: string;
  price: number;
  duration: string;
  icon: LucideIcon;
  tagline: string;
  included: string[];
  bestFor: string[];
  goodToKnow: string[];
};

const TIERS: Tier[] = [
  {
    slug: "essential-wash",
    name: "Essential Wash",
    price: 39,
    duration: "30 min",
    icon: Droplets,
    tagline:
      "The fast, gentle hand wash to keep your car looking sharp between deeper details. Built for vehicles already in good shape.",
    included: [
      "Gentle hand wash with pH-balanced soap",
      "Quick spray wax for added shine",
      "Wheel face rinse",
      "Tire wipe",
      "Interior vacuum",
      "Light wipe-down of main interior surfaces",
      "Streak-free windows",
    ],
    bestFor: [
      "Weekly or bi-weekly maintenance",
      "Vehicles already in fairly good shape",
      "Keeping your car clean between deeper details",
    ],
    goodToKnow: [
      "Does not include deep stain removal, seat shampooing, or heavy interior restoration",
      "Best suited for lightly soiled vehicles",
    ],
  },
  {
    slug: "interior-detail",
    name: "Interior Detail",
    price: 89,
    duration: "60 min",
    icon: Sparkles,
    tagline:
      "A focused interior reset. We attack built-up dust, crumbs, spills, and everyday mess so your cabin feels brand new again.",
    included: [
      "Full interior vacuum",
      "Dash, console, door panels, and cup holder cleaning",
      "Seat cleaning",
      "Chemical treatment on interior surfaces",
      "Light stain treatment",
      "Crevice and touchpoint cleaning",
      "Interior windows cleaned",
    ],
    bestFor: [
      "Vehicles with built-up dust, crumbs, spills, or everyday mess",
      "Families, commuters, and work vehicles needing an interior reset",
    ],
    goodToKnow: [
      "Light stain treatment is included; severe stains, pet hair, or bio messes may need an add-on",
      "Exterior wash is not the focus of this package",
    ],
  },
  {
    slug: "refresh-detail",
    name: "Refresh Detail",
    price: 149,
    duration: "90 min",
    icon: Wand2,
    tagline:
      "A complete inside-and-out refresh. Combines our Essential Wash and Interior Detail with upgraded wheel work and tire shine.",
    included: [
      "Everything in Essential Wash",
      "Everything in Interior Detail",
      "More thorough wheel cleaning",
      "Tire shine",
      "Full inside-and-out refresh",
    ],
    bestFor: [
      "Customers wanting a full reset without going premium",
      "Monthly upkeep",
      "Preparing a vehicle for sale",
    ],
    goodToKnow: [
      "Designed as a strong all-around maintenance detail",
      "Deep correction or heavy restoration may require Black Label",
    ],
  },
  {
    slug: "black-label",
    name: "Dapr Black Label Detail",
    price: 299,
    duration: "3 hrs",
    icon: Crown,
    tagline:
      "Our flagship signature service. Showroom-finish results from a senior detailer with our most thorough interior and exterior work.",
    included: [
      "Everything in Refresh Detail",
      "Paint decontamination & clay bar treatment",
      "Carpet shampoo",
      "Steam extraction on upholstery and carpets",
      "Leather conditioning where applicable",
      "Engine bay degrease & dress",
      "Premium interior protectant on all surfaces",
      "Door jambs and hidden touchpoints",
    ],
    bestFor: [
      "Showroom-finish results",
      "Annual deep details",
      "Restoring a neglected vehicle",
      "Special occasions and resale prep",
    ],
    goodToKnow: [
      "Performed by a senior detailer",
      "Plan on roughly three hours on site",
      "Heavily soiled vehicles may need additional time at our discretion",
    ],
  },
];

type Differentiator = { icon: LucideIcon; title: string; body: string };
const DIFFERENTIATORS: Differentiator[] = [
  {
    icon: Leaf,
    title: "Eco-friendly products",
    body: "pH-balanced, biodegradable formulas that are safe for your car, your driveway, and the planet.",
  },
  {
    icon: Recycle,
    title: "Sustainable water use",
    body: "Water-conserving methods and spot-free filtration use a fraction of a traditional car wash.",
  },
  {
    icon: ShieldCheck,
    title: "Vetted detailers",
    body: "Background-checked, fully insured, and trained on our zero-scratch wash methodology.",
  },
  {
    icon: Clock,
    title: "Time back in your day",
    body: "Built for busy professionals and parents — we come to you, no waiting rooms or wasted afternoons.",
  },
  {
    icon: Sparkles,
    title: "Satisfaction guarantee",
    body: "Not happy with the result? We'll come back and make it right, no questions asked.",
  },
];

type CompareRow = { feature: string; values: [boolean, boolean, boolean, boolean] };
const COMPARE: CompareRow[] = [
  { feature: "Hand wash & spray wax", values: [true, false, true, true] },
  { feature: "Wheel face rinse + tire wipe", values: [true, false, true, true] },
  { feature: "Deep wheel clean + tire shine", values: [false, false, true, true] },
  { feature: "Interior vacuum", values: [true, true, true, true] },
  { feature: "Streak-free windows", values: [true, true, true, true] },
  { feature: "Full surface cleaning (dash, console, doors)", values: [false, true, true, true] },
  { feature: "Seat cleaning & surface chemical treatment", values: [false, true, true, true] },
  { feature: "Light stain treatment", values: [false, true, true, true] },
  { feature: "Carpet shampoo", values: [false, false, false, true] },
  { feature: "Steam extraction", values: [false, false, false, true] },
  { feature: "Paint decontamination & clay bar", values: [false, false, false, true] },
  { feature: "Engine bay degrease & dress", values: [false, false, false, true] },
  { feature: "Premium interior protectant", values: [false, false, false, true] },
];

export default function ServicesOverview() {
  const isMobile = useIsMobile();
  return isMobile ? <MobileServices /> : <DesktopServices />;
}

/* ---------------------------------------------------------------- DESKTOP */

function DesktopServices() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goBookWith = (slug?: string) => {
    setLocation(slug ? `/booking?service=${slug}` : "/booking");
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-[#8c52ff] selection:text-white font-sans overflow-hidden">
      {/* Nav */}
      <nav
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 border-b border-white/5 ${
          scrolled ? "bg-[#050505]/80 backdrop-blur-md py-4" : "bg-transparent py-6"
        }`}
      >
        <div className="max-w-[1120px] mx-auto px-8 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <button onClick={() => setLocation("/")} className="flex items-center" data-testid="link-home" aria-label="Dapr home">
              <img src={dapprLogo} alt="Dapr" className="h-28 w-auto" />
            </button>
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">
              <button className="text-white" data-testid="link-services-active">Services</button>
              <button onClick={() => setLocation("/how-it-works")} className="hover:text-white transition-colors" data-testid="link-how-it-works">How it Works</button>
              <button onClick={() => setLocation("/corporate")} className="hover:text-white transition-colors" data-testid="link-corporate">For Fleets</button>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {user ? (
              <button onClick={() => setLocation("/profile")} className="text-sm font-medium text-white/60 hover:text-white transition-colors" data-testid="link-profile">
                My Account
              </button>
            ) : (
              <button onClick={() => setLocation("/auth")} className="text-sm font-medium text-white/60 hover:text-white transition-colors" data-testid="link-login">
                Log in
              </button>
            )}
            <button
              onClick={() => goBookWith()}
              className="bg-white text-black px-5 py-2.5 rounded-full text-sm font-bold hover:bg-white/90 transition-transform hover:scale-105 active:scale-95"
              data-testid="button-book-nav"
            >
              Book a Wash
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-40 pb-16 lg:pt-52 lg:pb-24 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#8c52ff]/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="max-w-[1120px] mx-auto px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-[#8c52ff] mb-8 uppercase tracking-wider">
            <Icon icon={Sparkles} size="sm" /> Our Services
          </div>
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6 max-w-4xl mx-auto">
            Every detail of every detail.
          </h1>
          <p className="text-lg lg:text-xl text-white/60 leading-relaxed max-w-2xl mx-auto">
            From a quick weekly hand wash to a full showroom restoration — every Dapr service is performed at your home, office, or curb by a vetted professional with their own water and power.
          </p>
        </div>
      </section>

      {/* Sticky in-page anchor nav (sits below the fixed top nav) */}
      <div
        className={`sticky z-40 border-b border-white/5 bg-[#050505]/85 backdrop-blur-md transition-all duration-300 ${
          scrolled ? "top-[68px]" : "top-[88px]"
        }`}
        data-testid="services-anchor-nav"
      >
        <div className="max-w-[1120px] mx-auto px-8 py-3 flex flex-wrap items-center justify-center gap-2">
          {TIERS.map((t) => (
            <a
              key={t.slug}
              href={`#${t.slug}`}
              className="px-4 py-1.5 rounded-full text-xs font-semibold bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-colors"
              data-testid={`anchor-${t.slug}`}
            >
              {t.name}
            </a>
          ))}
          <a
            href="#compare"
            className="px-4 py-1.5 rounded-full text-xs font-semibold bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-colors"
            data-testid="anchor-compare"
          >
            Compare
          </a>
          <a
            href="#add-ons"
            className="px-4 py-1.5 rounded-full text-xs font-semibold bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-colors"
            data-testid="anchor-add-ons"
            >
              Add-ons
            </a>
        </div>
      </div>

      {/* Why Dapr */}
      <section className="py-16 border-t border-white/5">
        <div className="max-w-[1120px] mx-auto px-8">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-[#8c52ff] uppercase tracking-wider mb-3">Why Dapr</p>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">Premium results, with care for what matters.</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
            {DIFFERENTIATORS.map((d) => (
              <div
                key={d.title}
                className="rounded-2xl border border-white/5 bg-[#0a0a0a] p-6 hover:border-white/10 transition-colors"
                data-testid={`diff-${d.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="w-10 h-10 rounded-xl bg-[#8c52ff]/10 text-[#8c52ff] flex items-center justify-center mb-4">
                  <Icon icon={d.icon} size="md" />
                </div>
                <h3 className="text-base font-bold mb-2 leading-tight">{d.title}</h3>
                <p className="text-sm text-white/55 leading-relaxed">{d.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tier sections */}
      <section className="py-16 border-t border-white/5">
        <div className="max-w-[1120px] mx-auto px-8 space-y-20">
          {TIERS.map((tier, i) => (
            <TierBlock key={tier.slug} tier={tier} index={i} onBook={() => goBookWith(tier.slug)} />
          ))}
        </div>
      </section>

      {/* Compare */}
      <section id="compare" className="py-20 border-t border-white/5 bg-[#070707]">
        <div className="max-w-[1120px] mx-auto px-8">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-[#8c52ff] uppercase tracking-wider mb-3">Compare Services</p>
            <h2 className="text-3xl lg:text-5xl font-bold tracking-tight">All four tiers, side by side.</h2>
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a0a]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/10">
                    <th className="text-left font-semibold text-white/60 px-6 py-5 min-w-[260px]">Feature</th>
                    {TIERS.map((t) => (
                      <th key={t.slug} className="text-center font-semibold text-white px-4 py-5 min-w-[140px]">
                        <div className="flex flex-col items-center gap-1">
                          <Icon icon={t.icon} size="sm" className="text-[#8c52ff]" />
                          <span className="text-[13px] leading-tight">{t.name}</span>
                          <span className="text-[11px] text-white/40 font-normal">${t.price}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARE.map((row) => (
                    <tr key={row.feature} className="border-b border-white/5 last:border-0">
                      <td className="px-6 py-4 text-white/80">{row.feature}</td>
                      {row.values.map((v, idx) => (
                        <td key={idx} className="px-4 py-4 text-center">
                          {v ? (
                            <Icon icon={Check} size="sm" className="text-[#8c52ff] mx-auto" />
                          ) : (
                            <span className="text-white/20">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-center text-xs text-white/40 mt-6 leading-relaxed max-w-2xl mx-auto">
            Final results vary based on vehicle size and condition. Heavy soiling, pet hair, or unusual conditions may require an upgrade or add-on.
          </p>
        </div>
      </section>

      {/* Add-ons */}
      <section id="add-ons" className="py-20 border-t border-white/5">
        <div className="max-w-[1120px] mx-auto px-8">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-[#8c52ff] uppercase tracking-wider mb-3">Add-Ons</p>
            <h2 className="text-3xl lg:text-5xl font-bold tracking-tight mb-4">Tailor any service to your car.</h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              Add any of these to a base package at checkout. Extra time will be reserved automatically.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ADD_ONS.map((a) => (
              <div
                key={a.name}
                className="rounded-2xl border border-white/5 bg-[#0a0a0a] p-6 hover:border-white/10 transition-colors"
                data-testid={`addon-${a.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#8c52ff]/10 text-[#8c52ff] flex items-center justify-center shrink-0">
                      <Icon icon={Plus} size="sm" />
                    </div>
                    <h3 className="text-base font-bold leading-tight">{a.name}</h3>
                  </div>
                  <p className="text-base font-bold text-[#8c52ff] shrink-0">${a.price}</p>
                </div>
                <p className="text-sm text-white/55 leading-relaxed pl-12">{a.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 relative border-t border-white/5">
        <div className="absolute inset-0 bg-[#8c52ff]/5" />
        <div className="max-w-[1100px] mx-auto px-8 relative z-10 text-center">
          <h2 className="text-4xl lg:text-6xl font-extrabold tracking-tight mb-8">Ready for a Dapr clean?</h2>
          <p className="text-xl text-white/60 max-w-2xl mx-auto mb-12">
            Pick your service and we'll come to you. Most bookings start in under 60 minutes.
          </p>
          <button
            onClick={() => goBookWith()}
            className="bg-white text-black px-10 py-5 rounded-full text-lg font-bold hover:bg-white/90 transition-transform hover:scale-105 active:scale-95 shadow-[0_0_40px_-10px_rgba(255,255,255,0.5)] inline-flex items-center gap-3"
            data-testid="button-final-cta"
          >
            Book a Wash <Icon icon={ArrowRight} size="md" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-[#020202]">
        <div className="max-w-[1120px] mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <img src={dapprLogo} alt="Dapr" className="h-20 w-auto opacity-80" />
          <div className="flex gap-6 text-sm text-white/40">
            <button onClick={() => setLocation("/faq")} className="hover:text-white transition-colors" data-testid="link-faq-footer">FAQ</button>
            <button onClick={() => setLocation("/corporate")} className="hover:text-white transition-colors" data-testid="link-corporate-footer">For Fleets</button>
            <button onClick={() => setLocation("/how-it-works")} className="hover:text-white transition-colors" data-testid="link-how-footer">How it Works</button>
          </div>
          <p className="text-sm text-white/40">&copy; {new Date().getFullYear()} Dapr. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function TierBlock({ tier, index, onBook }: { tier: Tier; index: number; onBook: () => void }) {
  const TierIcon = tier.icon;
  const reverse = index % 2 === 1;
  return (
    <div id={tier.slug} className="scroll-mt-32">
      <div className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-start ${reverse ? "lg:[direction:rtl]" : ""}`}>
        {/* Header / pitch column */}
        <div className="lg:[direction:ltr]">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#8c52ff]/15 text-[#8c52ff] flex items-center justify-center">
              <Icon icon={TierIcon} size="lg" />
            </div>
            <span className="text-xs font-semibold text-[#8c52ff] uppercase tracking-wider">
              Tier {String(index + 1).padStart(2, "0")}
            </span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.05] mb-4">{tier.name}</h2>
          <div className="flex items-baseline gap-3 mb-6">
            <p className="text-3xl font-bold text-white">${tier.price}</p>
            <p className="text-sm text-white/40 font-medium">starting price</p>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <p className="text-sm text-white/60 font-medium flex items-center gap-1.5">
              <Icon icon={Clock} size="xs" /> {tier.duration}
            </p>
          </div>
          <p className="text-lg text-white/70 leading-relaxed mb-8 max-w-lg">{tier.tagline}</p>
          <button
            onClick={onBook}
            className="bg-[#8c52ff] text-white px-7 py-3.5 rounded-full text-sm font-bold hover:bg-[#7a42e5] transition-all hover:scale-105 active:scale-95 inline-flex items-center gap-2 shadow-[0_0_30px_-10px_#8c52ff]"
            data-testid={`button-book-${tier.slug}`}
          >
            Book {tier.name} <Icon icon={ArrowRight} size="sm" />
          </button>
        </div>

        {/* Lists column */}
        <div className="lg:[direction:ltr] rounded-3xl border border-white/10 bg-[#0a0a0a] p-8 space-y-6">
          <DetailList title="What's included" items={tier.included} />
          <div className="h-px bg-white/5" />
          <DetailList title="Best for" items={tier.bestFor} muted />
          <div className="h-px bg-white/5" />
          <DetailList title="Good to know" items={tier.goodToKnow} muted />
        </div>
      </div>
    </div>
  );
}

function DetailList({ title, items, muted }: { title: string; items: string[]; muted?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-3">{title}</p>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className={`flex items-start gap-2.5 leading-snug ${muted ? "text-sm text-white/60" : "text-sm text-white/85"}`}>
            <Icon icon={Check} size="sm" className="text-[#8c52ff] mt-0.5 shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------------- MOBILE */

function MobileServices() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [openTier, setOpenTier] = useState<string | null>(TIERS[0].slug);
  const [openAddOns, setOpenAddOns] = useState(false);

  const goBookWith = (slug?: string) => {
    setLocation(slug ? `/booking?service=${slug}` : "/booking");
  };

  return (
    <div
      className="min-h-screen bg-white font-sans"
      style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom))" }}
    >
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="px-5 pt-12 pb-5">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 text-[11px] font-semibold tracking-widest text-[#888] uppercase mb-4 hover:text-[#111] transition-colors"
            data-testid="link-back"
          >
            <Icon icon={ArrowLeft} size="sm" />
            Dapr
          </button>
          <p className="text-[10px] font-semibold tracking-widest text-[#8c52ff] uppercase mb-2">Our Services</p>
          <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-[#111] leading-tight mb-3">
            Every detail of every detail.
          </h1>
          <p className="text-[14px] text-[#666] leading-relaxed">
            From a quick hand wash to a full showroom restoration — every service is performed at your home or office by a vetted pro.
          </p>
        </div>

        {/* Why Dapr compact */}
        <div className="px-5 pb-2">
          <p className="text-[10px] font-semibold tracking-widest text-[#999] uppercase mb-3">Why Dapr</p>
          <div className="grid grid-cols-2 gap-2">
            {DIFFERENTIATORS.slice(0, 4).map((d) => (
              <div key={d.title} className="rounded-xl border border-[#ededed] p-3" data-testid={`mobile-diff-${d.title.toLowerCase().replace(/\s+/g, "-")}`}>
                <div className="w-7 h-7 rounded-lg bg-[#f4f0ff] text-[#8c52ff] flex items-center justify-center mb-2">
                  <Icon icon={d.icon} size="xs" />
                </div>
                <p className="text-[12px] font-semibold text-[#111] leading-tight mb-1">{d.title}</p>
                <p className="text-[11px] text-[#888] leading-snug">{d.body}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3 px-3 py-2.5 rounded-xl bg-[#faf7ff] border border-[#ece2ff]">
            <Icon icon={Star} size="sm" className="text-[#8c52ff] shrink-0" />
            <p className="text-[12px] text-[#444] leading-snug">
              <span className="font-semibold text-[#111]">Satisfaction guarantee.</span> Not happy? We'll come back and make it right.
            </p>
          </div>
        </div>

        {/* Tiers — accordion */}
        <div className="pt-6">
          <p className="px-5 text-[10px] font-semibold tracking-widest text-[#999] uppercase mb-1">Services</p>
          <div className="border-t border-[#ededed] mt-3">
            {TIERS.map((tier) => {
              const TierIcon = tier.icon;
              const expanded = openTier === tier.slug;
              return (
                <div key={tier.slug} className="border-b border-[#ededed] last:border-0" data-testid={`mobile-tier-${tier.slug}`}>
                  <button
                    onClick={() => setOpenTier(expanded ? null : tier.slug)}
                    aria-expanded={expanded}
                    className="w-full text-left flex items-center px-5 py-4 active:bg-[#fafafa] hover:bg-[#fafafa] transition-colors"
                    data-testid={`mobile-tier-toggle-${tier.slug}`}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mr-4 bg-[#f4f0ff] text-[#8c52ff]">
                      <Icon icon={TierIcon} size="sm" />
                    </div>
                    <div className="flex-1 pr-4 min-w-0">
                      <p className="text-[15px] font-semibold text-[#111] mb-0.5">{tier.name}</p>
                      <p className="text-[12px] text-[#888] leading-snug">{tier.tagline}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-[15px] font-bold text-[#111]">${tier.price}</p>
                        <div className="flex items-center gap-1 justify-end">
                          <Icon icon={Clock} size="xs" className="text-[#aaa]" />
                          <p className="text-[11px] text-[#aaa]">{tier.duration}</p>
                        </div>
                      </div>
                      <Icon icon={ChevronDown} size="sm" className={` text-[#bbb] transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  <div
                    className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                      expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                    aria-hidden={!expanded}
                  >
                    <div className="overflow-hidden">
                      <div className="px-5 pl-[76px] pb-5">
                        <div className="border-t border-[#f0f0f0] pt-1">
                          <MobileSection title="Included" items={tier.included} />
                          <div className="h-px bg-[#f4f4f4] mt-4" />
                          <MobileSection title="Best for" items={tier.bestFor} />
                          <div className="h-px bg-[#f4f4f4] mt-4" />
                          <MobileSection title="Good to know" items={tier.goodToKnow} />
                          <button
                            onClick={() => goBookWith(tier.slug)}
                            className="mt-5 inline-flex items-center gap-1.5 bg-[#111] text-white text-[13px] font-semibold rounded-full px-5 py-2.5 hover:bg-[#000] transition-colors"
                            data-testid={`mobile-book-${tier.slug}`}
                          >
                            Book {tier.name}
                            <Icon icon={ChevronRight} size="xs" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Compare — horizontally scrollable */}
        <div className="pt-8" data-testid="mobile-compare-section">
          <div className="px-5 mb-3 flex items-center justify-between">
            <p className="text-[10px] font-semibold tracking-widest text-[#999] uppercase">Compare</p>
            <p className="text-[10px] text-[#bbb]">Swipe →</p>
          </div>
          <div className="overflow-x-auto -mx-0 pl-5 pr-5 pb-2" style={{ WebkitOverflowScrolling: "touch" }}>
            <div className="inline-block min-w-full align-top">
              <table className="border-separate border-spacing-0 text-left">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-white pr-3 pb-3 text-[10px] font-semibold uppercase tracking-widest text-[#999] align-bottom">
                      Feature
                    </th>
                    {TIERS.map((t) => (
                      <th
                        key={t.slug}
                        className="px-3 pb-3 align-bottom min-w-[110px]"
                        data-testid={`mobile-compare-col-${t.slug}`}
                      >
                        <p className="text-[12px] font-semibold text-[#111] leading-tight whitespace-nowrap">{t.name}</p>
                        <p className="text-[11px] font-bold text-[#8c52ff] mt-0.5">${t.price}</p>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARE.map((row, i) => (
                    <tr key={i}>
                      <td className="sticky left-0 z-10 bg-white pr-3 py-2.5 border-t border-[#f0f0f0] text-[12px] text-[#444] leading-snug">
                        {row.feature}
                      </td>
                      {row.values.map((v, j) => (
                        <td
                          key={j}
                          className="px-3 py-2.5 border-t border-[#f0f0f0] text-center"
                        >
                          {v ? (
                            <Icon icon={Check} size="xs" className="text-[#8c52ff] inline-block" />
                          ) : (
                            <span className="text-[#ddd] text-[14px] leading-none">–</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Add-ons — collapsed list */}
        <div className="pt-6 px-5">
          <p className="text-[10px] font-semibold tracking-widest text-[#999] uppercase mb-3">Add-Ons</p>
          <button
            onClick={() => setOpenAddOns((v) => !v)}
            aria-expanded={openAddOns}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[#ededed] active:bg-[#fafafa] hover:bg-[#fafafa] transition-colors"
            data-testid="mobile-toggle-add-ons"
          >
            <span className="text-[14px] font-semibold text-[#111]">{ADD_ONS.length} optional extras</span>
            <Icon icon={ChevronDown} size="sm" className={` text-[#bbb] transition-transform duration-300 ${openAddOns ? "rotate-180" : ""}`} />
          </button>

          <div
            className={`grid transition-[grid-template-rows] duration-300 ease-out ${
              openAddOns ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
            aria-hidden={!openAddOns}
          >
            <div className="overflow-hidden">
              <div className="pt-3 space-y-2">
                {ADD_ONS.map((a) => (
                  <div
                    key={a.name}
                    className="flex items-start justify-between gap-3 px-4 py-3 rounded-xl border border-[#ededed]"
                    data-testid={`mobile-addon-${a.name.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#111] mb-0.5">{a.name}</p>
                      <p className="text-[12px] text-[#888] leading-snug">{a.description}</p>
                    </div>
                    <p className="text-[14px] font-bold text-[#8c52ff] shrink-0">${a.price}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="text-[11px] text-[#999] leading-relaxed mt-3">
            Add any of these to a base package at checkout. We'll reserve the extra time automatically.
          </p>
        </div>

        {/* Final CTA */}
        <div className="px-5 pt-8">
          <div className="rounded-2xl bg-[#111] p-6 text-center">
            <h3 className="text-[20px] font-bold text-white mb-2">Ready for a Dapr clean?</h3>
            <p className="text-[13px] text-white/60 mb-5 leading-relaxed">
              Pick your service and we'll come to you.
            </p>
            <button
              onClick={() => goBookWith()}
              className="bg-[#8c52ff] text-white px-6 py-3 rounded-full text-sm font-bold hover:bg-[#7a42e5] transition-colors inline-flex items-center gap-2"
              data-testid="mobile-button-final-cta"
            >
              Book a Wash <Icon icon={ArrowRight} size="sm" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="pt-4">
      <p className="text-[10px] font-semibold tracking-widest text-[#999] uppercase mb-2">{title}</p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-[13px] text-[#444] leading-snug">
            <Icon icon={Check} size="xs" className="text-[#8c52ff] mt-[3px] shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
