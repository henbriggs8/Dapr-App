import { useLocation } from "wouter";
import { ArrowRight, MapPin } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import SiteNav from "@/components/site-nav";

export default function AboutPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <SiteNav active="about" />

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="pt-28 pb-20 lg:pt-40 lg:pb-28">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div className="max-w-4xl">
            <span className="text-xs font-bold text-[#8c52ff] uppercase tracking-widest mb-6 block">
              About Dapr
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight leading-[1.06] text-black mb-8">
              You can order food, rides, and groceries on demand, but car care
              is still offline and messy.{" "}
              <span className="text-[#8c52ff]">Dapr fixes that.</span>
            </h1>
            <p className="text-xl lg:text-2xl text-gray-500 leading-relaxed max-w-2xl">
              We're building a better way to take care of your car — starting
              with on-demand detailing delivered directly to your driveway.
            </p>
          </div>
        </div>
      </section>

      {/* Hero image */}
      <section className="pb-20 lg:pb-28">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div className="relative rounded-[2rem] overflow-hidden bg-gray-100 aspect-[16/7] lg:aspect-[21/8]">
            <img
              src="/dapper-van-house.jpg"
              alt="Dapr service van arriving at a customer's home"
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </div>
        </div>
      </section>

      {/* ── The Problem ────────────────────────────────────────────────── */}
      <section className="py-20 lg:py-28 border-t border-gray-100">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5 block">
                The Problem
              </span>
              <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-black leading-tight">
                Car care hasn't caught up.
              </h2>
            </div>
            <div className="space-y-5 text-lg text-gray-500 leading-relaxed pt-1 lg:pt-14">
              <p>
                Taking care of your car still means calling around, comparing
                unclear prices, rearranging your schedule, driving somewhere,
                waiting around, and hoping you chose the right provider.
              </p>
              <p className="text-gray-800 font-medium">
                We think it should be as easy as ordering everything else in
                your life.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── What We're Building ────────────────────────────────────────── */}
      <section className="py-20 lg:py-28 bg-gray-50">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="text-xs font-bold text-[#8c52ff] uppercase tracking-widest mb-5 block">
              What We're Building
            </span>
            <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-black leading-tight mb-8">
              Car care, on demand.
            </h2>
            <div className="space-y-5 text-lg text-gray-500 leading-relaxed">
              <p>
                Dapr connects drivers with vetted local professionals who come
                directly to them. Customers choose their vehicle, select a
                service, see the price upfront, book a time, and manage the
                entire experience from their phone.
              </p>
              <p>Today, we're starting with detailing.</p>
              <p className="text-gray-800 font-medium">
                But the larger vision is to make caring for a vehicle
                dramatically easier.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Credibility / Origin ───────────────────────────────────────── */}
      <section className="py-20 lg:py-28 border-t border-gray-100">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="relative rounded-[2rem] overflow-hidden bg-gray-100 aspect-[3/2]">
              <img
                src="/dapper-jeep-desert.jpg"
                alt="Dapr detailing professional at work"
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-black/30" />
            </div>
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5 block">
                Why Dapr
              </span>
              <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-black leading-tight mb-8">
                Built by people who know car care.
              </h2>
              <p className="text-lg text-gray-500 leading-relaxed mb-6">
                Dapr was founded by Henry Briggs after years spent building and
                operating an automotive detailing and restyling business. That
                firsthand experience shapes how we're building Dapr — around
                the real needs of customers and the professionals doing the
                work.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Marketplace mission ────────────────────────────────────────── */}
      <section className="py-20 lg:py-28 bg-black text-white">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div className="mb-16">
            <span className="text-xs font-bold text-[#8c52ff] uppercase tracking-widest mb-5 block">
              Two Sides, One Platform
            </span>
            <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
              Better for drivers.
              <br />
              Better for pros.
            </h2>
          </div>
          <div className="grid lg:grid-cols-2 gap-px bg-white/10 rounded-[2rem] overflow-hidden">
            {/* Drivers */}
            <div className="bg-black p-10 lg:p-14 space-y-4">
              <p className="text-xs font-bold text-[#8c52ff] uppercase tracking-widest">
                For Drivers
              </p>
              <h3 className="text-2xl font-extrabold text-white">
                Car care that comes to you.
              </h3>
              <p className="text-gray-400 leading-relaxed text-lg">
                Clear pricing, simple booking, trusted professionals, and less
                time spent waiting around. Your car gets taken care of wherever
                you are.
              </p>
            </div>
            {/* Pros */}
            <div className="bg-black p-10 lg:p-14 space-y-4">
              <p className="text-xs font-bold text-[#8c52ff] uppercase tracking-widest">
                For Dapr Pros
              </p>
              <h3 className="text-2xl font-extrabold text-white">
                A better way to earn doing great work.
              </h3>
              <p className="text-gray-400 leading-relaxed text-lg">
                Dapr gives independent car-care professionals technology,
                demand, and infrastructure so they can spend more time doing
                the work and less time managing everything around it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bigger Vision ──────────────────────────────────────────────── */}
      <section className="py-20 lg:py-28 border-t border-gray-100">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <span className="text-xs font-bold text-[#8c52ff] uppercase tracking-widest mb-5 block">
              The Vision
            </span>
            <h2 className="text-4xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight text-black leading-tight mb-10">
              We're building the infrastructure for on-demand car care.
            </h2>
            <div className="space-y-5 text-lg text-gray-500 leading-relaxed text-left max-w-2xl mx-auto">
              <p>Today, that starts with detailing.</p>
              <p>
                Over time, we believe more of the work required to maintain and
                care for a vehicle will come directly to the customer — powered
                by better software, smarter logistics, and new forms of
                automation.
              </p>
              <p className="text-gray-800 font-medium">
                Our goal isn't simply to build a better detailing company.
              </p>
              <p className="text-gray-800 font-medium">
                It's to build a better way to take care of a car.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Gilbert Origin ─────────────────────────────────────────────── */}
      <section className="py-20 lg:py-28 bg-gray-50">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="relative rounded-[2rem] overflow-hidden bg-gray-200 aspect-[3/2]">
              <img
                src="/dapper-lambo.jpg"
                alt="Dapr service in Arizona"
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-black/30" />
              <div className="absolute bottom-5 left-5 flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm">
                <Icon icon={MapPin} size="sm" className="text-[#8c52ff]" />
                <span className="text-sm font-bold text-black">Gilbert, Arizona</span>
              </div>
            </div>
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5 block">
                Where We Started
              </span>
              <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-black leading-tight mb-8">
                Starting local.
                <br />
                Thinking much bigger.
              </h2>
              <div className="space-y-5 text-lg text-gray-500 leading-relaxed">
                <p>Dapr started in Gilbert, Arizona.</p>
                <p>
                  We're beginning the way great local marketplaces are built:
                  one neighborhood, one customer, and one great experience at a
                  time.
                </p>
                <p>
                  We're learning what it takes to make on-demand car care
                  exceptional before bringing Dapr to more communities.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32 border-t border-gray-100">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-4xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight text-black leading-tight mb-10">
            There's a better way
            <br />
            to care for your car.
          </h2>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={() => setLocation("/auth")}
              className="bg-black text-white px-8 py-4 rounded-full font-bold text-base hover:bg-gray-900 active:scale-[0.98] transition-all inline-flex items-center gap-2"
            >
              Book with Dapr <Icon icon={ArrowRight} size="sm" />
            </button>
            <button
              onClick={() => setLocation("/providers/apply")}
              className="bg-white text-black px-8 py-4 rounded-full font-bold text-base border border-gray-200 hover:border-gray-400 active:scale-[0.98] transition-all"
            >
              Become a Dapr Pro
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
