import { useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowRight,
  MapPin,
  Briefcase,
  Clock,
  Zap,
  Heart,
  Users,
  TrendingUp,
  Laptop,
  Wrench,
  BarChart3,
  Megaphone,
  type LucideIcon,
} from "lucide-react";
import SiteNav from "@/components/site-nav";
import { Icon } from "@/components/ui/icon";

/* ── Data ─────────────────────────────────────────────────────────── */

type Department = "All" | "Engineering" | "Operations" | "Sales" | "Marketing";

type Role = {
  title: string;
  dept: Department;
  location: string;
  type: "Full-time" | "Part-time" | "Contract";
  icon: LucideIcon;
  blurb: string;
};

const ROLES: Role[] = [
  {
    title: "Senior Full-Stack Engineer",
    dept: "Engineering",
    location: "Remote (US)",
    type: "Full-time",
    icon: Laptop,
    blurb:
      "Own core platform features — booking flows, real-time dispatch, and the APIs that power our iOS apps. We move fast; you'll ship weekly.",
  },
  {
    title: "iOS Engineer (Swift / SwiftUI)",
    dept: "Engineering",
    location: "Remote (US)",
    type: "Full-time",
    icon: Laptop,
    blurb:
      "Build the native customer and provider apps. Deep knowledge of SwiftUI, async/await, and clean architecture. Bonus if you've done real-time location work.",
  },
  {
    title: "Fleet Sales Manager",
    dept: "Sales",
    location: "Salt Lake City, UT",
    type: "Full-time",
    icon: BarChart3,
    blurb:
      "Close fleet and property management accounts in our home market and expand nationally. You'll own pipeline from first call to signed contract.",
  },
  {
    title: "Customer Success Lead",
    dept: "Sales",
    location: "Salt Lake City, UT · Hybrid",
    type: "Full-time",
    icon: Users,
    blurb:
      "Onboard new customers, manage relationships with fleet partners, and keep churn at zero. You're the voice of the customer inside Dapr.",
  },
  {
    title: "Field Operations Manager",
    dept: "Operations",
    location: "Salt Lake City, UT",
    type: "Full-time",
    icon: Wrench,
    blurb:
      "Oversee provider quality, scheduling, and on-site operations. You'll build the playbook that scales our service to every new market.",
  },
  {
    title: "Detail Technician",
    dept: "Operations",
    location: "Salt Lake City, UT",
    type: "Full-time",
    icon: Wrench,
    blurb:
      "Join our certified detailer network. Work on your schedule, earn competitive pay, and be the face of Dapr for customers who love their cars.",
  },
  {
    title: "Growth Marketing Manager",
    dept: "Marketing",
    location: "Remote (US)",
    type: "Full-time",
    icon: Megaphone,
    blurb:
      "Own paid, SEO, and partnership channels. You'll run experiments, track what works, and build the funnel that brings both customers and providers to Dapr.",
  },
];

const PERKS = [
  {
    icon: Zap,
    title: "Equity from day one",
    body: "Every full-time Dapr employee gets meaningful equity. We're building something real — you should own a piece of it.",
  },
  {
    icon: Heart,
    title: "Full health coverage",
    body: "Medical, dental, and vision — 100% employer-paid for you, heavily subsidized for dependents.",
  },
  {
    icon: Clock,
    title: "Flexible hours",
    body: "We care about output, not clock-in times. Work when you're sharpest. Take Fridays slow if you need to.",
  },
  {
    icon: TrendingUp,
    title: "Real growth",
    body: "Early-stage means your scope grows fast. The person who joins as an IC today may be running a team in 12 months.",
  },
  {
    icon: Laptop,
    title: "Top-of-line setup",
    body: "MacBook Pro, any peripherals you need, and a $500 home-office budget to make your space work.",
  },
  {
    icon: Briefcase,
    title: "Unlimited PTO",
    body: "Take the time you need to recharge. We set a two-week minimum because real rest makes better work.",
  },
];

const DEPT_TABS: Department[] = ["All", "Engineering", "Operations", "Sales", "Marketing"];

/* ── Sub-components ───────────────────────────────────────────────── */

function RoleCard({ role, onApply }: { role: Role; onApply: () => void }) {
  return (
    <div className="group bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-[#8c52ff]/30 transition-all flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#8c52ff]/10 text-[#8c52ff] flex items-center justify-center shrink-0">
            <Icon icon={role.icon} size="md" />
          </div>
          <div>
            <h3 className="font-bold text-black text-base leading-tight">{role.title}</h3>
            <span className="text-xs font-semibold text-[#8c52ff] uppercase tracking-widest">{role.dept}</span>
          </div>
        </div>
        <span className="text-xs font-medium text-gray-400 bg-gray-50 rounded-full px-3 py-1 shrink-0">{role.type}</span>
      </div>

      <p className="text-sm text-gray-500 leading-relaxed">{role.blurb}</p>

      <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Icon icon={MapPin} size="sm" />
          <span>{role.location}</span>
        </div>
        <button
          onClick={onApply}
          className="flex items-center gap-1.5 text-sm font-semibold text-[#8c52ff] hover:gap-2.5 transition-all"
        >
          Apply <Icon icon={ArrowRight} size="sm" />
        </button>
      </div>
    </div>
  );
}

