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
} from 'lucide-react';

export function RefinedB() {
  const services = [
    {
      name: "Essential Wash",
      price: "39",
      duration: "45 min",
      description: "Exterior rinse, hand wash, window clean",
      Icon: Droplets,
    },
    {
      name: "Interior Detail",
      price: "89",
      duration: "90 min",
      description: "Full vacuum, wipe-down, stain treatment",
      Icon: Sparkles,
    },
    {
      name: "Full Detail",
      price: "149",
      duration: "150 min",
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
    <div className="min-h-screen bg-white text-zinc-900 font-sans pb-[120px] selection:bg-zinc-900 selection:text-white mx-auto relative overflow-hidden" style={{ maxWidth: '390px' }}>
      {/* Header */}
      <div className="pt-16 pb-10 px-6">
        <h1 className="text-[32px] font-medium tracking-tight text-zinc-950">Services</h1>
      </div>

      {/* Packages Section */}
      <div className="px-6 pb-12">
        <h2 className="text-[11px] font-semibold text-zinc-400 tracking-[0.2em] mb-5 uppercase">Packages</h2>
        <div className="flex flex-col border-t border-zinc-100">
          {services.map((service, index) => {
            const Icon = service.Icon;
            return (
              <div key={index} className="flex gap-4 py-7 border-b border-zinc-100 cursor-pointer group hover:bg-zinc-50/50 transition-colors -mx-4 px-4 rounded-xl">
                <div className="shrink-0 w-10 h-10 rounded-full bg-[#8c52ff]/[0.06] flex items-center justify-center group-hover:bg-[#8c52ff]/[0.12] transition-colors mt-0.5">
                  <Icon className="w-4 h-4 text-[#8c52ff]" strokeWidth={1.5} />
                </div>
                
                <div className="flex-1 min-w-0 pr-2">
                  <h3 className="text-[17px] font-medium tracking-tight text-zinc-900 mb-1.5">{service.name}</h3>
                  <p className="text-[13px] text-zinc-500 leading-relaxed pr-2">
                    {service.description}
                  </p>
                </div>

                <div className="flex flex-col items-end shrink-0 w-20">
                  <div className="flex items-center justify-end gap-1 mb-1 w-full">
                    <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">from</span>
                    <span className="text-[17px] font-medium text-zinc-900 tracking-tight">${service.price}</span>
                  </div>
                  <div className="flex items-center justify-end gap-1.5 w-full">
                    <span className="text-[12px] font-medium text-zinc-400">{service.duration}</span>
                    <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-[#8c52ff] group-hover:translate-x-0.5 transition-all" strokeWidth={1.5} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Signature Package */}
      <div className="px-6 pb-14">
        <h2 className="text-[11px] font-semibold text-zinc-400 tracking-[0.2em] mb-5 uppercase">Signature</h2>
        <div className="relative rounded-2xl overflow-hidden cursor-pointer group">
          {/* Subtle purple wash background */}
          <div className="absolute inset-0 bg-zinc-950 transition-colors group-hover:bg-black z-0"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[#8c52ff]/15 via-transparent to-transparent opacity-60 z-0"></div>
          
          <div className="relative z-10 p-6 flex flex-col gap-6">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm">
                {React.createElement(signatureIcon, { className: "w-4 h-4 text-[#8c52ff]", strokeWidth: 1.5 })}
              </div>
              <div className="flex flex-col items-end">
                 <div className="flex items-center gap-1 mb-1">
                    <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">from</span>
                    <span className="text-[17px] font-medium text-white tracking-tight">$299</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] font-medium text-zinc-400">180 min</span>
                    <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-[#8c52ff] group-hover:translate-x-0.5 transition-all" strokeWidth={1.5} />
                  </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-[19px] font-medium text-white tracking-tight mb-2">Dapper Signature Detail</h3>
              <p className="text-[14px] text-zinc-400 leading-relaxed">
                Steam extraction, paint decontamination, full interior deep clean, engine bay detailing.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add-ons Section */}
      <div className="px-6 pb-8">
        <h2 className="text-[11px] font-semibold text-zinc-400 tracking-[0.2em] mb-5 uppercase">Add-ons</h2>
        <div className="flex flex-col border-t border-zinc-100">
          {addOns.map((addon, index) => {
            const Icon = addon.Icon;
            return (
              <div key={index} className="flex items-center gap-4 py-5 border-b border-zinc-100 cursor-pointer group hover:bg-zinc-50/50 transition-colors -mx-4 px-4 rounded-xl">
                <div className="shrink-0 w-9 h-9 rounded-full bg-[#8c52ff]/[0.06] flex items-center justify-center group-hover:bg-[#8c52ff]/[0.12] transition-colors">
                  <Icon className="w-4 h-4 text-[#8c52ff]" strokeWidth={1.5} />
                </div>
                <span className="flex-1 text-[15px] font-medium text-zinc-800 tracking-tight">{addon.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[15px] font-medium text-zinc-900 tracking-tight">${addon.price}</span>
                  <button className="w-8 h-8 rounded-full border border-zinc-200 flex items-center justify-center group-hover:border-[#8c52ff] group-hover:text-[#8c52ff] transition-colors bg-white">
                    <span className="text-lg leading-none font-light mb-0.5">+</span>
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
