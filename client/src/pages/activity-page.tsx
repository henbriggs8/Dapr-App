import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Booking, Service, TimeSlot } from "@shared/schema";
import { Calendar, Clock, Bell, Gift, MessageSquare, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

const notifications = [
  {
    id: 1,
    title: "Booking Reminder",
    message: "Your car wash appointment is tomorrow at 2:00 PM",
    time: "2 hours ago",
    read: false,
    type: "reminder",
  },
  {
    id: 2,
    title: "Service Update",
    message: "Your car wash service has been completed! Rate your experience.",
    time: "1 day ago",
    read: true,
    type: "update",
  },
  {
    id: 3,
    title: "Special Offer",
    message: "Get 15% off your next premium detail this week only!",
    time: "3 days ago",
    read: true,
    type: "promotion",
  },
];

const loyaltyPoints = 750;
const nextRewardAt = 1000;
const loyaltyTier = "Silver";

const loyaltyBenefits = [
  { emoji: "🎁", title: "Free Birthday Detail", description: "One free Basic wash during your birthday month" },
  { emoji: "💰", title: "10% Off Every 5th Wash", description: "Automatic discount applied to qualifying bookings" },
  { emoji: "⚡", title: "Priority Booking", description: "Access to premium time slots before they're released" },
];

const statusColors: Record<string, string> = {
  completed: "bg-black",
  in_progress: "bg-gray-500",
  cancelled: "bg-gray-300",
  confirmed: "bg-gray-400",
};

export default function ActivityPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"bookings" | "messages" | "loyalty">("bookings");

  const { data: bookings, isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
    enabled: !!user,
  });
  const { data: services } = useQuery<Service[]>({ queryKey: ["/api/services"] });
  const { data: timeSlots } = useQuery<TimeSlot[]>({ queryKey: ["/api/timeslots"] });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const tabs = [
    { id: "bookings" as const, label: "Bookings" },
    { id: "messages" as const, label: "Messages" },
    { id: "loyalty" as const, label: "Loyalty" },
  ];

  return (
    <div
      className="min-h-screen bg-white font-sans"
      style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }}
    >
      {/* Header */}
      <div className="pt-14 pb-6 px-6 border-b border-gray-200">
        <p className="text-xs font-semibold text-gray-500 tracking-widest uppercase mb-1">Dapper</p>
        <h1 className="text-3xl font-medium tracking-tight text-black">Activity</h1>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-gray-200 px-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`mr-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-black text-black"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bookings Tab */}
      {activeTab === "bookings" && (
        <div className="px-6 pt-6">
          {bookingsLoading ? (
            <div className="border-t border-gray-200">
              {[1, 2, 3].map((i) => (
                <div key={i} className="py-6 border-b border-gray-200">
                  <div className="h-4 bg-gray-100 rounded w-1/3 mb-2 animate-pulse" />
                  <div className="h-3 bg-gray-100 rounded w-2/3 animate-pulse" />
                </div>
              ))}
            </div>
          ) : bookings && bookings.length > 0 ? (
            <div className="border-t border-gray-200">
              {bookings.map((booking) => {
                const service = services?.find((s) => s.id === booking.serviceId);
                const timeSlot = timeSlots?.find((t) => t.id === booking.timeSlotId);
                return (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between py-5 border-b border-gray-200 cursor-pointer"
                    onClick={() => setLocation(`/booking?id=${booking.id}`)}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-1.5 rounded-full w-2 h-2 shrink-0 ${statusColors[booking.status] || "bg-gray-300"}`}
                      />
                      <div>
                        <h3 className="text-base font-medium text-black">{service?.name || "Service"}</h3>
                        <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {timeSlot ? formatDate(timeSlot.date) : "—"}
                          {timeSlot && (
                            <>
                              <span className="mx-0.5">·</span>
                              <Clock className="h-3 w-3" />
                              {timeSlot.startTime}
                            </>
                          )}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 capitalize">
                          {booking.status.replace("_", " ")}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#8c52ff] shrink-0" />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center border-t border-gray-200">
              <p className="text-gray-500 mb-4">No bookings yet</p>
              <button
                onClick={() => setLocation("/")}
                className="text-sm font-medium text-[#8c52ff] underline underline-offset-4"
              >
                Book a service
              </button>
            </div>
          )}
        </div>
      )}

      {/* Messages Tab */}
      {activeTab === "messages" && (
        <div className="px-6 pt-6">
          <div className="border-t border-gray-200">
            {notifications.map((n) => (
              <div
                key={n.id}
                className="flex items-start gap-4 py-5 border-b border-gray-200"
              >
                <div className="w-2 h-2 rounded-full mt-2 shrink-0 bg-gray-300">
                  {!n.read && <div className="w-2 h-2 rounded-full bg-black" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h3 className={`text-sm font-medium ${!n.read ? "text-black" : "text-gray-600"}`}>
                      {n.title}
                    </h3>
                    <span className="text-xs text-gray-400 ml-3 shrink-0">{n.time}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loyalty Tab */}
      {activeTab === "loyalty" && (
        <div className="px-6 pt-6">
          {/* Points Block */}
          <div className="bg-gray-950 text-white p-6 mb-6">
            <p className="text-xs font-semibold tracking-widest text-white/50 uppercase mb-3">Dapper Rewards</p>
            <div className="flex justify-between items-baseline mb-4">
              <div>
                <span className="text-4xl font-medium">{loyaltyPoints}</span>
                <span className="text-gray-400 text-sm ml-2">pts</span>
              </div>
              <span className="text-sm text-gray-400">{loyaltyTier} Member</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Next reward at {nextRewardAt} points</span>
                <span>{Math.round((loyaltyPoints / nextRewardAt) * 100)}%</span>
              </div>
              <div className="w-full h-1 bg-gray-800 rounded-full">
                <div
                  className="h-1 bg-white rounded-full"
                  style={{ width: `${(loyaltyPoints / nextRewardAt) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Benefits */}
          <h3 className="text-xs font-semibold text-gray-500 tracking-widest uppercase mb-4">Your Benefits</h3>
          <div className="border-t border-gray-200">
            {loyaltyBenefits.map((benefit) => (
              <div key={benefit.title} className="flex items-start gap-4 py-5 border-b border-gray-200">
                <span className="text-xl mt-0.5">{benefit.emoji}</span>
                <div>
                  <h4 className="text-base font-medium text-black">{benefit.title}</h4>
                  <p className="text-sm text-gray-500 mt-0.5">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
