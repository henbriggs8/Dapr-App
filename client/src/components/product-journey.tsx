import { useEffect, useRef, useState } from "react";

/**
 * "Book → Match → Track" product-story section for the marketing homepage.
 *
 * Desktop: three text stages scroll on the left while a single sticky iPhone
 * on the right cross-fades between real app screenshots as each stage
 * becomes active (IntersectionObserver).
 *
 * Mobile: stages stack vertically, each with its own phone render.
 *
 * Marketing-only — no app logic, no API calls.
 */

type JourneyStage = {
  id: string;
  label: string;
  headline: string;
  copy: string;
  image: string;
  alt: string;
};

const STAGES: JourneyStage[] = [
  {
    id: "book",
    label: "01 — BOOK",
    headline: "Book in a few taps",
    copy: "Set your location, choose your timing, and schedule car care around your day.",
    image: "/product-journey/book.webp",
    alt: "Dapr app screen for choosing service location and time",
  },
  {
    id: "match",
    label: "02 — MATCH",
    headline: "Meet your Dapr Pro",
    copy: "Dapr confirms availability and matches you with a vetted local Pro.",
    image: "/product-journey/match.webp",
    alt: "Dapr app screen matching you with a Dapr Pro",
  },
  {
    id: "track",
    label: "03 — TRACK",
    headline: "Know exactly what's happening",
    copy: "Follow your service from confirmation to arrival to completion.",
    image: "/product-journey/track.webp",
    alt: "Dapr app screen tracking service status from booking to completion",
  },
];

/** All three screenshots are pre-normalized to 720×~1475, so the inner
 *  screen viewport uses that exact ratio — no visible cropping — and the
 *  fixed ratio prevents layout shift while images load. */
const SCREEN_ASPECT = "aspect-[720/1475]";

export function DaprPhoneFrame({
  activeIndex,
  reducedMotion,
  className = "",
}: {
  activeIndex: number;
  reducedMotion: boolean;
  className?: string;
}) {
  return (
    <div
      className={`relative bg-[#1a1a1c] rounded-[2.6rem] p-[9px] shadow-[0_24px_60px_-18px_rgba(0,0,0,0.28)] ${className}`}
      data-testid="phone-frame"
    >
      <div className={`relative ${SCREEN_ASPECT} overflow-hidden rounded-[2rem] bg-[#f4f2ee]`}>
        {STAGES.map((stage, i) => (
          <img
            key={stage.id}
            src={stage.image}
            alt={stage.alt}
            loading="eager"
            className={`absolute inset-0 h-full w-full object-contain ${
              reducedMotion
                ? ""
                : "transition-all duration-[250ms] ease-out"
            } ${
              i === activeIndex
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-1"
            }`}
            data-testid={`phone-screen-${stage.id}`}
          />
        ))}
      </div>
    </div>
  );
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export default function ProductJourneySection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const stageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    // The active stage is whichever step's text block is closest to the
    // vertical center of the viewport — an exact scroll↔screen relationship,
    // throttled to one computation per animation frame.
    let ticking = false;
    const update = () => {
      ticking = false;
      const viewportCenter = window.innerHeight / 2;
      let closest = 0;
      let closestDistance = Infinity;
      stageRefs.current.forEach((el, i) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const distance = Math.abs(rect.top + rect.height / 2 - viewportCenter);
        if (distance < closestDistance) {
          closestDistance = distance;
          closest = i;
        }
      });
      setActiveIndex((prev) => (prev === closest ? prev : closest));
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    update();
    // Capture-phase listener on document: the page scrolls on <body> (the
    // global CSS gives html/body height:100% + overflow-x:hidden), and
    // element scroll events do NOT bubble to window — capture catches
    // scrolling regardless of which container actually scrolls.
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true } as EventListenerOptions);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section id="how-dapr-works" className="bg-[#faf9f6] border-y border-gray-100" data-testid="section-product-journey">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Intro ── */}
        <div className="pt-16 lg:pt-28 pb-10 lg:pb-16 max-w-2xl">
          <div className="text-xs font-semibold tracking-[0.2em] text-[#8c52ff] mb-4">
            HOW DAPR WORKS
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-black mb-4">
            Car care, without the car wash.
          </h2>
          <p className="text-base lg:text-xl text-gray-500 leading-relaxed">
            Book from your phone, get matched with a local Dapr Pro, and follow the service from start to finish.
          </p>
        </div>

        {/* ── Desktop: scrolling stages + sticky phone ── */}
        <div className="hidden lg:grid grid-cols-[44%_56%] gap-16 pb-28">
          <div>
            {STAGES.map((stage, i) => (
              <div
                key={stage.id}
                ref={(el) => { stageRefs.current[i] = el; }}
                data-stage-index={i}
                className="min-h-[80vh] flex flex-col justify-center"
                data-testid={`journey-stage-${stage.id}`}
              >
                <div
                  className={`${reducedMotion ? "" : "transition-all duration-300"} ${
                    i === activeIndex ? "opacity-100" : "opacity-40"
                  }`}
                >
                  <div className="text-xs font-semibold tracking-[0.2em] text-[#8c52ff] mb-5">
                    {stage.label}
                  </div>
                  <h3 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-black mb-5 leading-[1.1]">
                    {stage.headline}
                  </h3>
                  <p className="text-lg xl:text-xl text-gray-500 leading-relaxed max-w-md">
                    {stage.copy}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="relative">
            {/* One persistent phone: the sticky box occupies the full usable
                viewport below the fixed 64px nav and vertically centers the
                phone, so it holds an identical position while all three
                stages scroll past, releasing only when the section ends.
                Width is capped by viewport height so the whole phone always
                fits on screen. */}
            <div className="sticky top-16 h-[calc(100vh-4rem)] self-start flex items-center justify-center">
              <DaprPhoneFrame
                activeIndex={activeIndex}
                reducedMotion={reducedMotion}
                className="w-[min(380px,calc((100vh-140px)*0.46))]"
              />
            </div>
          </div>
        </div>

        {/* ── Mobile / tablet: stacked stages ── */}
        <div className="lg:hidden pb-16 space-y-16">
          {STAGES.map((stage, i) => (
            <div key={stage.id} data-testid={`journey-stage-mobile-${stage.id}`}>
              <div className="text-xs font-semibold tracking-[0.2em] text-[#8c52ff] mb-3">
                {stage.label}
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-black mb-3">
                {stage.headline}
              </h3>
              <p className="text-base sm:text-lg text-gray-500 leading-relaxed mb-6 max-w-md">
                {stage.copy}
              </p>
              <div className="flex justify-center">
                <div className="relative bg-[#1a1a1c] rounded-[2.2rem] p-[7px] shadow-[0_18px_44px_-16px_rgba(0,0,0,0.25)] w-[240px] sm:w-[280px]">
                  <div className={`relative ${SCREEN_ASPECT} overflow-hidden rounded-[1.7rem] bg-[#f4f2ee]`}>
                    <img
                      src={stage.image}
                      alt={stage.alt}
                      loading={i === 0 ? "eager" : "lazy"}
                      className="absolute inset-0 h-full w-full object-cover object-top"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
