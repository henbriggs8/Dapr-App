import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { User, Service, TimeSlot, Booking } from "@shared/schema";
import { useLocation, useSearch } from "wouter";
import {
  Calendar,
  Clock,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Zap,
  Users,
  Droplets,
  Sparkles,
  Wand2,
  Crown,
  Check,
  type LucideIcon,
} from "lucide-react";
import { CarWashSpinner } from "@/components/car-wash-spinner";
import { useState, useEffect, useRef } from "react";
import BookingDialog from "@/components/booking-dialog";
import { OnboardingButton } from "@/components/onboarding-button";
import QuickRebook from "@/components/quick-rebook";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";

type BookingMode = "now" | "schedule";

function iconForService(name: string): LucideIcon {
  const n = name.toLowerCase();
  if (n.includes("essential") || n.includes("basic") || n.includes("exterior")) return Droplets;
  if (n.includes("interior")) return Sparkles;
  if (n.includes("refresh") || n.includes("standard") || n.includes("maintenance")) return Wand2;
  if (n.includes("black label") || n.includes("signature") || n.includes("premium")) return Crown;
  return Droplets;
}

type ServiceContent = {
  short: string;
  included: string[];
  bestFor: string[];
  goodToKnow: string[];
};

const SERVICE_CONTENT: Record<string, ServiceContent> = {
  "essential wash": {
    short: "Hand wash, spray wax, vacuum, quick interior wipe-down",
    included: [
      "Gentle hand wash",
      "Quick spray wax for added shine",
      "Wheel face rinse",
      "Tire wipe",
      "Interior vacuum",
      "Light wipe-down of main interior surfaces",
      "Windows cleaned",
    ],
    bestFor: [
      "Weekly or bi-weekly maintenance",
      "Vehicles already in fairly good shape",
      "Keeping your car clean between deeper details",
    ],
    goodToKnow: [
      "Does not include deep stain removal, seat shampooing, or heavy interior restoration",
      "Best suited for lightly soiled vehicles",
    ],
  },
  "interior detail": {
    short: "Full vacuum, surface cleaning, seat cleaning, light stain treatment",
    included: [
      "Full interior vacuum",
      "Dash, console, door panels, and cup holder cleaning",
      "Seat cleaning",
      "Chemical treatment on interior surfaces",
      "Light stain treatment",
      "Crevice and touchpoint cleaning",
      "Interior windows cleaned",
    ],
    bestFor: [
      "Vehicles with built-up dust, crumbs, spills, or everyday mess",
      "Families, commuters, and work vehicles needing an interior reset",
    ],
    goodToKnow: [
      "Light stain treatment is included, but severe staining, pet hair, or bio messes may require additional time or add-ons",
      "Exterior wash is not the main focus of this package unless otherwise noted",
    ],
  },
  "refresh detail": {
    short: "Complete interior/exterior refresh with upgraded wheels and tire shine",
    included: [
      "Everything in Essential Wash",
      "Everything in Interior Detail",
      "More thorough wheel cleaning",
      "Tire shine",
      "Full inside-and-out refresh",
    ],
    bestFor: [
      "Customers wanting a full reset without stepping into a premium signature package",
      "Great for monthly upkeep or preparing a vehicle for sale",
    ],
    goodToKnow: [
      "Designed as a strong all-around maintenance detail",
      "Deep correction services, extraction, or heavy restoration may require a higher-tier package",
    ],
  },
};

function ExpandedSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="pt-4">
      <p className="text-[10px] font-semibold tracking-widest text-[#999] uppercase mb-2">{title}</p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-[13px] text-[#444] leading-snug">
            <Check className="h-3.5 w-3.5 text-[#8c52ff] mt-[3px] shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function getArrivalWindows() {
  const now = new Date();
  const asapStart = new Date(now.getTime() + 35 * 60000);
  const asapEnd = new Date(now.getTime() + 50 * 60000);
  const nextStart = new Date(now.getTime() + 50 * 60000);
  const nextEnd = new Date(now.getTime() + 65 * 60000);

  const fmt = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

  const laterBase = new Date(now);
  laterBase.setHours(now.getHours() + 2, 0, 0, 0);
  const laterEnd = new Date(laterBase.getTime() + 60 * 60000);

  return [
    {
      id: "asap",
      label: "Book ASAP",
      subtitle: `Arrives ${fmt(asapStart)} – ${fmt(asapEnd)}`,
      badge: "Most popular",
      primary: true,
    },
    {
      id: "next",
      label: "Next available",
      subtitle: `Arrives ${fmt(nextStart)} – ${fmt(nextEnd)}`,
      badge: null,
      primary: false,
    },
    {
      id: "later",
      label: "Later today",
      subtitle: `${fmt(laterBase)} – ${fmt(laterEnd)}`,
      badge: null,
      primary: false,
    },
  ];
}

// Marketing tier slugs from /services. Each maps to a preferred display name
// (matched case-insensitively against the API's service.name) and a category
// fallback used when no name match exists in the seed data.
const SLUG_PRESELECT: Record<string, { name: string; category: string }> = {
  "essential-wash": { name: "essential wash", category: "basic" },
  "interior-detail": { name: "interior detail", category: "standard" },
  "refresh-detail": { name: "refresh detail", category: "standard" },
  "black-label": { name: "black label", category: "premium" },
};

function resolvePreselectService(slug: string, services: Service[]): Service | undefined {
  const target = SLUG_PRESELECT[slug];
  if (!target) return undefined;
  const byName = services.find((s) => s.name.toLowerCase().includes(target.name));
  if (byName) return byName;
  return services.find((s) => s.category === target.category);
}

