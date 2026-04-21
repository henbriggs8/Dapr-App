import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { User, Service, TimeSlot, Booking } from "@shared/schema";
import { useLocation } from "wouter";
import { Calendar, Clock, ChevronRight, ArrowLeft, Zap, Users } from "lucide-react";
import { CarWashSpinner } from "@/components/car-wash-spinner";
import { useState, useEffect } from "react";
import BookingDialog from "@/components/booking-dialog";
import { EnhancedServiceSelection } from "@/components/enhanced-service-selection";
import { OnboardingButton } from "@/components/onboarding-button";
import QuickRebook from "@/components/quick-rebook";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";

type BookingMode = "now" | "schedule";

function getArrivalWindows() {
  const now = new Date();
  const asapStart = new Date(now.getTime() + 35 * 60000);
  const asapEnd = new Date(now.getTime() + 50 * 60000);
  const nextStart = new Date(now.getTime() + 50 * 60000);
  const nextEnd = new Date(now.getTime() + 65 * 60000);

  const fmt = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

  // "Later today" = next even hour + 2h from now
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

export default function BookingScreen() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [selectedTimeSlotId, setSelectedTimeSlotId] = useState<number | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingMode, setBookingMode] = useState<BookingMode>("now");
  const [, setLocation] = useLocation();

  const [debugInfo, setDebugInfo] = useState<string | null>(null);

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

  useEffect(() => {
    if (!servicesError) return;
    const isNative = Capacitor.isNativePlatform();
    const apiBase = import.meta.env.VITE_API_BASE_URL || "(not set)";
    const resolvedUrl = isNative ? `${apiBase}/api/services` : "/api/services";
    fetch(resolvedUrl)
      .then(r => setDebugInfo(`native=${isNative} | base=${apiBase} | url=${resolvedUrl} | status=${r.status}`))
      .catch(e => setDebugInfo(`native=${isNative} | base=${apiBase} | url=${resolvedUrl} | err=${e.message}`));
  }, [servicesError]);

  const handleServiceSelect = (service: Service) => {
    setSelectedServiceId(service.id);
  };

  const handleTimeSlotSelect = (timeSlot: TimeSlot) => {
    setSelectedTimeSlotId(timeSlot.id);
    if (selectedServiceId && providers && providers.length > 0) {
      setBookingOpen(true);
    }
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
    setSelectedTimeSlotId(slots[0].id);
    if (selectedServiceId && providers && providers.length > 0) {
      setBookingOpen(true);
    }
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
      {/* Header */}
      <div className="pt-14 pb-6 px-6 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => setLocation("/")}
            className="text-gray-400 hover:text-black transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <p className="text-xs font-semibold text-gray-500 tracking-widest uppercase">Dapper</p>
        </div>
        <h1 className="text-3xl font-medium tracking-tight text-black">Book a Service</h1>
      </div>

      {/* Onboarding */}
      <div className="px-6 pt-4">
        <OnboardingButton />
      </div>

      {/* Quick Rebook */}
      {bookings && bookings.length > 0 && (
        <div className="px-6 pt-4">
          <QuickRebook
            userBookings={bookings}
            services={services || []}
            timeSlots={timeSlots || []}
            vehicles={[]}
            provider={provider}
          />
        </div>
      )}

      {/* Service Selection */}
      <div className="px-6 pt-6">
        <h2 className="text-xs font-semibold text-gray-500 tracking-widest uppercase mb-4">Choose Service</h2>
        {servicesError ? (
          <div className="py-6 text-center">
            <p className="text-sm text-gray-500 mb-3">Couldn't load services. Check your connection.</p>
            <button
              onClick={() => refetchServices()}
              className="text-sm font-semibold text-[#8c52ff] underline underline-offset-2"
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
          <EnhancedServiceSelection
            services={services || []}
            selectedServiceId={selectedServiceId}
            onServiceSelect={handleServiceSelect}
            onBookNow={() => {
              if (selectedServiceId) handleNowSelect();
            }}
          />
        )}
      </div>

      {/* Time Selection */}
      {selectedServiceId && (
        <div className="px-6 pt-6">
          {/* Section label */}
          <h2 className="text-xs font-semibold text-gray-500 tracking-widest uppercase mb-4">
            When do you want us there?
          </h2>

          {/* Now / Schedule later toggle */}
          <div className="flex bg-gray-100 rounded-full p-1 mb-6">
            <button
              onClick={() => {
                setBookingMode("now");
                setSelectedDate(today);
              }}
              className={`flex-1 py-2 text-sm font-semibold rounded-full transition-all ${
                bookingMode === "now"
                  ? "bg-black text-white shadow-sm"
                  : "text-gray-500"
              }`}
            >
              Now
            </button>
            <button
              onClick={() => setBookingMode("schedule")}
              className={`flex-1 py-2 text-sm font-semibold rounded-full transition-all ${
                bookingMode === "schedule"
                  ? "bg-black text-white shadow-sm"
                  : "text-gray-500"
              }`}
            >
              Schedule later
            </button>
          </div>

          {/* ── NOW MODE ─────────────────────────────────────────────── */}
          {bookingMode === "now" && (
            <div className="space-y-3">
              {/* Trust signals */}
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
                  /* Primary ASAP card */
                  <button
                    key={window.id}
                    onClick={handleNowSelect}
                    className="w-full rounded-2xl bg-[#8c52ff] p-5 text-left active:opacity-90 transition"
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
                  /* Secondary options */
                  <button
                    key={window.id}
                    onClick={handleNowSelect}
                    className="w-full flex items-center justify-between rounded-2xl border border-gray-200 px-5 py-4 active:bg-gray-50 transition"
                  >
                    <div className="text-left">
                      <p className="text-sm font-semibold text-black">{window.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{window.subtitle}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-[#8c52ff] flex-shrink-0" />
                  </button>
                )
              )}

              {/* Best for note */}
              <p className="text-center text-xs text-gray-400 pt-2">Best for same-day service</p>
            </div>
          )}

          {/* ── SCHEDULE LATER MODE ──────────────────────────────────── */}
          {bookingMode === "schedule" && (
            <div>
              {/* Date picker strip */}
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
                  >
                    {formatDate(date)}
                  </button>
                ))}
              </div>

              {/* Time slot rows */}
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
                        className="w-full flex items-center justify-between py-5 border-b border-gray-200 active:bg-gray-50 transition"
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
        <div className="px-6 pt-6">
          <h2 className="text-xs font-semibold text-gray-500 tracking-widest uppercase mb-4">Recent</h2>
          <div className="border-t border-gray-200">
            {bookings.slice(0, 3).map((booking) => (
              <div key={booking.id} className="flex items-center justify-between py-5 border-b border-gray-200">
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
              >
                <span className="text-sm text-gray-500">View all bookings</span>
                <ChevronRight className="w-5 h-5 text-[#8c52ff]" />
              </button>
            )}
          </div>
        </div>
      )}

      {bookingOpen && selectedServiceId && selectedTimeSlotId && provider && (
        <BookingDialog
          open={bookingOpen}
          onClose={() => setBookingOpen(false)}
          provider={provider}
          serviceId={selectedServiceId}
          timeSlotId={selectedTimeSlotId}
        />
      )}
    </div>
  );
}
