import { useQuery } from "@tanstack/react-query";
import { Service } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Plus, Star, Droplet, Wrench, Sparkles, Clock, CheckCircle2, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { formatPrice } from "@shared/pricing";

const addOns = [
  {
    name: "Leather Treatment",
    description: "Deep condition and protect leather surfaces",
    price: 35,
    icon: Wrench,
  },
  {
    name: "Clay Bar Treatment",
    description: "Remove embedded contaminants from paint",
    price: 45,
    icon: Droplet,
  },
  {
    name: "Interior Sanitization",
    description: "Disinfect all interior surfaces",
    price: 25,
    icon: Shield,
  },
  {
    name: "Premium Wax",
    description: "Long-lasting protection with carnauba wax",
    price: 30,
    icon: Sparkles,
  },
];

const signatureFeatures = [
  "Steam extraction cleaning",
  "Paint decontamination",
  "Full interior deep clean & conditioning",
  "Engine bay detailing",
];

export default function ServicesPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: services, isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  return (
    <div
      className="w-full min-h-screen bg-white px-4 sm:px-6 lg:px-8 py-6"
      style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <p className="text-xs font-semibold tracking-widest text-[#8c52ff] uppercase mb-1">
          What we offer
        </p>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Services</h1>
      </motion.div>

      <div className="space-y-10">
        {/* Core Services */}
        <section>
          <h2 className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-4">
            Core Packages
          </h2>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 rounded-2xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {services?.map((service, index) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                  className="group flex items-center justify-between p-5 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-white hover:border-[#8c52ff]/30 hover:shadow-sm transition-all duration-200"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 text-base">{service.name}</h3>
                    </div>
                    <p className="text-sm text-gray-500 leading-snug line-clamp-1">
                      {service.description}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{service.duration} min</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 ml-4 shrink-0">
                    <span className="text-lg font-bold text-gray-900">
                      {formatPrice(service.price)}
                    </span>
                    <Button
                      size="sm"
                      className="bg-[#8c52ff] hover:bg-[#7b40f0] text-white text-xs px-4 rounded-full"
                      onClick={() => setLocation("/")}
                    >
                      Book
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Signature Detail */}
        <section>
          <h2 className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-4">
            Signature Package
          </h2>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl bg-[#1a0a3c] p-6 text-white relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-[#8c52ff]/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none" />

            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[#c4a0ff] text-xs font-semibold tracking-widest uppercase mb-1">
                    Best Value
                  </p>
                  <h3 className="text-xl font-bold">Dapper Signature Detail</h3>
                  <p className="text-white/60 text-sm mt-0.5">3-hour comprehensive package</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">$299</div>
                  <div className="text-white/50 text-xs">180 min</div>
                </div>
              </div>

              <ul className="space-y-2 mb-5">
                {signatureFeatures.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5 text-sm text-white/80">
                    <CheckCircle2 className="h-4 w-4 text-[#c4a0ff] shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                className="w-full bg-[#8c52ff] hover:bg-[#7b40f0] text-white rounded-full font-semibold"
                onClick={() => setLocation("/")}
              >
                Book Signature Detail
              </Button>
            </div>
          </motion.div>
        </section>

        {/* Add-Ons */}
        <section>
          <h2 className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-4">
            Add-Ons
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {addOns.map((addon, index) => (
              <motion.div
                key={addon.name}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.07 }}
                className="flex flex-col p-4 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-white hover:border-[#8c52ff]/30 hover:shadow-sm transition-all duration-200"
              >
                <div className="bg-[#8c52ff]/10 w-9 h-9 rounded-xl flex items-center justify-center mb-3">
                  <addon.icon className="h-4.5 w-4.5 text-[#8c52ff]" />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-0.5">
                  {addon.name}
                </h3>
                <p className="text-xs text-gray-400 leading-snug flex-1">{addon.description}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="font-bold text-gray-900 text-sm">${addon.price}</span>
                  <button className="flex items-center gap-1 text-[#8c52ff] text-xs font-semibold">
                    <Plus className="h-3.5 w-3.5" /> Add
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
