import { useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowRight,
  Sparkles,
  Gift,
  CheckCircle2,
  Copy,
  Check,
  Share2,
} from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import SiteNav from "@/components/site-nav";

interface ReferralInfo {
  code: string;
  credits: number;
  referralCount: number;
  pendingCredits: number;
}

export default function FirstWashOffer() {
  const [, nav] = useLocation();
  const { isSignedIn, getToken } = useAuth();

  /* ── First-wash offer state ─────────────────────────────────── */
  const [code, setCode] = useState("");
  const [applying, setApplying] = useState(false);
  const [codeResult, setCodeResult] = useState<{ success: boolean; message: string } | null>(null);

  /* ── Referral state (signed-in users) ────────────────────────── */
  const [copied, setCopied] = useState(false);

  const { data: referral, isLoading: referralLoading } = useQuery<ReferralInfo>({
    queryKey: ["/api/referral/my-code"],
    enabled: !!isSignedIn,
    queryFn: async () => {
      const token = await getToken().catch(() => null);
      const res = await fetch("/api/referral/my-code", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load referral info");
      return res.json();
    },
  });

  const shareLink = referral?.code
    ? `${window.location.origin}/signup?ref=${referral.code}`
    : "";

  const handleCopyCode = () => {
    if (!referral?.code) return;
    navigator.clipboard.writeText(referral.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleShare = () => {
    if (navigator.share && referral?.code) {
      navigator.share({
        title: "Get $20 off your first Dapr wash",
        text: `Use my code ${referral.code} and we both get $20.`,
        url: shareLink,
      });
    } else {
      handleCopyCode();
    }
  };

  const handleApplyCode = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setApplying(true);
    setCodeResult(null);
    try {
      const token = await getToken().catch(() => null);
      const res = await fetch("/api/referral/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await res.json();
      setCodeResult(data);
    } catch {
      setCodeResult({ success: false, message: "Something went wrong. Try again." });
    } finally {
      setApplying(false);
    }
  };

  const handleBook = () => {
    localStorage.setItem("sawFirstWash", "true");
    localStorage.setItem("onboardingCompleted", "true");
    nav("/");
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <SiteNav />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div className="relative w-full h-[70vh] min-h-[480px] overflow-hidden">
        {/* Background image */}
        <img
          src="https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=2000&q=80"
          alt="Professional car detailing"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />

        {/* Hero text */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
          <span className="inline-block text-xs font-bold text-[#c4a0ff] uppercase tracking-widest mb-5">
            Special offers
          </span>
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.05] mb-5 max-w-3xl">
            Your car deserves
            <br />
            <span className="text-[#c4a0ff]">the best.</span>
          </h1>
          <p className="text-lg lg:text-xl text-white/70 max-w-xl leading-relaxed">
            First-time customer? Your first wash is on us. Already a member? Share the love and earn together.
          </p>
        </div>
      </div>

      {/* ── Offer cards ──────────────────────────────────────────── */}
      <div className="max-w-[1100px] mx-auto px-6 lg:px-8 -mt-16 relative z-20 pb-24">
        <div className="grid lg:grid-cols-2 gap-6">

          {/* ── Card 1: First wash free ─────────────────────────── */}
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden flex flex-col">
            {/* Card header */}
            <div className="bg-gradient-to-br from-[#8c52ff] to-[#6528d9] p-8 text-white">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-5">
                <Icon icon={Sparkles} size="lg" className="text-white" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-2">New customers</p>
              <h2 className="text-3xl font-extrabold tracking-tight leading-tight mb-2">
                Your first wash<br />is free.
              </h2>
              <p className="text-white/70 text-sm leading-relaxed">
                Just tip your detailer — we'll cover the rest. No catch, no subscription required.
              </p>
            </div>

            {/* What's included */}
            <div className="px-8 py-6 flex-1 flex flex-col">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">What's included</p>
              <ul className="space-y-3 mb-6">
                {[
                  "Exterior hand wash",
                  "Wheels & tires cleaned",
                  "Windows wiped inside & out",
                  "Interior vacuum",
                  "Just tip your detailer",
                ].map((item, i) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-gray-700">
                    <Icon
                      icon={CheckCircle2}
                      size="sm"
                      className={`shrink-0 ${i === 4 ? "text-amber-400" : "text-[#8c52ff]"}`}
                    />
                    <span className={i === 4 ? "font-semibold text-gray-900" : ""}>{item}</span>
                  </li>
                ))}
              </ul>

              {/* Referral code entry */}
              <div className="mb-6">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                  Have a referral code?
                </p>
                {codeResult?.success ? (
                  <div className="flex items-center gap-2 rounded-2xl px-4 py-3 bg-green-50 border border-green-200">
                    <Icon icon={CheckCircle2} size="sm" className="text-green-600 shrink-0" />
                    <p className="text-sm font-semibold text-green-700">{codeResult.message}</p>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="e.g. ABC123"
                      maxLength={12}
                      className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-mono tracking-wider outline-none focus:border-[#8c52ff] focus:ring-2 focus:ring-[#8c52ff]/10 transition-all"
                    />
                    <button
                      onClick={handleApplyCode}
                      disabled={!code.trim() || applying}
                      className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white bg-[#8c52ff] hover:bg-[#7a3fff] transition-colors disabled:opacity-40"
                    >
                      {applying ? "…" : "Apply"}
                    </button>
                  </div>
                )}
                {codeResult && !codeResult.success && (
                  <p className="text-xs text-red-500 mt-1.5 px-1">{codeResult.message}</p>
                )}
              </div>

              <div className="mt-auto">
                <button
                  onClick={handleBook}
                  className="w-full flex items-center justify-center gap-2 bg-black text-white font-bold text-sm py-4 rounded-2xl hover:bg-[#8c52ff] transition-colors"
                >
                  Book my free wash <Icon icon={ArrowRight} size="sm" />
                </button>
                <p className="text-center text-xs text-gray-400 mt-3">
                  Valid for first-time customers · One per account
                </p>
              </div>
            </div>
          </div>

          {/* ── Card 2: Give $20 / Get $20 ─────────────────────── */}
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden flex flex-col">
            {/* Card header */}
            <div className="bg-gradient-to-br from-[#111] to-[#333] p-8 text-white">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-5">
                <Icon icon={Gift} size="lg" className="text-white" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Existing customers</p>
              <h2 className="text-3xl font-extrabold tracking-tight leading-tight mb-2">
                Give $20,<br />get $20.
              </h2>
              <p className="text-white/60 text-sm leading-relaxed">
                Share your personal link. When a friend books their first wash, you both get $20 credit.
              </p>
            </div>

            {/* How it works */}
            <div className="px-8 py-6 flex-1 flex flex-col">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">How it works</p>
              <ol className="space-y-4 mb-6">
                {[
                  { step: "1", text: "Share your unique referral link or code with a friend." },
                  { step: "2", text: "They book and complete their first Dapr wash." },
                  { step: "3", text: "You both get $20 credit applied to your next booking." },
                ].map(({ step, text }) => (
                  <li key={step} className="flex items-start gap-3 text-sm text-gray-600">
                    <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {step}
                    </span>
                    {text}
                  </li>
                ))}
              </ol>

              {/* Referral code / CTA block */}
              <div className="mt-auto">
                {isSignedIn ? (
                  referralLoading ? (
                    <div className="h-24 rounded-2xl bg-gray-50 animate-pulse" />
                  ) : referral ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Your code</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 font-mono text-lg font-bold tracking-widest text-gray-900 text-center">
                            {referral.code}
                          </div>
                          <button
                            onClick={handleCopyCode}
                            className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors shrink-0"
                          >
                            {copied
                              ? <Icon icon={Check} size="sm" className="text-green-600" />
                              : <Icon icon={Copy} size="sm" className="text-gray-500" />
                            }
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={handleShare}
                        className="w-full flex items-center justify-center gap-2 bg-black text-white font-bold text-sm py-4 rounded-2xl hover:bg-[#8c52ff] transition-colors"
                      >
                        <Icon icon={Share2} size="sm" /> Share your link
                      </button>
                      {referral.referralCount > 0 && (
                        <p className="text-center text-xs text-gray-400">
                          {referral.referralCount} friend{referral.referralCount !== 1 ? "s" : ""} referred
                          {referral.credits > 0 ? ` · $${referral.credits} credit earned` : ""}
                        </p>
                      )}
                    </div>
                  ) : null
                ) : (
                  /* Not signed in */
                  <div className="rounded-2xl bg-gray-50 border border-gray-100 p-6 text-center">
                    <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                      Create a free account to get your personal referral link and start earning credits.
                    </p>
                    <button
                      onClick={() => nav("/auth")}
                      className="w-full flex items-center justify-center gap-2 bg-black text-white font-bold text-sm py-4 rounded-2xl hover:bg-[#8c52ff] transition-colors"
                    >
                      Create an account <Icon icon={ArrowRight} size="sm" />
                    </button>
                  </div>
                )}

                <p className="text-center text-xs text-gray-400 mt-3">
                  No limit on referrals · Credits never expire
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <span>© {new Date().getFullYear()} Dapr Enterprises, Inc. All rights reserved.</span>
          <div className="flex gap-5">
            <button onClick={() => nav("/privacy")} className="hover:text-black transition-colors">Privacy</button>
            <button onClick={() => nav("/terms")} className="hover:text-black transition-colors">Terms</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
