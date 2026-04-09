import { useQuery } from "@tanstack/react-query";
import { Service } from "@shared/schema";
import { useLocation } from "wouter";
import { ArrowLeft, ChevronRight, Clock, HelpCircle } from "lucide-react";

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
      {/* Header */}
      <div className="px-5 pt-12 pb-5">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-[11px] font-semibold tracking-widest text-[#888] uppercase mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Dapper
        </button>
        <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-[#111]">
          Book a Service
        </h1>
      </div>

      <div className="h-px bg-[#ededed] mx-5" />

      {/* Choose Service */}
      <div className="pt-6 pb-2">
        <p className="px-5 text-[10px] font-semibold tracking-widest text-[#999] uppercase mb-1">
          Choose Service
        </p>

        {isLoading ? (
          <div className="px-5 pt-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="py-5 border-b border-[#ededed]">
                <div className="h-4 bg-gray-100 rounded w-1/3 mb-2 animate-pulse" />
                <div className="h-3 bg-gray-100 rounded w-2/3 animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="border-t border-[#ededed] mt-3">
            {packages.map((service) => (
              <button
                key={service.id}
                onClick={() => setLocation("/booking")}
                className="w-full text-left flex items-center px-5 py-5 border-b border-[#ededed] active:bg-[#fafafa] transition"
              >
                <div className="flex-1 pr-4">
                  <p className="text-[16px] font-semibold text-[#111] mb-0.5">{service.name}</p>
                  <p className="text-[12px] text-[#888] leading-snug">{service.description}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-[16px] font-bold text-[#111]">${service.price}</p>
                    <div className="flex items-center gap-1 justify-end">
                      <Clock className="h-3 w-3 text-[#aaa]" />
                      <p className="text-[11px] text-[#aaa]">{service.duration} min</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#ccc]" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Signature */}
      {signature && (
        <div className="px-5 pt-6">
          <p className="text-[10px] font-semibold tracking-widest text-[#999] uppercase mb-3">
            Signature
          </p>
          <button
            onClick={() => setLocation("/booking")}
            className="w-full text-left bg-[#111] rounded-2xl p-5 active:opacity-90 transition"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[16px] font-bold text-white mb-0.5">{signature.name}</p>
                <p className="text-[11px] font-semibold tracking-widest text-[#666] uppercase">
                  {signature.duration} min
                </p>
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

      {/* Tour Dapper floating button */}
      <div className="fixed bottom-24 right-5">
        <button
          onClick={() => setLocation("/how-it-works")}
          className="flex items-center gap-2 bg-white border border-[#e0e0e0] rounded-full px-4 py-2.5 shadow-sm text-[13px] font-medium text-[#555] active:bg-[#fafafa] transition"
        >
          <HelpCircle className="h-4 w-4 text-[#8c52ff]" />
          Tour Dapper
          <span className="h-2 w-2 rounded-full bg-[#8c52ff]" />
        </button>
      </div>
    </div>
  );
}