function PerkCard({ icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <div className="flex gap-4">
      <div className="w-10 h-10 rounded-xl bg-[#8c52ff]/10 text-[#8c52ff] flex items-center justify-center shrink-0 mt-0.5">
        <Icon icon={icon} size="md" />
      </div>
      <div>
        <h3 className="font-bold text-black mb-1">{title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────────────── */

export default function CareersPage() {
  const [, nav] = useLocation();
  const [activeDept, setActiveDept] = useState<Department>("All");

  const filtered = activeDept === "All" ? ROLES : ROLES.filter((r) => r.dept === activeDept);

  function handleApply() {
    window.location.href = "mailto:careers@dapr.com?subject=Application";
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <SiteNav />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="pt-32 pb-20 lg:pt-40 lg:pb-28 bg-white">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-block text-xs font-bold text-[#8c52ff] uppercase tracking-widest mb-5">
              Join the team
            </span>
            <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-black leading-[1.05] mb-6">
              Help us build the{" "}
              <span className="text-[#8c52ff]">future of car care.</span>
            </h1>
            <p className="text-xl text-gray-500 leading-relaxed max-w-2xl">
              Dapr is a small team building something people actually love — on-demand, professional auto detailing that
              shows up where you are. We're looking for sharp, self-directed people to grow with us.
            </p>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-6 mt-14 max-w-lg">
            {[
              { val: "~20", label: "People on the team" },
              { val: "3+", label: "Cities live" },
              { val: "Seed", label: "Stage" },
            ].map(({ val, label }) => (
              <div key={label}>
                <p className="text-3xl font-extrabold text-black tracking-tight">{val}</p>
                <p className="text-sm text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Values ───────────────────────────────────────────────── */}
      <section className="py-20 bg-gray-50 border-y border-gray-100">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div className="max-w-xl mb-12">
            <span className="text-xs font-bold text-[#8c52ff] uppercase tracking-widest mb-3 block">How we work</span>
            <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-black">
              Small team. Big ownership.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Ship fast, learn faster",
                body: "We don't wait for perfect. We put things in front of customers quickly, see what lands, and iterate. Long planning cycles don't exist here.",
              },
              {
                title: "Own the outcome",
                body: "There's no one to hand things off to. When you take on a problem, you see it through from first principles to something working in the wild.",
              },
              {
                title: "High trust, high standards",
                body: "We give people autonomy early because we hire people who've earned it. We expect a lot, give a lot back, and have no patience for politics.",
              },
              {
                title: "Customer first, always",
                body: "Every decision — product, ops, design — runs through one filter: does this make the customer's experience better? If yes, ship it.",
              },
              {
                title: "Operate in the real world",
                body: "We're not a pure software company. Our product shows up at someone's car. The people who thrive here respect the physical side of what we do.",
              },
              {
                title: "Default to transparency",
                body: "Financials, strategy, and feedback are shared openly. You won't wonder what's going on. We expect you to engage with the full picture.",
              },
            ].map(({ title, body }) => (
              <div key={title} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="font-bold text-black mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Open roles ───────────────────────────────────────────── */}
      <section className="py-20 lg:py-28">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div className="max-w-xl mb-10">
            <span className="text-xs font-bold text-[#8c52ff] uppercase tracking-widest mb-3 block">Open roles</span>
            <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-black">
              Find your spot on the team.
            </h2>
          </div>

          {/* Department filter */}
          <div className="flex flex-wrap gap-2 mb-8">
            {DEPT_TABS.map((dept) => (
              <button
                key={dept}
                onClick={() => setActiveDept(dept)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  activeDept === dept
                    ? "bg-[#8c52ff] text-white shadow-sm"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-black"
                }`}
              >
                {dept}
              </button>
            ))}
          </div>

          {filtered.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((role) => (
                <RoleCard key={role.title} role={role} onApply={handleApply} />
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm py-12 text-center">No open roles in this department right now.</p>
          )}

          {/* General application nudge */}
          <div className="mt-12 rounded-2xl bg-[#8c52ff]/5 border border-[#8c52ff]/15 p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <h3 className="font-bold text-black text-lg mb-1">Don't see your role?</h3>
              <p className="text-gray-500 text-sm max-w-md">
                We occasionally hire for positions we haven't posted yet. If you think you're a fit, send us a note —
                we read everything.
              </p>
            </div>
            <button
              onClick={handleApply}
              className="shrink-0 flex items-center gap-2 bg-black text-white font-semibold text-sm px-6 py-3 rounded-full hover:bg-[#8c52ff] transition-colors"
            >
              Send a general application <Icon icon={ArrowRight} size="sm" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Perks ────────────────────────────────────────────────── */}
      <section className="py-20 bg-gray-50 border-y border-gray-100">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div className="max-w-xl mb-12">
            <span className="text-xs font-bold text-[#8c52ff] uppercase tracking-widest mb-3 block">Benefits</span>
            <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-black">
              We take care of the people who build this.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {PERKS.map((p) => (
              <PerkCard key={p.title} {...p} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-4xl lg:text-6xl font-extrabold tracking-tight text-black mb-5">
            Ready to build with us?
          </h2>
          <p className="text-xl text-gray-500 mb-10 max-w-lg mx-auto">
            Browse the open roles above or drop us a line. Either way, we'd love to hear from you.
          </p>
          <button
            onClick={handleApply}
            className="inline-flex items-center gap-2 bg-[#8c52ff] text-white font-bold text-base px-8 py-4 rounded-full shadow-lg hover:bg-[#7a3fff] transition-colors"
          >
            Get in touch <Icon icon={ArrowRight} size="sm" />
          </button>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <span>© {new Date().getFullYear()} Dapr, Inc. All rights reserved.</span>
          <div className="flex gap-5">
            <button onClick={() => nav("/privacy")} className="hover:text-black transition-colors">Privacy</button>
            <button onClick={() => nav("/terms")} className="hover:text-black transition-colors">Terms</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
