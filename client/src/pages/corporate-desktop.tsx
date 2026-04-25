import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowRight,
  CheckCircle2,
  Building2,
  Truck,
  Car,
  Wrench,
  Briefcase,
  ShieldCheck,
  Clock,
  ReceiptText,
  MapPin,
  ChevronDown,
  Droplets,
  Sparkles,
  Star,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import { Icon } from "@/components/ui/icon";

const dapprLogo = "/dapr-logo.svg";

type Tier = { label: string; min: number; max: number; mult: number | null };
const TIERS: Tier[] = [
  { label: "1–5", min: 1, max: 5, mult: 1.0 },
  { label: "6–15", min: 6, max: 15, mult: 0.94 },
  { label: "16–40", min: 16, max: 40, mult: 0.88 },
  { label: "41–75", min: 41, max: 75, mult: 0.83 },
  { label: "76–120", min: 76, max: 120, mult: 0.78 },
  { label: "121–200", min: 121, max: 200, mult: 0.74 },
  { label: "200+", min: 201, max: 9999, mult: null },
];

type Service = { id: string; name: string; base: number | null; desc: string; icon: LucideIcon };
const SERVICES: Service[] = [
  { id: "exterior", name: "Exterior Wash", base: 55, desc: "Hand wash, wheels, tires, exterior windows.", icon: Droplets },
  { id: "wash-wipe", name: "Wash + Interior Wipe Down", base: 79, desc: "Exterior + cabin vacuum and wipe down.", icon: Sparkles },
  { id: "maintenance", name: "Maintenance Detail", base: 109, desc: "Recurring program clean, inside and out.", icon: Wrench },
  { id: "full", name: "Full Detail", base: 179, desc: "Showroom finish, top to bottom.", icon: Star },
  { id: "custom", name: "Custom Fleet Program", base: null, desc: "Built to spec for your fleet.", icon: Settings2 },
];

const CASES = [
  {
    icon: Truck,
    title: "Service & delivery vans",
    body: "Keep branded vehicles client-ready every week with on-site service at the depot.",
  },
  {
    icon: Car,
    title: "Dealer lots & inventory",
    body: "Lot-wide presentation washes and prep details on a weekly cadence.",
  },
  {
    icon: Building2,
    title: "Property managers",
    body: "Recurring resident-amenity washes at multifamily communities and HOAs.",
  },
  {
    icon: Briefcase,
    title: "Executive & corporate",
    body: "Scheduled details for executive parking, board members, and visitor lots.",
  },
  {
    icon: Wrench,
    title: "Trade & contractor fleets",
    body: "Heavy-duty wash programs for trucks, trailers, and work vehicles.",
  },
  {
    icon: MapPin,
    title: "Multi-site operators",
    body: "Standardized service across every location with one point of contact.",
  },
];

const FAQS = [
  {
    q: "How does on-site fleet service work?",
    a: "Our team arrives at your site fully self-sufficient — water, power, and supplies on board. We work around your operations on a recurring schedule that fits your fleet.",
  },
  {
    q: "Do you offer recurring service contracts?",
    a: "Yes. Most fleet partners run weekly, bi-weekly, or monthly programs with locked pricing and a single monthly invoice.",
  },
  {
    q: "Are your detailers insured?",
    a: "Every Dapper professional is fully insured, background-checked, and trained on our zero-scratch wash methodology.",
  },
  {
    q: "What's included in custom programs?",
    a: "Custom programs cover anything outside our standard menu — heavy equipment, ceramic coatings, wraps, dealer-prep, event-prep, and on-call dispatch.",
  },
  {
    q: "How is pricing finalized?",
    a: "After a quick discovery call we'll walk your site, confirm vehicle mix and service frequency, and send a fixed per-vehicle quote.",
  },
];

const PARTNER_LOGOS = ["Vivint", "Adobe", "Bill.com", "dōTERRA", "Lucid"] as const;

