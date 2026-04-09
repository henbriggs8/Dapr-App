import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight } from "lucide-react";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 30 }, (_, i) => CURRENT_YEAR - i);

const CAR_MAKES = [
  "Acura","Alfa Romeo","Aston Martin","Audi","Bentley","BMW","Buick","Cadillac",
  "Chevrolet","Chrysler","Dodge","Ferrari","Fiat","Ford","Genesis","GMC","Honda",
  "Hyundai","Infiniti","Jaguar","Jeep","Kia","Lamborghini","Land Rover","Lexus",
  "Lincoln","Maserati","Mazda","McLaren","Mercedes-Benz","Mini","Mitsubishi",
  "Nissan","Polestar","Porsche","Ram","Rolls Royce","Subaru","Tesla","Toyota",
  "Volkswagen","Volvo","Other",
];

const CAR_MODELS: { [key: string]: string[] } = {
  "Acura": ["ILX","TLX","RLX","MDX","RDX","NSX"],
  "Alfa Romeo": ["Giulia","Stelvio","4C","Tonale"],
  "Aston Martin": ["DB11","Vantage","DBS","DBX"],
  "Audi": ["A3","A4","A5","A6","A7","A8","Q3","Q5","Q7","Q8","e-tron","R8","TT"],
  "Bentley": ["Continental","Flying Spur","Bentayga","Mulsanne"],
  "BMW": ["1 Series","2 Series","3 Series","4 Series","5 Series","6 Series","7 Series","8 Series","X1","X2","X3","X4","X5","X6","X7","Z4","i3","i4","iX"],
  "Buick": ["Encore","Envision","Enclave"],
  "Cadillac": ["ATS","CTS","CT4","CT5","CT6","XT4","XT5","XT6","Escalade"],
  "Chevrolet": ["Spark","Sonic","Malibu","Impala","Camaro","Corvette","Trax","Equinox","Traverse","Tahoe","Suburban","Silverado","Colorado"],
  "Chrysler": ["300","Pacifica"],
  "Dodge": ["Charger","Challenger","Durango","Journey"],
  "Ferrari": ["488","F8","SF90","Roma","Portofino","812","LaFerrari"],
  "Fiat": ["500","500X","124 Spider"],
  "Ford": ["Fiesta","Focus","Fusion","Mustang","EcoSport","Escape","Edge","Explorer","Expedition","F-150","Ranger"],
  "Genesis": ["G70","G80","G90","GV60","GV70","GV80"],
  "GMC": ["Terrain","Acadia","Yukon","Sierra","Canyon"],
  "Honda": ["Fit","Civic","Accord","Insight","CR-V","Passport","Pilot","Ridgeline"],
  "Hyundai": ["Accent","Elantra","Sonata","Venue","Kona","Tucson","Santa Fe","Palisade"],
  "Infiniti": ["Q50","Q60","Q70","QX30","QX50","QX60","QX80"],
  "Jaguar": ["XE","XF","XJ","F-Type","E-Pace","F-Pace","I-Pace"],
  "Jeep": ["Compass","Cherokee","Grand Cherokee","Wrangler","Gladiator"],
  "Kia": ["Rio","Forte","Optima","Stinger","Soul","Seltos","Sportage","Sorento","Telluride"],
  "Lamborghini": ["Huracan","Aventador","Urus"],
  "Land Rover": ["Range Rover Evoque","Range Rover Velar","Range Rover Sport","Range Rover","Discovery Sport","Discovery","Defender"],
  "Lexus": ["IS","ES","GS","LS","RC","LC","UX","NX","RX","GX","LX"],
  "Lincoln": ["MKZ","Continental","Corsair","Nautilus","Aviator","Navigator"],
  "Maserati": ["Ghibli","Quattroporte","Levante","MC20"],
  "Mazda": ["Mazda3","Mazda6","CX-3","CX-30","CX-5","CX-9","MX-5 Miata"],
  "McLaren": ["570S","720S","765LT","Artura"],
  "Mercedes-Benz": ["A-Class","C-Class","E-Class","S-Class","CLA","CLS","GLA","GLB","GLC","GLE","GLS","G-Class","SL","AMG GT"],
  "Mini": ["Cooper","Countryman","Clubman"],
  "Mitsubishi": ["Mirage","Eclipse Cross","Outlander"],
  "Nissan": ["Versa","Sentra","Altima","Maxima","370Z","GT-R","Kicks","Rogue","Murano","Pathfinder","Armada","Titan","Frontier"],
  "Polestar": ["1","2","3"],
  "Porsche": ["718","911","Panamera","Macan","Cayenne","Taycan"],
  "Ram": ["1500","2500","3500","ProMaster"],
  "Rolls Royce": ["Ghost","Wraith","Dawn","Phantom","Cullinan"],
  "Subaru": ["Impreza","Legacy","Outback","Forester","Crosstrek","Ascent","WRX","BRZ"],
  "Tesla": ["Model 3","Model S","Model X","Model Y","Cybertruck"],
  "Toyota": ["Yaris","Corolla","Camry","Avalon","Prius","C-HR","RAV4","Venza","Highlander","4Runner","Sequoia","Sienna","Tacoma","Tundra"],
  "Volkswagen": ["Jetta","Passat","Arteon","Golf","Tiguan","Atlas","ID.4"],
  "Volvo": ["S60","S90","V60","V90","XC40","XC60","XC90"],
  "Other": ["Custom","Kit Car","Classic","Modified"],
};

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

  const availableModels = make && CAR_MODELS[make] ? CAR_MODELS[make] : [];
  const handleMakeChange = (val: string) => { setMake(val); setModel(""); };
  const isValid = year && make && model;

  const handleSave = () => {
    localStorage.setItem("userVehicle", JSON.stringify({ year, make, model }));
    setLocation("/onboarding/first-wash-offer");
  };

  const handleSkip = () => {
    localStorage.setItem("skipVehicle", "true");
    setLocation("/onboarding/first-wash-offer");
  };

  return (
    <div className="flex flex-col min-h-screen bg-white px-6 pt-14 pb-10">
      <div className="flex items-center justify-between mb-10">
        <button
          onClick={() => setLocation("/onboarding/name")}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f1f1f1]"
        >
          <ArrowLeft className="h-4 w-4" />
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
          disabled={!isValid}
          className={primaryBtn}
        >
          Save & Continue <ArrowRight className="h-4 w-4" />
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
