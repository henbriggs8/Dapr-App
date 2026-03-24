import { useQuery } from "@tanstack/react-query";
import { Service } from "@shared/schema";
import { useLocation } from "wouter";
import { Plus, Droplet, Wrench, Sparkles, Shield, ChevronRight, CheckCircle2 } from "lucide-react";
import { formatPrice } from "@shared/pricing";

const addOns = [
  { name: "Leather Treatment", description: "Deep condition and protect leather surfaces", price: 35, icon: Wrench },
  { name: "Clay Bar Treatment", description: "Remove embedded contaminants from paint", price: 45, icon: Droplet },
  { name: "Interior Sanitization", description: "Disinfect all interior surfaces", price: 25, icon: Shield },
  { name: "Premium Wax", description: "Long-lasting protection with carnauba wax", price: 30, icon: Sparkles },
];

const signatureFeatures = [
  "Steam extraction cleaning",
  "Paint decontamination",
  "Full interior deep clean & conditioning",
  "Engine bay detailing",
];

export default function ServicesPage() {
  const [, setLocation] = useLocation();

  const { data: services, isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

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
            services?.map((service) => (
              <div
                key={service.id}
                className="flex flex-col py-6 border-b border-gray-200 cursor-pointer"
                onClick={() => setLocation("/")}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-lg font-medium text-black">{service.name}</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-medium text-black">{formatPrice(service.price)}</span>
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

      {/* Signature Package */}
      <div className="px-6 pt-6 pb-2">
        <h2 className="text-xs font-semibold text-gray-500 tracking-widest uppercase mb-4">Signature</h2>
        <div
          className="bg-gray-950 text-white p-6 cursor-pointer hover:bg-black transition-colors"
          onClick={() => setLocation("/")}
        >
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
          <ul className="space-y-2 mb-0">
            {signatureFeatures.map((feature) => (
              <li key={feature} className="flex items-center gap-2.5 text-sm text-gray-400">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#8c52ff] shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Add-Ons */}
      <div className="px-6 pt-6">
        <h2 className="text-xs font-semibold text-gray-500 tracking-widest uppercase mb-4">Add-ons</h2>
        <div className="border-t border-gray-200">
          {addOns.map((addon) => (
            <div
              key={addon.name}
              className="flex justify-between items-center py-5 border-b border-gray-200"
            >
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="text-base text-black">{addon.name}</h3>
                <p className="text-sm text-gray-500 leading-snug mt-0.5">{addon.description}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-base font-medium text-black">${addon.price}</span>
                <button className="w-8 h-8 border border-gray-200 flex items-center justify-center hover:border-black transition-colors">
                  <Plus className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
