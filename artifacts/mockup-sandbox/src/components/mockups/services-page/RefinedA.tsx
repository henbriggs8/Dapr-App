import React from 'react';
import {
  ChevronRight,
  Droplets,
  Sparkles,
  Car,
  Gem,
  Armchair,
  Wind,
  ShieldCheck,
  Layers,
  Plus
} from 'lucide-react';

export function RefinedA() {
  const services = [
    {
      name: "Essential Wash",
      price: "39",
      duration: "45 MIN",
      description: "Exterior rinse, hand wash, window clean",
      Icon: Droplets,
    },
    {
      name: "Interior Detail",
      price: "89",
      duration: "90 MIN",
      description: "Full vacuum, wipe-down, stain treatment",
      Icon: Sparkles,
    },
    {
      name: "Full Detail",
      price: "149",
      duration: "150 MIN",
      description: "Everything in interior/exterior + steam clean & luxe wax",
      Icon: Car,
    }
  ];

  const signatureIcon = Gem;

  const addOns = [
    { name: "Leather Treatment", price: "35", Icon: Armchair },
    { name: "Clay Bar Treatment", price: "45", Icon: Layers },
    { name: "Interior Sanitization", price: "25", Icon: Wind },
    { name: "Premium Wax", price: "30", Icon: ShieldCheck }
  ];

  return (
    <div className="w-[390px] mx-auto min-h-screen bg-white text-zinc-950 font-sans pb-[120px] selection:bg-zinc-950 selection:text-white border-x border-zinc-100">
      {/* Header */}
      <div className="pt-16 pb-10 px-6">
        <h1 className="text-[28px] font-medium tracking-tight">Services</h1>
      </div>

      {/* Packages Section */}
      <div className="px-6 pb-12">
        <h2 className="text-[11px] font-semibold text-zinc-400 tracking-[0.15em] mb-4 uppercase">Packages</h2>
        <div className="flex flex-col border-t border-zinc-100">
          {services.map((service, index) => {
            const Icon = service.Icon;
            return (
              <div key={index} className="flex gap-4 py-6 border-b border-zinc-100 cursor-pointer group transition-colors hover:bg-zinc-50/50 -mx-4 px-4 rounded-xl">
                <div className="shrink-0 w-[42px] h-[42px] rounded-full bg-[#8c52ff]/[0.06] ring-1 ring-[#8c52ff]/10 flex items-center justify-center group-hover:bg-[#8c52ff]/[0.12] group-hover:ring-[#8c52ff]/20 transition-all duration-300">
                  <Icon className="w-[18px] h-[18px] text-[#8c52ff]" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0 py-0.5">
                  <div className="flex justify-between items-start">
                    <div className="pr-4 flex-1">
                      <h3 className="text-[16px] font-medium tracking-tight text-zinc-900">{service.name}</h3>
                      <p className="text-[13px] text-zinc-500 leading-relaxed mt-1.5 pr-2">{service.description}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 w-[72px] justify-end">
                      <div className="text-right flex flex-col items-end gap-1">
                        <div className="flex items-baseline">
                          <span className="text-[10px] text-zinc-400 font-medium mr-0.5">from</span>
                          <span className="text-[16px] font-medium text-zinc-900 tracking-tight">${service.price}</span>
                        </div>
                        <span className="text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">{service.duration}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-[#8c52ff] group-hover:translate-x-0.5 transition-all duration-300 shrink-0" strokeWidth={2} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Signature Package */}
      <div className="px-6 pb-12">
        <h2 className="text-[11px] font-semibold text-zinc-400 tracking-[0.15em] mb-4 uppercase">Signature</h2>
        <div className="bg-zinc-950 text-white rounded-2xl p-6 cursor-pointer group hover:bg-black transition-colors duration-300 shadow-xl shadow-zinc-950/10 ring-1 ring-zinc-900">
          <div className="flex gap-4">
            <div className="shrink-0 w-[42px] h-[42px] rounded-full bg-white/[0.08] ring-1 ring-white/10 flex items-center justify-center group-hover:bg-[#8c52ff]/20 group-hover:ring-[#8c52ff]/30 transition-all duration-300">
              {React.createElement(signatureIcon, { className: "w-[18px] h-[18px] text-[#8c52ff]", strokeWidth: 1.5 })}
            </div>
            <div className="flex-1 min-w-0 py-0.5">
              <div className="flex justify-between items-start mb-3">
                <div className="pr-4 flex-1">
                  <h3 className="text-[16px] font-medium tracking-tight text-zinc-50 mb-1.5">Dapper Signature Detail</h3>
                  <span className="text-[10px] font-semibold tracking-[0.15em] text-[#8c52ff] uppercase">180 MIN</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 w-[72px] justify-end">
                  <div className="text-right flex flex-col items-end gap-1">
                    <div className="flex items-baseline">
                      <span className="text-[10px] text-zinc-500 font-medium mr-0.5">from</span>
                      <span className="text-[16px] font-medium text-zinc-50 tracking-tight">$299</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-[#8c52ff] group-hover:translate-x-0.5 transition-all duration-300 shrink-0" strokeWidth={2} />
                </div>
              </div>
              <p className="text-[13px] text-zinc-400 leading-relaxed pr-2">
                Steam extraction, paint decontamination, full interior deep clean, engine bay detailing
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add-ons Section */}
      <div className="px-6 pb-8">
        <h2 className="text-[11px] font-semibold text-zinc-400 tracking-[0.15em] mb-4 uppercase">Add-ons</h2>
        <div className="flex flex-col border-t border-zinc-100">
          {addOns.map((addon, index) => {
            const Icon = addon.Icon;
            return (
              <div key={index} className="flex items-center gap-4 py-5 border-b border-zinc-100 cursor-pointer group transition-colors hover:bg-zinc-50/50 -mx-4 px-4 rounded-xl">
                <div className="shrink-0 w-[38px] h-[38px] rounded-full bg-[#8c52ff]/[0.06] ring-1 ring-[#8c52ff]/10 flex items-center justify-center group-hover:bg-[#8c52ff]/[0.12] group-hover:ring-[#8c52ff]/20 transition-all duration-300">
                  <Icon className="w-[16px] h-[16px] text-[#8c52ff]" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[15px] font-medium tracking-tight text-zinc-900">{addon.name}</span>
                </div>
                <div className="flex items-center gap-4 shrink-0 w-[72px] justify-end">
                  <div className="flex items-baseline">
                    <span className="text-[15px] font-medium text-zinc-600 group-hover:text-zinc-900 transition-colors tracking-tight">+${addon.price}</span>
                  </div>
                  <button className="w-7 h-7 rounded-full border border-zinc-200 flex items-center justify-center text-zinc-400 group-hover:border-zinc-900 group-hover:text-zinc-900 group-hover:bg-zinc-900/5 transition-all duration-300 shrink-0">
                    <Plus className="w-[14px] h-[14px]" strokeWidth={2} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
