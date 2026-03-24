import React from 'react';
import { ChevronRight } from 'lucide-react';

export function UberMinimal() {
  const services = [
    {
      name: "Essential Wash",
      price: "$39",
      duration: "45 min",
      description: "exterior rinse, hand wash, window clean"
    },
    {
      name: "Interior Detail",
      price: "$89",
      duration: "90 min",
      description: "full vacuum, wipe-down, stain treatment"
    },
    {
      name: "Full Detail",
      price: "$149",
      duration: "150 min",
      description: "everything in Interior + clay bar + hand wax"
    }
  ];

  const addOns = [
    { name: "Leather Treatment", price: "$35" },
    { name: "Clay Bar Treatment", price: "$45" },
    { name: "Interior Sanitization", price: "$25" },
    { name: "Premium Wax", price: "$30" }
  ];

  return (
    <div className="min-h-screen bg-white text-black font-sans pb-[120px] selection:bg-black selection:text-white">
      {/* Header */}
      <div className="pt-16 pb-8 px-6">
        <h1 className="text-3xl font-medium tracking-tight">Services</h1>
      </div>

      {/* Packages Section */}
      <div className="px-6 pb-12">
        <h2 className="text-xs font-semibold text-gray-500 tracking-widest mb-4 uppercase">Packages</h2>
        <div className="flex flex-col border-t border-gray-200">
          {services.map((service, index) => (
            <div key={index} className="flex flex-col py-6 border-b border-gray-200 cursor-pointer group">
              <div className="flex justify-between items-start mb-1">
                <h3 className="text-lg font-medium">{service.name}</h3>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-lg font-medium">{service.price}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#8c52ff]" />
                </div>
              </div>
              <div className="flex justify-between items-center pr-8">
                <p className="text-sm text-gray-500 leading-relaxed max-w-[85%]">{service.description}</p>
                <span className="text-xs text-gray-400 font-medium">{service.duration}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Signature Package */}
      <div className="px-6 pb-12">
        <h2 className="text-xs font-semibold text-gray-500 tracking-widest mb-4 uppercase">Signature</h2>
        <div className="bg-gray-950 text-white p-6 cursor-pointer hover:bg-black transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-medium mb-1">Dapper Signature Detail</h3>
              <span className="text-xs text-gray-400 font-medium tracking-wide">180 MIN</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-medium">$299</span>
              <ChevronRight className="w-5 h-5 text-[#8c52ff]" />
            </div>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">
            Steam extraction, Paint decontamination, Full interior deep clean, Engine bay detailing
          </p>
        </div>
      </div>

      {/* Add-ons Section */}
      <div className="px-6 pb-8">
        <h2 className="text-xs font-semibold text-gray-500 tracking-widest mb-4 uppercase">Add-ons</h2>
        <div className="flex flex-col border-t border-gray-200">
          {addOns.map((addon, index) => (
            <div key={index} className="flex justify-between items-center py-5 border-b border-gray-200 cursor-pointer group">
              <span className="text-base">{addon.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-base font-medium">{addon.price}</span>
                <button className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center group-hover:border-black transition-colors">
                  <span className="text-lg leading-none font-light">+</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
