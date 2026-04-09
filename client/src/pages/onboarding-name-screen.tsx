import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight } from "lucide-react";

const primaryBtn =
  "flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#111] text-[13px] font-semibold text-white disabled:opacity-30 transition active:scale-[0.98]";

const inputCls =
  "flex h-12 w-full items-center border border-[#ececec] bg-[#f6f6f6] px-4 text-[14px] text-[#111] outline-none placeholder:text-[#b2b2b2]";

function FieldLabel({ label, optional }: { label: string; optional?: boolean }) {
  return (
    <p className="text-[10px] font-semibold tracking-widest text-[#aaa] uppercase mb-2">
      {label}
      {optional && <span className="ml-1 normal-case font-normal text-[#c8c8c8]">(optional)</span>}
    </p>
  );
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => currentYear - 18 - i);

const selectCls =
  "h-12 w-full border border-[#ececec] bg-[#f6f6f6] px-3 text-[14px] text-[#111] outline-none appearance-none";

export default function OnboardingNameScreen() {
  const [, setLocation] = useLocation();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [email, setEmail] = useState(() => localStorage.getItem("pendingEmail") || "");

  const isValid =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    birthMonth !== "" &&
    birthDay !== "" &&
    birthYear !== "";

  const handleContinue = async () => {
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const birthday = `${birthMonth} ${birthDay}, ${birthYear}`;

    localStorage.setItem("userName", JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim() }));
    localStorage.setItem("userBirthday", birthday);

    const trimmedEmail = email.trim();
    if (trimmedEmail) {
      localStorage.setItem("pendingEmail", trimmedEmail);
    } else {
      localStorage.removeItem("pendingEmail");
    }

    try {
      await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName,
          birthday,
          ...(trimmedEmail && { email: trimmedEmail }),
        }),
      });
    } catch {
    }

    setLocation("/onboarding/car-profile");
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
        <span className="text-[12px] text-[#aaa]">Step 1 of 2</span>
      </div>

      <p className="text-[10px] font-semibold tracking-widest text-[#8c52ff] uppercase mb-3">Your profile</p>
      <h1 className="text-[28px] font-semibold leading-[1.1] tracking-[-0.03em] text-[#111] mb-2">
        Tell us about you
      </h1>
      <p className="text-[13px] text-[#8a8a8a] mb-8 leading-5">
        We'll use this to personalise your experience.
      </p>

      <div className="flex flex-col gap-4">
        {/* Name row */}
        <div className="flex gap-3">
          <div className="flex-1">
            <FieldLabel label="First name" />
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Jordan"
              autoFocus
              className={inputCls}
            />
          </div>
          <div className="flex-1">
            <FieldLabel label="Last name" />
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Smith"
              className={inputCls}
            />
          </div>
        </div>

        {/* Birthday */}
        <div>
          <FieldLabel label="Birthday" />
          <div className="flex gap-2">
            <select
              value={birthMonth}
              onChange={(e) => setBirthMonth(e.target.value)}
              className={`${selectCls} flex-[2]`}
            >
              <option value="">Month</option>
              {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select
              value={birthDay}
              onChange={(e) => setBirthDay(e.target.value)}
              className={`${selectCls} flex-1`}
            >
              <option value="">Day</option>
              {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              className={`${selectCls} flex-[1.5]`}
            >
              <option value="">Year</option>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Email */}
        <div>
          <FieldLabel label="Email address" optional />
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputCls}
          />
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
