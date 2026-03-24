import React from "react";
import { 
  Droplet, 
  Sparkles, 
  Car, 
  ShieldCheck, 
  Wind, 
  SprayCan, 
  Clock, 
  ChevronRight,
  Shield,
  Palette
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function Modern() {
  return (
    <div className="min-h-screen bg-[#f8f8f8] text-slate-900 pb-[120px] font-sans selection:bg-indigo-100">
      {/* Header */}
      <header className="px-6 pt-12 pb-6 sticky top-0 bg-[#f8f8f8]/80 backdrop-blur-xl z-50 border-b border-white/20">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Services</h1>
        <p className="text-slate-500 mt-1 text-sm font-medium">Select a package to get started.</p>
      </header>

      <main className="px-4 pt-6 flex flex-col gap-10">
        {/* Core Packages */}
        <section>
          <div className="flex items-center gap-2 mb-4 px-2 sticky top-[100px] z-40 bg-[#f8f8f8]/90 backdrop-blur-md py-2 -mx-2">
            <h2 className="text-lg font-bold text-slate-800">Core Packages</h2>
            <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 hover:bg-indigo-50 border-0 shadow-sm">Popular</Badge>
          </div>
          
          <div className="flex flex-col gap-4">
            {/* Essential Wash */}
            <div className="bg-white rounded-2xl p-5 shadow-[0_2px_20px_rgba(0,0,0,0.03)] border border-white relative overflow-hidden group transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-[100px] -z-10 opacity-50" />
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                    <Droplet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Essential Wash</h3>
                    <div className="flex items-center text-xs text-slate-500 font-medium mt-0.5">
                      <Clock className="w-3 h-3 mr-1" /> 45 min
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-slate-900">$39</span>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-5 leading-relaxed">
                Exterior rinse, hand wash, window clean. Perfect for a quick refresh.
              </p>
              <Button className="w-full rounded-full bg-slate-900 hover:bg-indigo-600 text-white shadow-md transition-colors h-11">
                Book <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            {/* Interior Detail */}
            <div className="bg-white rounded-2xl p-5 shadow-[0_2px_20px_rgba(0,0,0,0.03)] border border-white relative overflow-hidden group transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-[100px] -z-10 opacity-50" />
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                    <Wind className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Interior Detail</h3>
                    <div className="flex items-center text-xs text-slate-500 font-medium mt-0.5">
                      <Clock className="w-3 h-3 mr-1" /> 90 min
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-slate-900">$89</span>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-5 leading-relaxed">
                Full vacuum, wipe-down, stain treatment. Revitalize your cabin.
              </p>
              <Button className="w-full rounded-full bg-slate-900 hover:bg-indigo-600 text-white shadow-md transition-colors h-11">
                Book <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            {/* Full Detail */}
            <div className="bg-white rounded-2xl p-5 shadow-[0_2px_20px_rgba(0,0,0,0.03)] border border-white relative overflow-hidden group transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-[100px] -z-10 opacity-50" />
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Full Detail</h3>
                    <div className="flex items-center text-xs text-slate-500 font-medium mt-0.5">
                      <Clock className="w-3 h-3 mr-1" /> 150 min
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-slate-900">$149</span>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-5 leading-relaxed">
                Everything in Interior + clay bar + hand wax. The ultimate reset.
              </p>
              <Button className="w-full rounded-full bg-slate-900 hover:bg-indigo-600 text-white shadow-md transition-colors h-11">
                Book <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </section>

        {/* Signature Package */}
        <section>
          <div className="flex items-center gap-2 mb-4 px-2 sticky top-[100px] z-40 bg-[#f8f8f8]/90 backdrop-blur-md py-2 -mx-2">
            <h2 className="text-lg font-bold text-slate-800">Signature Package</h2>
          </div>
          
          <div className="rounded-2xl p-6 bg-gradient-to-br from-violet-600 to-indigo-600 shadow-[0_8px_30px_rgba(99,102,241,0.3)] relative overflow-hidden text-white">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <Badge className="bg-white/20 hover:bg-white/20 text-white border-0 mb-3 backdrop-blur-md font-medium">Ultimate Care</Badge>
                  <h3 className="font-bold text-2xl tracking-tight">Dapper Signature</h3>
                  <div className="flex items-center text-sm text-indigo-100 font-medium mt-1">
                    <Clock className="w-4 h-4 mr-1.5" /> 180 min
                  </div>
                </div>
                <div className="text-right bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md">
                  <span className="text-2xl font-bold">$299</span>
                </div>
              </div>
              
              <ul className="space-y-3 mb-8 text-indigo-50 text-sm">
                <li className="flex items-start gap-2.5">
                  <Wind className="w-4 h-4 text-indigo-300 shrink-0 mt-0.5" />
                  <span>Steam extraction for deep stain removal</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-300 shrink-0 mt-0.5" />
                  <span>Paint decontamination & correction prep</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-indigo-300 shrink-0 mt-0.5" />
                  <span>Full interior deep clean & conditioning</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Car className="w-4 h-4 text-indigo-300 shrink-0 mt-0.5" />
                  <span>Engine bay detailing & dressing</span>
                </li>
              </ul>
              
              <Button className="w-full rounded-full bg-white text-indigo-600 hover:bg-slate-50 font-bold shadow-lg h-12 text-base">
                Book Signature Detail
              </Button>
            </div>
          </div>
        </section>

        {/* Add-ons */}
        <section>
          <div className="flex items-center gap-2 mb-4 px-2 sticky top-[100px] z-40 bg-[#f8f8f8]/90 backdrop-blur-md py-2 -mx-2">
            <h2 className="text-lg font-bold text-slate-800">Add-ons</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {/* Leather Treatment */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-white flex flex-col items-center text-center group cursor-pointer hover:border-indigo-100 transition-colors">
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 mb-3 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                <Shield className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-sm text-slate-800 mb-1">Leather Treatment</h4>
              <span className="text-indigo-600 font-bold text-sm">+$35</span>
            </div>

            {/* Clay Bar */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-white flex flex-col items-center text-center group cursor-pointer hover:border-indigo-100 transition-colors">
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 mb-3 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                <Palette className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-sm text-slate-800 mb-1">Clay Bar</h4>
              <span className="text-indigo-600 font-bold text-sm">+$45</span>
            </div>

            {/* Sanitization */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-white flex flex-col items-center text-center group cursor-pointer hover:border-indigo-100 transition-colors">
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 mb-3 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                <SprayCan className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-sm text-slate-800 mb-1">Sanitization</h4>
              <span className="text-indigo-600 font-bold text-sm">+$25</span>
            </div>

            {/* Premium Wax */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-white flex flex-col items-center text-center group cursor-pointer hover:border-indigo-100 transition-colors">
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 mb-3 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-sm text-slate-800 mb-1">Premium Wax</h4>
              <span className="text-indigo-600 font-bold text-sm">+$30</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
