import React, { useEffect } from "react";
import { ArrowRight, Star, Clock, MapPin, CheckCircle2 } from "lucide-react";

export default function Concierge() {
  useEffect(() => {
    // Inject fonts
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Outfit:wght@300;400;500&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F5EC] text-[#1B1A18] font-['Outfit',sans-serif] selection:bg-[#2A3F35] selection:text-[#F7F5EC] overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-8 py-6 flex items-center justify-between mix-blend-difference text-[#F7F5EC]">
        <div className="text-2xl font-['Cormorant_Garamond',serif] tracking-widest uppercase font-semibold">
          DAPPER
        </div>
        <div className="hidden md:flex items-center gap-12 text-sm tracking-wide font-light">
          <a href="#services" className="hover:opacity-70 transition-opacity">Services</a>
          <a href="#professionals" className="hover:opacity-70 transition-opacity">The Professionals</a>
          <a href="#process" className="hover:opacity-70 transition-opacity">Process</a>
        </div>
        <button className="px-6 py-2.5 bg-[#F7F5EC] text-[#1B1A18] text-sm tracking-wide uppercase hover:bg-white transition-colors duration-300">
          Reserve
        </button>
      </nav>

      {/* Hero Section */}
      <section className="relative w-full h-[100vh] flex items-end pb-24 px-8 md:px-16 lg:px-24">
        <div className="absolute inset-0 z-0">
          <img 
            src="/__mockup/images/hero-concierge.png" 
            alt="Luxury car in driveway" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30" />
        </div>
        
        <div className="relative z-10 max-w-4xl text-[#F7F5EC]">
          <h1 className="font-['Cormorant_Garamond',serif] text-6xl md:text-8xl lg:text-[110px] leading-[0.9] font-light mb-8">
            Your time is a <span className="italic text-[#C4A87A]">luxury.</span><br />
            Let us handle the details.
          </h1>
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
            <p className="text-lg md:text-xl font-light max-w-lg leading-relaxed opacity-90">
              White-glove mobile automotive detailing, delivered to your driveway. We bring the meticulous care of a private concierge directly to you.
            </p>
            <button className="flex items-center gap-4 px-8 py-4 bg-[#C4A87A] text-[#1B1A18] hover:bg-[#D5B98B] transition-colors duration-300 rounded-none group">
              <span className="uppercase tracking-widest text-sm font-medium">Book an Appointment</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* Intro / Philosophy */}
      <section className="py-32 px-8 md:px-16 lg:px-24 max-w-[1440px] mx-auto flex flex-col md:flex-row items-start justify-between gap-16">
        <div className="md:w-1/3">
          <p className="uppercase tracking-[0.2em] text-xs font-semibold text-[#8C9389] mb-4">Our Philosophy</p>
          <h2 className="font-['Cormorant_Garamond',serif] text-4xl md:text-5xl leading-tight">
            Automotive care,<br />reimagined as <br /><i className="text-[#C4A87A]">hospitality.</i>
          </h2>
        </div>
        <div className="md:w-1/2 flex flex-col gap-8">
          <p className="text-xl leading-relaxed text-[#4A4843] font-light">
            You wouldn't wait in line for a mediocre meal, so why wait in line for a mediocre car wash? Dapper exists to give you back your most valuable asset: time. 
          </p>
          <p className="text-xl leading-relaxed text-[#4A4843] font-light">
            Our vetted professionals arrive at your home or office equipped with everything needed to restore your vehicle to showroom condition, while you carry on with your day uninterrupted.
          </p>
        </div>
      </section>

      {/* The Professionals */}
      <section id="professionals" className="py-24 px-8 md:px-16 lg:px-24 bg-[#EBE7DF]">
        <div className="max-w-[1440px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
            <div>
              <p className="uppercase tracking-[0.2em] text-xs font-semibold text-[#8C9389] mb-4">The Talent</p>
              <h2 className="font-['Cormorant_Garamond',serif] text-5xl md:text-6xl">Meet your personal detailers.</h2>
            </div>
            <p className="max-w-md text-[#4A4843] font-light text-lg">
              We accept fewer than 5% of applicants. Our detailers are master craftsmen who treat your vehicle with the reverence it deserves.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Detailer 1 */}
            <div className="group">
              <div className="aspect-[3/4] overflow-hidden mb-6 bg-[#D8D4CC]">
                <img 
                  src="/__mockup/images/detailer-1.png" 
                  alt="James, Master Detailer" 
                  className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700 ease-out"
                />
              </div>
              <h3 className="font-['Cormorant_Garamond',serif] text-3xl mb-1">James Harrison</h3>
              <p className="text-[#8C9389] uppercase tracking-wider text-sm mb-3">Master Detailer • 8 Years</p>
              <p className="text-[#4A4843] font-light leading-relaxed">
                "Every vehicle tells a story. My job is to make sure yours reads flawlessly from every angle."
              </p>
            </div>
            {/* Detailer 2 */}
            <div className="group md:mt-16">
              <div className="aspect-[3/4] overflow-hidden mb-6 bg-[#D8D4CC]">
                <img 
                  src="/__mockup/images/detailer-2.png" 
                  alt="Elena, Paint Correction Specialist" 
                  className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700 ease-out"
                />
              </div>
              <h3 className="font-['Cormorant_Garamond',serif] text-3xl mb-1">Elena Rostova</h3>
              <p className="text-[#8C9389] uppercase tracking-wider text-sm mb-3">Paint Correction Specialist</p>
              <p className="text-[#4A4843] font-light leading-relaxed">
                "True luxury is peace of mind. I treat every car exactly as I would treat my own."
              </p>
            </div>
            {/* Context Card */}
            <div className="flex flex-col justify-center p-12 bg-[#2A3F35] text-[#F7F5EC] lg:mt-32">
              <Star className="w-8 h-8 text-[#C4A87A] mb-8" />
              <h3 className="font-['Cormorant_Garamond',serif] text-4xl mb-6">Uncompromising Standards</h3>
              <ul className="space-y-4 font-light text-lg opacity-90">
                <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-[#C4A87A]" /> Rigorous background checks</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-[#C4A87A]" /> 100+ hours of advanced training</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-[#C4A87A]" /> Fully insured & bonded</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Services / Menu */}
      <section id="services" className="py-32 px-8 md:px-16 lg:px-24 max-w-[1200px] mx-auto">
        <div className="text-center mb-24">
          <p className="uppercase tracking-[0.2em] text-xs font-semibold text-[#8C9389] mb-4">The Menu</p>
          <h2 className="font-['Cormorant_Garamond',serif] text-5xl md:text-6xl mb-6">Curated Services</h2>
          <div className="w-px h-16 bg-[#C4A87A] mx-auto"></div>
        </div>

        <div className="space-y-16">
          {/* Basic */}
          <div className="flex flex-col md:flex-row gap-8 items-start border-b border-[#EBE7DF] pb-16 group cursor-pointer hover:border-[#2A3F35] transition-colors">
            <div className="md:w-1/4">
              <h3 className="font-['Cormorant_Garamond',serif] text-4xl group-hover:text-[#C4A87A] transition-colors">The Signature</h3>
              <p className="text-[#8C9389] uppercase tracking-wider text-sm mt-2">from $65</p>
            </div>
            <div className="md:w-2/4">
              <p className="text-xl text-[#4A4843] font-light leading-relaxed">
                An elegant refresh. Meticulous hand wash, wheel faces cleaned, tires dressed, interior vacuumed, and all surfaces gently wiped down.
              </p>
            </div>
            <div className="md:w-1/4 flex justify-end">
              <button className="text-[#1B1A18] uppercase tracking-widest text-sm font-semibold border-b border-[#1B1A18] pb-1 hover:text-[#C4A87A] hover:border-[#C4A87A] transition-colors">
                Select
              </button>
            </div>
          </div>

          {/* Standard */}
          <div className="flex flex-col md:flex-row gap-8 items-start border-b border-[#EBE7DF] pb-16 group cursor-pointer hover:border-[#2A3F35] transition-colors">
            <div className="md:w-1/4">
              <h3 className="font-['Cormorant_Garamond',serif] text-4xl group-hover:text-[#C4A87A] transition-colors">The Executive</h3>
              <p className="text-[#8C9389] uppercase tracking-wider text-sm mt-2">from $145</p>
            </div>
            <div className="md:w-2/4">
              <p className="text-xl text-[#4A4843] font-light leading-relaxed">
                Elevated attention. Includes all Signature services plus deep interior conditioning, leather treatment, and exterior synthetic sealant for lasting gloss.
              </p>
            </div>
            <div className="md:w-1/4 flex justify-end">
              <button className="text-[#1B1A18] uppercase tracking-widest text-sm font-semibold border-b border-[#1B1A18] pb-1 hover:text-[#C4A87A] hover:border-[#C4A87A] transition-colors">
                Select
              </button>
            </div>
          </div>

          {/* Premium */}
          <div className="flex flex-col md:flex-row gap-8 items-start border-b border-[#EBE7DF] pb-16 group cursor-pointer hover:border-[#2A3F35] transition-colors">
            <div className="md:w-1/4">
              <h3 className="font-['Cormorant_Garamond',serif] text-4xl group-hover:text-[#C4A87A] transition-colors">The Concierge</h3>
              <p className="text-[#8C9389] uppercase tracking-wider text-sm mt-2">from $295</p>
            </div>
            <div className="md:w-2/4">
              <p className="text-xl text-[#4A4843] font-light leading-relaxed">
                The ultimate reset. Comprehensive deep cleaning, paint decontamination, clay bar treatment, single-step polish, and ceramic spray coating.
              </p>
            </div>
            <div className="md:w-1/4 flex justify-end">
              <button className="text-[#1B1A18] uppercase tracking-widest text-sm font-semibold border-b border-[#1B1A18] pb-1 hover:text-[#C4A87A] hover:border-[#C4A87A] transition-colors">
                Select
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Image break */}
      <section className="w-full h-[60vh] bg-[#D8D4CC]">
        <img 
          src="/__mockup/images/detail-macro.png" 
          alt="Macro detail of car polish" 
          className="w-full h-full object-cover"
        />
      </section>

      {/* Footer / CTA */}
      <footer className="bg-[#1B1A18] text-[#F7F5EC] pt-32 pb-16 px-8 md:px-16 lg:px-24">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row justify-between items-start gap-16 mb-32">
          <div className="md:w-1/2">
            <h2 className="font-['Cormorant_Garamond',serif] text-5xl md:text-7xl mb-8 leading-tight">
              Ready to elevate<br />your drive?
            </h2>
            <button className="flex items-center gap-4 px-8 py-4 bg-[#C4A87A] text-[#1B1A18] hover:bg-[#F7F5EC] transition-colors duration-300 rounded-none group">
              <span className="uppercase tracking-widest text-sm font-medium">Schedule Service</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          <div className="md:w-1/3 grid grid-cols-2 gap-12">
            <div>
              <h4 className="uppercase tracking-[0.2em] text-xs font-semibold text-[#8C9389] mb-6">Service Area</h4>
              <ul className="space-y-3 font-light text-sm text-[#D8D4CC]">
                <li>Los Angeles</li>
                <li>San Francisco</li>
                <li>Miami</li>
                <li>New York</li>
              </ul>
            </div>
            <div>
              <h4 className="uppercase tracking-[0.2em] text-xs font-semibold text-[#8C9389] mb-6">Company</h4>
              <ul className="space-y-3 font-light text-sm text-[#D8D4CC]">
                <li>About Us</li>
                <li>The Team</li>
                <li>FAQ</li>
                <li>Contact</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="max-w-[1440px] mx-auto border-t border-[#2A3F35] pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-light text-[#8C9389] uppercase tracking-wider">
          <div className="font-['Cormorant_Garamond',serif] text-2xl tracking-widest text-[#F7F5EC]">DAPPER</div>
          <div>© 2025 Dapper Automotive Concierge. All Rights Reserved.</div>
        </div>
      </footer>
    </div>
  );
}
