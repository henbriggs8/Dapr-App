import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { useAuth } from "@clerk/clerk-react";

const ACCENT = "#8c52ff";

export default function FirstWashOffer() {
  const [, setLocation] = useLocation();
  const { getToken } = useAuth();
  const [code, setCode] = useState("");
  const [applying, setApplying] = useState(false);
  const [codeResult, setCodeResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleBook = () => {
    localStorage.setItem("sawFirstWash", "true");
    localStorage.setItem("onboardingCompleted", "true");
    setLocation("/booking");
  };

  const handleSkip = () => {
    localStorage.setItem("sawFirstWash", "true");
    localStorage.setItem("onboardingCompleted", "true");
    setLocation("/");
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

  return (
    <div className="flex flex-col min-h-screen bg-white px-6 pt-14 pb-10">
      {/* Back + step */}
      <div className="flex items-center justify-between mb-10">
        <button
          onClick={() => setLocation("/onboarding/car-profile")}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f1f1f1]"
        >
          <Icon icon={ArrowLeft} size="sm" />
        </button>
        <span className="text-[12px] text-[#aaa]">Step 3 of 3</span>
      </div>

      {/* Icon */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f3eeff] mb-8">
        <Icon icon={Sparkles} size="xl" style={{ color: ACCENT }} />
      </div>

      {/* Heading */}
      <p className="text-[10px] font-semibold tracking-widest mb-3" style={{ color: ACCENT }}>WELCOME OFFER</p>
      <h1 className="text-[32px] font-semibold leading-[1.05] tracking-[-0.04em] text-[#111] mb-4">
        Your first wash<br />is on us.
      </h1>
      <p className="text-[14px] text-[#8a8a8a] leading-6 mb-2">
        Just cover the tip — we'll take care of the rest.
      </p>
      <p className="text-[13px] text-[#b2b2b2] leading-5 mb-8">
        Premium mobile detailing delivered to your door. Cancel anytime.
      </p>

      {/* Offer detail rows */}
      <div className="flex flex-col border-t border-[#ececec] mb-8">
        {[
          { label: "Exterior hand wash", value: "Included" },
          { label: "Interior vacuum", value: "Included" },
          { label: "Windows cleaned", value: "Included" },
          { label: "Tip for detailer", value: "Up to you" },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between py-4 border-b border-[#ececec]">
            <span className="text-[14px] text-[#111]">{label}</span>
            <span className="text-[13px] font-medium" style={{ color: ACCENT }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Referral code entry */}
      <div className="mb-8">
        <p className="text-[12px] font-semibold text-[#555] mb-2">Have a referral code? Add an extra free wash.</p>
        {codeResult?.success ? (
          <div className="flex items-center gap-2 rounded-2xl px-4 py-3.5 bg-[#f0fdf4] border border-[#bbf7d0]">
            <Icon icon={CheckCircle2} size="sm" className="text-[#16a34a] shrink-0" />
            <p className="text-[13px] font-semibold text-[#16a34a]">{codeResult.message}</p>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Enter code (e.g. ABC123)"
              maxLength={12}
              className="flex-1 rounded-2xl border border-[#e0e0e0] bg-[#f7f7f7] px-4 py-3 text-[14px] font-mono tracking-wider outline-none focus:border-[#8c52ff] transition"
            />
            <button
              onClick={handleApplyCode}
              disabled={!code.trim() || applying}
              className="rounded-2xl px-4 py-3 text-[13px] font-semibold text-white transition active:scale-95 disabled:opacity-40"
              style={{ background: ACCENT }}
            >
              {applying ? "..." : "Apply"}
            </button>
          </div>
        )}
        {codeResult && !codeResult.success && (
          <p className="text-[12px] text-red-500 mt-1.5 px-1">{codeResult.message}</p>
        )}
      </div>

      {/* CTAs */}
      <div className="mt-auto flex flex-col gap-3">
        <button
          type="button"
          onClick={handleBook}
          className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full text-[13px] font-semibold text-white transition active:scale-[0.98]"
          style={{ background: ACCENT }}
        >
          Book my free wash <Icon icon={ArrowRight} size="sm" />
        </button>
        <button
          type="button"
          onClick={handleSkip}
          className="text-center text-[13px] text-[#aaa] py-2"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
