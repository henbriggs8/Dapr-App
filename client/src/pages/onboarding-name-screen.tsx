import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight } from "lucide-react";

const primaryBtn =
  "flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#111] text-[13px] font-semibold text-white disabled:opacity-30 transition active:scale-[0.98]";

const inputCls =
  "flex h-12 w-full items-center border border-[#ececec] bg-[#f6f6f6] px-4 text-[14px] text-[#111] outline-none placeholder:text-[#b2b2b2] rounded-none";

export default function OnboardingNameScreen() {
  const [, setLocation] = useLocation();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(() => localStorage.getItem("pendingEmail") || "");

  const isValid = firstName.trim().length > 0 && lastName.trim().length > 0;

  const handleContinue = async () => {
    localStorage.setItem(
      "userName",
      JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim() })
    );

    const trimmedEmail = email.trim();
    if (trimmedEmail) {
      localStorage.setItem("pendingEmail", trimmedEmail);
      try {
        await fetch("/api/user/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmedEmail }),
        });
      } catch {
      }
    } else {
      localStorage.removeItem("pendingEmail");
    }

    setLocation("/onboarding/address");
  };

  return (
    <div className="flex flex-col min-h-screen bg-white px-6 pt-14 pb-10">
      <div className="flex items-center justify-between mb-10">
        <button
          onClick={() => setLocation("/")}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f1f1f1]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-[12px] text-[#aaa]">Step 1 of 4</span>
      </div>

      <p className="text-[10px] font-semibold tracking-widest text-[#8c52ff] uppercase mb-3">Your profile</p>
      <h1 className="text-[28px] font-semibold leading-[1.1] tracking-[-0.03em] text-[#111] mb-2">
        What's your name?
      </h1>
      <p className="text-[13px] text-[#8a8a8a] mb-10 leading-5">
        We'll use this to personalise your experience.
      </p>

      <div className="flex flex-col gap-4">
        <div>
          <p className="text-[10px] font-semibold tracking-widest text-[#aaa] uppercase mb-2">First name</p>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && isValid && handleContinue()}
            placeholder="e.g. Jordan"
            autoFocus
            className={inputCls}
          />
        </div>
        <div>
          <p className="text-[10px] font-semibold tracking-widest text-[#aaa] uppercase mb-2">Last name</p>
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && isValid && handleContinue()}
            placeholder="e.g. Smith"
            className={inputCls}
          />
        </div>

        <div className="pt-2">
          <div className="border-t border-[#f0f0f0] mb-4" />
          <p className="text-[10px] font-semibold tracking-widest text-[#aaa] uppercase mb-2">
            Email address <span className="normal-case font-normal text-[#c0c0c0]">(recommended)</span>
          </p>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputCls}
          />
          <p className="mt-2 text-[11px] text-[#b0b0b0] leading-4">
            Used for booking confirmations and password resets.
          </p>
        </div>
      </div>

      <div className="mt-auto pt-8">
        <button
          type="button"
          onClick={handleContinue}
          disabled={!isValid}
          className={primaryBtn}
        >
          Continue <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
