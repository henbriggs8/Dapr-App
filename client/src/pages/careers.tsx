import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
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
  CheckCircle2,
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
  /** Role-specific application question shown in the Apply form. */
  question: string;
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
    question:
      "Tell us about a product or feature you owned from idea to production. What did you personally build?",
  },
  {
    title: "iOS Engineer (Swift / SwiftUI)",
    dept: "Engineering",
    location: "Remote (US)",
    type: "Full-time",
    icon: Laptop,
    blurb:
      "Build the native customer and provider apps. Deep knowledge of SwiftUI, async/await, and clean architecture. Bonus if you've done real-time location work.",
    question:
      "Share an iOS app, GitHub project, or Swift/SwiftUI project you've worked on and briefly explain your contribution.",
  },
  {
    title: "Fleet Sales Manager",
    dept: "Sales",
    location: "Salt Lake City, UT",
    type: "Full-time",
    icon: BarChart3,
    blurb:
      "Close fleet and property management accounts in our home market and expand nationally. You'll own pipeline from first call to signed contract.",
    question:
      "Tell us about your experience selling B2B. What is the largest or most meaningful account you've personally closed?",
  },
  {
    title: "Customer Success Lead",
    dept: "Sales",
    location: "Salt Lake City, UT · Hybrid",
    type: "Full-time",
    icon: Users,
    blurb:
      "Onboard new customers, manage relationships with fleet partners, and keep churn at zero. You're the voice of the customer inside Dapr.",
    question:
      "Tell us about a customer relationship or account you were responsible for retaining or growing.",
  },
  {
    title: "Field Operations Manager",
    dept: "Operations",
    location: "Salt Lake City, UT",
    type: "Full-time",
    icon: Wrench,
    blurb:
      "Oversee provider quality, scheduling, and on-site operations. You'll build the playbook that scales our service to every new market.",
    question:
      "Tell us about an operation, workforce, or field team you've managed and roughly how large it was.",
  },
  {
    title: "Detail Technician",
    dept: "Operations",
    location: "Salt Lake City, UT",
    type: "Full-time",
    icon: Wrench,
    blurb:
      "Join our certified detailer network. Work on your schedule, earn competitive pay, and be the face of Dapr for customers who love their cars.",
    question:
      "How many years of professional detailing experience do you have, and what detailing services are you comfortable performing?",
  },
  {
    title: "Growth Marketing Manager",
    dept: "Marketing",
    location: "Remote (US)",
    type: "Full-time",
    icon: Megaphone,
    blurb:
      "Own paid, SEO, and partnership channels. You'll run experiments, track what works, and build the funnel that brings both customers and providers to Dapr.",
    question:
      "Tell us about a growth experiment or campaign you ran. What did you do and what was the result?",
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
    title: "Flexible PTO",
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

/* ── Application form ─────────────────────────────────────────────── */

const inputCls =
  "w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-[#8c52ff] focus:ring-2 focus:ring-[#8c52ff]/10 transition-all";
const labelCls = "text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block";

const MAX_RESUME_BYTES = 8 * 1024 * 1024;
const RESUME_ACCEPT = ".pdf,.doc,.docx";
const RESUME_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  city: "",
  state: "",
  linkedinUrl: "",
  portfolioUrl: "",
  whyDapr: "",
  relevantExperience: "",
  roleSpecificAnswer: "",
  availableStart: "",
  authorizedToWorkUs: "",
  requiresSponsorship: "",
  referralSource: "",
};

