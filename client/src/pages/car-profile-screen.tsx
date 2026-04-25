import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { apiRequest } from "@/lib/queryClient";
import { YEARS, CAR_MAKES, CAR_MODELS } from "@/utils/car-data";

const primaryBtn =
  "flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#111] text-[13px] font-semibold text-white disabled:opacity-30 transition active:scale-[0.98]";

const selectCls =
  "flex h-12 w-full border border-[#ececec] bg-[#f6f6f6] px-4 text-[14px] text-[#111] outline-none appearance-none";

function FieldLabel({ label }: { label: string }) {
  return <p className="text-[10px] font-semibold tracking-widest text-[#aaa] uppercase mb-2">{label}</p>;
}

export default function CarProfileScreen() {
  const [, setLocation] = useLocation();
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [saving, setSaving] = useState(false);

  const availableModels = make && CAR_MODELS[make] ? CAR_MODELS[make] : [];
  const handleMakeChange = (val: string) => { setMake(val); setModel(""); };
  const isValid = year && make && model;

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);

    const vehicleData = { year: Number(year), make, model };

    localStorage.setItem("userVehicle", JSON.stringify(vehicleData));

    try {
      await apiRequest("POST", "/api/vehicles", vehicleData);
    } catch (err) {
      console.warn("Could not save vehicle to database:", err);
    }

    setSaving(false);
    setLocation("/onboarding/first-wash-offer");
  };

  const handleSkip = () => {
    localStorage.setItem("skipVehicle", "true");
    setLocation("/onboarding/first-wash-offer");
  };

  return (
    <div className="flex flex-col min-h-screen bg-white px-6 pt-14" style={{ paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom, 2.5rem))' }}>
      <div className="flex items-center justify-between mb-10">
        <button
          onClick={() => setLocation("/onboarding/name")}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f1f1f1]"
        >
          <Icon icon={ArrowLeft} size="sm" />
        </button>
        <span className="text-[12px] text-[#aaa]">Step 2 of 3</span>
      </div>

      <p className="text-[10px] font-semibold tracking-widest text-[#8c52ff] uppercase mb-3">Your vehicle</p>
      <h1 className="text-[28px] font-semibold leading-[1.1] tracking-[-0.03em] text-[#111] mb-2">
        Tell us about your car
      </h1>
      <p className="text-[13px] text-[#8a8a8a] mb-8 leading-5">
        Helps us bring the right equipment to every job.
      </p>

      <div className="flex flex-col gap-4 flex-1">
        <div className="flex gap-3">
          <div className="w-28">
            <FieldLabel label="Year" />
            <select value={year} onChange={(e) => setYear(e.target.value)} className={selectCls}>
              <option value="">Year</option>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <FieldLabel label="Make" />
            <select value={make} onChange={(e) => handleMakeChange(e.target.value)} className={selectCls}>
              <option value="">Select</option>
              {CAR_MAKES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div>
          <FieldLabel label="Model" />
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={!make}
            className={selectCls + (!make ? " opacity-40" : "")}
          >
            <option value="">{make ? "Select model" : "Select make first"}</option>
            {availableModels.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <div className="pt-8 flex flex-col gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={!isValid || saving}
          className={primaryBtn}
        >
          {saving ? "Saving…" : <>Save & Continue <Icon icon={ArrowRight} size="sm" /></>}
        </button>
        <button
          type="button"
          onClick={handleSkip}
          className="text-center text-[13px] text-[#aaa] py-2"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
