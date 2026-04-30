import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowRight,
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  MapPin,
  Sparkles,
  Truck,
  UserCheck,
  Wrench,
  ShieldCheck,
  Droplets,
  Zap,
  Camera,
  CreditCard,
  type LucideIcon,
} from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";

const dapprLogo = "/dapr-logo.svg";

type Step = {
  number: string;
  icon: LucideIcon;
  title: string;
  body: string;
  bullets: string[];
};

const STEPS: Step[] = [
  {
    number: "01",
    icon: CalendarCheck,
    title: "Book in under a minute",
    body:
      "Pick your service tier, drop in your address, and choose a time that works. No phone tag, no quotes, no waiting on a callback.",
    bullets: [
      "Transparent flat pricing — see the total before you book",
      "Same-day slots typically available",
      "Add-ons like pet hair removal or carpet shampoo at checkout",
    ],
  },
  {
    number: "02",
    icon: UserCheck,
    title: "We match you with a vetted detailer",
    body:
      "Within minutes, we assign a Dapr professional in your area. Every detailer is background-checked, fully insured, and trained on our zero-scratch wash methodology.",
    bullets: [
      "See their name, photo, and rating before they arrive",
      "Real-time chat if you need to share gate codes or notes",
      "Senior detailers reserved for Black Label bookings",
    ],
  },
  {
    number: "03",
    icon: Truck,
    title: "Your detailer comes to you",
    body:
      "Driveway, office parking lot, or curbside — we bring everything we need. You don't have to move your car, find a hose, or run an extension cord.",
    bullets: [
      "Self-contained water and power on every vehicle",
      "Live ETA tracking from the moment they're dispatched",
      "Eco-friendly, biodegradable products that are safe for your driveway",
    ],
  },
  {
    number: "04",
    icon: Wrench,
    title: "We get to work",
    body:
      "Stay and watch, or get back to your day. Your detailer follows the exact checklist for the tier you booked — no shortcuts, no surprises.",
    bullets: [
      "Photo updates pushed to your phone as work progresses",
      "Reach your detailer in-app at any time",
      "Heavily soiled? They'll flag it before adding any time",
    ],
  },
  {
    number: "05",
    icon: ClipboardCheck,
    title: "Final walkthrough and easy pay",
    body:
      "When the work is done, your detailer sends before-and-after photos and a quick walkthrough. Pay in the app, tip optional, and rate your experience in two taps.",
    bullets: [
      "100% satisfaction guarantee — we'll come back if anything's off",
      "Save your car profile for one-tap rebooking",
      "Receipt emailed automatically; perfect for business expenses",
    ],
  },
];

type Highlight = { icon: LucideIcon; title: string; body: string };
const HIGHLIGHTS: Highlight[] = [
  {
    icon: Droplets,
    title: "We bring the water",
    body: "Onboard tanks and spot-free filtration mean no driveway access required.",
  },
  {
    icon: Zap,
    title: "We bring the power",
    body: "Self-contained generators run our extractors, polishers, and steamers.",
  },
  {
    icon: ShieldCheck,
    title: "Insured and vetted",
    body: "Every detailer is background-checked and covered by our liability policy.",
  },
  {
    icon: Camera,
    title: "Photo proof, every time",
    body: "Before-and-after photos are attached to every completed service.",
  },
  {
    icon: CreditCard,
    title: "Cashless and easy",
    body: "Pay in the app — Apple Pay, Google Pay, or any major card.",
  },
  {
    icon: MapPin,
    title: "Wherever you are",
    body: "Home, office, hotel, or curbside — if we can park beside the vehicle, we can wash it.",
  },
];

export default function HowItWorks() {
  const isMobile = useIsMobile();
  return isMobile ? <MobileHowItWorks /> : <DesktopHowItWorks />;
}

/* ---------------------------------------------------------------- DESKTOP */