function YesNo({
  label,
  value,
  onChange,
  testId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  testId: string;
}) {
  return (
    <div>
      <span className={labelCls}>{label} *</span>
      <div className="flex gap-2">
        {["Yes", "No"].map((opt) => {
          const optValue = opt === "Yes" ? "true" : "false";
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(optValue)}
              data-testid={`${testId}-${opt.toLowerCase()}`}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                value === optValue
                  ? "bg-[#8c52ff] text-white shadow-sm"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-black"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ApplicationForm({
  role,
  onChangePosition,
}: {
  role: Role;
  onChangePosition: () => void;
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [resume, setResume] = useState<File | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function set(field: keyof typeof EMPTY_FORM, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleResume(file: File | null) {
    setResumeError(null);
    if (!file) return setResume(null);
    const ext = file.name.toLowerCase().split(".").pop();
    const okType = RESUME_MIME_TYPES.includes(file.type) || ["pdf", "doc", "docx"].includes(ext ?? "");
    if (!okType) {
      setResume(null);
      return setResumeError("Resume must be a PDF, DOC, or DOCX file.");
    }
    if (file.size > MAX_RESUME_BYTES) {
      setResume(null);
      return setResumeError("Resume must be 8 MB or smaller.");
    }
    setResume(file);
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (!resume) throw new Error("Please attach your resume.");
      const data = new FormData();
      data.append("role", role.title);
      Object.entries(form).forEach(([key, value]) => data.append(key, value));
      data.append("resume", resume);
      const res = await fetch("/api/careers/applications", { method: "POST", body: data });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message =
          typeof body?.error === "string"
            ? body.error
            : "Please double-check the highlighted fields and try again.";
        throw new Error(message);
      }
    },
    onSuccess: () => setSubmitted(true),
  });

  if (submitted) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-10 shadow-sm text-center max-w-xl mx-auto">
        <div className="w-14 h-14 mx-auto rounded-full bg-[#8c52ff]/10 text-[#8c52ff] flex items-center justify-center mb-5">
          <Icon icon={CheckCircle2} size="lg" />
        </div>
        <h3 className="text-2xl font-extrabold tracking-tight text-black mb-2">Application received</h3>
        <p className="text-gray-500 leading-relaxed">
          Thanks for your interest in Dapr. We've received your application and will reach out if there's a fit.
        </p>
      </div>
    );
  }

  const requiredFilled =
    form.firstName && form.lastName && form.email && form.phone && form.city && form.state &&
    form.whyDapr && form.relevantExperience && form.roleSpecificAnswer && form.availableStart &&
    form.authorizedToWorkUs !== "" && form.requiresSponsorship !== "" && resume;

  return (
    <form
      className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-10 shadow-sm max-w-3xl mx-auto flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!mutation.isPending) mutation.mutate();
      }}
    >
      {/* Selected position */}
      <div className="flex items-center justify-between gap-4 bg-[#8c52ff]/5 border border-[#8c52ff]/15 rounded-xl px-5 py-4">
        <div>
          <p className="text-xs font-bold text-[#8c52ff] uppercase tracking-widest mb-0.5">Applying for</p>
          <p className="font-bold text-black" data-testid="text-selected-role">{role.title}</p>
        </div>
        <button
          type="button"
          onClick={onChangePosition}
          className="text-sm font-semibold text-gray-400 hover:text-[#8c52ff] transition-colors shrink-0"
          data-testid="button-change-position"
        >
          Change position
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className={labelCls}>First name *</label>
          <input className={inputCls} required value={form.firstName} onChange={(e) => set("firstName", e.target.value)} data-testid="input-first-name" />
        </div>
        <div>
          <label className={labelCls}>Last name *</label>
          <input className={inputCls} required value={form.lastName} onChange={(e) => set("lastName", e.target.value)} data-testid="input-last-name" />
        </div>
        <div>
          <label className={labelCls}>Email *</label>
          <input className={inputCls} type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} data-testid="input-email" />
        </div>
        <div>
          <label className={labelCls}>Phone number *</label>
          <input className={inputCls} type="tel" required value={form.phone} onChange={(e) => set("phone", e.target.value)} data-testid="input-phone" />
        </div>
        <div>
          <label className={labelCls}>City *</label>
          <input className={inputCls} required value={form.city} onChange={(e) => set("city", e.target.value)} data-testid="input-city" />
        </div>
        <div>
          <label className={labelCls}>State *</label>
          <input className={inputCls} required value={form.state} onChange={(e) => set("state", e.target.value)} data-testid="input-state" />
        </div>
        <div>
          <label className={labelCls}>LinkedIn URL</label>
          <input className={inputCls} type="url" placeholder="https://linkedin.com/in/…" value={form.linkedinUrl} onChange={(e) => set("linkedinUrl", e.target.value)} data-testid="input-linkedin" />
        </div>
        <div>
          <label className={labelCls}>Portfolio / GitHub / Website</label>
          <input className={inputCls} type="url" placeholder="https://…" value={form.portfolioUrl} onChange={(e) => set("portfolioUrl", e.target.value)} data-testid="input-portfolio" />
        </div>
      </div>

      {/* Resume */}
      <div>
        <label className={labelCls}>Resume (PDF, DOC, or DOCX — max 8 MB) *</label>
        <input
          type="file"
          accept={RESUME_ACCEPT}
          onChange={(e) => handleResume(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-[#8c52ff]/10 file:px-5 file:py-2.5 file:text-sm file:font-semibold file:text-[#8c52ff] hover:file:bg-[#8c52ff]/20 file:transition-colors cursor-pointer"
          data-testid="input-resume"
        />
        {resumeError && <p className="text-sm text-red-500 mt-1.5">{resumeError}</p>}
        {resume && !resumeError && (
          <p className="text-sm text-gray-400 mt-1.5">Attached: {resume.name}</p>
        )}
      </div>

      <div>
        <label className={labelCls}>Why are you interested in joining Dapr? *</label>
        <textarea className={`${inputCls} resize-none`} rows={4} required value={form.whyDapr} onChange={(e) => set("whyDapr", e.target.value)} data-testid="input-why-dapr" />
      </div>
      <div>
        <label className={labelCls}>Tell us about something you've done that makes you a strong fit for this role. *</label>
        <textarea className={`${inputCls} resize-none`} rows={4} required value={form.relevantExperience} onChange={(e) => set("relevantExperience", e.target.value)} data-testid="input-experience" />
      </div>
      <div>
        <label className={labelCls}>{role.question} *</label>
        <textarea className={`${inputCls} resize-none`} rows={4} required value={form.roleSpecificAnswer} onChange={(e) => set("roleSpecificAnswer", e.target.value)} data-testid="input-role-answer" />
      </div>

      <div>
        <label className={labelCls}>When could you start? *</label>
        <input className={inputCls} required placeholder="e.g. Two weeks from offer" value={form.availableStart} onChange={(e) => set("availableStart", e.target.value)} data-testid="input-start" />
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <YesNo label="Authorized to work in the U.S.?" value={form.authorizedToWorkUs} onChange={(v) => set("authorizedToWorkUs", v)} testId="button-authorized" />
        <YesNo label="Will you require sponsorship?" value={form.requiresSponsorship} onChange={(v) => set("requiresSponsorship", v)} testId="button-sponsorship" />
      </div>

      <div>
        <label className={labelCls}>How did you hear about Dapr?</label>
        <input className={inputCls} value={form.referralSource} onChange={(e) => set("referralSource", e.target.value)} data-testid="input-referral" />
      </div>

      {mutation.isError && (
        <p className="text-sm text-red-500" data-testid="text-submit-error">
          {(mutation.error as Error).message}
        </p>
      )}

      <button
        type="submit"
        disabled={mutation.isPending || !requiredFilled}
        className="inline-flex items-center justify-center gap-2 bg-[#8c52ff] text-white font-bold text-base px-8 py-4 rounded-full shadow-lg hover:bg-[#7a3fff] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        data-testid="button-submit-application"
      >
        {mutation.isPending ? "Submitting…" : <>Submit application <Icon icon={ArrowRight} size="sm" /></>}
      </button>
    </form>
  );
}

/* ── Main page ────────────────────────────────────────────────────── */

export default function CareersPage() {
  const [, nav] = useLocation();
  const [activeDept, setActiveDept] = useState<Department>("All");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const applySectionRef = useRef<HTMLDivElement | null>(null);

  const filtered = activeDept === "All" ? ROLES : ROLES.filter((r) => r.dept === activeDept);

  function handleApply(role: Role) {
    setSelectedRole(role);
    // Wait a tick so the section renders (or re-renders) before scrolling.
    requestAnimationFrame(() => {
      applySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      applySectionRef.current?.focus({ preventScroll: true });
    });
  }

  function handleGeneralApply() {
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
              { val: "Growing", label: "Team" },
              { val: "3", label: "New cities launching this year" },
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
      <section id="open-roles" className="py-20 lg:py-28">
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
                <RoleCard key={role.title} role={role} onApply={() => handleApply(role)} />
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
              onClick={handleGeneralApply}
              className="shrink-0 flex items-center gap-2 bg-black text-white font-semibold text-sm px-6 py-3 rounded-full hover:bg-[#8c52ff] transition-colors"
            >
              Send a general application <Icon icon={ArrowRight} size="sm" />
            </button>
          </div>

          {/* ── Apply to Dapr ─────────────────────────────────────── */}
          {selectedRole && (
            <div
              ref={applySectionRef}
              tabIndex={-1}
              className="mt-16 scroll-mt-28 outline-none"
              aria-label={`Apply to Dapr — ${selectedRole.title}`}
            >
              <div className="max-w-xl mx-auto text-center mb-10">
                <span className="text-xs font-bold text-[#8c52ff] uppercase tracking-widest mb-3 block">
                  Apply to Dapr
                </span>
                <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-black">
                  Tell us about yourself.
                </h2>
              </div>
              <ApplicationForm
                key={selectedRole.title}
                role={selectedRole}
                onChangePosition={() => {
                  setSelectedRole(null);
                  document.getElementById("open-roles")?.scrollIntoView({ behavior: "smooth" });
                }}
              />
            </div>
          )}
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
            onClick={handleGeneralApply}
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
