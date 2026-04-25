import { useQuery } from "@tanstack/react-query";
import { Service } from "@shared/schema";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  HelpCircle,
  Droplets,
  Sparkles,
  Wand2,
  Crown,
  type LucideIcon,
} from "lucide-react";

function iconForService(name: string): LucideIcon {
  const n = name.toLowerCase();
  if (n.includes("essential") || n.includes("basic") || n.includes("exterior")) return Droplets;
  if (n.includes("interior")) return Sparkles;
  if (n.includes("refresh") || n.includes("standard") || n.includes("maintenance")) return Wand2;
  if (n.includes("black label") || n.includes("signature") || n.includes("premium")) return Crown;
  return Droplets;
}

export default function ServicesPage() {
  const [, setLocation] = useLocation();

  const { data: services, isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const packages = services?.filter((s) => s.category !== "premium") ?? [];
  const signature = services?.find((s) => s.category === "premium");

  return (
    <div
      className="min-h-screen bg-white"
      style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom))" }}
    >
      <div className="max-w-3xl mx-auto md:px-6 md:pt-10">
        {/* Header */}
        <div className="px-5 pt-12 pb-5 md:px-0 md:pt-0">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 text-[11px] font-semibold tracking-widest text-[#888] uppercase mb-4 hover:text-[#111] transition-colors"
            data-testid="link-back"
          >
            <ArrowLeft className="h-4 w-4" />
            Dapper
          </button>
          <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-[#111]">
            Book a Service
          </h1>
        </div>

        {/* Card container — feels boxed on desktop, edge-to-edge on mobile */}
        <div className="md:rounded-2xl md:border md:border-[#ededed] md:shadow-sm md:overflow-hidden md:bg-white">
          <div className="h-px bg-[#ededed] mx-5 md:hidden" />

          {/* Choose Service */}
          <div className="pt-6 pb-2 md:pt-5">
            <p className="px-5 text-[10px] font-semibold tracking-widest text-[#999] uppercase mb-1">
              Choose Service
            </p>

            {isLoading ? (
              <div className="px-5 pt-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="py-4 border-b border-[#ededed] last:border-0">
                    <div className="h-4 bg-gray-100 rounded w-1/3 mb-2 animate-pulse" />
                    <div className="h-3 bg-gray-100 rounded w-2/3 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-t border-[#ededed] mt-3">
                {packages.map((service) => {
                  const Icon = iconForService(service.name);
                  return (
                    <button
                      key={service.id}
                      onClick={() => setLocation("/booking")}
                      className="w-full text-left flex items-center px-5 py-4 border-b border-[#ededed] last:border-0 active:bg-[#fafafa] hover:bg-[#fafafa] transition-colors"
                      data-testid={`service-${service.id}`}
                    >
                      <div className="w-10 h-10 rounded-full bg-[#f4f0ff] text-[#8c52ff] flex items-center justify-center shrink-0 mr-4">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 pr-4 min-w-0">
                        <p className="text-[15px] font-semibold text-[#111] mb-0.5">{service.name}</p>
                        <p className="text-[12px] text-[#888] leading-snug truncate">{service.description}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-[15px] font-bold text-[#111]">${service.price}</p>
                          <div className="flex items-center gap-1 justify-end">
                            <Clock className="h-3 w-3 text-[#aaa]" />
                            <p className="text-[11px] text-[#aaa]">{service.duration} min</p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-[#ccc]" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Signature */}
          {signature && (
            <div className="px-5 pt-5 pb-5 md:px-5 md:pt-4">
              <p className="text-[10px] font-semibold tracking-widest text-[#999] uppercase mb-3">
                Signature
              </p>
              <button
                onClick={() => setLocation("/booking")}
                className="w-full text-left bg-[#111] rounded-2xl p-5 active:opacity-90 hover:opacity-95 transition-opacity"
                data-testid="service-signature"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/10 text-[#8c52ff] flex items-center justify-center shrink-0">
                      <Crown className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[16px] font-bold text-white mb-0.5">{signature.name}</p>
                      <p className="text-[11px] font-semibold tracking-widest text-[#666] uppercase">
                        {signature.duration} min
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-[16px] font-bold text-white">${signature.price}</p>
                    <ChevronRight className="h-4 w-4 text-[#8c52ff]" />
                  </div>
                </div>
                <p className="text-[13px] text-[#999] leading-5">{signature.description}</p>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tour Dapper floating button */}
      <div className="fixed bottom-24 right-5 md:bottom-8">
        <button
          onClick={() => setLocation("/how-it-works")}
          className="flex items-center gap-2 bg-white border border-[#e0e0e0] rounded-full px-4 py-2.5 shadow-sm text-[13px] font-medium text-[#555] active:bg-[#fafafa] hover:bg-[#fafafa] transition-colors"
          data-testid="button-tour-dapper"
        >
          <HelpCircle className="h-4 w-4 text-[#8c52ff]" />
          Tour Dapper
          <span className="h-2 w-2 rounded-full bg-[#8c52ff]" />
        </button>
      </div>
    </div>
  );
}
