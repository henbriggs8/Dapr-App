import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { User, Service, TimeSlot, Booking } from "@shared/schema";
import { useLocation } from "wouter";
import { Calendar, Clock, ChevronRight, ArrowLeft } from "lucide-react";
import { CarWashSpinner } from "@/components/car-wash-spinner";
import { useState } from "react";
import BookingDialog from "@/components/booking-dialog";
import { EnhancedServiceSelection } from "@/components/enhanced-service-selection";
import { OnboardingButton } from "@/components/onboarding-button";
import QuickRebook from "@/components/quick-rebook";

export default function BookingScreen() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [selectedTimeSlotId, setSelectedTimeSlotId] = useState<number | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [, setLocation] = useLocation();

  const { data: providers, isLoading: providersLoading } = useQuery<User[]>({
    queryKey: ["/api/providers"],
  });
  const { data: services, isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
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

  const handleServiceSelect = (service: Service) => {
    setSelectedServiceId(service.id);
  };

  const handleTimeSlotSelect = (timeSlot: TimeSlot) => {
    setSelectedTimeSlotId(timeSlot.id);
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
        <EnhancedServiceSelection
          services={services || []}
          selectedServiceId={selectedServiceId}
          onServiceSelect={handleServiceSelect}
          onBookNow={() => {
            if (selectedServiceId && !selectedTimeSlotId) {
              const slots = getAvailableTimeSlots();
              if (slots.length > 0) {
                setSelectedTimeSlotId(slots[0].id);
                setBookingOpen(true);
              }
            } else if (selectedServiceId && selectedTimeSlotId) {
              setBookingOpen(true);
            }
          }}
        />
      </div>

      {/* Time Selection */}
      {selectedServiceId && (
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-gray-500 tracking-widest uppercase">Select Time</h2>
            <button
              onClick={() => {
                if (selectedDate === today) {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  setSelectedDate(tomorrow.toISOString().split("T")[0]);
                } else {
                  setSelectedDate(today);
                }
              }}
              className="text-xs text-[#8c52ff] font-medium"
            >
              {selectedDate === today ? "Schedule for later" : "Back to today"}
            </button>
          </div>

          {/* Date picker strip */}
          {selectedDate !== today && (
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
          )}

          {/* Time slot rows */}
          <div className="border-t border-gray-200">
            {getAvailableTimeSlots().length === 0 ? (
              <div className="py-12 text-center">
                <Calendar className="h-8 w-8 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 text-sm">
                  No slots available for {selectedDate === today ? "today" : "this date"}
                </p>
                {selectedDate === today && (
                  <button
                    onClick={() => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      setSelectedDate(tomorrow.toISOString().split("T")[0]);
                    }}
                    className="mt-3 text-sm font-medium text-[#8c52ff] underline underline-offset-4"
                  >
                    Try tomorrow
                  </button>
                )}
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
                    className="w-full flex items-center justify-between py-5 border-b border-gray-200"
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
