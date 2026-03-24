import { useQuery } from "@tanstack/react-query";
import { Service } from "@shared/schema";
import { useLocation } from "wouter";
import { ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { ADD_ONS, getSelectedAddOnIds, saveSelectedAddOnIds } from "@/utils/add-ons";

export default function ServicesPage() {
  const [, setLocation] = useLocation();
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);

  const { data: services, isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  // Load persisted add-on selections on mount
  useEffect(() => {
    setSelectedAddOns(getSelectedAddOnIds());
  }, []);

  const packages = services?.filter((s) => s.category !== "premium") ?? [];
  const signature = services?.find((s) => s.category === "premium");

  const toggleAddOn = (id: string) => {
    const updated = selectedAddOns.includes(id)
      ? selectedAddOns.filter((a) => a !== id)
      : [...selectedAddOns, id];
    setSelectedAddOns(updated);
    saveSelectedAddOnIds(updated);
  };

  return (
    <div
      className="min-h-screen bg-white font-sans"
      style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }}
    >
      {/* Header */}
      <div className="pt-14 pb-8 px-6 border-b border-gray-200">
        <p className="text-xs font-semibold text-gray-500 tracking-widest uppercase mb-1">Dapper</p>
        <h1 className="text-3xl font-medium tracking-tight text-black">Services</h1>
      </div>

      {/* Core Packages */}
      <div className="px-6 pt-6 pb-2">
        <h2 className="text-xs font-semibold text-gray-500 tracking-widest uppercase mb-4">Packages</h2>
        <div className="border-t border-gray-200">
          {isLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="py-6 border-b border-gray-200">
                  <div className="h-4 bg-gray-100 rounded w-1/3 mb-2 animate-pulse" />
                  <div className="h-3 bg-gray-100 rounded w-2/3 animate-pulse" />
                </div>
              ))}
            </>
          ) : (
            packages.map((service) => (
              <div
                key={service.id}
                className="flex flex-col py-6 border-b border-gray-200 cursor-pointer"
                onClick={() => setLocation("/booking")}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-lg font-medium text-black">{service.name}</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-medium text-black">${service.price}</span>
                    <ChevronRight className="w-5 h-5 text-[#8c52ff]" />
                  </div>
                </div>
                <div className="flex justify-between items-center pr-8">
                  <p className="text-sm text-gray-500 leading-relaxed max-w-[80%]">{service.description}</p>
                  <span className="text-xs text-gray-400 font-medium">{service.duration} min</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Signature Block */}
      {signature && (
        <div className="px-6 pt-6 pb-2">
          <h2 className="text-xs font-semibold text-gray-500 tracking-widest uppercase mb-4">Signature</h2>
          <div
            className="bg-gray-950 text-white p-6 cursor-pointer hover:bg-black transition-colors"
            onClick={() => setLocation("/booking")}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-medium mb-1">{signature.name}</h3>
                <span className="text-xs text-gray-400 font-medium tracking-wide uppercase">{signature.duration} min</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-medium">${signature.price}</span>
                <ChevronRight className="w-5 h-5 text-[#8c52ff]" />
              </div>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">{signature.description}</p>
          </div>
        </div>
      )}

      {/* Add-Ons */}
      <div className="px-6 pt-6">
        <h2 className="text-xs font-semibold text-gray-500 tracking-widest uppercase mb-1">Add-ons</h2>
        <p className="text-xs text-gray-400 mb-4">Select any extras to include with your service</p>
        <div className="flex flex-wrap gap-2">
          {ADD_ONS.map((addon) => {
            const isSelected = selectedAddOns.includes(addon.id);
            return (
              <button
                key={addon.id}
                onClick={() => toggleAddOn(addon.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                  isSelected
                    ? "bg-[#8c52ff] border-[#8c52ff] text-white"
                    : "bg-white border-gray-200 text-black hover:border-gray-400"
                }`}
              >
                {addon.name}
                <span className={`ml-1.5 text-xs ${isSelected ? "text-purple-200" : "text-gray-400"}`}>
                  +${addon.price}
                </span>
              </button>
            );
          })}
        </div>
        {selectedAddOns.length > 0 && (
          <p className="text-xs text-[#8c52ff] mt-3 font-medium">
            {selectedAddOns.length} add-on{selectedAddOns.length > 1 ? "s" : ""} selected · +$
            {ADD_ONS.filter((a) => selectedAddOns.includes(a.id)).reduce((sum, a) => sum + a.price, 0)} total
          </p>
        )}
      </div>
    </div>
  );
}
