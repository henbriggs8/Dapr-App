import { useLocation } from "wouter";
import {
  ArrowRight,
  CheckCircle2,
  Zap,
  BarChart3,
  Users,
  Shield,
  Clock,
  Star,
  MapPin,
} from "lucide-react";
import { Icon } from "@/components/ui/icon";
import SiteNav from "@/components/site-nav";

const dapprLogo = "/dapr-logo.svg";

export default function BecomeAPro() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <SiteNav active="become-a-pro" />

      {/* Hero */}
      <section className="pt-24 pb-16 lg:pt-32 lg:pb-24">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <span className="text-xs font-bold text-[#8c52ff] uppercase tracking-widest mb-4 block">Join the Network</span>
              <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05] text-black mb-5">
                Your skills.<br />Your schedule.<br />Your business.
              </h1>
              <p className="text-lg text-gray-500 leading-relaxed mb-8 max-w-lg">
                Earn money doing what you're good at. Dapr connects you with customers so you can focus on the work — we handle booking, payments, and marketing.
              </p>
              <div className="flex items-center gap-4 flex-wrap">
                <button
                  onClick={() => setLocation("/providers/apply")}
                  className="bg-black text-white px-7 py-4 rounded-full font-bold text-base hover:bg-gray-900 active:scale-[0.98] transition-all inline-flex items-center gap-2"
                  data-testid="hero-apply"
                >
                  Apply to become a Pro <Icon icon={ArrowRight} size="sm" />
                </button>
                <button
                  onClick={() => setLocation("/faq")}
                  className="text-sm font-semibold text-gray-500 hover:text-black transition-colors"
                >
                  Learn more
                </button>
              </div>

              {/* Quick stats */}
              <div className="mt-12 grid grid-cols-3 gap-6 border-t border-gray-100 pt-8">
                {[
                  { value: "$32+", label: "Avg hourly earnings" },
                  { value: "4.9★", label: "Platform Pro rating" },
                  { value: "24hr", label: "Avg first booking" },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-2xl font-extrabold text-black">{s.value}</p>
                    <p className="text-xs text-gray-400 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual */}
            <div className="relative rounded-[2rem] overflow-hidden bg-gray-900 aspect-[4/5] lg:aspect-auto lg:h-[580px]">
              <img
                src="/become-a-pro-hero.jpg"
                alt="Dapr Pro giving thumbs up next to a branded vehicle"
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
              {/* Gradient overlay matching home page style */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/10" />
              {/* Floating earnings card */}
              <div className="absolute bottom-6 left-6 bg-white rounded-2xl shadow-lg px-5 py-4">
                <p className="text-xs text-gray-500 mb-1">This week</p>
                <p className="text-2xl font-extrabold text-black">$847</p>
                <p className="text-xs text-green-500 font-semibold mt-0.5">↑ 14% from last week</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 lg:py-28 bg-gray-50/60 border-y border-gray-100">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-black mb-4">Why Dapr Pros love it</h2>
            <p className="text-gray-500 text-lg">Built for professionals who take their craft seriously.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Clock,
                title: "Set your own hours",
                desc: "Work full-time or pick up jobs on the side. Go online when you want, go offline when you're done.",
              },
              {
                icon: BarChart3,
                title: "Transparent earnings",
                desc: "See exactly what you'll earn before you accept a job. No hidden deductions or surprise fees.",
              },
              {
                icon: Zap,
                title: "Instant payouts",
                desc: "Get paid as soon as a job is complete. No waiting for weekly transfers.",
              },
              {
                icon: MapPin,
                title: "Work near you",
                desc: "We match you with jobs close to your location so you spend less time driving and more time earning.",
              },
              {
                icon: Users,
                title: "Jobs come to you",
                desc: "Dapr handles all the marketing and booking. No chasing leads or repeat customers — just consistent work in your area.",
              },
              {
                icon: Star,
                title: "Build your reputation",
                desc: "Earn ratings, build a profile, and stand out to customers who want the best.",
              },
            ].map((b) => (
              <div key={b.title} className="bg-white rounded-3xl p-7 border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-11 h-11 rounded-2xl bg-[#8c52ff]/10 flex items-center justify-center mb-5">
                  <b.icon size={20} className="text-[#8c52ff]" />
                </div>
                <h3 className="font-bold text-black text-base mb-2">{b.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 lg:py-28">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-black mb-4">How to get started</h2>
            <p className="text-gray-500 text-lg">Join in three simple steps.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                num: "01",
                title: "Apply online",
                desc: "Fill out a quick application and tell us about your experience and availability.",
              },
              {
                num: "02",
                title: "Get verified",
                desc: "We review your application, run a background check, and onboard you to the platform.",
              },
              {
                num: "03",
                title: "Start earning",
                desc: "Go online in the app, accept your first job, and start building your Dapr Pro business.",
              },
            ].map((step) => (
              <div key={step.num} className="bg-gray-50 rounded-3xl p-8">
                <div className="text-4xl font-extrabold text-gray-200 mb-4 leading-none">{step.num}</div>
                <h3 className="font-bold text-black text-lg mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Training */}
      <section className="py-20 lg:py-28 bg-gray-50/60 border-y border-gray-100">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Copy */}
            <div>
              <span className="text-xs font-bold text-[#8c52ff] uppercase tracking-widest mb-4 block">No experience? No problem.</span>
              <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-black mb-5">
                We'll train you — for free.
              </h2>
              <p className="text-gray-500 text-lg leading-relaxed mb-8">
                You don't need years of experience to join Dapr. Our hands-on training program teaches you everything — from zero-scratch wash technique to customer-ready finishing — so you can start taking jobs with confidence.
              </p>
              <ul className="space-y-4 mb-10">
                {[
                  "Free, hands-on training at a local Dapr facility",
                  "Learn our zero-scratch wash methodology from certified trainers",
                  "Understand product selection, paint safety, and interior care",
                  "Pass a practical assessment and receive your Dapr Pro certification",
                  "Start earning as soon as you're certified",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-gray-700 text-sm">
                    <Icon icon={CheckCircle2} size="sm" className="text-[#8c52ff] shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-gray-400 italic">
                Already experienced? Skip straight to verification and be on the platform faster.
              </p>
            </div>

            {/* Feature cards */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Zap,          label: "Free training", sub: "No upfront cost, ever" },
                { icon: CheckCircle2, label: "Certification",  sub: "Dapr Pro credential" },
                { icon: Clock,        label: "1–2 days",       sub: "Typical program length" },
                { icon: BarChart3,    label: "Earn right away",sub: "Jobs waiting after cert" },
              ].map(({ icon, label, sub }) => (
                <div key={label} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-[#8c52ff]/10 text-[#8c52ff] flex items-center justify-center mb-4">
                    <Icon icon={icon} size="md" />
                  </div>
                  <p className="font-bold text-black text-sm mb-0.5">{label}</p>
                  <p className="text-gray-400 text-xs">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="py-20 lg:py-24 border-y border-gray-100">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-black mb-5">What you'll need</h2>
              <p className="text-gray-500 text-lg leading-relaxed mb-8">
                We're looking for professionals who take pride in their work. Here's what Dapr requires to join the platform.
              </p>
              <ul className="space-y-4">
                {[
                  "Detailing experience or certification",
                  "Valid driver's license and reliable vehicle",
                  "Basic detailing supplies (we provide premium products guidance)",
                  "Smartphone to receive and manage bookings",
                  "Ability to pass a background check",
                  "Commitment to Dapr's quality standards",
                ].map((req) => (
                  <li key={req} className="flex items-start gap-3 text-gray-700 text-sm">
                    <Icon icon={CheckCircle2} size="sm" className="text-[#8c52ff] shrink-0 mt-0.5" />
                    {req}
                  </li>
                ))}
              </ul>
            </div>
            {/* CTA card */}
            <div className="bg-black rounded-3xl p-10 text-white">
              <h3 className="text-2xl font-bold mb-3">Ready to apply?</h3>
              <p className="text-gray-400 mb-8 leading-relaxed">
                Join hundreds of Dapr Pros already earning on the platform. Applications take under 5 minutes.
              </p>
              <button
                onClick={() => setLocation("/providers/apply")}
                className="w-full py-4 rounded-2xl bg-white text-black font-bold text-base hover:bg-gray-100 active:scale-[0.98] transition-all mb-4"
                data-testid="apply-cta"
              >
                Apply now
              </button>
              <p className="text-xs text-gray-500 text-center">
                Already a Pro? <button onClick={() => setLocation("/auth")} className="text-[#8c52ff] font-semibold hover:underline">Sign in here</button>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 pt-16 pb-10">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <img src={dapprLogo} alt="Dapr" className="h-16 w-auto" />
              <p className="text-gray-400 text-sm leading-relaxed">Professional mobile car care, delivered to your door.</p>
            </div>
            <div>
              <h4 className="font-bold text-black text-sm mb-4">Dapr</h4>
              <ul className="space-y-3 text-sm text-gray-500">
                {[{ label: "About Us", path: "/about" }, { label: "Careers", path: "/careers" }, { label: "Help", path: "/faq" }].map((l) => (
                  <li key={l.label}><button onClick={() => setLocation(l.path)} className="hover:text-black transition-colors">{l.label}</button></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-black text-sm mb-4">Pros</h4>
              <ul className="space-y-3 text-sm text-gray-500">
                {[{ label: "Become a Pro", path: "/become-a-pro" }, { label: "Pro login", path: "/auth" }].map((l) => (
                  <li key={l.label}><button onClick={() => setLocation(l.path)} className="hover:text-black transition-colors">{l.label}</button></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-black text-sm mb-4">Legal</h4>
              <ul className="space-y-3 text-sm text-gray-500">
                {[{ label: "Privacy Policy", path: "/privacy" }, { label: "Terms of Service", path: "/terms" }].map((l) => (
                  <li key={l.label}><button onClick={() => setLocation(l.path)} className="hover:text-black transition-colors">{l.label}</button></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400">&copy; {new Date().getFullYear()} Dapr, Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
