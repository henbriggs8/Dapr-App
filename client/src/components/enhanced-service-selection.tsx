import { Clock, ChevronRight, Check } from "lucide-react";
import { Service } from "@shared/schema";

interface EnhancedServiceSelectionProps {
  services: Service[];
  selectedServiceId: number | null;
  onServiceSelect: (service: Service) => void;
  onBookNow: () => void;
}

export function EnhancedServiceSelection({
  services,
  selectedServiceId,
  onServiceSelect,
}: EnhancedServiceSelectionProps) {
  const packages = services.filter((s) => s.category !== "premium");
  const signature = services.find((s) => s.category === "premium");

  return (
    <div>
      {/* Packages */}
      <div className="border-t border-gray-200">
        {packages.map((service) => {
          const isSelected = selectedServiceId === service.id;
          return (
            <button
              key={service.id}
              onClick={() => onServiceSelect(service)}
              className="w-full flex items-start justify-between py-5 border-b border-gray-200 text-left"
            >
              <div className="flex-1 pr-4">
                <p className="text-base font-medium text-black">{service.name}</p>
                <p className="text-sm text-gray-500 mt-0.5">{service.description}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 pt-0.5">
                <div className="text-right">
                  <p className="text-base font-medium text-black">${service.price}</p>
                  <p className="text-xs text-gray-400 flex items-center justify-end gap-0.5 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {service.duration} min
                  </p>
                </div>
                {isSelected ? (
                  <div className="w-5 h-5 rounded-full bg-[#8c52ff] flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                ) : (
                  <ChevronRight className="w-5 h-5 text-[#8c52ff] flex-shrink-0" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Signature Block */}
      {signature && (
        <div className="mt-8">
          <p className="text-xs font-semibold text-gray-500 tracking-widest uppercase mb-3">Signature</p>
          <button
            onClick={() => onServiceSelect(signature)}
            className="w-full bg-gray-950 rounded-xl p-5 text-left"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 pr-4">
                <p className="text-base font-medium text-white">{signature.name}</p>
                <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">{signature.duration} min</p>
                <p className="text-sm text-gray-400 mt-3">{signature.description}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <p className="text-base font-medium text-white">${signature.price}</p>
                {selectedServiceId === signature.id ? (
                  <div className="w-5 h-5 rounded-full bg-[#8c52ff] flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                ) : (
                  <ChevronRight className="w-5 h-5 text-[#8c52ff] flex-shrink-0" />
                )}
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
