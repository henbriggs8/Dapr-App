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
  return (
    <div className="border-t border-gray-200">
      {services.map((service) => {
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
  );
}
