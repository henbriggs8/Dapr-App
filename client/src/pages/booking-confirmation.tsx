import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { CheckCircle, Calendar, Clock, MapPin, Car, CreditCard } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { WalletLogo } from "@/components/wallet-logo";
import { useQuery } from "@tanstack/react-query";
import { Booking, Service, TimeSlot } from "@shared/schema";
import { CarWashSpinner } from "@/components/car-wash-spinner";

function PaymentMethodBadge({ method }: { method: string }) {
  if (method === "apple_pay") {
    return (
      <div className="flex items-center gap-1.5">
        <WalletLogo wallet="apple" className="text-gray-800 shrink-0" />
        <span className="text-sm font-medium text-gray-900">Apple Pay</span>
      </div>
    );
  }
  if (method === "google_pay") {
    return (
      <div className="flex items-center gap-1.5">
        <WalletLogo wallet="google" />
        <span className="text-sm font-medium text-gray-900">Google Pay</span>
      </div>
    );
  }
  if (method === "paypal") {
    return (
      <div className="flex items-center gap-1.5">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-label="PayPal" fill="#003087" className="shrink-0">
          <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.59 3.025-2.566 6.082-8.558 6.082H9.828c-.524 0-.968.383-1.05.9l-1.453 9.204a.641.641 0 0 0 .634.74h4.094c.46 0 .85-.333.92-.788l.038-.197.733-4.648.047-.255a.932.932 0 0 1 .92-.789h.58c3.754 0 6.694-1.524 7.552-5.932.359-1.845.173-3.386-.671-4.03z"/>
        </svg>
        <span className="text-sm font-medium text-gray-900">PayPal</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <Icon icon={CreditCard} size="sm" className="text-gray-400 shrink-0" />
      <span className="text-sm font-medium text-gray-900">Credit / Debit Card</span>
    </div>
  );
}

export default function BookingConfirmation() {
  const [, navigate] = useLocation();
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("card");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("booking") || urlParams.get("bookingId");
    if (id) {
      const numId = parseInt(id);
      setBookingId(numId);
      try {
        const stored = sessionStorage.getItem(`lastPaymentMethod:${numId}`);
        if (stored) setPaymentMethod(stored);
      } catch {}
    }
  }, []);

  const { data: bookings, isLoading: isLoadingBookings } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
    enabled: !!bookingId,
  });

  const { data: services, isLoading: isLoadingServices } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    enabled: !!bookingId,
  });

  const { data: timeSlots, isLoading: isLoadingTimeSlots } = useQuery<TimeSlot[]>({
    queryKey: ["/api/timeslots"],
    enabled: !!bookingId,
  });

  const isLoading = isLoadingBookings || isLoadingServices || isLoadingTimeSlots;

  const booking = bookingId && bookings ? bookings.find(b => b.id === bookingId) : null;
  const service = booking && services ? services.find(s => s.id === booking.serviceId) : null;
  const timeSlot = booking && timeSlots ? timeSlots.find(t => t.id === booking.timeSlotId) : null;

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
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <CarWashSpinner size="lg" showText text="Loading..." />
      </div>
    );
  }

  if (!bookingId) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <p className="text-gray-500 text-sm mb-6 text-center">
          No booking found. Please complete the booking process first.
        </p>
        <button
          onClick={() => navigate("/booking")}
          className="w-full max-w-xs py-3 bg-[#8c52ff] text-white rounded-xl text-sm font-medium"
        >
          Book a Service
        </button>
        <button
          onClick={() => navigate("/")}
          className="mt-3 w-full max-w-xs py-3 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium"
        >
          Return Home
        </button>
      </div>
    );
  }

  if (!booking || !service || !timeSlot) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <p className="text-gray-500 text-sm mb-6 text-center">
          Booking #{bookingId} not found. Please check your booking history.
        </p>
        <button
          onClick={() => navigate("/activity")}
          className="w-full max-w-xs py-3 bg-[#8c52ff] text-white rounded-xl text-sm font-medium"
        >
          View My Bookings
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top confirmation section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8">
        {/* Check icon */}
        <div className="w-16 h-16 rounded-full bg-[#8c52ff]/10 flex items-center justify-center mb-6">
          <Icon icon={CheckCircle} size="xl" className="text-[#8c52ff]" />
        </div>

        {/* Headline */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
          Booking Confirmed
        </h1>
        <p className="text-gray-500 text-sm text-center mb-8">
          Your booking is confirmed. We're now finding a detailer near you.
        </p>

        {/* Matching status pill */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#8c52ff]/30 bg-[#8c52ff]/5 mb-10">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8c52ff] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#8c52ff]" />
          </span>
          <span className="text-[#8c52ff] text-xs font-medium">
            Matching with a detailer in your area...
          </span>
        </div>

        {/* Booking detail rows */}
        <div className="w-full max-w-sm space-y-0 border border-gray-200 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200">
            <Icon icon={Car} size="sm" className="text-gray-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Service</p>
              <p className="text-sm font-medium text-gray-900 truncate">{service.name}</p>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              ${service.price}
            </span>
          </div>

          <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200">
            <Icon icon={Calendar} size="sm" className="text-gray-400 shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Date</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(timeSlot.date)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200">
            <Icon icon={Clock} size="sm" className="text-gray-400 shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Time</p>
              <p className="text-sm font-medium text-gray-900">{formatTime(timeSlot.startTime)}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 px-4 py-4 border-b border-gray-200">
            <Icon icon={MapPin} size="sm" className="text-gray-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Location</p>
              <p className="text-sm font-medium text-gray-900 leading-snug">{booking.serviceLocation}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-4">
            <Icon icon={CreditCard} size="sm" className="text-gray-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Paid with</p>
              <PaymentMethodBadge method={paymentMethod} />
            </div>
          </div>
        </div>

        {/* Add-ons selected */}
        {Array.isArray(booking.addOns) && booking.addOns.length > 0 && (
          <div
            className="w-full max-w-sm mt-4 border border-gray-200 rounded-2xl px-4 py-4"
            data-testid="confirmation-addons"
          >
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Add-ons</p>
            <ul className="space-y-1.5">
              {(booking.addOns as Array<{ id?: string; name?: string; price?: number }>).map((addon, idx) => (
                <li key={addon?.id ?? idx} className="flex items-center justify-between text-sm">
                  <span className="text-gray-900 truncate pr-2">{addon?.name ?? "Add-on"}</span>
                  <span className="text-gray-500 shrink-0">
                    {typeof addon?.price === "number" ? `+$${addon.price}` : ""}
                  </span>
                </li>
              ))}
            </ul>
            {typeof booking.totalPrice === "number" && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-semibold text-gray-900">${booking.totalPrice}</span>
              </div>
            )}
          </div>
        )}

        {/* Booking ID */}
        <p className="mt-4 text-xs text-gray-400">Booking #{booking.id}</p>
      </div>

      {/* Bottom actions */}
      <div className="px-6 pb-10 space-y-3">
        <button
          onClick={() => navigate("/activity")}
          className="w-full py-3.5 bg-[#8c52ff] text-white rounded-xl text-sm font-semibold"
        >
          View My Bookings
        </button>
        <button
          onClick={() => navigate("/")}
          className="w-full py-3.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium"
        >
          Return Home
        </button>
      </div>
    </div>
  );
}
