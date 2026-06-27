import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Booking, Service, TimeSlot } from "@shared/schema";
import { Calendar, Clock, MessageSquare, ChevronRight, Star, X, HelpCircle } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";


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

  const { toast } = useToast();

  const cancelMutation = useMutation({
    mutationFn: (bookingId: number) => apiRequest("PATCH", `/api/bookings/${bookingId}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({ title: "Booking cancelled" });
    },
    onError: (err: any) => {
      const msg = err?.message || "";
      if (msg.includes("2 hours")) {
        toast({ title: "Cannot cancel", description: "Please contact support for bookings within 2 hours.", variant: "destructive" });
      } else {
        toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
      }
    },
  });

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
        <p className="text-xs font-semibold text-gray-500 tracking-widest uppercase mb-1">Dapr</p>
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
                const needsRating = booking.status === "completed" && !booking.rating;
                return (
                  <div key={booking.id} className="border-b border-gray-200">
                    {/* Rate your experience banner */}
                    {needsRating && (
                      <button
                        onClick={() => setLocation(`/review/${booking.id}`)}
                        className="w-full flex items-center justify-between px-3 py-2.5 bg-[#f3eeff] rounded-xl my-2 active:opacity-80 transition"
                      >
                        <div className="flex items-center gap-2">
                          <Icon icon={Star} size="xs" style={{ color: "#8c52ff" }} />
                          <span className="text-[12px] font-semibold text-[#8c52ff]">Rate your experience</span>
                        </div>
                        <Icon icon={ChevronRight} size="xs" style={{ color: "#8c52ff" }} />
                      </button>
                    )}
                    <div
                      className="flex items-center justify-between py-5 cursor-pointer"
                      onClick={() => setLocation(`/booking-details/${booking.id}`)}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-1.5 rounded-full w-2 h-2 shrink-0 ${statusColors[booking.status] || "bg-gray-300"}`}
                        />
                        <div>
                          <h3 className="text-base font-medium text-black">{service?.name || "Service"}</h3>
                          <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                            <Icon icon={Calendar} size="xs" />
                            {timeSlot ? formatDate(timeSlot.date) : "—"}
                            {timeSlot && (
                              <>
                                <span className="mx-0.5">·</span>
                                <Icon icon={Clock} size="xs" />
                                {timeSlot.startTime}
                              </>
                            )}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5 capitalize">
                            {booking.status.replace("_", " ")}
                            {booking.rating && (
                              <span className="ml-2 text-[#8c52ff]">
                                {"★".repeat(booking.rating)}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <Icon icon={ChevronRight} size="md" className="text-[#8c52ff] shrink-0" />
                    </div>
                    {/* Cancel + Get Help CTAs for actionable bookings */}
                    {(booking.status === "pending" || booking.status === "confirmed") && (
                      <div className="flex gap-2 pb-3">
                        <button
                          onClick={() => setLocation("/faq")}
                          className="flex items-center gap-1.5 text-[12px] font-medium text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 active:opacity-70"
                        >
                          <Icon icon={HelpCircle} size="xs" />
                          Get Help
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm("Cancel this booking?")) {
                              cancelMutation.mutate(booking.id);
                            }
                          }}
                          disabled={cancelMutation.isPending}
                          className="flex items-center gap-1.5 text-[12px] font-medium text-red-500 border border-red-200 rounded-lg px-3 py-1.5 active:opacity-70 disabled:opacity-40"
                        >
                          <Icon icon={X} size="xs" />
                          Cancel
                        </button>
                      </div>
                    )}
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
          <div className="py-16 text-center border-t border-gray-200">
            <p className="text-gray-500 mb-2">No messages yet</p>
            <p className="text-sm text-gray-400">Service updates and notifications will appear here.</p>
          </div>
        </div>
      )}

      {/* Loyalty Tab */}
      {activeTab === "loyalty" && (
        <div className="px-6 pt-6">
          <div className="py-16 text-center border-t border-gray-200">
            <p className="text-gray-500 mb-2">Loyalty rewards coming soon</p>
            <p className="text-sm text-gray-400">Earn points and unlock perks with every wash.</p>
          </div>
        </div>
      )}
    </div>
  );
}
