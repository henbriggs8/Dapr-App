import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Copy, Check, Gift, Users, Sparkles, Share2 } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";

const ACCENT = "#8c52ff";
const ACCENT_BG = "#f3eeff";

interface ReferralInfo {
  code: string;
  credits: number;
  referralCount: number;
  pendingCredits: number;
}

export default function ReferralPage() {
  const [, setLocation] = useLocation();
  const { getToken } = useAuth();
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery<ReferralInfo>({
    queryKey: ["/api/referral/my-code"],
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

  const shareLink = data?.code
    ? `${window.location.origin}/signup?ref=${data.code}`
    : "";

  const handleCopy = () => {
    if (!data?.code) return;
    navigator.clipboard.writeText(data.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShare = () => {
    if (navigator.share && data?.code) {
      navigator.share({
        title: "Get a free car wash with Dapr",
        text: `Use my referral code ${data.code} — you'll get a free wash, and so will I!`,
        url: shareLink,
      });
    } else {
      handleCopy();
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-4">
        <button
          onClick={() => setLocation("/")}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f1f1f1]"
        >
          <Icon icon={ArrowLeft} size="sm" />
        </button>
        <h1 className="text-[18px] font-bold text-[#111]">Refer a Friend</h1>
      </div>

      {/* Hero */}
      <div className="mx-4 mt-2 mb-6 rounded-2xl px-5 py-6 text-center" style={{ background: "linear-gradient(135deg, #6d28d9, #4f46e5, #7c3aed)" }}>
        <div className="flex h-14 w-14 items-center justify-center rounded-full mx-auto mb-4" style={{ background: "rgba(255,255,255,0.18)" }}>
          <Icon icon={Gift} size="xl" style={{ color: "white" }} />
        </div>
        <h2 className="text-[22px] font-bold text-white leading-tight mb-2">
          Give a free wash,<br />get a free wash
        </h2>
        <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.75)" }}>
          Share your code — your friend gets a free wash,<br />and you get one when they complete theirs.
        </p>
      </div>

      {/* Code card */}
      <div className="mx-4 mb-5 rounded-2xl border border-[#e8dcff] px-5 py-4" style={{ background: ACCENT_BG }}>
        <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: ACCENT }}>Your referral code</p>
        {isLoading ? (
          <div className="h-10 w-40 rounded-xl bg-[#e8dcff] animate-pulse" />
        ) : (
          <div className="flex items-center justify-between gap-3">
            <span className="text-[28px] font-extrabold tracking-widest text-[#111]">
              {data?.code ?? "—"}
            </span>
            <button
              onClick={handleCopy}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white border border-[#e0d4ff] active:scale-95 transition"
            >
              <Icon icon={copied ? Check : Copy} size="sm" style={{ color: ACCENT }} />
            </button>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="mx-4 mb-6 flex gap-3">
        <div className="flex-1 rounded-2xl border border-[#ececec] px-4 py-4 text-center bg-white">
          <p className="text-[24px] font-extrabold text-[#111]">{data?.credits ?? 0}</p>
          <p className="text-[11px] text-[#999] mt-0.5 font-medium">Free washes</p>
        </div>
        <div className="flex-1 rounded-2xl border border-[#ececec] px-4 py-4 text-center bg-white">
          <p className="text-[24px] font-extrabold text-[#111]">{(data?.referralCount ?? 0) + (data?.pendingCredits ?? 0)}</p>
          <p className="text-[11px] text-[#999] mt-0.5 font-medium">Friends referred</p>
        </div>
      </div>

      {/* How it works */}
      <div className="mx-4 mb-6">
        <h3 className="text-[14px] font-bold text-[#111] mb-3">How it works</h3>
        <div className="flex flex-col gap-3">
          {[
            { icon: Share2, text: "Share your code with a friend" },
            { icon: Sparkles, text: "They enter it when they sign up — they get 1 free wash instantly" },
            { icon: Gift, text: "When they complete their first wash, you get 1 free wash too" },
            { icon: Users, text: "No limit — refer as many friends as you like" },
          ].map(({ icon, text }, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: ACCENT_BG }}>
                <Icon icon={icon} size="sm" style={{ color: ACCENT }} />
              </div>
              <p className="text-[13px] text-[#555] leading-5 pt-1.5">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Share CTA */}
      <div className="mx-4 mb-10">
        <button
          onClick={handleShare}
          className="w-full h-[52px] rounded-full text-[14px] font-semibold text-white transition active:scale-[0.98]"
          style={{ background: ACCENT }}
        >
          Share your code
        </button>
      </div>
    </div>
  );
}
