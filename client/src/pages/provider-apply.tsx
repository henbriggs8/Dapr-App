import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import SiteNav from "@/components/site-nav";
import { Icon } from "@/components/ui/icon";
import {
  ArrowRight, ArrowLeft, CheckCircle2, User, Wrench, Clock,
  FileText, Loader2, ChevronRight, AlertCircle,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface ApplicationData {
  // Step 1
  fullName: string;
  phoneNumber: string;
  email: string;
  city: string;
  zipCode: string;
  // Step 2
  experienceLevel: string;
  yearsDetailing: number | "";
  vehicleType: string;
  vehicleDescription: string;
  // Step 3
  availableWeekdays: boolean;
  availableWeekends: boolean;
  maxTravelRadius: number;
  notes: string;
  // Review
  privacyAccepted: boolean;
  termsAccepted: boolean;
  contactConsent: boolean;
}

const EMPTY: ApplicationData = {
  fullName: "", phoneNumber: "", email: "", city: "", zipCode: "",
  experienceLevel: "", yearsDetailing: "", vehicleType: "", vehicleDescription: "",
  availableWeekdays: false, availableWeekends: false, maxTravelRadius: 15, notes: "",
  privacyAccepted: false, termsAccepted: false, contactConsent: false,
};

const STORAGE_KEY = "dapr_pro_apply_draft";

const EXPERIENCE_OPTIONS = [
  { value: "newToDetailing", label: "New to detailing" },
  { value: "someExperience", label: "Some experience" },
  { value: "experienced", label: "Experienced" },
  { value: "professional", label: "Professional detailer" },
];

const VEHICLE_TYPES = ["Car", "SUV", "Truck", "Van"];

const STEPS = [
  { id: 1, label: "Your info",   icon: User },
  { id: 2, label: "Experience",  icon: Wrench },
  { id: 3, label: "Availability",icon: Clock },
  { id: 4, label: "Review",      icon: FileText },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return raw;
}

function isValidZip(z: string) { return /^\d{5}$/.test(z); }
function isValidEmail(e: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

// ── Field components ──────────────────────────────────────────────────────────

function Field({ label, error, children, hint }: { label: string; error?: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-800 mb-1.5">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function Input({ error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return (
    <input
      className={`w-full px-4 py-3 rounded-xl border text-sm bg-white transition-colors outline-none focus:ring-2 focus:ring-[#8c52ff]/30 ${
        error ? "border-red-400 focus:border-red-400" : "border-gray-200 focus:border-[#8c52ff]"
      }`}
      {...props}
    />
  );
}

// ── Step components ───────────────────────────────────────────────────────────

function StepYourInfo({ data, onChange, errors }: { data: ApplicationData; onChange: (d: Partial<ApplicationData>) => void; errors: Record<string, string> }) {
  return (
    <div className="space-y-5">
      <Field label="Full name" error={errors.fullName}>
        <Input
          value={data.fullName}
          onChange={e => onChange({ fullName: e.target.value })}
          placeholder="Jane Smith"
          error={errors.fullName}
        />
      </Field>
      <Field label="Phone number" error={errors.phoneNumber}>
        <Input
          type="tel"
          value={data.phoneNumber}
          onChange={e => onChange({ phoneNumber: e.target.value })}
          placeholder="(555) 000-0000"
          error={errors.phoneNumber}
        />
      </Field>
      <Field label="Email address" error={errors.email}>
        <Input
          type="email"
          value={data.email}
          onChange={e => onChange({ email: e.target.value })}
          placeholder="jane@example.com"
          error={errors.email}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="City" error={errors.city}>
          <Input
            value={data.city}
            onChange={e => onChange({ city: e.target.value })}
            placeholder="Austin"
            error={errors.city}
          />
        </Field>
        <Field label="ZIP code" error={errors.zipCode}>
          <Input
            value={data.zipCode}
            onChange={e => onChange({ zipCode: e.target.value })}
            placeholder="78701"
            maxLength={5}
            error={errors.zipCode}
          />
        </Field>
      </div>
    </div>
  );
}

function StepExperience({ data, onChange, errors }: { data: ApplicationData; onChange: (d: Partial<ApplicationData>) => void; errors: Record<string, string> }) {
  return (
    <div className="space-y-6">
      <Field label="Experience level" error={errors.experienceLevel}>
        <div className="grid grid-cols-2 gap-3 mt-1">
          {EXPERIENCE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ experienceLevel: opt.value })}
              className={`px-4 py-3 rounded-xl border text-sm font-medium text-left transition-all ${
                data.experienceLevel === opt.value
                  ? "border-[#8c52ff] bg-[#f3eeff] text-[#8c52ff]"
                  : "border-gray-200 text-gray-700 hover:border-gray-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {errors.experienceLevel && <p className="text-xs text-red-500 mt-1">{errors.experienceLevel}</p>}
      </Field>

      <Field label="Years detailing" error={errors.yearsDetailing} hint="Enter 0 if you're just getting started">
        <Input
          type="number"
          min={0}
          max={40}
          value={data.yearsDetailing}
          onChange={e => onChange({ yearsDetailing: e.target.value === "" ? "" : Math.min(40, Math.max(0, parseInt(e.target.value) || 0)) })}
          placeholder="0"
          error={errors.yearsDetailing}
        />
      </Field>

      <Field label="Your vehicle type" error={errors.vehicleType}>
        <div className="flex flex-wrap gap-2 mt-1">
          {VEHICLE_TYPES.map(vt => (
            <button
              key={vt}
              type="button"
              onClick={() => onChange({ vehicleType: vt })}
              className={`px-4 py-2.5 rounded-full border text-sm font-medium transition-all ${
                data.vehicleType === vt
                  ? "border-[#8c52ff] bg-[#f3eeff] text-[#8c52ff]"
                  : "border-gray-200 text-gray-700 hover:border-gray-300"
              }`}
            >
              {vt}
            </button>
          ))}
        </div>
        {errors.vehicleType && <p className="text-xs text-red-500 mt-1">{errors.vehicleType}</p>}
      </Field>

      <Field label="Vehicle description" error={errors.vehicleDescription} hint='e.g. "2022 Ford Explorer"'>
        <Input
          value={data.vehicleDescription}
          onChange={e => onChange({ vehicleDescription: e.target.value })}
          placeholder="2022 Ford Explorer"
          error={errors.vehicleDescription}
        />
      </Field>
    </div>
  );
}

function StepAvailability({ data, onChange, errors }: { data: ApplicationData; onChange: (d: Partial<ApplicationData>) => void; errors: Record<string, string> }) {
  const radiusOptions = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

  return (
    <div className="space-y-6">
      <Field label="When are you available?" error={errors.availability}>
        <div className="grid grid-cols-2 gap-3 mt-1">
          {[
            { key: "availableWeekdays", label: "Weekdays", sub: "Mon – Fri" },
            { key: "availableWeekends", label: "Weekends", sub: "Sat – Sun" },
          ].map(opt => (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange({ [opt.key]: !data[opt.key as keyof ApplicationData] } as any)}
              className={`px-4 py-4 rounded-xl border text-sm font-medium text-left transition-all ${
                data[opt.key as keyof ApplicationData]
                  ? "border-[#8c52ff] bg-[#f3eeff] text-[#8c52ff]"
                  : "border-gray-200 text-gray-700 hover:border-gray-300"
              }`}
            >
              <span className="block font-semibold">{opt.label}</span>
              <span className="text-xs text-gray-400">{opt.sub}</span>
            </button>
          ))}
        </div>
        {errors.availability && <p className="text-xs text-red-500 mt-1">{errors.availability}</p>}
      </Field>

      <Field label={`Travel radius: ${data.maxTravelRadius} miles`}>
        <div className="flex flex-wrap gap-2 mt-1">
          {radiusOptions.map(r => (
            <button
              key={r}
              type="button"
              onClick={() => onChange({ maxTravelRadius: r })}
              className={`w-14 py-2 rounded-xl border text-sm font-semibold transition-all ${
                data.maxTravelRadius === r
                  ? "border-[#8c52ff] bg-[#f3eeff] text-[#8c52ff]"
                  : "border-gray-200 text-gray-700 hover:border-gray-300"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Additional notes" hint="You do not need to self-certify a detailed equipment list. Dapr will review your vehicle information during approval.">
        <textarea
          value={data.notes}
          onChange={e => {
            if (e.target.value.length <= 1000) onChange({ notes: e.target.value });
          }}
          placeholder="Anything else you'd like us to know…"
          rows={4}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white transition-colors outline-none focus:ring-2 focus:ring-[#8c52ff]/30 focus:border-[#8c52ff] resize-none"
        />
        <p className="text-xs text-gray-400 mt-1 text-right">{data.notes.length}/1,000</p>
      </Field>
    </div>
  );
}

function ReviewRow({ label, value, onEdit }: { label: string; value: React.ReactNode; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-gray-100 last:border-0">
      <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-sm text-gray-900">{value}</p>
      </div>
      <button onClick={onEdit} className="text-xs text-[#8c52ff] font-semibold hover:underline shrink-0 ml-4 mt-0.5">Edit</button>
    </div>
  );
}

function StepReview({ data, onEdit, onChange, errors }: {
  data: ApplicationData;
  onEdit: (step: number) => void;
  onChange: (d: Partial<ApplicationData>) => void;
  errors: Record<string, string>;
}) {
  const expLabel = EXPERIENCE_OPTIONS.find(o => o.value === data.experienceLevel)?.label || data.experienceLevel;
  const avail = [data.availableWeekdays && "Weekdays", data.availableWeekends && "Weekends"].filter(Boolean).join(", ");

  return (
    <div className="space-y-6">
      {/* Summary sections */}
      <div className="bg-gray-50 rounded-2xl px-4">
        <ReviewRow label="Your information" onEdit={() => onEdit(1)} value={
          <span>{data.fullName} · {data.email} · {data.city}, {data.zipCode}</span>
        } />
        <ReviewRow label="Experience & vehicle" onEdit={() => onEdit(2)} value={
          <span>{expLabel} · {data.yearsDetailing} yr{data.yearsDetailing === 1 ? "" : "s"} · {data.vehicleType} ({data.vehicleDescription})</span>
        } />
        <ReviewRow label="Availability & radius" onEdit={() => onEdit(3)} value={
          <span>{avail} · {data.maxTravelRadius} mi radius</span>
        } />
      </div>

      {/* Legal agreements */}
      <div className="space-y-4 pt-2">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Agreements</p>

        {[
          {
            key: "privacyAccepted",
            text: (
              <>I have read and agree to the{" "}
                <a href="/privacy" target="_blank" className="text-[#8c52ff] underline">Privacy Policy</a>.
              </>
            ),
          },
          {
            key: "termsAccepted",
            text: (
              <>I have read and agree to the{" "}
                <a href="/terms" target="_blank" className="text-[#8c52ff] underline">Dapr Provider Applicant Terms</a>.
              </>
            ),
          },
          {
            key: "contactConsent",
            text: "I consent to Dapr contacting me via phone, email, or text regarding my application.",
          },
        ].map(({ key, text }) => (
          <label key={key} className="flex items-start gap-3 cursor-pointer group">
            <div
              onClick={() => onChange({ [key]: !data[key as keyof ApplicationData] } as any)}
              className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                data[key as keyof ApplicationData]
                  ? "border-[#8c52ff] bg-[#8c52ff]"
                  : "border-gray-300 group-hover:border-[#8c52ff]"
              }`}
            >
              {data[key as keyof ApplicationData] && (
                <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span className="text-sm text-gray-700 leading-relaxed">{text}</span>
          </label>
        ))}

        {errors.agreements && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <Icon icon={AlertCircle} size="xs" /> {errors.agreements}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Progress bar ─────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
            current === s.id ? "bg-[#8c52ff] text-white" :
            current > s.id ? "bg-[#e8dcff] text-[#8c52ff]" :
            "bg-gray-100 text-gray-400"
          }`}>
            {current > s.id ? (
              <Icon icon={CheckCircle2} size="xs" />
            ) : (
              <Icon icon={s.icon} size="xs" />
            )}
            <span className="hidden sm:inline">{s.label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-px w-4 lg:w-8 transition-all ${current > s.id ? "bg-[#8c52ff]" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Confirmation ──────────────────────────────────────────────────────────────

function Confirmation({ appId }: { appId: number }) {
  const [, setLocation] = useLocation();
  return (
    <div className="text-center py-6">
      <div className="w-20 h-20 rounded-full bg-[#f3eeff] flex items-center justify-center mx-auto mb-6">
        <Icon icon={CheckCircle2} size="lg" className="text-[#8c52ff]" />
      </div>
      <h2 className="text-2xl font-extrabold text-gray-900 mb-3">Application received</h2>
      <p className="text-gray-500 text-base leading-relaxed max-w-md mx-auto mb-2">
        We've received your application to become a Dapr Pro. Our team will review your information and contact you about verification and next steps.
      </p>
      <p className="text-sm text-gray-400 mb-8">Application reference #{appId}</p>
      <div className="space-y-3 max-w-xs mx-auto">
        <button
          onClick={() => setLocation("/providers/apply/status")}
          className="w-full py-3.5 rounded-2xl bg-[#8c52ff] text-white font-bold text-sm hover:bg-[#7a3fff] transition-colors inline-flex items-center justify-center gap-2"
        >
          View application status <Icon icon={ChevronRight} size="sm" />
        </button>
        <button
          onClick={() => setLocation("/")}
          className="w-full py-3.5 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Back to Dapr
        </button>
      </div>
    </div>
  );
}

// ── Validation ────────────────────────────────────────────────────────────────

function validateStep(step: number, data: ApplicationData): Record<string, string> {
  const errs: Record<string, string> = {};
  if (step === 1) {
    if (!data.fullName.trim()) errs.fullName = "Full name is required";
    if (!data.phoneNumber.trim()) errs.phoneNumber = "Phone number is required";
    if (!data.email.trim()) errs.email = "Email is required";
    else if (!isValidEmail(data.email)) errs.email = "Enter a valid email address";
    if (!data.city.trim()) errs.city = "City is required";
    if (!data.zipCode.trim()) errs.zipCode = "ZIP code is required";
    else if (!isValidZip(data.zipCode)) errs.zipCode = "Enter a valid 5-digit ZIP code";
  }
  if (step === 2) {
    if (!data.experienceLevel) errs.experienceLevel = "Select your experience level";
    if (data.yearsDetailing === "") errs.yearsDetailing = "Enter years of experience (0 is fine)";
    if (!data.vehicleType) errs.vehicleType = "Select your vehicle type";
    if (!data.vehicleDescription.trim()) errs.vehicleDescription = "Describe your vehicle";
  }
  if (step === 3) {
    if (!data.availableWeekdays && !data.availableWeekends) {
      errs.availability = "Select at least one availability option";
    }
  }
  if (step === 4) {
    if (!data.privacyAccepted || !data.termsAccepted || !data.contactConsent) {
      errs.agreements = "All agreements must be accepted before submitting";
    }
  }
  return errs;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ProviderApply() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [data, setData] = useState<ApplicationData>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      return saved ? { ...EMPTY, ...JSON.parse(saved) } : EMPTY;
    } catch { return EMPTY; }
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [applicationId, setApplicationId] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Persist draft to sessionStorage on every data change
  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
  }, [data]);

  // Pre-fill email from user account if available
  useEffect(() => {
    if (user?.email && !data.email) setData(d => ({ ...d, email: user.email! }));
    if (user?.name && !data.fullName) setData(d => ({ ...d, fullName: user.name! }));
  }, [user]);

  // Check if user already has an application
  const { data: existingApp, isLoading: appLoading } = useQuery({
    queryKey: ["/api/provider-applications/me"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/provider-applications/me");
      return res.json();
    },
    enabled: !!user,
    retry: false,
  });

  // Redirect to status page if already submitted/beyond draft
  useEffect(() => {
    if (existingApp?.exists && existingApp.applicationStatus !== "draft") {
      setLocation("/providers/apply/status");
    }
    // Resume draft: load saved data into form
    if (existingApp?.exists && existingApp.applicationStatus === "draft") {
      setApplicationId(existingApp.id);
    }
  }, [existingApp]);

  const handleChange = useCallback((updates: Partial<ApplicationData>) => {
    setData(d => ({ ...d, ...updates }));
    setErrors(e => {
      const next = { ...e };
      Object.keys(updates).forEach(k => delete next[k]);
      return next;
    });
  }, []);

  // Create or return draft application on the backend
  const createDraftMutation = useMutation({
    mutationFn: async (formData: ApplicationData) => {
      const res = await apiRequest("POST", "/api/provider-applications", {
        fullName: formData.fullName,
        phoneNumber: normalizePhone(formData.phoneNumber),
        email: formData.email.trim().toLowerCase(),
        city: formData.city,
        zipCode: formData.zipCode,
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to create application");
      }
      return res.json();
    },
  });

  // Save draft updates
  const saveDraftMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const res = await apiRequest("PATCH", `/api/provider-applications/${id}`, updates);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save draft");
      }
      return res.json();
    },
  });

  // Submit application
  const submitMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/provider-applications/${id}/submit`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to submit application");
      }
      return res.json();
    },
    onSuccess: () => {
      sessionStorage.removeItem(STORAGE_KEY);
      queryClient.invalidateQueries({ queryKey: ["/api/provider-applications/me"] });
      setSubmitted(true);
    },
    onError: (err: Error) => {
      setSubmitError(err.message);
    },
  });

  const goNext = async () => {
    const errs = validateStep(step, data);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});

    if (!user) {
      // Persist data to sessionStorage and send to auth
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, _returnStep: step })); } catch {}
      setLocation("/auth?redirect=/providers/apply");
      return;
    }

    // Step 1 completion: ensure draft exists in DB
    if (step === 1) {
      try {
        let id = applicationId;
        if (!id) {
          const result = await createDraftMutation.mutateAsync(data);
          id = result.application.id;
          setApplicationId(id);
        } else {
          await saveDraftMutation.mutateAsync({
            id,
            updates: {
              fullName: data.fullName,
              phoneNumber: normalizePhone(data.phoneNumber),
              email: data.email.trim().toLowerCase(),
              city: data.city,
              zipCode: data.zipCode,
            },
          });
        }
      } catch (err: any) {
        if (err.message?.includes("DUPLICATE")) {
          setErrors({ email: err.message });
        } else {
          setErrors({ fullName: err.message || "Could not save your application. Please try again." });
        }
        return;
      }
    }

    // Step 2 & 3: save progress
    if ((step === 2 || step === 3) && applicationId) {
      const stepUpdates = step === 2
        ? { experienceLevel: data.experienceLevel, yearsDetailing: Number(data.yearsDetailing), vehicleType: data.vehicleType, vehicleDescription: data.vehicleDescription }
        : { availableWeekdays: data.availableWeekdays, availableWeekends: data.availableWeekends, maxTravelRadius: data.maxTravelRadius, notes: data.notes };
      try {
        await saveDraftMutation.mutateAsync({ id: applicationId, updates: stepUpdates });
      } catch {}
    }

    setStep(s => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => { setStep(s => Math.max(1, s - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const goToStep = (n: number) => { setStep(n); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const handleSubmit = async () => {
    const errs = validateStep(4, data);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitError(null);

    if (!applicationId) return;

    const now = new Date().toISOString();
    // Save legal agreements to draft first
    try {
      await saveDraftMutation.mutateAsync({
        id: applicationId,
        updates: {
          privacyPolicyVersion: "1.0",
          privacyAcceptedAt: now,
          applicantTermsVersion: "1.0",
          applicantTermsAcceptedAt: now,
          contactConsentAt: now,
        },
      });
    } catch {}

    submitMutation.mutate(applicationId);
  };

  const isSaving = createDraftMutation.isPending || saveDraftMutation.isPending;

  // ── Render ──────────────────────────────────────────────────────────────────

  if (authLoading || (user && appLoading)) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Icon icon={Loader2} size="lg" className="text-[#8c52ff] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <SiteNav />

      <div className="pt-24 pb-16">
        <div className="max-w-xl mx-auto px-4 sm:px-6">

          {/* Hero header */}
          {!submitted && (
            <div className="mb-8">
              <p className="text-xs font-bold text-[#8c52ff] uppercase tracking-widest mb-2">Become a Dapr Pro</p>
              <h1 className="text-3xl font-extrabold tracking-tight text-black">Apply to join the network</h1>
              <p className="text-gray-500 text-sm mt-2">Takes about 3 minutes. You can save your progress and return anytime.</p>
            </div>
          )}

          {/* Card */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            {!submitted && (
              <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                <StepIndicator current={step} />
              </div>
            )}

            <div className="px-6 py-6 sm:px-8 sm:py-8">
              {submitted && applicationId ? (
                <Confirmation appId={applicationId} />
              ) : (
                <>
                  {/* Step title */}
                  <h2 className="text-lg font-bold text-gray-900 mb-5">
                    {step === 1 && "Your information"}
                    {step === 2 && "Experience & vehicle"}
                    {step === 3 && "Availability"}
                    {step === 4 && "Review & submit"}
                  </h2>

                  {/* Step content */}
                  {step === 1 && <StepYourInfo data={data} onChange={handleChange} errors={errors} />}
                  {step === 2 && <StepExperience data={data} onChange={handleChange} errors={errors} />}
                  {step === 3 && <StepAvailability data={data} onChange={handleChange} errors={errors} />}
                  {step === 4 && <StepReview data={data} onEdit={goToStep} onChange={handleChange} errors={errors} />}

                  {/* Auth nudge (unauthenticated users) */}
                  {!user && step === 1 && (
                    <div className="mt-5 bg-[#f3eeff] rounded-xl px-4 py-3 text-sm text-[#5a2dd6]">
                      You'll be asked to sign in before your application is saved.
                    </div>
                  )}

                  {/* Submit error */}
                  {submitError && (
                    <div className="mt-4 bg-red-50 rounded-xl px-4 py-3 text-sm text-red-600 flex items-center gap-2">
                      <Icon icon={AlertCircle} size="sm" />
                      {submitError}
                    </div>
                  )}

                  {/* Navigation */}
                  <div className={`flex mt-8 gap-3 ${step > 1 ? "justify-between" : "justify-end"}`}>
                    {step > 1 && (
                      <button
                        onClick={goBack}
                        disabled={isSaving}
                        className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors px-4 py-3"
                      >
                        <Icon icon={ArrowLeft} size="sm" /> Back
                      </button>
                    )}

                    {step < 4 ? (
                      <button
                        onClick={goNext}
                        disabled={isSaving}
                        className="flex items-center gap-2 bg-black text-white px-7 py-3.5 rounded-full font-bold text-sm hover:bg-gray-900 active:scale-[0.98] transition-all disabled:opacity-60"
                      >
                        {isSaving ? <Icon icon={Loader2} size="sm" className="animate-spin" /> : null}
                        Continue
                        {!isSaving && <Icon icon={ArrowRight} size="sm" />}
                      </button>
                    ) : (
                      <button
                        onClick={handleSubmit}
                        disabled={submitMutation.isPending || isSaving}
                        className="flex items-center gap-2 bg-[#8c52ff] text-white px-7 py-3.5 rounded-full font-bold text-sm hover:bg-[#7a3fff] active:scale-[0.98] transition-all disabled:opacity-60"
                      >
                        {submitMutation.isPending ? <Icon icon={Loader2} size="sm" className="animate-spin" /> : null}
                        Submit application
                        {!submitMutation.isPending && <Icon icon={CheckCircle2} size="sm" />}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Step counter */}
          {!submitted && (
            <p className="text-center text-xs text-gray-400 mt-4">Step {step} of {STEPS.length}</p>
          )}
        </div>
      </div>
    </div>
  );
}
