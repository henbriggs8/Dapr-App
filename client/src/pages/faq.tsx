import { useEffect, useState } from "react";
import SiteNav from "@/components/site-nav";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  HelpCircle,
  CreditCard,
  Wrench,
  MapPin,
  ShieldCheck,
  Sparkles,
  Send,
  CheckCircle2,
  MessageSquare,
  Phone,
  type LucideIcon,
} from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const dapprLogo = "/dapr-logo.svg";

type Faq = { q: string; a: string };
type Category = { id: string; icon: LucideIcon; title: string; blurb: string; items: Faq[] };

const CATEGORIES: Category[] = [
  {
    id: "pricing",
    icon: CreditCard,
    title: "Pricing & Booking",
    blurb: "Flat prices, easy scheduling, and no surprises at the curb.",
    items: [
      {
        q: "How much does a Dapr service cost?",
        a: "Pricing is flat by tier: Essential Wash from $39, Interior Detail from $89, Refresh Detail from $149, and Dapr Black Label Detail from $299. The total you see at booking is the total you pay — taxes and travel are included. Add-ons (like pet hair removal or carpet shampoo) are clearly priced before you confirm.",
      },
      {
        q: "How do I book?",
        a: "Open the app or website, choose your tier, enter your address, and pick a time. Most bookings start in under 60 minutes. You can also save your vehicle profile to rebook in one tap.",
      },
      {
        q: "What payment methods do you accept?",
        a: "All payment is handled in-app. We accept every major credit and debit card, Apple Pay, and Google Pay. We don't accept cash — your detailer is never carrying money.",
      },
      {
        q: "Can I reschedule or cancel?",
        a: "Yes. You can reschedule or cancel free of charge up to 2 hours before your appointment. Inside the 2-hour window, a small late-cancel fee may apply so we can take care of the detailer who held the slot.",
      },
      {
        q: "Do you offer subscriptions or memberships?",
        a: "Yes — recurring weekly, bi-weekly, and monthly plans are available at a discount versus one-off bookings. You can manage frequency, pause, or cancel anytime from your profile.",
      },
      {
        q: "Is there a tip?",
        a: "Tips are never expected, always appreciated, and 100% optional. If you choose to tip, 100% of it goes to your detailer.",
      },
    ],
  },
  {
    id: "service",
    icon: Wrench,
    title: "Service & Equipment",
    blurb: "What we bring, how long it takes, and what fits each tier.",
    items: [
      {
        q: "What do you bring? Do I need to provide water or power?",
        a: "Nothing on your end. Every Dapr detailer arrives with their own water tanks, spot-free filtration, generator, and all products and tools. You don't need a hose, an outlet, or even to be home.",
      },
      {
        q: "How long does each service take?",
        a: "Roughly 30 minutes for an Essential Wash, 60 minutes for an Interior Detail, 90 minutes for a Refresh Detail, and about 3 hours for the Dapr Black Label Detail. Heavily soiled vehicles may take longer — your detailer will flag it before adding any time.",
      },
      {
        q: "Does my vehicle size affect the price?",
        a: "Listed prices cover sedans, coupes, and most crossovers. SUVs, trucks, vans, and oversized vehicles may have a small upcharge that's calculated automatically when you select your vehicle profile at booking.",
      },
      {
        q: "Can you handle pet hair, heavy stains, or bio messes?",
        a: "Yes. Pet hair removal, deep stain treatment, and bio cleanup are available as add-ons at checkout. For severe situations, we recommend the Black Label tier where steam extraction is included.",
      },
      {
        q: "Do you use eco-friendly products?",
        a: "Always. Every product we use is pH-balanced and biodegradable, and our spot-free filtration uses a fraction of the water of a traditional car wash. Safe for your car, your driveway, and the planet.",
      },
      {
        q: "Will the wash damage my paint or wrap?",
        a: "No. We follow a zero-scratch, two-bucket hand-wash methodology with microfiber media only. Our pressure washing and decontamination steps are vinyl-wrap and ceramic-coating safe.",
      },
    ],
  },
  {
    id: "logistics",
    icon: MapPin,
    title: "Where & When",
    blurb: "Service area, location requirements, and weather policy.",
    items: [
      {
        q: "Where do you operate?",
        a: "We currently service most metro areas in our launch markets. Enter your address at booking and the app will confirm coverage instantly. New zip codes are added every month — if we're not there yet, you can join the waitlist.",
      },
      {
        q: "Where can the service take place?",
        a: "Anywhere we can park beside the vehicle: your driveway, garage apron, office parking lot, hotel valet area, or street parking (where local rules permit). We don't need a hookup — just space to work safely.",
      },
      {
        q: "Do I need to be home?",
        a: "Not at all. Many customers leave keys in a lockbox or simply leave the vehicle unlocked in a driveway. You'll get photo updates throughout the service and a final walkthrough sent to your phone.",
      },
      {
        q: "What happens if it rains or snows?",
        a: "Light rain typically isn't a problem for interior services. For exterior work, if weather would compromise the result, we'll proactively reach out to reschedule at no charge. Our forecasting flags risk in the 24 hours before your appointment so you're never caught by surprise.",
      },
      {
        q: "How early should I book?",
        a: "Same-day slots are usually available, especially for morning or midday windows. For weekends and Black Label Details, booking 1–2 days ahead is recommended.",
      },
    ],
  },
  {
    id: "trust",
    icon: ShieldCheck,
    title: "Trust & Quality",
    blurb: "Vetting, insurance, and the satisfaction guarantee.",
    items: [
      {
        q: "Are your detailers insured and background-checked?",
        a: "Yes — every single one. Detailers pass a criminal background check, complete our zero-scratch training program, and are covered under our liability and damage insurance from the moment they're dispatched.",
      },
      {
        q: "What's the satisfaction guarantee?",
        a: "If anything about your service isn't right, message us within 48 hours. We'll send a detailer back to make it right at no charge — no debate, no fine print.",
      },
      {
        q: "What if my car is damaged?",
        a: "Damage is extremely rare, but if it happens we own it. File a claim from the booking detail screen and our team will respond within one business day to coordinate repair through our insurance.",
      },
      {
        q: "Can I request the same detailer next time?",
        a: "Yes. After your first booking, you can favorite your detailer and request them on future appointments whenever they're available.",
      },
      {
        q: "How do ratings work?",
        a: "After every service you can rate your detailer in two taps and leave optional feedback. Detailers maintain their assignment privileges only by holding a strong rating, so the team you meet is consistently the best in the market.",
      },
    ],
  },
];