export default function BookingScreen() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const preselectAppliedRef = useRef(false);
  const [selectedTimeSlotId, setSelectedTimeSlotId] = useState<number | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingMode, setBookingMode] = useState<BookingMode>("now");
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const whenSectionRef = useRef<HTMLDivElement | null>(null);

  const { data: providers, isLoading: providersLoading } = useQuery<User[]>({
    queryKey: ["/api/providers"],
  });
  const { data: services, isLoading: servicesLoading, isError: servicesError, refetch: refetchServices } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    retry: 2,
  });
  const { data: timeSlots, isLoading: timeSlotsLoading } = useQuery<TimeSlot[]>({
    queryKey: [`/api/timeslots?date=${selectedDate}`, selectedDate],
    enabled: !!selectedDate,
  });
  const { data: bookings, isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
    enabled: !!user,
  });

  const isLoading = providersLoading || servicesLoading || timeSlotsLoading || bookingsLoading;

  // Preselect a tier when arriving with ?service=<slug> from /services
  useEffect(() => {
    if (preselectAppliedRef.current) return;
    if (!services || services.length === 0) return;
    const params = new URLSearchParams(search);
    const slug = params.get("service");
    if (!slug) return;
    const match = resolvePreselectService(slug, services);
    if (!match) return;
    preselectAppliedRef.current = true;
    setSelectedServiceId(match.id);
    setExpandedId(match.id);
    setTimeout(() => {
      whenSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
  }, [services, search]);

  useEffect(() => {
    if (!servicesError) return;
    const isNative = Capacitor.isNativePlatform();
    const apiBase = import.meta.env.VITE_API_BASE_URL || "(not set)";
    const resolvedUrl = isNative ? `${apiBase}/api/services` : "/api/services";
    fetch(resolvedUrl)
      .then(r => setDebugInfo(`native=${isNative} | base=${apiBase} | url=${resolvedUrl} | status=${r.status}`))
      .catch(e => setDebugInfo(`native=${isNative} | base=${apiBase} | url=${resolvedUrl} | err=${e.message}`));
  }, [servicesError]);

  const packages = services?.filter((s) => s.category !== "premium") ?? [];
  const signature = services?.find((s) => s.category === "premium");

  const handlePickService = (service: Service) => {
    setSelectedServiceId(service.id);
    setExpandedId(service.id);
    setTimeout(() => {
      whenSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const handleTimeSlotSelect = (timeSlot: TimeSlot) => {
    setSelectedTimeSlotId(timeSlot.id);
    if (selectedServiceId) setBookingOpen(true);
  };

  const handleNowSelect = () => {
    const slots = getAvailableTimeSlots();
    if (slots.length === 0) {
      toast({
        title: "No slots available today",
        description: "Try scheduling for a later date instead.",
      });
      setBookingMode("schedule");
      return;
    }
    const chosen = slots[0];
    setSelectedTimeSlotId(chosen.id);
    if (selectedServiceId) setBookingOpen(true);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + "T00:00:00");
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    if (date.getTime() === today.getTime()) return "Today";
    if (date.getTime() === tomorrow.getTime()) return "Tomorrow";
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const getDateOptions = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split("T")[0]);
    }
    return dates;
  };

  const getAvailableTimeSlots = () => {
    if (!timeSlots) return [];
    return timeSlots.filter(
      (slot) => slot.date === selectedDate && slot.isAvailable && slot.currentBookings < slot.maxBookings
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen pb-32">
        <CarWashSpinner size="lg" showText text="Loading booking options..." />
      </div>
    );
  }

  const provider = providers?.[0];
  const today = new Date().toISOString().split("T")[0];
  const arrivalWindows = getArrivalWindows();

  return (
    <div
      className="min-h-screen bg-white font-sans"
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

        <div className="md:rounded-2xl md:border md:border-[#ededed] md:shadow-sm md:overflow-hidden md:bg-white">
          {/* Onboarding */}
          <div className="px-5 pt-4">
            <OnboardingButton />
          </div>

          {/* Quick Rebook */}
          {bookings && bookings.length > 0 && (
            <div className="px-5 pt-4">
              <QuickRebook
                userBookings={bookings}
                services={services || []}
                timeSlots={timeSlots || []}
                vehicles={[]}
                provider={provider}
              />
            </div>
          )}

          <div className="h-px bg-[#ededed] mx-5 md:hidden mt-4" />

          {/* Choose Service — accordion */}
          <div className="pt-6 pb-2 md:pt-5">
            <p className="px-5 text-[10px] font-semibold tracking-widest text-[#999] uppercase mb-1">
              Choose Service
            </p>

            {servicesError ? (
              <div className="py-6 px-5 text-center">
                <p className="text-sm text-gray-500 mb-3">Couldn't load services. Check your connection.</p>
                <button
                  onClick={() => refetchServices()}
                  className="text-sm font-semibold text-[#8c52ff] underline underline-offset-2"
                  data-testid="button-retry-services"
                >
                  Try again
                </button>
                {debugInfo && (
                  <div className="mt-5 mx-2 p-3 bg-gray-100 rounded-xl text-left">
                    <p className="text-[10px] font-mono text-gray-700 break-all leading-relaxed">{debugInfo}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="border-t border-[#ededed] mt-3">
                {packages.map((service) => {
                  const Icon = iconForService(service.name);
                  const expanded = expandedId === service.id;
                  const selected = selectedServiceId === service.id;
                  const content = SERVICE_CONTENT[service.name.toLowerCase()];
                  const shortDesc = content?.short ?? service.description;
                  return (
                    <div
                      key={service.id}
                      className={`border-b border-[#ededed] last:border-0 transition-colors ${
                        selected ? "bg-[#faf7ff]" : ""
                      }`}
                      data-testid={`service-${service.id}`}
                    >
                      <button
                        onClick={() => setExpandedId(expanded ? null : service.id)}
                        aria-expanded={expanded}
                        aria-controls={`service-panel-${service.id}`}
                        className="w-full text-left flex items-center px-5 py-4 active:bg-[#fafafa] hover:bg-[#fafafa] transition-colors"
                        data-testid={`service-toggle-${service.id}`}
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mr-4 transition-colors ${
                            selected ? "bg-[#8c52ff] text-white" : "bg-[#f4f0ff] text-[#8c52ff]"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 pr-4 min-w-0">
                          <p className="text-[15px] font-semibold text-[#111] mb-0.5">{service.name}</p>
                          <p className="text-[12px] text-[#888] leading-snug">{shortDesc}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className="text-[15px] font-bold text-[#111]">${service.price}</p>
                            <div className="flex items-center gap-1 justify-end">
                              <Clock className="h-3 w-3 text-[#aaa]" />
                              <p className="text-[11px] text-[#aaa]">{service.duration} min</p>
                            </div>
                          </div>
                          <ChevronDown
                            className={`h-4 w-4 text-[#bbb] transition-transform duration-300 ${
                              expanded ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </button>

                      <div
                        id={`service-panel-${service.id}`}
                        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                        }`}
                        aria-hidden={!expanded}
                      >
                        <div className="overflow-hidden">
                          {content && (
                            <div className="px-5 pl-[76px] pb-5">
                              <div className="border-t border-[#f0f0f0] pt-1">
                                <ExpandedSection title="Included" items={content.included} />
                                <div className="h-px bg-[#f4f4f4] mt-4" />
                                <ExpandedSection title="Best for" items={content.bestFor} />
                                <div className="h-px bg-[#f4f4f4] mt-4" />
                                <ExpandedSection title="Good to know" items={content.goodToKnow} />
                                <button
                                  onClick={() => handlePickService(service)}
                                  className="mt-5 inline-flex items-center gap-1.5 bg-[#111] text-white text-[13px] font-semibold rounded-full px-5 py-2.5 hover:bg-[#000] transition-colors"
                                  data-testid={`book-${service.id}`}
                                >
                                  {selected ? "Selected — choose a time" : `Choose ${service.name}`}
                                  <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!servicesError && packages.length > 0 && (
              <p className="px-5 pt-4 text-[11px] text-[#999] leading-relaxed">
                Final service time and results may vary based on vehicle size and condition. Heavy
                stains, excessive pet hair, or unusually dirty vehicles may require additional time
                or service upgrades.
              </p>
            )}
          </div>

          {/* Signature */}
          {signature && (
            <div className="px-5 pt-5 pb-5 md:pt-4">
              <p className="text-[10px] font-semibold tracking-widest text-[#999] uppercase mb-3">
                Signature
              </p>
              <button
                onClick={() => handlePickService(signature)}
                className={`w-full text-left bg-[#111] rounded-2xl p-5 active:opacity-90 hover:opacity-95 transition ${
                  selectedServiceId === signature.id ? "ring-2 ring-[#8c52ff] ring-offset-2 ring-offset-white" : ""
                }`}
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

          {/* Time / Date selection */}
          {selectedServiceId && (
            <div ref={whenSectionRef} className="px-5 pt-6 border-t border-[#ededed]">
              <h2 className="text-[10px] font-semibold tracking-widest text-[#999] uppercase mb-4">
                When do you want us there?
              </h2>

              <div className="flex bg-gray-100 rounded-full p-1 mb-6">
                <button
                  onClick={() => {
                    setBookingMode("now");
                    setSelectedDate(today);
                  }}
                  className={`flex-1 py-2 text-sm font-semibold rounded-full transition-all ${
                    bookingMode === "now" ? "bg-black text-white shadow-sm" : "text-gray-500"
                  }`}
                  data-testid="mode-now"
                >
                  Now
                </button>
                <button
                  onClick={() => setBookingMode("schedule")}
                  className={`flex-1 py-2 text-sm font-semibold rounded-full transition-all ${
                    bookingMode === "schedule" ? "bg-black text-white shadow-sm" : "text-gray-500"
                  }`}
                  data-testid="mode-schedule"
                >
                  Schedule later
                </button>
              </div>

              {bookingMode === "now" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Users className="h-3.5 w-3.5 text-[#8c52ff]" />
                      <span>2 Detail Pros nearby</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Zap className="h-3.5 w-3.5 text-[#8c52ff]" />
                      <span>Live availability</span>
                    </div>
                  </div>

                  {arrivalWindows.map((window) =>
                    window.primary ? (
                      <button
                        key={window.id}
                        onClick={handleNowSelect}
                        className="w-full rounded-2xl bg-[#8c52ff] p-5 text-left active:opacity-90 transition"
                        data-testid={`window-${window.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Zap className="h-4 w-4 text-white" fill="white" />
                              <span className="text-base font-bold text-white">{window.label}</span>
                            </div>
                            <p className="text-sm text-purple-200">{window.subtitle}</p>
                          </div>
                          {window.badge && (
                            <span className="text-[10px] font-semibold tracking-wide uppercase bg-white/20 text-white px-2.5 py-1 rounded-full">
                              {window.badge}
                            </span>
                          )}
                        </div>
                      </button>
                    ) : (
                      <button
                        key={window.id}
                        onClick={handleNowSelect}
                        className="w-full flex items-center justify-between rounded-2xl border border-gray-200 px-5 py-4 active:bg-gray-50 hover:bg-gray-50 transition"
                        data-testid={`window-${window.id}`}
                      >
                        <div className="text-left">
                          <p className="text-sm font-semibold text-black">{window.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{window.subtitle}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-[#8c52ff] flex-shrink-0" />
                      </button>
                    )
                  )}

                  <p className="text-center text-xs text-gray-400 pt-2">Best for same-day service</p>
                </div>
              )}

              {bookingMode === "schedule" && (
                <div>
                  <div className="flex gap-2 overflow-x-auto pb-3 mb-4 border-b border-gray-200">
                    {getDateOptions().slice(1, 8).map((date) => (
                      <button
                        key={date}
                        onClick={() => setSelectedDate(date)}
                        className={`flex-shrink-0 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                          selectedDate === date
                            ? "border-black text-black"
                            : "border-transparent text-gray-400 hover:text-gray-600"
                        }`}
                        data-testid={`date-${date}`}
                      >
                        {formatDate(date)}
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-gray-200">
                    {getAvailableTimeSlots().length === 0 ? (
                      <div className="py-12 text-center">
                        <Calendar className="h-8 w-8 mx-auto mb-3 text-gray-300" />
                        <p className="text-gray-500 text-sm">No slots available for this date</p>
                      </div>
                    ) : (
                      timeSlots
                        ?.filter(
                          (slot) =>
                            slot.date === selectedDate &&
                            slot.isAvailable &&
                            slot.currentBookings < slot.maxBookings
                        )
                        .map((timeSlot) => (
                          <button
                            key={timeSlot.id}
                            onClick={() => handleTimeSlotSelect(timeSlot)}
                            className="w-full flex items-center justify-between py-5 border-b border-gray-200 active:bg-gray-50 hover:bg-gray-50 transition"
                            data-testid={`slot-${timeSlot.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <span className="text-base font-medium text-black">{formatTime(timeSlot.startTime)}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-gray-400">
                                {timeSlot.maxBookings - timeSlot.currentBookings} spots left
                              </span>
                              <ChevronRight className="w-5 h-5 text-[#8c52ff]" />
                            </div>
                          </button>
                        ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recent Bookings */}
          {user && bookings && bookings.length > 0 && (
            <div className="px-5 pt-6 pb-6 border-t border-[#ededed]">
              <h2 className="text-[10px] font-semibold tracking-widest text-[#999] uppercase mb-4">
                Recent
              </h2>
              <div className="border-t border-gray-200">
                {bookings.slice(0, 3).map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between py-4 border-b border-gray-200">
                    <div>
                      <p className="text-base font-medium text-black capitalize">{booking.priceTier}</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {booking.date} · {booking.time}
                      </p>
                    </div>
                    <span className="text-sm text-gray-400 capitalize">{booking.status}</span>
                  </div>
                ))}
                {bookings.length > 3 && (
                  <button
                    onClick={() => setLocation("/activity")}
                    className="w-full flex items-center justify-between py-5"
                    data-testid="link-all-bookings"
                  >
                    <span className="text-sm text-gray-500">View all bookings</span>
                    <ChevronRight className="w-5 h-5 text-[#8c52ff]" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {bookingOpen && selectedServiceId && selectedTimeSlotId && (() => {
        const selectedSlot = timeSlots?.find((s) => s.id === selectedTimeSlotId);
        return (
          <BookingDialog
            open={bookingOpen}
            onClose={() => setBookingOpen(false)}
            provider={provider}
            serviceId={selectedServiceId}
            timeSlotId={selectedTimeSlotId}
            timeSlot={selectedSlot}
          />
        );
      })()}
    </div>
  );
}
