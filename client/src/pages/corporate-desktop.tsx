import { useMemo, useRef, useState } from "react";
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
import SiteNav from "@/components/site-nav";

type Tier = { label: string; min: number; max: number; mult: number | null };
const TIERS: Tier[] = [
  { label: "1–5",    min: 1,   max: 5,    mult: 1.0  },
  { label: "6–15",   min: 6,   max: 15,   mult: 0.94 },
  { label: "16–40",  min: 16,  max: 40,   mult: 0.88 },
  { label: "41–75",  min: 41,  max: 75,   mult: 0.83 },
  { label: "76–120", min: 76,  max: 120,  mult: 0.78 },
  { label: "121–200",min: 121, max: 200,  mult: 0.74 },
  { label: "200+",   min: 201, max: 9999, mult: null  },
];

type Service = { id: string; name: string; base: number | null; desc: string; icon: LucideIcon };
const SERVICES: Service[] = [
  { id: "exterior",    name: "Exterior Wash",          base: 55,  desc: "Hand wash, wheels, tires, exterior windows.", icon: Droplets },
  { id: "wash-wipe",  name: "Wash + Interior Wipe",   base: 79,  desc: "Exterior + cabin vacuum and wipe down.",       icon: Sparkles },
  { id: "maintenance",name: "Maintenance Detail",      base: 109, desc: "Recurring program clean, inside and out.",    icon: Wrench   },
  { id: "full",       name: "Full Detail",             base: 179, desc: "Showroom finish, top to bottom.",             icon: Star     },
  { id: "custom",     name: "Custom Fleet Program",    base: null,desc: "Built to spec for your fleet.",              icon: Settings2},
];

const CASES = [
  { icon: Truck,     title: "Service & delivery vans",  body: "Keep branded vehicles client-ready every week with on-site service at the depot." },
  { icon: Car,       title: "Dealer lots & inventory",  body: "Lot-wide presentation washes and prep details on a weekly cadence." },
  { icon: Building2, title: "Property managers",        body: "Recurring resident-amenity washes at multifamily communities and HOAs." },
  { icon: Briefcase, title: "Executive & corporate",    body: "Scheduled details for executive parking, board members, and visitor lots." },
  { icon: Wrench,    title: "Trade & contractor fleets",body: "Heavy-duty wash programs for trucks, trailers, and work vehicles." },
  { icon: MapPin,    title: "Multi-site operators",     body: "Standardized service across every location with one point of contact." },
];

const FAQS = [
  { q: "How does on-site fleet service work?",   a: "Our team arrives at your site fully self-sufficient — water, power, and supplies on board. We work around your operations on a recurring schedule that fits your fleet." },
  { q: "Do you offer recurring service contracts?", a: "Yes. Most fleet partners run weekly, bi-weekly, or monthly programs with locked pricing and a single monthly invoice." },
  { q: "Are your detailers insured?",            a: "Every Dapr professional is fully insured, background-checked, and trained on our zero-scratch wash methodology." },
  { q: "What's included in custom programs?",    a: "Custom programs cover anything outside our standard menu — heavy equipment, ceramic coatings, wraps, dealer-prep, event-prep, and on-call dispatch." },
  { q: "How is pricing finalized?",              a: "After a quick discovery call we'll walk your site, confirm vehicle mix and service frequency, and send a fixed per-vehicle quote." },
];

const PARTNER_LOGOS = [
  { name: "Vivint",        src: "/logo-vivint.svg"       },
  { name: "Bill.com",      src: "/logo-bill.svg"         },
  { name: "dōTERRA",       src: "/logo-doterra.svg"      },
  { name: "Adobe",         src: "/logo-adobe.svg"        },
  { name: "Podium",        src: "/logo-podium.svg"       },
  { name: "Herc Rentals",  src: "/logo-herc-rentals.svg" },
  { name: "Sunbelt",       src: "/logo-sunbelt.svg"      },
  { name: "Ancestry",      src: "/logo-ancestry.svg"     },
  { name: "Domo",          src: "/logo-domo.svg"         },
  { name: "Greystar",      src: "/logo-greystar.svg"     },
  { name: "Kiln",          src: "/logo-kiln.svg"         },
  { name: "Porsche",       src: "/logo-porsche.svg"      },
  { name: "Ritz-Carlton",  src: "/logo-ritz.svg"         },
] as const;