function DesktopHowItWorks() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
            <button
              onClick={() => setLocation("/")}
              className="flex items-center"
              data-testid="link-home"
              aria-label="Dapr home"
            >
              <img src={dapprLogo} alt="Dapr" className="h-28 w-auto" />
            </button>
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">
              <button
                onClick={() => setLocation("/services")}
                className="hover:text-white transition-colors"
                data-testid="link-services"
              >
                Services
              </button>
              <button className="text-white" data-testid="link-how-it-works-active">
                How it Works
              </button>
              <button
                onClick={() => setLocation("/corporate")}
                className="hover:text-white transition-colors"
                data-testid="link-corporate"
              >
                For Fleets
              </button>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {user ? (
              <button
                onClick={() => setLocation("/profile")}
                className="text-sm font-medium text-white/60 hover:text-white transition-colors"
                data-testid="link-profile"
              >
                My Account
              </button>
            ) : (
              <button
                onClick={() => setLocation("/auth")}
                className="text-sm font-medium text-white/60 hover:text-white transition-colors"
                data-testid="link-login"
              >
                Log in
              </button>
            )}
            <button
              onClick={() => setLocation("/booking")}
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
            <Icon icon={Sparkles} size="sm" /> How It Works
          </div>
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6 max-w-4xl mx-auto">
            Five steps from booked to brilliant.
          </h1>
          <p className="text-lg lg:text-xl text-white/60 leading-relaxed max-w-2xl mx-auto">
            Book in your pajamas. Get matched with a vetted detailer. Watch your car transform — wherever you parked it.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-10 text-xs font-medium text-white/50">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <Icon icon={Clock} size="xs" /> Most bookings start in under 60 minutes
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <Icon icon={ShieldCheck} size="xs" /> Satisfaction guaranteed
            </span>
          </div>
        </div>
      </section>

      {/* Steps timeline */}
      <section className="py-16 border-t border-white/5">
        <div className="max-w-[1120px] mx-auto px-8 space-y-20">
          {STEPS.map((step, i) => (
            <StepBlock key={step.number} step={step} reverse={i % 2 === 1} />
          ))}
        </div>
      </section>

      {/* Highlights */}
      <section className="py-20 border-t border-white/5 bg-[#070707]">
        <div className="max-w-[1120px] mx-auto px-8">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-[#8c52ff] uppercase tracking-wider mb-3">
              What Makes It Effortless
            </p>
            <h2 className="text-3xl lg:text-5xl font-bold tracking-tight">
              We bring everything. You bring the car.
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {HIGHLIGHTS.map((h) => (
              <div
                key={h.title}
                className="rounded-2xl border border-white/5 bg-[#0a0a0a] p-6 hover:border-white/10 transition-colors"
                data-testid={`highlight-${h.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="w-10 h-10 rounded-xl bg-[#8c52ff]/10 text-[#8c52ff] flex items-center justify-center mb-4">
                  <Icon icon={h.icon} size="md" />
                </div>
                <h3 className="text-base font-bold mb-2 leading-tight">{h.title}</h3>
                <p className="text-sm text-white/55 leading-relaxed">{h.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 relative border-t border-white/5">
        <div className="absolute inset-0 bg-[#8c52ff]/5" />
        <div className="max-w-[1100px] mx-auto px-8 relative z-10 text-center">
          <h2 className="text-4xl lg:text-6xl font-extrabold tracking-tight mb-8">
            Ready to see it for yourself?
          </h2>
          <p className="text-xl text-white/60 max-w-2xl mx-auto mb-12">
            Pick a service, pick a time. Your detailer is closer than you think.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => setLocation("/booking")}
              className="bg-white text-black px-10 py-5 rounded-full text-lg font-bold hover:bg-white/90 transition-transform hover:scale-105 active:scale-95 shadow-[0_0_40px_-10px_rgba(255,255,255,0.5)] inline-flex items-center gap-3"
              data-testid="button-final-cta"
            >
              Book a Wash <Icon icon={ArrowRight} size="md" />
            </button>
            <button
              onClick={() => setLocation("/services")}
              className="text-white/70 hover:text-white px-6 py-5 rounded-full text-base font-semibold border border-white/10 hover:border-white/20 transition-colors inline-flex items-center gap-2"
              data-testid="button-view-services"
            >
              See all services
            </button>
          </div>
          <p className="mt-8 text-sm text-white/40">
            Still have questions?{" "}
            <button
              onClick={() => setLocation("/faq")}
              className="text-[#8c52ff] hover:underline font-semibold"
              data-testid="link-faq-contact"
            >
              Contact our support team →
            </button>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-[#020202]">
        <div className="max-w-[1120px] mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <img src={dapprLogo} alt="Dapr" className="h-20 w-auto opacity-80" />
          <div className="flex gap-6 text-sm text-white/40">
            <button
              onClick={() => setLocation("/faq")}
              className="hover:text-white transition-colors"
              data-testid="link-faq-footer"
            >
              FAQ
            </button>
            <button
              onClick={() => setLocation("/services")}
              className="hover:text-white transition-colors"
              data-testid="link-services-footer"
            >
              Services
            </button>
            <button
              onClick={() => setLocation("/corporate")}
              className="hover:text-white transition-colors"
              data-testid="link-corporate-footer"
            >
              For Fleets
            </button>
          </div>
          <p className="text-sm text-white/40">
            &copy; {new Date().getFullYear()} Dapr. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function StepBlock({ step, reverse }: { step: Step; reverse: boolean }) {
  const StepIcon = step.icon;
  return (
    <div className="scroll-mt-32">
      <div
        className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-start ${
          reverse ? "lg:[direction:rtl]" : ""
        }`}
      >
        {/* Pitch */}
        <div className="lg:[direction:ltr]">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#8c52ff]/15 text-[#8c52ff] flex items-center justify-center">
              <Icon icon={StepIcon} size="lg" />
            </div>
            <span className="text-xs font-semibold text-[#8c52ff] uppercase tracking-wider">
              Step {step.number}
            </span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.05] mb-5">
            {step.title}
          </h2>
          <p className="text-lg text-white/70 leading-relaxed max-w-lg">{step.body}</p>
        </div>

        {/* Bullets */}
        <div className="lg:[direction:ltr] rounded-3xl border border-white/10 bg-[#0a0a0a] p-8">
          <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-4">
            What this looks like
          </p>
          <ul className="space-y-3">
            {step.bullets.map((b, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-sm text-white/85 leading-snug"
              >
                <Icon
                  icon={CheckCircle2}
                  size="sm"
                  className="text-[#8c52ff] mt-0.5 shrink-0"
                />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- MOBILE */

function MobileHowItWorks() {
  const [, setLocation] = useLocation();

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
          <p className="text-[10px] font-semibold tracking-widest text-[#8c52ff] uppercase mb-2">
            How It Works
          </p>
          <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-[#111] leading-tight mb-3">
            Five steps from booked to brilliant.
          </h1>
          <p className="text-[14px] text-[#666] leading-relaxed">
            Book in your pajamas. Get matched with a vetted detailer. Watch your car transform — wherever you parked it.
          </p>
        </div>

        {/* Steps timeline */}
        <div className="px-5 pt-4">
          <p className="text-[10px] font-semibold tracking-widest text-[#999] uppercase mb-3">
            The Journey
          </p>
          <div className="relative pl-8">
            <div className="absolute left-[14px] top-2 bottom-2 w-px bg-[#ece2ff]" />
            <div className="space-y-5">
              {STEPS.map((step) => {
                const StepIcon = step.icon;
                return (
                  <div
                    key={step.number}
                    className="relative"
                    data-testid={`mobile-step-${step.number}`}
                  >
                    <div className="absolute -left-8 top-0 w-7 h-7 rounded-full bg-[#8c52ff] text-white flex items-center justify-center shadow-[0_0_0_4px_white]">
                      <Icon icon={StepIcon} size="xs" />
                    </div>
                    <div className="rounded-2xl border border-[#ededed] bg-white p-4">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-[10px] font-bold tracking-widest text-[#8c52ff]">
                          STEP {step.number}
                        </span>
                      </div>
                      <p className="text-[16px] font-semibold text-[#111] leading-tight mb-1.5">
                        {step.title}
                      </p>
                      <p className="text-[13px] text-[#666] leading-relaxed mb-3">
                        {step.body}
                      </p>
                      <ul className="space-y-1.5 pt-2 border-t border-[#f4f4f4]">
                        {step.bullets.map((b, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-[12.5px] text-[#444] leading-snug"
                          >
                            <Icon
                              icon={CheckCircle2}
                              size="xs"
                              className="text-[#8c52ff] mt-[3px] shrink-0"
                            />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Highlights compact grid */}
        <div className="px-5 pt-8">
          <p className="text-[10px] font-semibold tracking-widest text-[#999] uppercase mb-3">
            What's Included Every Time
          </p>
          <div className="grid grid-cols-2 gap-2">
            {HIGHLIGHTS.map((h) => (
              <div
                key={h.title}
                className="rounded-xl border border-[#ededed] p-3"
                data-testid={`mobile-highlight-${h.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="w-7 h-7 rounded-lg bg-[#f4f0ff] text-[#8c52ff] flex items-center justify-center mb-2">
                  <Icon icon={h.icon} size="xs" />
                </div>
                <p className="text-[12px] font-semibold text-[#111] leading-tight mb-1">
                  {h.title}
                </p>
                <p className="text-[11px] text-[#888] leading-snug">{h.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="px-5 pt-8">
          <div className="rounded-2xl bg-[#111] p-6 text-center">
            <h3 className="text-[20px] font-bold text-white mb-2">
              Ready to see it for yourself?
            </h3>
            <p className="text-[13px] text-white/60 mb-5 leading-relaxed">
              Pick a service, pick a time. Your detailer is closer than you think.
            </p>
            <button
              onClick={() => setLocation("/booking")}
              className="bg-[#8c52ff] text-white px-6 py-3 rounded-full text-sm font-bold hover:bg-[#7a42e5] transition-colors inline-flex items-center gap-2"
              data-testid="mobile-button-final-cta"
            >
              Book a Wash <Icon icon={ArrowRight} size="sm" />
            </button>
          </div>
          <button
            onClick={() => setLocation("/faq")}
            className="w-full mt-4 text-center text-[13px] font-semibold text-[#8c52ff] py-3 hover:underline"
            data-testid="mobile-link-faq"
          >
            Still have questions? Read the FAQ →
          </button>
        </div>
      </div>
    </div>
  );
}