export default function FAQ() {
  const isMobile = useIsMobile();
  return isMobile ? <MobileFAQ /> : <DesktopFAQ />;
}

/* ---------------------------------------------------------------- DESKTOP */

function DesktopFAQ() {
  const [, setLocation] = useLocation();
  const [openId, setOpenId] = useState<string | null>("pricing-0");
  const { toast } = useToast();
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [lastRequestedCallback, setLastRequestedCallback] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "", requestCallback: false });

  const contactMutation = useMutation({
    mutationFn: (data: typeof contactForm) => apiRequest("POST", "/api/contact", data),
    onSuccess: (_data, variables) => {
      setLastRequestedCallback(variables.requestCallback);
      setContactSubmitted(true);
      setContactForm({ name: "", email: "", message: "", requestCallback: false });
    },
    onError: () => {
      toast({ title: "Something went wrong", description: "Please try again in a moment.", variant: "destructive" });
    },
  });

  function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) return;
    contactMutation.mutate(contactForm);
  }

  const inputCls = "w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#8c52ff] focus:ring-2 focus:ring-[#8c52ff]/10 transition-all";

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <SiteNav active="help" />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="pt-28 pb-14 lg:pt-36 lg:pb-20 bg-white">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8 text-center">
          <span className="inline-flex items-center gap-2 text-xs font-bold text-[#8c52ff] uppercase tracking-widest mb-6">
            <Icon icon={HelpCircle} size="sm" /> Frequently Asked
          </span>
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] text-black mb-6 max-w-3xl mx-auto">
            Answers, before you ask.
          </h1>
          <p className="text-lg lg:text-xl text-gray-500 leading-relaxed max-w-2xl mx-auto">
            Everything we get asked about pricing, the service itself, where we work, and how we keep your car safe.
          </p>
        </div>
      </section>

      {/* ── Sticky category anchor nav ───────────────────────────────── */}
      <div className="sticky top-16 z-40 border-b border-gray-100 bg-white/90 backdrop-blur-md">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8 py-3 flex flex-wrap items-center justify-center gap-2">
          {CATEGORIES.map((c) => (
            <a
              key={c.id}
              href={`#${c.id}`}
              className="px-4 py-1.5 rounded-full text-xs font-semibold text-gray-500 border border-gray-200 hover:border-[#8c52ff] hover:text-[#8c52ff] transition-colors"
              data-testid={`anchor-${c.id}`}
            >
              {c.title}
            </a>
          ))}
        </div>
      </div>

      {/* ── Categories ───────────────────────────────────────────────── */}
      <section className="py-16 border-t border-gray-100">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8 space-y-16">
          {CATEGORIES.map((cat) => {
            const CatIcon = cat.icon;
            return (
              <div key={cat.id} id={cat.id} className="scroll-mt-32">
                <div className="grid lg:grid-cols-[260px_1fr] gap-10 lg:gap-16 items-start">
                  {/* Sticky category header */}
                  <div className="lg:sticky lg:top-36">
                    <div className="w-11 h-11 rounded-xl bg-[#8c52ff]/10 text-[#8c52ff] flex items-center justify-center mb-5">
                      <Icon icon={CatIcon} size="md" />
                    </div>
                    <h2 className="text-2xl font-extrabold tracking-tight text-black leading-tight mb-3">
                      {cat.title}
                    </h2>
                    <p className="text-sm text-gray-500 leading-relaxed">{cat.blurb}</p>
                  </div>

                  {/* Q&A accordion */}
                  <div className="rounded-3xl border border-gray-100 bg-white shadow-sm divide-y divide-gray-100">
                    {cat.items.map((item, i) => {
                      const id = `${cat.id}-${i}`;
                      const open = openId === id;
                      return (
                        <button
                          key={id}
                          onClick={() => setOpenId(open ? null : id)}
                          aria-expanded={open}
                          className="w-full text-left px-6 py-5 focus:outline-none hover:bg-gray-50/50 transition-colors first:rounded-t-3xl last:rounded-b-3xl"
                          data-testid={`faq-toggle-${id}`}
                        >
                          <div className="flex items-start justify-between gap-6">
                            <p className="text-[15px] font-semibold text-black leading-snug flex-1">
                              {item.q}
                            </p>
                            <Icon
                              icon={ChevronDown}
                              size="sm"
                              className={`text-gray-400 mt-0.5 shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
                            />
                          </div>
                          <div
                            className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                            aria-hidden={!open}
                          >
                            <div className="overflow-hidden">
                              <p className="pt-3 text-sm text-gray-500 leading-relaxed text-left">
                                {item.a}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Still need help ──────────────────────────────────────────── */}
      <section className="py-24 border-t border-gray-100 bg-gray-50">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            {/* Left: copy */}
            <div>
              <div className="w-11 h-11 rounded-xl bg-[#8c52ff]/10 text-[#8c52ff] flex items-center justify-center mb-6">
                <Icon icon={MessageSquare} size="md" />
              </div>
              <h2 className="text-3xl lg:text-5xl font-extrabold tracking-tight text-black mb-5">
                Still need help?
              </h2>
              <p className="text-gray-500 text-lg leading-relaxed mb-8">
                Didn't find what you were looking for? Send us a message and we'll get back to you, or check the box to request a callback.
              </p>
              <div className="flex flex-col gap-4 mb-10">
                <div className="flex items-center gap-3 text-gray-600 text-sm">
                  <Icon icon={CheckCircle2} size="sm" className="text-[#8c52ff] shrink-0" />
                  Usually responds within a few hours
                </div>
                <div className="flex items-center gap-3 text-gray-600 text-sm">
                  <Icon icon={Phone} size="sm" className="text-[#8c52ff] shrink-0" />
                  We can call you back if you prefer
                </div>
              </div>
              <div className="flex flex-wrap gap-6 pt-6 border-t border-gray-100">
                <button
                  onClick={() => setLocation("/services")}
                  className="text-gray-500 hover:text-black text-sm font-semibold transition-colors inline-flex items-center gap-1.5"
                  data-testid="button-see-services"
                >
                  See all services <Icon icon={ArrowRight} size="sm" />
                </button>
                <button
                  onClick={() => setLocation("/how-it-works")}
                  className="text-gray-500 hover:text-black text-sm font-semibold transition-colors"
                  data-testid="button-how-it-works"
                >
                  How it works
                </button>
              </div>
            </div>

            {/* Right: form */}
            <div className="rounded-3xl border border-gray-100 bg-white shadow-sm p-8">
              {contactSubmitted ? (
                <div className="flex flex-col items-center justify-center text-center py-10 gap-4">
                  <div className="w-14 h-14 rounded-full bg-[#8c52ff]/10 text-[#8c52ff] flex items-center justify-center">
                    <Icon icon={CheckCircle2} size="xl" />
                  </div>
                  <h3 className="text-xl font-bold text-black">Message sent!</h3>
                  <p className="text-gray-500 text-sm max-w-xs">
                    We received your message and will follow up soon.{" "}
                    {lastRequestedCallback ? "Expect a call from us." : ""}
                  </p>
                  <button
                    onClick={() => setContactSubmitted(false)}
                    className="mt-2 text-[#8c52ff] text-sm font-semibold hover:underline"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="flex flex-col gap-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Your name</label>
                      <input
                        type="text" required placeholder="Jane Smith"
                        value={contactForm.name}
                        onChange={(e) => setContactForm((f) => ({ ...f, name: e.target.value }))}
                        className={inputCls} data-testid="contact-name"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email address</label>
                      <input
                        type="email" required placeholder="jane@example.com"
                        value={contactForm.email}
                        onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))}
                        className={inputCls} data-testid="contact-email"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Your message</label>
                    <textarea
                      required minLength={10} rows={4}
                      placeholder="What can we help you with?"
                      value={contactForm.message}
                      onChange={(e) => setContactForm((f) => ({ ...f, message: e.target.value }))}
                      className={`${inputCls} resize-none`} data-testid="contact-message"
                    />
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer" data-testid="contact-callback-label">
                    <input
                      type="checkbox"
                      checked={contactForm.requestCallback}
                      onChange={(e) => setContactForm((f) => ({ ...f, requestCallback: e.target.checked }))}
                      className="w-4 h-4 accent-[#8c52ff] cursor-pointer rounded"
                      data-testid="contact-callback"
                    />
                    <span className="text-sm text-gray-500">
                      I'd prefer a callback — please call me instead of emailing
                    </span>
                  </label>
                  <button
                    type="submit"
                    disabled={contactMutation.isPending}
                    className="bg-black text-white px-6 py-3.5 rounded-full text-sm font-bold hover:bg-gray-900 transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    data-testid="contact-submit"
                  >
                    {contactMutation.isPending ? "Sending…" : <><Icon icon={Send} size="sm" /> Send message</>}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="py-10 border-t border-gray-100 bg-white">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <img src={dapprLogo} alt="Dapr" className="h-20 w-auto" />
          <div className="flex gap-6 text-sm text-gray-400">
            <button onClick={() => setLocation("/services")} className="hover:text-black transition-colors" data-testid="link-services-footer">Services</button>
            <button onClick={() => setLocation("/how-it-works")} className="hover:text-black transition-colors" data-testid="link-how-footer">How it Works</button>
            <button onClick={() => setLocation("/corporate")} className="hover:text-black transition-colors" data-testid="link-corporate-footer">For Fleets</button>
          </div>
          <p className="text-sm text-gray-400">&copy; {new Date().getFullYear()} Dapr. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

/* ---------------------------------------------------------------- MOBILE */

function MobileFAQ() {
  const [, setLocation] = useLocation();
  const [openId, setOpenId] = useState<string | null>("pricing-0");
  const { toast } = useToast();
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [lastRequestedCallback, setLastRequestedCallback] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "", requestCallback: false });

  const contactMutation = useMutation({
    mutationFn: (data: typeof contactForm) => apiRequest("POST", "/api/contact", data),
    onSuccess: (_data, variables) => {
      setLastRequestedCallback(variables.requestCallback);
      setContactSubmitted(true);
      setContactForm({ name: "", email: "", message: "", requestCallback: false });
    },
    onError: () => {
      toast({ title: "Something went wrong", description: "Please try again in a moment.", variant: "destructive" });
    },
  });

  function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) return;
    contactMutation.mutate(contactForm);
  }

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
            Frequently Asked
          </p>
          <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-[#111] leading-tight mb-3">
            Answers, before you ask.
          </h1>
          <p className="text-[14px] text-[#666] leading-relaxed">
            Pricing, the service itself, where we work, and how we keep your car safe.
          </p>
        </div>

        {/* Categories */}
        <div className="pt-4">
          {CATEGORIES.map((cat) => {
            const CatIcon = cat.icon;
            return (
              <div key={cat.id} className="px-5 pt-6" data-testid={`mobile-cat-${cat.id}`}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#f4f0ff] text-[#8c52ff] flex items-center justify-center shrink-0">
                    <Icon icon={CatIcon} size="sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-[#111] leading-tight">
                      {cat.title}
                    </p>
                    <p className="text-[12px] text-[#888] leading-snug">{cat.blurb}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-[#ededed] divide-y divide-[#f0f0f0] bg-white">
                  {cat.items.map((item, i) => {
                    const id = `${cat.id}-${i}`;
                    const open = openId === id;
                    return (
                      <button
                        key={id}
                        onClick={() => setOpenId(open ? null : id)}
                        aria-expanded={open}
                        className="w-full text-left px-4 py-4 active:bg-[#fafafa] transition-colors"
                        data-testid={`mobile-faq-toggle-${id}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-[14px] font-semibold text-[#111] leading-snug flex-1">
                            {item.q}
                          </p>
                          <Icon
                            icon={ChevronDown}
                            size="sm"
                            className={`text-[#bbb] mt-0.5 shrink-0 transition-transform duration-300 ${
                              open ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                        <div
                          className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                          }`}
                          aria-hidden={!open}
                        >
                          <div className="overflow-hidden">
                            <p className="pt-2.5 text-[13px] text-[#555] leading-relaxed">
                              {item.a}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="px-5 pt-8">
          <div className="rounded-2xl bg-[#111] p-6 text-center">
            <h3 className="text-[20px] font-bold text-white mb-2">Ready to book?</h3>
            <p className="text-[13px] text-white/60 mb-5 leading-relaxed">
              Pick a service and we'll come to you.
            </p>
            <button
              onClick={() => setLocation("/")}
              className="bg-[#8c52ff] text-white px-6 py-3 rounded-full text-sm font-bold hover:bg-[#7a42e5] transition-colors inline-flex items-center gap-2"
              data-testid="mobile-button-book"
            >
              Book a Wash <Icon icon={ArrowRight} size="sm" />
            </button>
          </div>
          <div className="flex items-center justify-center gap-6 mt-5 text-[13px] font-semibold">
            <button
              onClick={() => setLocation("/services")}
              className="text-[#8c52ff] hover:underline"
              data-testid="mobile-link-services"
            >
              See services
            </button>
            <span className="text-[#ddd]">•</span>
            <button
              onClick={() => setLocation("/how-it-works")}
              className="text-[#8c52ff] hover:underline"
              data-testid="mobile-link-how"
            >
              How it works
            </button>
          </div>
        </div>

        {/* Contact support */}
        <div className="px-5 pt-8 pb-4">
          <div className="rounded-2xl border border-[#ededed] p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-xl bg-[#f4f0ff] text-[#8c52ff] flex items-center justify-center shrink-0">
                <Icon icon={MessageSquare} size="sm" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#111]">Still need help?</p>
                <p className="text-[11px] text-[#888]">Send us a message — we respond fast</p>
              </div>
            </div>

            {contactSubmitted ? (
              <div className="flex flex-col items-center text-center py-6 gap-3">
                <div className="w-12 h-12 rounded-full bg-[#f4f0ff] text-[#8c52ff] flex items-center justify-center">
                  <Icon icon={CheckCircle2} size="lg" />
                </div>
                <p className="text-[14px] font-semibold text-[#111]">Message sent!</p>
                <p className="text-[12px] text-[#666]">
                  We'll be in touch soon.{lastRequestedCallback ? " Expect a call from us." : ""}
                </p>
                <button
                  onClick={() => setContactSubmitted(false)}
                  className="text-[#8c52ff] text-[12px] font-semibold"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="flex flex-col gap-3">
                <input
                  type="text"
                  required
                  placeholder="Your name"
                  value={contactForm.name}
                  onChange={(e) => setContactForm((f) => ({ ...f, name: e.target.value }))}
                  className="border border-[#ededed] rounded-xl px-4 py-3 text-[13px] text-[#111] placeholder:text-[#bbb] focus:outline-none focus:border-[#8c52ff] transition-colors"
                  data-testid="mobile-contact-name"
                />
                <input
                  type="email"
                  required
                  placeholder="Email address"
                  value={contactForm.email}
                  onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))}
                  className="border border-[#ededed] rounded-xl px-4 py-3 text-[13px] text-[#111] placeholder:text-[#bbb] focus:outline-none focus:border-[#8c52ff] transition-colors"
                  data-testid="mobile-contact-email"
                />
                <textarea
                  required
                  minLength={10}
                  rows={3}
                  placeholder="What can we help you with?"
                  value={contactForm.message}
                  onChange={(e) => setContactForm((f) => ({ ...f, message: e.target.value }))}
                  className="border border-[#ededed] rounded-xl px-4 py-3 text-[13px] text-[#111] placeholder:text-[#bbb] focus:outline-none focus:border-[#8c52ff] transition-colors resize-none"
                  data-testid="mobile-contact-message"
                />
                <label className="flex items-center gap-2.5 cursor-pointer" data-testid="mobile-contact-callback-label">
                  <input
                    type="checkbox"
                    checked={contactForm.requestCallback}
                    onChange={(e) => setContactForm((f) => ({ ...f, requestCallback: e.target.checked }))}
                    className="w-4 h-4 accent-[#8c52ff]"
                    data-testid="mobile-contact-callback"
                  />
                  <span className="text-[12px] text-[#666]">Request a callback instead</span>
                </label>
                <button
                  type="submit"
                  disabled={contactMutation.isPending}
                  className="bg-[#8c52ff] text-white px-6 py-3 rounded-full text-[13px] font-bold hover:bg-[#7a42e5] transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60"
                  data-testid="mobile-contact-submit"
                >
                  {contactMutation.isPending ? "Sending…" : <><Icon icon={Send} size="sm" /> Send message</>}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
