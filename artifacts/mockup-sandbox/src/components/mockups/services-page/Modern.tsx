import React, { useState } from "react";
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
  Palette,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

// Noise overlay for texture
const Noise = () => (
  <div className="pointer-events-none fixed inset-0 z-50 h-full w-full opacity-[0.03]" 
       style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }} 
  />
);

export function Modern() {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  return (
    <div className="relative mx-auto w-full max-w-[390px] min-h-[100dvh] bg-[#050505] text-[#ededed] overflow-x-hidden selection:bg-white selection:text-black">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=Inter:wght@300;400;500&display=swap');
        
        .font-display {
          font-family: 'Syncopate', sans-serif;
          letter-spacing: -0.02em;
        }
        .font-body {
          font-family: 'Inter', sans-serif;
        }
        
        /* Smooth scrolling */
        html {
          scroll-behavior: smooth;
        }
      `}</style>
      
      <Noise />

      {/* Hero Header */}
      <header className="relative h-[280px] w-full flex flex-col justify-end p-6 border-b border-white/10">
        <div className="absolute inset-0 z-0">
          <img 
            src="/__mockup/images/showroom-wheel.png" 
            alt="Showroom wheel detail" 
            className="h-full w-full object-cover object-center opacity-40 grayscale-[20%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent" />
        </div>
        
        <div className="relative z-10">
          <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-white leading-tight">
            Curated<br />Services
          </h1>
          <p className="font-body text-sm text-white/50 mt-3 font-light max-w-[280px]">
            From essential upkeep to concourse-level restoration.
          </p>
        </div>
      </header>

      <main className="px-6 py-8 flex flex-col gap-12 pb-32">
        
        {/* Core Packages */}
        <section>
          <div className="flex items-end justify-between mb-6">
            <h2 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-white/40">
              Core Packages
            </h2>
          </div>
          
          <div className="flex flex-col gap-4">
            
            {/* Essential Wash */}
            <div 
              onClick={() => setSelectedPackage('essential')}
              className={cn(
                "group relative bg-black border p-6 transition-all duration-500 cursor-pointer overflow-hidden",
                selectedPackage === 'essential' ? "border-white" : "border-white/10 hover:border-white/30"
              )}
            >
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                  <h3 className="font-display text-lg text-white">Essential</h3>
                  <div className="flex items-center text-xs text-white/40 font-body mt-1">
                    <Clock className="w-3 h-3 mr-1.5" /> 45 min
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-display text-xl text-white block">$39</span>
                </div>
              </div>
              <p className="font-body text-xs text-white/60 mb-6 leading-relaxed relative z-10">
                Exterior rinse, hand wash, window clean. Perfect for a quick refresh.
              </p>
              <div className="flex items-center justify-between border-t border-white/10 pt-4 relative z-10">
                <span className="font-display text-[9px] uppercase tracking-widest text-white/40">Select Tier</span>
                <div className={cn(
                  "w-8 h-8 rounded-full border flex items-center justify-center transition-all",
                  selectedPackage === 'essential' ? "bg-white border-white text-black" : "border-white/20 text-white group-hover:border-white/50"
                )}>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Interior Detail */}
            <div 
              onClick={() => setSelectedPackage('interior')}
              className={cn(
                "group relative bg-black border p-6 transition-all duration-500 cursor-pointer overflow-hidden",
                selectedPackage === 'interior' ? "border-white" : "border-white/10 hover:border-white/30"
              )}
            >
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                  <h3 className="font-display text-lg text-white">Interior</h3>
                  <div className="flex items-center text-xs text-white/40 font-body mt-1">
                    <Clock className="w-3 h-3 mr-1.5" /> 90 min
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-display text-xl text-white block">$89</span>
                </div>
              </div>
              <p className="font-body text-xs text-white/60 mb-6 leading-relaxed relative z-10">
                Full vacuum, wipe-down, stain treatment. Revitalize your cabin.
              </p>
              <div className="flex items-center justify-between border-t border-white/10 pt-4 relative z-10">
                <span className="font-display text-[9px] uppercase tracking-widest text-white/40">Select Tier</span>
                <div className={cn(
                  "w-8 h-8 rounded-full border flex items-center justify-center transition-all",
                  selectedPackage === 'interior' ? "bg-white border-white text-black" : "border-white/20 text-white group-hover:border-white/50"
                )}>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Full Detail */}
            <div 
              onClick={() => setSelectedPackage('full')}
              className={cn(
                "group relative bg-black border p-6 transition-all duration-500 cursor-pointer overflow-hidden",
                selectedPackage === 'full' ? "border-white" : "border-white/10 hover:border-white/30"
              )}
            >
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                  <h3 className="font-display text-lg text-white">Full Detail</h3>
                  <div className="flex items-center text-xs text-white/40 font-body mt-1">
                    <Clock className="w-3 h-3 mr-1.5" /> 150 min
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-display text-xl text-white block">$149</span>
                </div>
              </div>
              <p className="font-body text-xs text-white/60 mb-6 leading-relaxed relative z-10">
                Everything in Interior + clay bar + hand wax. The ultimate reset.
              </p>
              <div className="flex items-center justify-between border-t border-white/10 pt-4 relative z-10">
                <span className="font-display text-[9px] uppercase tracking-widest text-white/40">Select Tier</span>
                <div className={cn(
                  "w-8 h-8 rounded-full border flex items-center justify-center transition-all",
                  selectedPackage === 'full' ? "bg-white border-white text-black" : "border-white/20 text-white group-hover:border-white/50"
                )}>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Signature Package */}
        <section>
          <div className="flex items-end justify-between mb-6">
            <h2 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-white/40">
              The Standard
            </h2>
          </div>
          
          <div 
            onClick={() => setSelectedPackage('signature')}
            className={cn(
              "group relative bg-black border p-6 transition-all duration-500 cursor-pointer overflow-hidden",
              selectedPackage === 'signature' ? "border-white" : "border-white/20 hover:border-white/50"
            )}
          >
            {/* Cinematic background image for Signature package */}
            <div className="absolute inset-0 z-0 opacity-20 group-hover:opacity-30 transition-opacity duration-700">
              <img 
                src="/__mockup/images/detail-macro.png" 
                alt="Signature detail background" 
                className="w-full h-full object-cover object-center grayscale-[50%]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
            </div>

            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="inline-block px-2 py-1 bg-white text-black font-display text-[8px] uppercase tracking-widest font-bold mb-3">
                    Ultimate Care
                  </span>
                  <h3 className="font-display text-2xl text-white leading-none mb-2">Signature</h3>
                  <div className="flex items-center text-xs text-white/40 font-body">
                    <Clock className="w-3 h-3 mr-1.5" /> 180 min
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-display text-2xl text-white block">$299</span>
                </div>
              </div>
              
              <ul className="flex flex-col gap-3 font-body text-xs text-white/60 mb-8 border-t border-white/10 pt-6">
                <li className="flex items-start gap-3"><ChevronRight className="w-3 h-3 text-white/30 mt-0.5" /> Steam extraction for deep stain removal</li>
                <li className="flex items-start gap-3"><ChevronRight className="w-3 h-3 text-white/30 mt-0.5" /> Paint decontamination & correction prep</li>
                <li className="flex items-start gap-3"><ChevronRight className="w-3 h-3 text-white/30 mt-0.5" /> Full interior deep clean & conditioning</li>
                <li className="flex items-start gap-3"><ChevronRight className="w-3 h-3 text-white/30 mt-0.5" /> Engine bay detailing & dressing</li>
              </ul>
              
              <div className="flex items-center justify-between">
                <span className="font-display text-[9px] uppercase tracking-widest text-white/40">Select Tier</span>
                <div className={cn(
                  "w-10 h-10 rounded-full border flex items-center justify-center transition-all",
                  selectedPackage === 'signature' ? "bg-white border-white text-black" : "border-white/30 text-white group-hover:border-white/70"
                )}>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Add-ons */}
        <section>
          <div className="flex items-end justify-between mb-6">
            <h2 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-white/40">
              Enhancements
            </h2>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'leather', name: 'Leather Treatment', price: '$35', icon: Shield },
              { id: 'clay', name: 'Clay Bar', price: '$45', icon: Palette },
              { id: 'sanitize', name: 'Sanitization', price: '$25', icon: SprayCan },
              { id: 'wax', name: 'Premium Wax', price: '$30', icon: Sparkles },
            ].map((addon) => (
              <div 
                key={addon.id}
                className="bg-black border border-white/10 p-4 flex flex-col justify-between group cursor-pointer hover:border-white/30 transition-all duration-300 min-h-[120px]"
              >
                <div className="flex justify-between items-start mb-4">
                  <addon.icon className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
                  <span className="font-display text-[10px] text-white/40 group-hover:text-white transition-colors">+{addon.price}</span>
                </div>
                <h4 className="font-body text-xs font-medium text-white/70 group-hover:text-white transition-colors leading-tight">
                  {addon.name}
                </h4>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 z-50 bg-gradient-to-t from-[#050505] via-[#050505]/90 to-transparent">
        <div className="max-w-[390px] mx-auto">
          <button 
            disabled={!selectedPackage}
            className="w-full bg-white text-black h-14 font-display text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 disabled:bg-white/10 disabled:text-white/30 transition-all hover:bg-white/90"
          >
            {selectedPackage ? 'Continue to Booking' : 'Select a Tier'} 
            {selectedPackage && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
