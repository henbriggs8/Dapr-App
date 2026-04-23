import React, { useEffect, useState } from "react";
import { ArrowRight, ChevronRight, Star, MapPin, Shield, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

// --- Hooks & Utils ---

function useScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollTop;
      const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scroll = `${totalScroll / windowHeight}`;
      setProgress(Number(scroll));
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return progress;
}

// --- Components ---

const RevealOnScroll = ({ children, className, delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-1000 ease-out",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12",
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

export default function Showroom() {
  const scrollProgress = useScrollProgress();

  return (
    <div className="min-h-screen bg-[#050505] text-[#ededed] selection:bg-white selection:text-black font-sans overflow-x-hidden">
      {/* --- Global Styles --- */}
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
        
        /* Noise overlay for texture */
        .noise {
          position: fixed;
          top: 0; left: 0; width: 100vw; height: 100vh;
          pointer-events: none;
          z-index: 50;
          opacity: 0.03;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        }
      `}</style>
      
      <div className="noise" />

      {/* --- Header --- */}
      <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-8 py-6 mix-blend-difference backdrop-blur-md bg-black/10 transition-all duration-500">
        <div className="font-display font-bold text-xl tracking-widest uppercase text-white">
          DAPPER
        </div>
        <nav className="hidden md:flex items-center gap-12 font-body text-sm font-medium tracking-wide text-white/70">
          <a href="#philosophy" className="hover:text-white transition-colors">Philosophy</a>
          <a href="#services" className="hover:text-white transition-colors">Services</a>
          <a href="#process" className="hover:text-white transition-colors">The Process</a>
        </nav>
        <button className="group relative overflow-hidden rounded-full bg-white px-6 py-2.5 font-body text-xs font-bold uppercase tracking-wider text-black transition-transform hover:scale-105">
          <span className="relative z-10 flex items-center gap-2">
            Reserve <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </span>
        </button>
      </header>

      {/* --- Hero Section --- */}
      <section className="relative h-screen w-full flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="/__mockup/images/showroom-hero.png" 
            alt="Dapper Hero" 
            className="w-full h-full object-cover object-center opacity-80"
          />
          {/* Vignette gradients to blend into background */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-[#050505]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-transparent to-transparent opacity-80" />
        </div>

        <div className="relative z-10 max-w-[1400px] w-full px-8 md:px-16 flex flex-col justify-end h-full pb-32">
          <RevealOnScroll>
            <h1 className="font-display text-5xl md:text-7xl lg:text-[7rem] font-bold leading-[0.9] text-white uppercase max-w-5xl mix-blend-overlay">
              Perfection, <br />
              <span className="text-transparent border-text" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.5)' }}>Delivered.</span>
            </h1>
          </RevealOnScroll>
          <RevealOnScroll delay={200}>
            <p className="mt-8 max-w-xl font-body text-lg md:text-xl font-light leading-relaxed text-white/70">
              The showroom experience brought to your driveway. Elite detailers, museum-grade products, zero compromises.
            </p>
          </RevealOnScroll>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-12 left-8 md:left-16 z-10 flex items-center gap-4">
          <div className="w-[1px] h-16 bg-white/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1/2 bg-white animate-[scrolldown_2s_ease-in-out_infinite]" />
          </div>
          <span className="font-body text-xs font-bold uppercase tracking-widest text-white/40 rotate-90 origin-left translate-y-8">Scroll</span>
        </div>
      </section>

      {/* --- Philosophy Section --- */}
      <section id="philosophy" className="py-32 md:py-48 px-8 md:px-16 max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-16 md:gap-8 items-center">
          <div className="md:col-span-5 flex flex-col gap-8">
            <RevealOnScroll>
              <h2 className="font-display text-xs font-bold uppercase tracking-[0.3em] text-white/40 mb-4">
                The Standard
              </h2>
              <p className="font-display text-3xl md:text-5xl leading-tight text-white">
                WE DON'T JUST WASH CARS. WE RESTORE MASTERPIECES.
              </p>
            </RevealOnScroll>
            <RevealOnScroll delay={200}>
              <p className="font-body text-lg text-white/60 leading-relaxed">
                Your vehicle is an investment, a statement, a sanctuary. Dapper was created for owners who understand that standard automated washes are abrasive, and cheap mobile details are a liability. We employ only vetted artisans armed with PH-neutral formulas and a borderline obsessive attention to detail.
              </p>
            </RevealOnScroll>
          </div>
          
          <div className="md:col-span-6 md:col-start-7">
            <RevealOnScroll delay={300} className="relative aspect-[4/3] rounded-sm overflow-hidden group">
              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-700 z-10" />
              <img 
                src="/__mockup/images/showroom-wheel.png" 
                alt="Detailing perfection" 
                className="w-full h-full object-cover scale-105 group-hover:scale-100 transition-transform duration-1000"
              />
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* --- Services Grid --- */}
      <section id="services" className="py-32 bg-[#0a0a0a] border-y border-white/5 relative">
        <div className="max-w-[1400px] mx-auto px-8 md:px-16">
          <RevealOnScroll>
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-24 gap-8">
              <div>
                <h2 className="font-display text-xs font-bold uppercase tracking-[0.3em] text-white/40 mb-4">
                  Curated Services
                </h2>
                <h3 className="font-display text-4xl md:text-6xl text-white">
                  CHOOSE YOUR<br />TIER
                </h3>
              </div>
              <p className="font-body text-white/50 max-w-sm">
                From essential upkeep to concourse-level restoration, performed wherever you park.
              </p>
            </div>
          </RevealOnScroll>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Tier 1 */}
            <RevealOnScroll delay={100} className="group border border-white/10 bg-black p-10 flex flex-col hover:border-white/30 transition-colors duration-500">
              <div className="mb-12">
                <h4 className="font-display text-2xl text-white mb-2">Essential</h4>
                <p className="font-body text-white/50 text-sm h-12">The perfect maintenance wash to keep your vehicle looking sharp week after week.</p>
              </div>
              
              <ul className="flex-1 flex flex-col gap-4 font-body text-sm text-white/70 mb-16">
                <li className="flex items-start gap-3"><ChevronRight className="w-4 h-4 text-white/30 mt-0.5" /> PH-neutral foam hand wash</li>
                <li className="flex items-start gap-3"><ChevronRight className="w-4 h-4 text-white/30 mt-0.5" /> Wheel & tire deep clean</li>
                <li className="flex items-start gap-3"><ChevronRight className="w-4 h-4 text-white/30 mt-0.5" /> Interior vacuum & wipe down</li>
                <li className="flex items-start gap-3"><ChevronRight className="w-4 h-4 text-white/30 mt-0.5" /> Streak-free glass cleaning</li>
              </ul>
              
              <div className="flex items-end justify-between mt-auto pt-8 border-t border-white/10">
                <div>
                  <span className="text-xs font-bold text-white/40 uppercase tracking-wider block mb-1">Starting at</span>
                  <span className="font-display text-3xl text-white">$85</span>
                </div>
                <button className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all">
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </RevealOnScroll>

            {/* Tier 2 */}
            <RevealOnScroll delay={200} className="group border border-white/10 bg-black p-10 flex flex-col hover:border-white/30 transition-colors duration-500 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-white text-black text-[10px] font-bold px-4 py-1 uppercase tracking-widest z-10">Most Popular</div>
              <div className="mb-12 relative z-10">
                <h4 className="font-display text-2xl text-white mb-2">Signature</h4>
                <p className="font-body text-white/50 text-sm h-12">Comprehensive detailing that restores your interior and protects your exterior.</p>
              </div>
              
              <ul className="flex-1 flex flex-col gap-4 font-body text-sm text-white/70 mb-16 relative z-10">
                <li className="flex items-start gap-3"><ChevronRight className="w-4 h-4 text-white/30 mt-0.5" /> Everything in Essential</li>
                <li className="flex items-start gap-3"><ChevronRight className="w-4 h-4 text-white/30 mt-0.5" /> Clay bar decontamination</li>
                <li className="flex items-start gap-3"><ChevronRight className="w-4 h-4 text-white/30 mt-0.5" /> 6-month ceramic sealant</li>
                <li className="flex items-start gap-3"><ChevronRight className="w-4 h-4 text-white/30 mt-0.5" /> Leather conditioning treatment</li>
                <li className="flex items-start gap-3"><ChevronRight className="w-4 h-4 text-white/30 mt-0.5" /> Deep carpet extraction</li>
              </ul>
              
              <div className="flex items-end justify-between mt-auto pt-8 border-t border-white/10 relative z-10">
                <div>
                  <span className="text-xs font-bold text-white/40 uppercase tracking-wider block mb-1">Starting at</span>
                  <span className="font-display text-3xl text-white">$195</span>
                </div>
                <button className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center bg-white text-black transition-all">
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </RevealOnScroll>

            {/* Tier 3 */}
            <RevealOnScroll delay={300} className="group border border-white/10 bg-black p-10 flex flex-col hover:border-white/30 transition-colors duration-500">
              <div className="mb-12">
                <h4 className="font-display text-2xl text-white mb-2">Concourse</h4>
                <p className="font-body text-white/50 text-sm h-12">Flawless perfection. Paint correction and long-term protection for the discerning owner.</p>
              </div>
              
              <ul className="flex-1 flex flex-col gap-4 font-body text-sm text-white/70 mb-16">
                <li className="flex items-start gap-3"><ChevronRight className="w-4 h-4 text-white/30 mt-0.5" /> Everything in Signature</li>
                <li className="flex items-start gap-3"><ChevronRight className="w-4 h-4 text-white/30 mt-0.5" /> Stage 1 Paint Correction (Polish)</li>
                <li className="flex items-start gap-3"><ChevronRight className="w-4 h-4 text-white/30 mt-0.5" /> 1-Year Ceramic Coating</li>
                <li className="flex items-start gap-3"><ChevronRight className="w-4 h-4 text-white/30 mt-0.5" /> Engine bay detailing</li>
                <li className="flex items-start gap-3"><ChevronRight className="w-4 h-4 text-white/30 mt-0.5" /> Undercarriage wash</li>
              </ul>
              
              <div className="flex items-end justify-between mt-auto pt-8 border-t border-white/10">
                <div>
                  <span className="text-xs font-bold text-white/40 uppercase tracking-wider block mb-1">Starting at</span>
                  <span className="font-display text-3xl text-white">$450</span>
                </div>
                <button className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all">
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* --- Image Feature Section --- */}
      <section className="py-0 relative h-[80vh] min-h-[600px] w-full flex items-center">
        <div className="absolute inset-0 z-0 flex">
          <div className="w-1/2 h-full bg-[#050505]"></div>
          <div className="w-1/2 h-full relative">
            <img 
              src="/__mockup/images/showroom-interior.png" 
              alt="Luxury interior" 
              className="w-full h-full object-cover grayscale-[20%]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#050505] to-transparent w-1/3" />
          </div>
        </div>

        <div className="relative z-10 max-w-[1400px] w-full px-8 md:px-16 mx-auto">
          <div className="max-w-xl">
            <RevealOnScroll>
              <h2 className="font-display text-4xl md:text-5xl text-white mb-8">
                SANCTUARY<br />RESTORED.
              </h2>
              <p className="font-body text-lg text-white/60 leading-relaxed mb-10">
                We treat interiors like high-end tailoring. Matte finishes stay matte. Leathers are nourished, not just greased. Carpets are extracted, not just vacuumed. Step into a cabin that smells like the day it left Stuttgart.
              </p>
              <button className="flex items-center gap-4 text-white font-bold uppercase tracking-widest text-sm hover:opacity-70 transition-opacity">
                View Interior Services <ArrowRight className="w-4 h-4" />
              </button>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* --- The Process / Trust --- */}
      <section id="process" className="py-32 px-8 md:px-16 max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
          <div>
            <RevealOnScroll className="relative aspect-[16/9] lg:aspect-[4/5] rounded-sm overflow-hidden">
              <img 
                src="/__mockup/images/showroom-process.png" 
                alt="Detailing process" 
                className="w-full h-full object-cover object-center"
              />
            </RevealOnScroll>
          </div>
          
          <div className="flex flex-col gap-16">
            <RevealOnScroll>
              <h2 className="font-display text-4xl text-white mb-4">ENGINEERED<br />CONVENIENCE</h2>
              <p className="font-body text-white/50">The highest caliber of service, completely frictionless. We operate on your schedule, at your location.</p>
            </RevealOnScroll>

            <div className="flex flex-col gap-12">
              <RevealOnScroll delay={100} className="flex gap-6">
                <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-display text-lg text-white mb-2">On-Demand Scheduling</h4>
                  <p className="font-body text-sm text-white/50 leading-relaxed">Book a slot that works for you in seconds. Same-day availability for urgent needs. Live GPS tracking of your detailer en route.</p>
                </div>
              </RevealOnScroll>
              
              <RevealOnScroll delay={200} className="flex gap-6">
                <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-display text-lg text-white mb-2">Vetted Artisans</h4>
                  <p className="font-body text-sm text-white/50 leading-relaxed">Only 4% of applicants make it onto the Dapper platform. Every detailer is background-checked, fully insured, and rigorously trained.</p>
                </div>
              </RevealOnScroll>

              <RevealOnScroll delay={300} className="flex gap-6">
                <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-display text-lg text-white mb-2">Fully Self-Contained</h4>
                  <p className="font-body text-sm text-white/50 leading-relaxed">Our vans arrive with their own spot-free water and power supply. Whether you're in a high-rise garage or a suburban driveway, we handle it.</p>
                </div>
              </RevealOnScroll>
            </div>
          </div>
        </div>
      </section>

      {/* --- Footer CTA --- */}
      <footer className="relative bg-black pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
           <div className="absolute w-[800px] h-[800px] rounded-full bg-white blur-[150px] -top-96 -right-96 opacity-10" />
        </div>
        
        <div className="max-w-[1400px] mx-auto px-8 md:px-16 relative z-10">
          <RevealOnScroll className="flex flex-col items-center text-center max-w-4xl mx-auto mb-32">
            <h2 className="font-display text-5xl md:text-7xl text-white font-bold leading-none mb-8">
              READY FOR THE<br />SHOWROOM?
            </h2>
            <p className="font-body text-xl text-white/50 mb-12">
              Join thousands of owners who trust Dapper with their investments.
            </p>
            <button className="bg-white text-black px-12 py-5 rounded-full font-body font-bold uppercase tracking-widest text-sm hover:scale-105 transition-transform flex items-center gap-3">
              Book Your Detail <ArrowRight className="w-4 h-4" />
            </button>
          </RevealOnScroll>

          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-white/10 text-white/30 font-body text-xs uppercase tracking-widest gap-4">
            <div className="font-display font-bold text-white/50 text-base">DAPPER</div>
            <div className="flex gap-8">
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Instagram</a>
            </div>
            <div>© {new Date().getFullYear()} DAPPER AUTOMOTIVE</div>
          </div>
        </div>
      </footer>
      
      {/* --- Global CSS Animation for scroll indicator --- */}
      <style>{`
        @keyframes scrolldown {
          0% { transform: translateY(-100%); }
          50% { transform: translateY(100%); }
          100% { transform: translateY(100%); }
        }
      `}</style>
    </div>
  );
}
