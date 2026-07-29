import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import SiteNav from "@/components/site-nav";
import { Icon } from "@/components/ui/icon";
import {
  CheckCircle2, Clock, AlertCircle, Loader2, ArrowRight, Mail,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; bg: string; heading: string; body: string }> = {
  draft: {
    icon: Clock, color: "text-gray-400", bg: "bg-gray-100",
    heading: "Your application is incomplete",
    body: "You have an unfinished application. Continue where you left off.",
  },
  submitted: {
    icon: CheckCircle2, color: "text-[#8c52ff]", bg: "bg-[#f3eeff]",
    heading: "Application received",
    body: "We've received your application to become a Dapr Pro. Our team will review your information and contact you about verification and next steps.",
  },
  under_review: {
    icon: Clock, color: "text-amber-500", bg: "bg-amber-50",
    heading: "We're reviewing your application",
    body: "Our team is looking over your information. We'll be in touch soon.",
  },
  verification_requested: {
    icon: AlertCircle, color: "text-orange-500", bg: "bg-orange-50",
    heading: "Verification needed",
    body: "We need a bit more information to verify your application. Our team will contact you with details.",
  },
  verification_submitted: {
    icon: Clock, color: "text-amber-500", bg: "bg-amber-50",
    heading: "Verification submitted",
    body: "We're reviewing your verification documents. We'll be in touch shortly.",
  },
  approved_needs_setup: {
    icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50",
    heading: "You're approved — finish setting up your Dapr Pro account",
    body: "Congratulations! Download the Dapr Pro app to complete your account setup and start accepting jobs.",
  },
  rejected: {
    icon: AlertCircle, color: "text-red-500", bg: "bg-red-50",
    heading: "Application not approved",
    body: "Thank you for applying. Unfortunately your application wasn't approved at this time. If you have questions, contact us at support@autodapr.com.",
  },
  active_provider: {
    icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50",
    heading: "You're ready to earn with Dapr",
    body: "Your Dapr Pro account is active. Open the Dapr Pro app to go online and start accepting jobs.",
  },
  withdrawn: {
    icon: AlertCircle, color: "text-gray-400", bg: "bg-gray-100",
    heading: "Application withdrawn",
    body: "Your application has been withdrawn. You're welcome to apply again in the future.",
  },
};

export default function ProviderApplyStatus() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();

  const { data: app, isLoading } = useQuery({
    queryKey: ["/api/provider-applications/me"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/provider-applications/me");
      return res.json();
    },
    enabled: !!user,
    retry: false,
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Icon icon={Loader2} size="lg" className="text-[#8c52ff] animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white font-sans">
        <SiteNav />
        <div className="pt-32 pb-16 max-w-lg mx-auto px-6 text-center">
          <h1 className="text-2xl font-bold text-black mb-3">Sign in to view your application</h1>
          <p className="text-gray-500 mb-8">You need to be signed in to check your application status.</p>
          <button
            onClick={() => setLocation("/auth?redirect=/providers/apply/status")}
            className="bg-black text-white px-7 py-3.5 rounded-full font-bold text-sm hover:bg-gray-900 transition-colors"
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  if (!app?.exists) {
    return (
      <div className="min-h-screen bg-white font-sans">
        <SiteNav />
        <div className="pt-32 pb-16 max-w-lg mx-auto px-6 text-center">
          <h1 className="text-2xl font-bold text-black mb-3">No application found</h1>
          <p className="text-gray-500 mb-8">You haven't started a provider application yet.</p>
          <button
            onClick={() => setLocation("/providers/apply")}
            className="bg-[#8c52ff] text-white px-7 py-3.5 rounded-full font-bold text-sm hover:bg-[#7a3fff] transition-colors inline-flex items-center gap-2"
          >
            Apply now <Icon icon={ArrowRight} size="sm" />
          </button>
        </div>
      </div>
    );
  }

  // Resume draft
  if (app.applicationStatus === "draft") {
    setLocation("/providers/apply");
    return null;
  }

  const config = STATUS_CONFIG[app.applicationStatus] || STATUS_CONFIG.submitted;
  const StatusIcon = config.icon;

  return (
    <div className="min-h-screen bg-white font-sans">
      <SiteNav />

      <div className="pt-24 pb-16">
        <div className="max-w-lg mx-auto px-6">
          {/* Status card */}
          <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
            <div className={`${config.bg} px-8 py-10 text-center`}>
              <div className={`w-16 h-16 rounded-full bg-white flex items-center justify-center mx-auto mb-5 shadow-sm`}>
                <Icon icon={StatusIcon} size="lg" className={config.color} />
              </div>
              <h1 className="text-xl font-extrabold text-gray-900 leading-tight">{config.heading}</h1>
            </div>

            <div className="px-8 py-6">
              <p className="text-gray-600 text-sm leading-relaxed mb-6">{config.body}</p>

              {/* Application details */}
              <div className="bg-gray-50 rounded-2xl divide-y divide-gray-100">
                <div className="flex justify-between px-4 py-3">
                  <span className="text-sm text-gray-500">Application #</span>
                  <span className="text-sm font-semibold text-gray-900">{app.id}</span>
                </div>
                {app.city && (
                  <div className="flex justify-between px-4 py-3">
                    <span className="text-sm text-gray-500">City</span>
                    <span className="text-sm font-semibold text-gray-900">{app.city}</span>
                  </div>
                )}
                {app.submittedAt && (
                  <div className="flex justify-between px-4 py-3">
                    <span className="text-sm text-gray-500">Submitted</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {new Date(app.submittedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                )}
              </div>

              {/* Action CTAs by status */}
              <div className="mt-6 space-y-3">
                {app.applicationStatus === "approved_needs_setup" && (
                  <div className="bg-green-50 rounded-xl p-4 text-sm text-green-800 leading-relaxed">
                    Download the <strong>Dapr Pro app</strong> on iOS to complete your setup and start earning.
                  </div>
                )}
                {app.applicationStatus === "active_provider" && (
                  <div className="bg-[#f3eeff] rounded-xl p-4 text-sm text-[#5a2dd6] leading-relaxed">
                    Open the <strong>Dapr Pro app</strong> to go online and accept jobs.
                  </div>
                )}
                <button
                  onClick={() => setLocation("/")}
                  className="w-full py-3.5 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Back to Dapr
                </button>
              </div>

              {/* Support link */}
              <p className="text-center text-xs text-gray-400 mt-5 flex items-center justify-center gap-1">
                <Icon icon={Mail} size="xs" />
                Questions? Email{" "}
                <a href="mailto:support@autodapr.com" className="text-[#8c52ff] hover:underline">support@autodapr.com</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
