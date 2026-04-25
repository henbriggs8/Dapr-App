import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { AddressAutocomplete } from "@/components/address-autocomplete";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

const primaryBtn =
  "flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#111] text-[13px] font-semibold text-white disabled:opacity-30 transition active:scale-[0.98]";

const inputCls =
  "flex h-12 w-full border border-[#ececec] bg-[#f6f6f6] px-4 text-[14px] text-[#111] outline-none placeholder:text-[#b2b2b2]";

export default function AddressScreen() {
  const [, setLocation] = useLocation();
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [locationType, setLocationType] = useState("Home");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const isValid = streetAddress && city && state && zipCode;

  const handleContinue = () => {
    localStorage.setItem(
      "userAddress",
      JSON.stringify({ streetAddress, city, state, zipCode, locationType, latitude, longitude })
    );
    setLocation("/onboarding/car-profile");
  };

  return (
    <div className="flex flex-col min-h-screen bg-white px-6 pt-14 pb-10">
      {/* Back + step */}
      <div className="flex items-center justify-between mb-10">
        <button
          onClick={() => setLocation("/onboarding/name")}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f1f1f1]"
        >
          <Icon icon={ArrowLeft} size="sm" />
        </button>
        <span className="text-[12px] text-[#aaa]">Step 2 of 4</span>
      </div>

      {/* Heading */}
      <p className="text-[10px] font-semibold tracking-widest text-[#8c52ff] uppercase mb-3">Service location</p>
      <h1 className="text-[28px] font-semibold leading-[1.1] tracking-[-0.03em] text-[#111] mb-2">
        Where do we come to you?
      </h1>
      <p className="text-[13px] text-[#8a8a8a] mb-8 leading-5">
        We'll send a detailer directly to your location.
      </p>

      {/* Location type pills */}
      <div className="flex gap-2 mb-6">
        {["Home", "Work", "Other"].map((type) => (
          <button
            key={type}
            onClick={() => setLocationType(type)}
            className={`flex-1 h-10 rounded-full text-[13px] font-medium border transition ${
              locationType === type
                ? "border-[#111] bg-[#111] text-white"
                : "border-[#ececec] bg-white text-[#666]"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Fields */}
      <div className="flex flex-col gap-4 flex-1">
        {/* Street address autocomplete */}
        <div>
          <p className="text-[10px] font-semibold tracking-widest text-[#aaa] uppercase mb-2">Street address</p>
          <AddressAutocomplete
            value={streetAddress}
            onChange={(address, details) => {
              setStreetAddress(address);
              if (details?.address_components) {
                const c = details.address_components;
                const city = c.find((x: any) => x.types.includes("locality") || x.types.includes("administrative_area_level_3"));
                const st = c.find((x: any) => x.types.includes("administrative_area_level_1"));
                const zip = c.find((x: any) => x.types.includes("postal_code"));
                if (city) setCity(city.long_name);
                if (st) setState(st.short_name);
                if (zip) setZipCode(zip.long_name);
              }
            }}
            onLocationSelect={(loc) => { setLatitude(loc.lat); setLongitude(loc.lng); }}
            label=""
            placeholder="Start typing your address…"
          />
        </div>

        {/* City */}
        <div>
          <p className="text-[10px] font-semibold tracking-widest text-[#aaa] uppercase mb-2">City</p>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="San Francisco"
            className={inputCls}
          />
        </div>

        {/* State + ZIP */}
        <div className="flex gap-3">
          <div className="w-28">
            <p className="text-[10px] font-semibold tracking-widest text-[#aaa] uppercase mb-2">State</p>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="flex h-12 w-full border border-[#ececec] bg-[#f6f6f6] px-3 text-[14px] text-[#111] outline-none appearance-none"
            >
              <option value="">—</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-semibold tracking-widest text-[#aaa] uppercase mb-2">ZIP code</p>
            <input
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
              placeholder="94102"
              inputMode="numeric"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="pt-8">
        <button
          type="button"
          onClick={handleContinue}
          disabled={!isValid}
          className={primaryBtn}
        >
          Continue <Icon icon={ArrowRight} size="sm" />
        </button>
      </div>
    </div>
  );
}