function formatMoney(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

/* ─── small reusable pieces ─────────────────────────────────────── */

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-2xl font-extrabold text-black">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function Benefit({ icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="w-10 h-10 rounded-xl bg-[#8c52ff]/10 text-[#8c52ff] flex items-center justify-center mb-4">
        <Icon icon={icon} size="md" />
      </div>
      <h3 className="font-bold text-black mb-2">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{body}</p>
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-[#8c52ff] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#8c52ff] focus:ring-2 focus:ring-[#8c52ff]/10 transition-all";

/* ─── Main component ─────────────────────────────────────────────── */

export default function CorporateDesktop() {
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

  const [form, setForm] = useState({
    name: "", company: "", email: "", phone: "",
    zip: "", vehicles: "", service: "", frequency: "Weekly", notes: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const goToForm = () => {
    setForm((f) => ({ ...f, vehicles: f.vehicles || String(tier.min), service: f.service || service.name }));
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const onChange =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = (e: React.FormEvent) => { e.preventDefault(); setSubmitted(true); };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <SiteNav active="fleets" />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="pt-28 pb-16 lg:pt-36 lg:pb-24 bg-white">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-20 items-center">
          {/* Left */}
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-bold text-[#8c52ff] uppercase tracking-widest mb-6">
              <Icon icon={ShieldCheck} size="sm" /> Dapr for Fleets
            </span>
            <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05] text-black mb-6">
              Keep every vehicle in your fleet{" "}
              <span className="text-[#8c52ff]">client-ready.</span>
            </h1>
            <p className="text-lg text-gray-500 mb-10 leading-relaxed max-w-xl">
              On-site, on a schedule, on one invoice. Dapr professionals come to your depot, dealer lot, or property — no disruption to your operation.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={goToForm}
                className="bg-black text-white px-8 py-4 rounded-full text-base font-bold hover:bg-gray-900 transition-colors flex items-center gap-2"
                data-testid="button-get-quote-hero"
              >
                Get a Fleet Quote <Icon icon={ArrowRight} size="sm" />
              </button>
              <a
                href="#estimator"
                className="border border-gray-200 text-gray-700 px-8 py-4 rounded-full text-base font-bold hover:bg-gray-50 transition-colors"
              >
                Estimate Pricing
              </a>
            </div>

            <div className="mt-12 grid grid-cols-3 gap-8 border-t border-gray-100 pt-8 max-w-md">
              <Stat value="100+" label="Fleet partners" />
              <Stat value="50k+" label="Vehicles serviced" />
              <Stat value="4.9★" label="Avg. partner rating" />
            </div>
          </div>

          {/* Right — pricing estimator card */}
          <div id="estimator" className="bg-gray-50 border border-gray-100 rounded-3xl p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs font-bold text-[#8c52ff] uppercase tracking-wider mb-1">Live Estimate</p>
                <h3 className="text-xl font-bold text-black">Fleet Pricing Calculator</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#8c52ff]/10 text-[#8c52ff] flex items-center justify-center">
                <Icon icon={ReceiptText} size="md" />
              </div>
            </div>

            {/* Slider */}
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Number of vehicles</label>
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl font-bold text-black">{tier.label}</span>
              <span className="text-xs text-gray-400">vehicles per site</span>
            </div>
            <input
              type="range" min={0} max={TIERS.length - 1} step={1}
              value={tierIdx} onChange={(e) => setTierIdx(parseInt(e.target.value))}
              className="w-full accent-[#8c52ff] mb-2"
              data-testid="slider-vehicles"
            />
            <div className="flex justify-between text-[10px] text-gray-400 font-medium mb-7">
              {TIERS.map((t, i) => (
                <button
                  key={t.label} onClick={() => setTierIdx(i)}
                  className={`transition-colors ${i === tierIdx ? "text-[#8c52ff] font-bold" : "hover:text-gray-600"}`}
                  data-testid={`tier-${i}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Service selector */}
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Service</label>
            <div className="flex flex-wrap gap-2 mb-7">
              {SERVICES.map((s) => {
                const active = serviceId === s.id;
                return (
                  <button
                    key={s.id} onClick={() => setServiceId(s.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold border transition-all ${
                      active
                        ? "bg-[#8c52ff] border-[#8c52ff] text-white"
                        : "bg-white border-gray-200 text-gray-600 hover:border-[#8c52ff] hover:text-[#8c52ff]"
                    }`}
                    data-testid={`service-${s.id}`}
                  >
                    <Icon icon={s.icon} size="xs" />
                    {s.name}
                  </button>
                );
              })}
            </div>

            {/* Result */}
            <div className={`rounded-2xl p-5 mb-5 ${isCustom ? "bg-gray-100 border border-gray-200" : "bg-[#8c52ff]/5 border border-[#8c52ff]/20"}`}>
              {isCustom ? (
                <>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Custom program</p>
                  <p className="text-xl font-bold text-black mb-1">Let's build it together</p>
                  <p className="text-sm text-gray-500">200+ vehicles or custom scope — bespoke program for your fleet.</p>
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Starting at</p>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-3xl font-extrabold text-black">{formatMoney(perVehicle!)}</span>
                    <span className="text-gray-500 text-sm">/ vehicle</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    Est. from <span className="text-black font-semibold">{formatMoney(cycleFrom!)}</span> per cycle ({tier.label} vehicles)
                  </p>
                </>
              )}
            </div>

            <button
              onClick={goToForm}
              className="w-full py-3.5 rounded-full bg-black text-white font-bold hover:bg-gray-900 transition-colors flex items-center justify-center gap-2"
              data-testid="button-estimator-cta"
            >
              Get Exact Fleet Quote <Icon icon={ArrowRight} size="sm" />
            </button>
            <p className="text-[11px] text-gray-400 mt-3 leading-relaxed text-center">
              Calculator shows starting rates only. Final pricing depends on vehicle size, condition, frequency, and location.
            </p>
          </div>
        </div>
      </section>

      {/* ── Trusted by ────────────────────────────────────────────────── */}
      <section className="py-10 border-y border-gray-100 bg-gray-50 overflow-hidden">
        <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-widest mb-7">Trusted by fleets & operators at</p>
        {/* Marquee track — items duplicated for seamless loop */}
        <div className="relative">
          {/* Fade edges */}
          <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-gray-50 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-gray-50 to-transparent z-10 pointer-events-none" />
          <div className="flex items-center" style={{ animation: "marquee 36s linear infinite" }}>
            {[0, 1].map((pass) => (
              <div key={pass} className="flex items-center shrink-0" aria-hidden={pass === 1}>
                {PARTNER_LOGOS.map(({ name, src }) => (
                  <img key={name} src={src} alt={name} className="h-14 w-auto mx-10 object-contain" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Dapr for Fleets ───────────────────────────────────────── */}
      <section className="py-24 lg:py-32">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div className="max-w-2xl mb-14">
            <span className="text-xs font-bold text-[#8c52ff] uppercase tracking-widest mb-4 block">Why Dapr for Fleets</span>
            <h2 className="text-3xl lg:text-5xl font-extrabold tracking-tight text-black mb-5">Built for operators, not weekenders.</h2>
            <p className="text-lg text-gray-500">
              We standardize the wash so your fleet looks the same in every city, on every truck, every week — without you managing it.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <Benefit icon={Clock}       title="Zero downtime"          body="We work around your hours — early mornings, overnights, or while drivers are off-site." />
            <Benefit icon={ShieldCheck} title="Insured & vetted teams" body="Background-checked detailers, full liability coverage, and a zero-scratch wash methodology." />
            <Benefit icon={ReceiptText} title="One contract, one invoice" body="Single point of contact across every site, with a monthly invoice and locked pricing." />
            <Benefit icon={Truck}       title="Fully self-sufficient"  body="We bring our own water, power, and disposal — no impact on your facility or utilities." />
            <Benefit icon={MapPin}      title="Multi-site coverage"    body="Roll out the same program across regions with consistent quality and reporting." />
            <Benefit icon={Briefcase}   title="Tailored programs"      body="Frequency, scope, and SLAs designed around your fleet — not a one-size-fits-all package." />
          </div>
        </div>
      </section>

      {/* ── Use cases ────────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32 bg-gray-50 border-y border-gray-100">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div className="max-w-2xl mb-14">
            <span className="text-xs font-bold text-[#8c52ff] uppercase tracking-widest mb-4 block">Fleet use cases</span>
            <h2 className="text-3xl lg:text-5xl font-extrabold tracking-tight text-black mb-5">A program for every kind of fleet.</h2>
            <p className="text-lg text-gray-500">From three vans to three hundred — we build the right cadence and scope.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {CASES.map(({ icon: IconComp, title, body }) => (
              <div key={title} className="rounded-2xl border border-gray-100 bg-white p-7 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-11 h-11 rounded-xl bg-[#8c52ff]/10 text-[#8c52ff] flex items-center justify-center mb-5">
                  <Icon icon={IconComp} size="md" />
                </div>
                <h3 className="text-lg font-bold text-black mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social proof ─────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1fr_1.1fr] gap-14 lg:gap-20 items-center">
            {/* Image card */}
            <div className="relative rounded-3xl overflow-hidden aspect-[4/5] lg:aspect-auto lg:h-[520px] bg-gray-100 shadow-md">
              <img src="/desktop/hero-car.jpg" alt="Dapr pro on site" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#8c52ff]/10 flex items-center justify-center">
                    <Icon icon={Building2} size="md" className="text-[#8c52ff]" />
                  </div>
                  <div>
                    <p className="font-bold text-black text-sm">Multi-site service partner</p>
                    <p className="text-xs text-gray-500">120 vehicles · 6 sites · bi-weekly</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  "Switching to Dapr cut the time our managers spent coordinating washes to zero. Our vans look new every week and we get one invoice."
                </p>
              </div>
            </div>

            {/* Copy */}
            <div>
              <span className="text-xs font-bold text-[#8c52ff] uppercase tracking-widest mb-4 block">Proof in production</span>
              <h2 className="text-3xl lg:text-5xl font-extrabold tracking-tight text-black mb-6">Real results across hundreds of vehicles.</h2>
              <p className="text-lg text-gray-500 mb-10 leading-relaxed">
                Our fleet partners standardize on Dapr because the program scales without friction — same quality in every city, predictable monthly cost, and zero coordination overhead.
              </p>
              <div className="grid grid-cols-3 gap-8 border-t border-gray-100 pt-8">
                <Stat value="98%"  label="On-time arrival" />
                <Stat value="0"    label="Coordination hours / week" />
                <Stat value="1"    label="Monthly invoice" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Quote form ───────────────────────────────────────────────── */}
      <section ref={formRef} id="quote-form" className="py-24 lg:py-32 bg-gray-50 border-y border-gray-100 scroll-mt-24">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8 grid lg:grid-cols-[1fr_1.4fr] gap-14 lg:gap-20">
          {/* Left */}
          <div>
            <span className="text-xs font-bold text-[#8c52ff] uppercase tracking-widest mb-4 block">Get a fleet quote</span>
            <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-black mb-5">Tell us about your fleet.</h2>
            <p className="text-gray-500 leading-relaxed mb-8">
              A specialist will reach out within one business day with a fixed per-vehicle quote and recommended cadence.
            </p>
            <ul className="space-y-3 text-sm text-gray-600">
              {["Free site walkthrough", "Locked monthly pricing", "Single point of contact", "No long-term contract required"].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Icon icon={CheckCircle2} size="sm" className="text-[#8c52ff] mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Form card */}
          <div className="rounded-3xl bg-white border border-gray-100 shadow-sm p-8">
            {submitted ? (
              <div className="py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-[#8c52ff]/10 text-[#8c52ff] flex items-center justify-center mx-auto mb-6">
                  <Icon icon={CheckCircle2} size="xl" />
                </div>
                <h3 className="text-2xl font-bold text-black mb-3">Quote request received.</h3>
                <p className="text-gray-500 max-w-sm mx-auto">
                  Thanks {form.name || "—"}. A fleet specialist will reach out to {form.email || "your email"} within one business day.
                </p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="grid grid-cols-2 gap-4">
                <Field label="Your name" required>
                  <input required value={form.name} onChange={onChange("name")} className={inputCls} placeholder="Jane Smith" data-testid="input-name" />
                </Field>
                <Field label="Company" required>
                  <input required value={form.company} onChange={onChange("company")} className={inputCls} placeholder="Acme Fleet Co." data-testid="input-company" />
                </Field>
                <Field label="Work email" required>
                  <input required type="email" value={form.email} onChange={onChange("email")} className={inputCls} placeholder="jane@company.com" data-testid="input-email" />
                </Field>
                <Field label="Phone">
                  <input value={form.phone} onChange={onChange("phone")} className={inputCls} placeholder="(555) 000-0000" data-testid="input-phone" />
                </Field>
                <Field label="ZIP / service area" required>
                  <input required value={form.zip} onChange={onChange("zip")} className={inputCls} placeholder="84101" data-testid="input-zip" />
                </Field>
                <Field label="Number of vehicles" required>
                  <input required type="number" min={1} value={form.vehicles} onChange={onChange("vehicles")} className={inputCls} placeholder="12" data-testid="input-vehicles" />
                </Field>
                <Field label="Service needed" required>
                  <select required value={form.service || service.name} onChange={onChange("service")} className={inputCls} data-testid="select-service">
                    {SERVICES.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </Field>
                <Field label="Service frequency">
                  <select value={form.frequency} onChange={onChange("frequency")} className={inputCls} data-testid="select-frequency">
                    {["Weekly","Bi-weekly","Monthly","Quarterly","One-time"].map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </Field>
                <div className="col-span-2">
                  <Field label="Notes">
                    <textarea
                      value={form.notes} onChange={onChange("notes")} rows={4}
                      className={`${inputCls} resize-none`}
                      placeholder="Site access, vehicle types, timing — anything we should know."
                      data-testid="textarea-notes"
                    />
                  </Field>
                </div>
                <div className="col-span-2 mt-2">
                  <button
                    type="submit"
                    className="w-full py-4 rounded-full bg-black text-white font-bold hover:bg-gray-900 transition-colors flex items-center justify-center gap-2"
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

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32">
        <div className="max-w-[900px] mx-auto px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold text-[#8c52ff] uppercase tracking-widest mb-4 block">Frequently asked</span>
            <h2 className="text-3xl lg:text-5xl font-extrabold tracking-tight text-black">Fleet program questions.</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={i} className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left"
                    data-testid={`faq-${i}`}
                  >
                    <span className="font-bold text-black text-base">{f.q}</span>
                    <Icon icon={ChevronDown} size="md" className={`text-gray-400 transition-transform shrink-0 ml-4 ${open ? "rotate-180" : ""}`} />
                  </button>
                  {open && <div className="px-6 pb-6 text-sm text-gray-500 leading-relaxed">{f.a}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32 bg-gray-50 border-t border-gray-100">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-4xl lg:text-6xl font-extrabold tracking-tight text-black mb-6">Ready to standardize your fleet?</h2>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-12">
            Tell us about your operation. We'll walk the site, design the program, and get your fleet looking sharp on a recurring schedule.
          </p>
          <button
            onClick={goToForm}
            className="bg-black text-white px-10 py-5 rounded-full text-lg font-bold hover:bg-gray-900 transition-colors inline-flex items-center gap-3"
            data-testid="button-final-cta"
          >
            Get a Fleet Quote <Icon icon={ArrowRight} size="md" />
          </button>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="py-10 border-t border-gray-100 bg-white">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <img src="/dapr-logo.svg" alt="Dapr" className="h-20 w-auto" />
          <div className="flex gap-6 text-sm text-gray-400">
            <button onClick={() => setLocation("/faq")} className="hover:text-black transition-colors">FAQ</button>
            <button onClick={() => setLocation("/how-it-works")} className="hover:text-black transition-colors">How it Works</button>
            <button onClick={() => setLocation("/")} className="hover:text-black transition-colors">Home</button>
          </div>
          <p className="text-sm text-gray-400">&copy; {new Date().getFullYear()} Dapr. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
