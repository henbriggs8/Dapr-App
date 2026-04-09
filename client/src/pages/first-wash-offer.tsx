import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

export default function FirstWashOffer() {
  const [, setLocation] = useLocation();

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

  return (
    <div className="flex flex-col min-h-screen bg-white px-6 pt-14 pb-10">
      {/* Back + step */}
      <div className="flex items-center justify-between mb-10">
        <button
          onClick={() => setLocation("/onboarding/car-profile")}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f1f1f1]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-[12px] text-[#aaa]">Step 3 of 3</span>
      </div>

      {/* Icon */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f3eeff] mb-8">
        <Sparkles className="h-8 w-8 text-[#8c52ff]" />
      </div>

      {/* Heading */}
      <p className="text-[10px] font-semibold tracking-widest text-[#8c52ff] uppercase mb-3">Welcome offer</p>
      <h1 className="text-[32px] font-semibold leading-[1.05] tracking-[-0.04em] text-[#111] mb-4">
        Your first wash<br />is on us.
      </h1>
      <p className="text-[14px] text-[#8a8a8a] leading-6 mb-2">
        Just cover the tip — we'll take care of the rest.
      </p>
      <p className="text-[13px] text-[#b2b2b2] leading-5 mb-12">
        Premium mobile detailing delivered to your door. Cancel anytime.
      </p>

      {/* Offer detail rows */}
      <div className="flex flex-col border-t border-[#ececec]">
        {[
          { label: "Exterior hand wash", value: "Included" },
          { label: "Interior vacuum", value: "Included" },
          { label: "Windows cleaned", value: "Included" },
          { label: "Tip for detailer", value: "Up to you" },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between py-4 border-b border-[#ececec]">
            <span className="text-[14px] text-[#111]">{label}</span>
            <span className="text-[13px] text-[#8c52ff] font-medium">{value}</span>
          </div>
        ))}
      </div>

      {/* CTAs */}
      <div className="mt-auto pt-8 flex flex-col gap-3">
        <button
          type="button"
          onClick={handleBook}
          className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#8c52ff] text-[13px] font-semibold text-white transition active:scale-[0.98]"
        >
          Book my free wash <ArrowRight className="h-4 w-4" />
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