function formatMoney(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function CorporateDesktop() {
  const [scrolled, setScrolled] = useState(false);
  const [, setLocation] = useLocation();
  const [tierIdx, setTierIdx] = useState(2);
  const [serviceId, setServiceId] = useState<string>("maintenance");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const formRef = useRef<HTMLDivElement | null>(null);

  const tier = TIERS[tierIdx];
  const service = useMemo(() => SERVICES.find((s) => s.id === serviceId)!, [serviceId]);
  const isCustom = service.base === null || tier.mult === null;
  const perVehicle = !isCustom ? Math.round(service.base! * tier.mult!) : null;
  const cycleFrom = !isCustom ? Math.round(perVehicle! * tier.min) : null;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Quote form state
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    zip: "",
    vehicles: "",
    service: "",
    frequency: "Weekly",
    notes: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const goToForm = () => {
    setForm((f) => ({
      ...f,
      vehicles: f.vehicles || String(tier.min),
      service: f.service || service.name,
    }));
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const onChange = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
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
            <button onClick={() => setLocation("/")} className="flex items-center" data-testid="link-home" aria-label="Dapper home">
              <img src={dapprLogo} alt="Dapper" className="h-28 w-auto" />
            </button>
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">
              <button onClick={() => setLocation("/services")} className="hover:text-white transition-colors">Services</button>
              <button onClick={() => setLocation("/how-it-works")} className="hover:text-white transition-colors">How it Works</button>
              <button className="text-white">For Fleets</button>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => setLocation("/auth")} className="text-sm font-medium text-white/60 hover:text-white transition-colors">Log in</button>
            <button
              onClick={goToForm}
              className="bg-white text-black px-5 py-2.5 rounded-full text-sm font-bold hover:bg-white/90 transition-transform hover:scale-105 active:scale-95"
              data-testid="button-get-quote-nav"
            >
              Get a Fleet Quote
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-40 pb-20 lg:pt-52 lg:pb-28 overflow-hidden">
        <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#8c52ff]/15 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-[1120px] mx-auto px-8 relative z-10 grid lg:grid-cols-[1.1fr_0.9fr] gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-[#8c52ff] mb-8 uppercase tracking-wider">
              <Icon icon={ShieldCheck} size="sm" /> Dapper for Fleets
            </div>
            <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05] mb-6">
              Keep every vehicle in your fleet{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8c52ff] to-[#b28cff]">client-ready.</span>
            </h1>
            <p className="text-lg text-white/60 mb-10 leading-relaxed max-w-xl">
              On-site, on a schedule, on one invoice. Dapper professionals come to your depot, dealer lot, or property and detail your vehicles without disrupting operations.
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={goToForm}
                className="bg-[#8c52ff] text-white px-8 py-4 rounded-full text-base font-bold hover:bg-[#7a42e5] transition-all hover:scale-105 active:scale-95 flex items-center gap-2 shadow-[0_0_40px_-10px_#8c52ff]"
                data-testid="button-get-quote-hero"
              >
                Get a Fleet Quote <Icon icon={ArrowRight} size="sm" />
              </button>
              <a
                href="#estimator"
                className="bg-white/5 text-white border border-white/10 px-8 py-4 rounded-full text-base font-bold hover:bg-white/10 transition-all"
              >
                Estimate Pricing
              </a>
            </div>

            <div className="mt-12 grid grid-cols-3 gap-8 border-t border-white/10 pt-8 max-w-md">
              <Stat value="100+" label="Fleet partners" />
              <Stat value="50k+" label="Vehicles serviced" />
              <Stat value="4.9★" label="Avg. partner rating" />
            </div>
          </div>

          {/* Hero estimator card */}
          <div id="estimator" className="relative">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 shadow-[0_30px_120px_-30px_#8c52ff]">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs font-semibold text-[#8c52ff] uppercase tracking-wider mb-1">Live Estimate</p>
                  <h3 className="text-xl font-bold">Fleet Pricing Calculator</h3>
                </div>
                <ReceiptText className="w-6 h-6 text-white/30" />
              </div>

              {/* Slider */}
              <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">Number of vehicles</label>
              <div className="flex items-center justify-between mb-3">
                <div className="text-2xl font-bold tracking-tight">{tier.label}</div>
                <div className="text-xs text-white/40">vehicles per site</div>
              </div>
              <input
                type="range"
                min={0}
                max={TIERS.length - 1}
                step={1}
                value={tierIdx}
                onChange={(e) => setTierIdx(parseInt(e.target.value))}
                className="w-full accent-[#8c52ff] mb-2"
                data-testid="slider-vehicles"
              />
              <div className="flex justify-between text-[10px] text-white/30 font-medium mb-8">
                {TIERS.map((t, i) => (
                  <button
                    key={t.label}
                    onClick={() => setTierIdx(i)}
                    className={`transition-colors ${i === tierIdx ? "text-[#8c52ff]" : "hover:text-white/60"}`}
                    data-testid={`tier-${i}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Service selector */}
              <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">Service</label>
              <div className="flex flex-wrap gap-2 mb-8">
                {SERVICES.map((s) => {
                  const IconComp = s.icon;
                  const active = serviceId === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setServiceId(s.id)}
                      className={`inline-flex items-center gap-2 pl-2.5 pr-3.5 py-2 rounded-full text-xs font-bold border transition-all ${
                        active
                          ? "bg-[#8c52ff] border-[#8c52ff] text-white"
                          : "bg-white/5 border-white/10 text-white/70 hover:border-white/30"
                      }`}
                      data-testid={`service-${s.id}`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          active ? "bg-white/20" : "bg-white/10 text-white"
                        }`}
                      >
                        <Icon icon={IconComp} size="xs" />
                      </span>
                      {s.name}
                    </button>
                  );
                })}
              </div>

              {/* Result */}
              <div className="rounded-2xl bg-gradient-to-br from-[#1a1033] to-[#0a0a0a] border border-[#8c52ff]/30 p-6 mb-5">
                {isCustom ? (
                  <>
                    <p className="text-xs text-white/60 uppercase tracking-wider font-semibold mb-2">Custom program</p>
                    <p className="text-3xl font-bold mb-1">Let's build it together</p>
                    <p className="text-sm text-white/60">200+ vehicles or custom scope — we'll design a bespoke program for your fleet.</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-white/60 uppercase tracking-wider font-semibold mb-2">Starting at</p>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-4xl font-bold">{formatMoney(perVehicle!)}</span>
                      <span className="text-white/60 text-sm">/ vehicle</span>
                    </div>
                    <p className="text-sm text-white/60">
                      Estimated from <span className="text-white font-semibold">{formatMoney(cycleFrom!)}</span> per service cycle ({tier.label} vehicles)
                    </p>
                  </>
                )}
              </div>

              <button
                onClick={goToForm}
                className="w-full py-4 rounded-full bg-white text-black font-bold hover:bg-white/90 transition-all flex items-center justify-center gap-2"
                data-testid="button-estimator-cta"
              >
                Get Exact Fleet Quote <Icon icon={ArrowRight} size="sm" />
              </button>

              <p className="text-[11px] text-white/40 mt-4 leading-relaxed">
                Calculator shows starting rates only. Final pricing depends on vehicle size, condition, service frequency, location, and site access after review.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted by */}
      <section className="py-12 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-[1120px] mx-auto px-8">
          <p className="text-center text-sm font-medium text-white/40 mb-8 uppercase tracking-widest">Trusted by fleets &amp; operators at</p>
          <div className="flex flex-wrap items-center justify-center gap-12 lg:gap-24 opacity-40 grayscale">
            {PARTNER_LOGOS.map((name) => (
              <div key={name} className="text-xl font-bold tracking-tighter">
                {name}
              </div>
            ))}
            <img src="/podium-logo.png" alt="Podium" className="h-6 w-auto invert" />
          </div>
        </div>
      </section>

      {/* Why Dapper for Fleets */}
      <section className="py-32">
        <div className="max-w-[1120px] mx-auto px-8">
          <div className="max-w-3xl mb-16">
            <p className="text-xs font-semibold text-[#8c52ff] uppercase tracking-wider mb-4">Why Dapper for Fleets</p>
            <h2 className="text-3xl lg:text-5xl font-bold tracking-tight mb-6">Built for operators, not weekenders.</h2>
            <p className="text-lg text-white/60">
              We standardize the wash so your fleet looks the same in every city, on every truck, every week — without you managing it.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <Benefit icon={Clock} title="Zero downtime" body="We work around your hours — early mornings, overnights, or while drivers are off-site." />
            <Benefit icon={ShieldCheck} title="Insured & vetted teams" body="Background-checked detailers, full liability coverage, and a zero-scratch wash methodology." />
            <Benefit icon={ReceiptText} title="One contract, one invoice" body="Single point of contact across every site, with a monthly invoice and locked pricing." />
            <Benefit icon={Truck} title="Fully self-sufficient" body="We bring our own water, power, and disposal — no impact on your facility or utilities." />
            <Benefit icon={MapPin} title="Multi-site coverage" body="Roll out the same program across regions with consistent quality and reporting." />
            <Benefit icon={Briefcase} title="Tailored programs" body="Frequency, scope, and SLAs designed around your fleet — not a one-size-fits-all package." />
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="py-32 bg-[#020202] border-y border-white/5">
        <div className="max-w-[1120px] mx-auto px-8">
          <div className="max-w-3xl mb-16">
            <p className="text-xs font-semibold text-[#8c52ff] uppercase tracking-wider mb-4">Fleet use cases</p>
            <h2 className="text-3xl lg:text-5xl font-bold tracking-tight mb-6">A program for every kind of fleet.</h2>
            <p className="text-lg text-white/60">From three vans to three hundred — we build the right cadence and scope.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CASES.map(({ icon: IconComp, title, body }) => (
              <div key={title} className="rounded-3xl border border-white/5 bg-[#0a0a0a] p-8 hover:border-white/10 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-[#8c52ff]/10 text-[#8c52ff] flex items-center justify-center mb-6">
                  <Icon icon={IconComp} size="lg" />
                </div>
                <h3 className="text-xl font-bold mb-3">{title}</h3>
                <p className="text-white/60 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Case study / proof */}
      <section className="py-32">
        <div className="max-w-[1120px] mx-auto px-8">
          <div className="grid lg:grid-cols-[1fr_1.1fr] gap-16 items-center">
            <div className="relative rounded-3xl overflow-hidden border border-white/10 aspect-[4/5] lg:aspect-auto lg:h-[520px]">
              <img src="/desktop/hero-car.jpg" alt="Dapper van on-site" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
              <div className="absolute bottom-8 left-8 right-8 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#8c52ff]/20 flex items-center justify-center">
                    <Icon icon={Building2} size="md" className="text-[#8c52ff]" />
                  </div>
                  <div>
                    <p className="font-bold">Multi-site service partner</p>
                    <p className="text-xs text-white/60">120 vehicles • 6 sites • bi-weekly</p>
                  </div>
                </div>
                <p className="text-sm text-white/70 leading-relaxed">
                  "Switching to Dapper cut the time our managers spent coordinating washes to zero. Our vans look new every week and we get one invoice."
                </p>
              </div>
            </div>

            <div className="max-w-xl">
              <p className="text-xs font-semibold text-[#8c52ff] uppercase tracking-wider mb-4">Proof in production</p>
              <h2 className="text-3xl lg:text-5xl font-bold tracking-tight mb-6">Real results across hundreds of vehicles.</h2>
              <p className="text-lg text-white/60 mb-10 leading-relaxed">
                Our fleet partners standardize on Dapper because the program scales without friction — same quality in every city, predictable monthly cost, and zero coordination overhead on their end.
              </p>

              <div className="grid grid-cols-3 gap-8 border-t border-white/10 pt-8">
                <Stat value="98%" label="On-time arrival" />
                <Stat value="0" label="Coordination hours / week" />
                <Stat value="1" label="Monthly invoice" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quote form */}
      <section ref={formRef} id="quote-form" className="py-32 bg-[#020202] border-y border-white/5 scroll-mt-24">
        <div className="max-w-[1100px] mx-auto px-8 grid lg:grid-cols-[1fr_1.4fr] gap-16">
          <div>
            <p className="text-xs font-semibold text-[#8c52ff] uppercase tracking-wider mb-4">Get a fleet quote</p>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-6">Tell us about your fleet.</h2>
            <p className="text-white/60 leading-relaxed mb-8">
              A specialist will reach out within one business day with a fixed per-vehicle quote and a recommended cadence.
            </p>
            <ul className="space-y-3 text-sm text-white/70">
              {["Free site walkthrough", "Locked monthly pricing", "Single point of contact", "No long-term contract required"].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Icon icon={CheckCircle2} size="sm" className="text-[#8c52ff] mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl bg-[#0a0a0a] border border-white/10 p-8">
            {submitted ? (
              <div className="py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-[#8c52ff]/15 text-[#8c52ff] flex items-center justify-center mx-auto mb-6">
                  <Icon icon={CheckCircle2} size="xl" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Quote request received.</h3>
                <p className="text-white/60 max-w-sm mx-auto">
                  Thanks {form.name || "—"}. A fleet specialist will reach out to {form.email || "your email"} within one business day.
                </p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="grid grid-cols-2 gap-4">
                <Field label="Your name" required>
                  <input required value={form.name} onChange={onChange("name")} className={inputCls} data-testid="input-name" />
                </Field>
                <Field label="Company" required>
                  <input required value={form.company} onChange={onChange("company")} className={inputCls} data-testid="input-company" />
                </Field>
                <Field label="Work email" required>
                  <input required type="email" value={form.email} onChange={onChange("email")} className={inputCls} data-testid="input-email" />
                </Field>
                <Field label="Phone">
                  <input value={form.phone} onChange={onChange("phone")} className={inputCls} data-testid="input-phone" />
                </Field>
                <Field label="ZIP / service area" required>
                  <input required value={form.zip} onChange={onChange("zip")} className={inputCls} data-testid="input-zip" />
                </Field>
                <Field label="Number of vehicles" required>
                  <input required type="number" min={1} value={form.vehicles} onChange={onChange("vehicles")} className={inputCls} data-testid="input-vehicles" />
                </Field>
                <Field label="Service needed" required>
                  <select required value={form.service || service.name} onChange={onChange("service")} className={inputCls} data-testid="select-service">
                    {SERVICES.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Service frequency">
                  <select value={form.frequency} onChange={onChange("frequency")} className={inputCls} data-testid="select-frequency">
                    {["Weekly", "Bi-weekly", "Monthly", "Quarterly", "One-time"].map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </Field>
                <div className="col-span-2">
                  <Field label="Notes">
                    <textarea
                      value={form.notes}
                      onChange={onChange("notes")}
                      rows={4}
                      className={`${inputCls} resize-none`}
                      placeholder="Site access, vehicle types, timing — anything we should know."
                      data-testid="textarea-notes"
                    />
                  </Field>
                </div>
                <div className="col-span-2 mt-2">
                  <button
                    type="submit"
                    className="w-full py-4 rounded-full bg-[#8c52ff] text-white font-bold hover:bg-[#7a42e5] transition-all flex items-center justify-center gap-2 shadow-[0_0_40px_-10px_#8c52ff]"
                    data-testid="button-submit-quote"
                  >
                    Request Fleet Quote <Icon icon={ArrowRight} size="sm" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-32">
        <div className="max-w-[900px] mx-auto px-8">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-[#8c52ff] uppercase tracking-wider mb-4">Frequently asked</p>
            <h2 className="text-3xl lg:text-5xl font-bold tracking-tight">Fleet program questions.</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={i} className="rounded-2xl border border-white/10 bg-[#0a0a0a] overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left"
                    data-testid={`faq-${i}`}
                  >
                    <span className="font-bold text-base">{f.q}</span>
                    <ChevronDown className={`w-5 h-5 text-white/50 transition-transform ${open ? "rotate-180" : ""}`} />
                  </button>
                  {open && <div className="px-6 pb-6 text-sm text-white/60 leading-relaxed">{f.a}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 relative border-t border-white/5">
        <div className="absolute inset-0 bg-[#8c52ff]/5" />
        <div className="max-w-[1100px] mx-auto px-8 relative z-10 text-center">
          <h2 className="text-4xl lg:text-6xl font-extrabold tracking-tight mb-8">Ready to standardize your fleet?</h2>
          <p className="text-xl text-white/60 max-w-2xl mx-auto mb-12">
            Tell us about your operation. We'll come walk the site, design the program, and get your fleet looking sharp on a recurring schedule.
          </p>
          <button
            onClick={goToForm}
            className="bg-white text-black px-10 py-5 rounded-full text-lg font-bold hover:bg-white/90 transition-transform hover:scale-105 active:scale-95 shadow-[0_0_40px_-10px_rgba(255,255,255,0.5)]"
            data-testid="button-final-cta"
          >
            Get a Fleet Quote
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-[#020202]">
        <div className="max-w-[1120px] mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <img src={dapprLogo} alt="Dapper" className="h-20 w-auto opacity-80" />
          <div className="flex gap-6 text-sm text-white/40">
            <button onClick={() => setLocation("/faq")} className="hover:text-white transition-colors">FAQ</button>
            <button onClick={() => setLocation("/how-it-works")} className="hover:text-white transition-colors">How it Works</button>
            <button onClick={() => setLocation("/")} className="hover:text-white transition-colors">Home</button>
          </div>
          <p className="text-sm text-white/40">&copy; {new Date().getFullYear()} Dapper. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

const inputCls =
  "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#8c52ff] focus:bg-white/10 transition-colors";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">
        {label}
        {required && <span className="text-[#8c52ff] ml-1">*</span>}
      </span>
      {children}
    </label>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-2xl lg:text-3xl font-bold tracking-tight mb-1">{value}</div>
      <div className="text-xs text-white/50 uppercase tracking-wider font-medium">{label}</div>
    </div>
  );
}

function Benefit({ icon: IconComp, title, body }: { icon: typeof Clock; title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-white/5 bg-[#0a0a0a] p-8 hover:border-white/10 transition-colors">
      <div className="w-12 h-12 rounded-xl bg-[#8c52ff]/10 text-[#8c52ff] flex items-center justify-center mb-6">
        <Icon icon={IconComp} size="lg" />
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-white/60 leading-relaxed">{body}</p>
    </div>
  );
}
