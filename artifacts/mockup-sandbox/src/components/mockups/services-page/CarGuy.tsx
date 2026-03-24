import React from "react";
import { 
  Car, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  Gauge, 
  Sparkles,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";

const services = [
  { 
    id: "essential",
    name: "Essential Wash", 
    desc: "Exterior rinse, hand wash, window clean", 
    price: "$39", 
    time: "45 MIN" 
  },
  { 
    id: "interior",
    name: "Interior Detail", 
    desc: "Full vacuum, wipe-down, stain treatment", 
    price: "$89", 
    time: "90 MIN" 
  },
  { 
    id: "full",
    name: "Full Detail", 
    desc: "Everything in Interior + clay bar + hand wax", 
    price: "$149", 
    time: "150 MIN" 
  },
];

const addons = [
  { id: "leather", name: "Leather Treatment", price: "+$35" },
  { id: "clay", name: "Clay Bar Treatment", price: "+$45" },
  { id: "sanitization", name: "Interior Sanitization", price: "+$25" },
  { id: "wax", name: "Premium Wax", price: "+$30" },
];

const signature = {
  name: "DAPPER SIGNATURE DETAIL",
  price: "$299",
  time: "180 MIN",
  features: [
    "Steam extraction", 
    "Paint decontamination", 
    "Full interior deep clean", 
    "Engine bay detailing"
  ]
};

export function CarGuy() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-gray-100 pb-[120px] font-['Barlow',sans-serif] selection:bg-amber-500 selection:text-black">
      
      {/* Header Background Pattern (subtle tire track / diagonal lines) */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-[#111] border-b border-[#222] overflow-hidden z-0">
        <div className="absolute inset-0 opacity-[0.03]" 
             style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' }}>
        </div>
      </div>

      <div className="relative z-10 px-6 pt-16 pb-8">
        <div className="flex items-center gap-3 mb-2">
          <Gauge className="w-8 h-8 text-amber-500" strokeWidth={1.5} />
          <h1 className="text-4xl font-extrabold tracking-tighter text-white uppercase font-['Oswald',sans-serif]">
            Dapper
          </h1>
        </div>
        <p className="text-sm font-semibold tracking-[0.2em] text-gray-400 uppercase">
          Premium Auto Detailing
        </p>
      </div>

      <div className="relative z-10 px-4 space-y-10">
        
        {/* PACKAGES SECTION */}
        <section>
          <div className="flex items-center gap-3 mb-6 px-2">
            <div className="h-[2px] w-8 bg-amber-500"></div>
            <h2 className="text-xl font-bold tracking-widest text-amber-500 uppercase">
              Packages
            </h2>
          </div>

          <div className="space-y-4">
            {services.map((svc) => (
              <div 
                key={svc.id} 
                className="bg-[#1a1a1a] border-l-[3px] border-amber-500 p-5 flex flex-col gap-4 shadow-2xl relative overflow-hidden group hover:bg-[#1f1f1f] transition-colors"
              >
                {/* Decorative background number/element */}
                <Car className="absolute -right-4 -top-4 w-24 h-24 text-white opacity-5" />

                <div className="flex justify-between items-start z-10">
                  <div>
                    <h3 className="text-xl font-bold text-white uppercase tracking-wide mb-1">
                      {svc.name}
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed pr-8">
                      {svc.desc}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-amber-500">
                      {svc.price}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2 z-10">
                  <div className="flex items-center gap-1.5 bg-[#0a0a0a] px-3 py-1 text-xs font-bold text-amber-500 tracking-wider border border-[#333]">
                    <Clock className="w-3.5 h-3.5" />
                    {svc.time}
                  </div>
                  <Button className="rounded-none bg-amber-500 hover:bg-amber-400 text-black font-bold uppercase tracking-wider text-xs px-6 h-10 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                    Book
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SIGNATURE SECTION */}
        <section>
          <div className="flex items-center gap-3 mb-6 px-2">
            <div className="h-[2px] w-8 bg-amber-500"></div>
            <h2 className="text-xl font-bold tracking-widest text-amber-500 uppercase">
              Signature
            </h2>
          </div>

          <div className="bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] border-t-4 border-amber-500 p-6 relative shadow-2xl overflow-hidden">
            {/* Carbon fiber-ish overlay */}
            <div className="absolute inset-0 opacity-[0.02]" 
                 style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '4px 4px' }}>
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-amber-500" fill="currentColor" />
                <span className="text-xs font-bold tracking-[0.2em] text-amber-500 uppercase">
                  Ultimate Experience
                </span>
              </div>
              
              <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-2 leading-none">
                {signature.name}
              </h3>
              
              <div className="flex items-end gap-3 mb-6 pb-6 border-b border-[#333]">
                <span className="text-4xl font-bold text-amber-500 leading-none">{signature.price}</span>
                <span className="flex items-center gap-1.5 text-xs font-bold text-gray-400 tracking-wider mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  {signature.time}
                </span>
              </div>

              <ul className="space-y-3 mb-8">
                {signature.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm font-medium text-gray-300">
                    <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button className="w-full rounded-none bg-amber-500 hover:bg-amber-400 text-black font-extrabold uppercase tracking-widest text-sm h-14">
                Reserve Signature Detail
              </Button>
            </div>
          </div>
        </section>

        {/* ADD-ONS SECTION */}
        <section>
          <div className="flex items-center gap-3 mb-6 px-2">
            <div className="h-[2px] w-8 bg-amber-500"></div>
            <h2 className="text-xl font-bold tracking-widest text-amber-500 uppercase">
              Extras
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {addons.map((addon) => (
              <div 
                key={addon.id}
                className="bg-[#111] border border-[#333] p-4 flex flex-col justify-between min-h-[100px] hover:border-amber-500/50 transition-colors group cursor-pointer"
              >
                <div className="text-sm font-bold text-gray-200 leading-tight group-hover:text-white transition-colors">
                  {addon.name}
                </div>
                <div className="flex justify-between items-end mt-2">
                  <span className="text-amber-500 font-bold text-sm">{addon.price}</span>
                  <div className="w-6 h-6 rounded-none bg-[#222] group-hover:bg-amber-500 flex items-center justify-center transition-colors">
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-black transition-colors" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
