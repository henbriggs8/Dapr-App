import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CarWashSpinner } from "@/components/car-wash-spinner";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User, Booking } from "@shared/schema";
import { 
  MapPin, 
  Clock, 
  DollarSign, 
  Star, 
  Car, 
  CheckCircle, 
  XCircle, 
  Play, 
  Square as StopIcon,
  Navigation,
  ChevronRight,
} from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { useState, useEffect, useRef } from "react";
import { ProviderProfileTab } from "@/components/provider-profile-tab";
import { TimeAdjustmentPanel } from "@/components/time-adjustment-panel";
import PhotoUploadPanel from "@/components/photo-upload-panel";

interface ProviderEarnings {
  totalEarnings: number;
  completedServices: number;
  averageRating: number;
  serviceTypeBreakdown: { [key: string]: number };
}

interface ProviderMetrics {
  averageDuration: { [key: string]: number };
  totalServiceTime: number;
}

type Tab = "jobs" | "available" | "earnings" | "metrics" | "profile";

export default function ProviderDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(user?.currentStatus === 'online');
  const [activeTab, setActiveTab] = useState<Tab>("jobs");
  const [confirmCompleteId, setConfirmCompleteId] = useState<number | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const isCompletingRef = useRef(false);

  // Fetch active bookings
  const { data: activeBookings = [], isLoading: isLoadingBookings, refetch: refetchBookings } = useQuery<Booking[]>({
    queryKey: ['/api/provider/active-bookings'],
  });

  // Fetch available jobs (within 15 miles) — poll every 10 s so new bookings appear automatically
  const { data: availableJobs = [], isLoading: isLoadingJobs, refetch: refetchJobs } = useQuery<(Booking & { distance: number | null })[]>({
    queryKey: ['/api/provider/available-jobs'],
    refetchInterval: 10000,
    staleTime: 0,
  });

  // Accept job mutation
  const acceptJobMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      const res = await apiRequest("POST", `/api/provider/accept-job/${bookingId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Job Accepted",
        description: "You have successfully accepted this job!",
      });
      refetchJobs();
      refetchBookings();
      queryClient.invalidateQueries({ queryKey: ['/api/provider/active-bookings'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reject job mutation
  const rejectJobMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      const res = await apiRequest("POST", `/api/provider/reject-job/${bookingId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Job Rejected",
        description: "Job has been removed from your available jobs.",
      });
      refetchJobs();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fetch provider earnings
  const { data: earnings, isLoading: isLoadingEarnings } = useQuery<ProviderEarnings>({
    queryKey: ['/api/provider/earnings'],
  });

  // Fetch provider metrics
  const { data: metricsData, isLoading: isLoadingMetrics } = useQuery<ProviderMetrics>({
    queryKey: ['/api/provider/metrics'],
  });

  // Update provider status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await apiRequest("PATCH", "/api/provider/status", { status });
      return await res.json();
    },
    onSuccess: (updatedUser: User) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      setIsOnline(updatedUser.currentStatus === 'online');
      toast({
        title: "Status updated",
        description: `You are now ${updatedUser.currentStatus}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update location mutation
  const updateLocationMutation = useMutation({
    mutationFn: async () => {
      if (!navigator.geolocation) {
        throw new Error("Geolocation is not supported");
      }

      return new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          (error) => reject(new Error("Failed to get location")),
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });
    },
    onSuccess: async (location) => {
      const res = await apiRequest("PATCH", "/api/provider/location", location);
      const updatedUser = await res.json();
      queryClient.setQueryData(["/api/user"], updatedUser);
      toast({
        title: "Location updated",
        description: "Your location has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update location",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Accept booking mutation
  const acceptBookingMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      const res = await apiRequest("POST", `/api/bookings/${bookingId}/accept`);
      return await res.json();
    },
    onSuccess: (updatedBooking: Booking) => {
      queryClient.invalidateQueries({ queryKey: ['/api/provider/active-bookings'] });
      toast({
        title: "Booking accepted",
        description: "You have successfully accepted the booking",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to accept booking",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reject booking mutation
  const rejectBookingMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      const res = await apiRequest("POST", `/api/bookings/${bookingId}/reject`);
      return await res.json();
    },
    onSuccess: (booking: Booking) => {
      queryClient.invalidateQueries({ queryKey: ['/api/provider/active-bookings'] });
      toast({
        title: "Booking rejected",
        description: "The booking has been rejected",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reject booking",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Start service mutation
  const startServiceMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      const res = await apiRequest("POST", `/api/bookings/${bookingId}/start`);
      return await res.json();
    },
    onSuccess: (booking: Booking) => {
      queryClient.invalidateQueries({ queryKey: ['/api/provider/active-bookings'] });
      toast({
        title: "Service started",
        description: "Timer has been started for this service",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start service",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Complete service mutation
  const completeServiceMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      const res = await apiRequest("POST", `/api/bookings/${bookingId}/complete`);
      return await res.json();
    },
    onSuccess: (booking: Booking) => {
      queryClient.invalidateQueries({ queryKey: ['/api/provider/active-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/provider/earnings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/provider/metrics'] });
      toast({
        title: "Service completed",
        description: "The service has been marked as completed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to complete service",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      isCompletingRef.current = false;
      setIsCompleting(false);
    },
  });

  // Mark arrived mutation
  const markArrivedMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      const res = await apiRequest("POST", `/api/bookings/${bookingId}/arrive`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/provider/active-bookings'] });
      toast({ title: "Arrival confirmed", description: "The customer has been notified you've arrived." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to mark arrival", description: error.message, variant: "destructive" });
    },
  });

  // Auto-broadcast GPS location every 20 s for each active booking
  const gpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    const activeJobs = activeBookings.filter(b =>
      b.status === 'assigned' || b.status === 'in_progress'
    );
    if (activeJobs.length === 0) {
      if (gpsIntervalRef.current) { clearInterval(gpsIntervalRef.current); gpsIntervalRef.current = null; }
      return;
    }
    const sendLocation = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        activeJobs.forEach((booking) => {
          apiRequest("POST", `/api/provider/location/booking/${booking.id}`, { latitude, longitude }).catch(() => {});
        });
      }, () => {}, { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 });
    };
    sendLocation();
    gpsIntervalRef.current = setInterval(sendLocation, 20000);
    return () => { if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current); };
  }, [activeBookings]);

  const handleStatusToggle = (checked: boolean) => {
    const newStatus = checked ? 'online' : 'offline';
    updateStatusMutation.mutate(newStatus);
  };

  const updateBookingStage = (booking: Booking, stage: string) => {
    // Implementation for updating booking stage
  };

  const cancelBooking = (booking: Booking) => {
    // Implementation for canceling booking
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatCategory = (category: string) => {
    return category.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending_assignment':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'assigned':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <CarWashSpinner size="lg" showText text="Loading..." />
      </div>
    );
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "jobs", label: "Jobs" },
    { key: "available", label: "Available" },
    { key: "earnings", label: "Earnings" },
    { key: "metrics", label: "Stats" },
    { key: "profile", label: "Profile" },
  ];

  const statusDot = isOnline
    ? "bg-green-500"
    : "bg-gray-400";

  return (
    <div className="min-h-screen bg-white pb-24">

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="px-6 pt-14 pb-6 border-b border-gray-200">
        <p className="text-xs font-semibold text-gray-500 tracking-widest uppercase mb-1">Dapr Pro</p>
        <h1 className="text-3xl font-medium tracking-tight text-black">
          {user.name || user.username}
        </h1>

        {/* Status + Location row */}
        <div className="flex items-center justify-between mt-4">
          {/* Online/Offline pill toggle */}
          <button
            onClick={() => handleStatusToggle(!isOnline)}
            disabled={updateStatusMutation.isPending}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all ${
              isOnline
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-gray-200 bg-white text-gray-500"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${statusDot}`} />
            {updateStatusMutation.isPending ? "Updating..." : isOnline ? "Online" : "Offline"}
          </button>

          {/* Update location */}
          <button
            onClick={() => updateLocationMutation.mutate()}
            disabled={updateLocationMutation.isPending}
            className="flex items-center gap-1.5 text-sm text-[#8c52ff] font-medium"
          >
            <Icon icon={Navigation} size="sm" />
            {updateLocationMutation.isPending ? "Locating..." : "Update location"}
          </button>
        </div>
      </div>

      {/* ── Stats bar ─────────────────────────────────────────── */}
      <div className="bg-gray-950 text-white px-6 py-5 grid grid-cols-3 divide-x divide-gray-800">
        <div className="pr-4">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Earnings</p>
          <p className="text-xl font-semibold">{earnings ? formatPrice(earnings.totalEarnings) : "—"}</p>
        </div>
        <div className="px-4">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Completed</p>
          <p className="text-xl font-semibold">{earnings?.completedServices ?? "—"}</p>
        </div>
        <div className="pl-4">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Rating</p>
          <p className="text-xl font-semibold">
            {earnings?.averageRating ? earnings.averageRating.toFixed(1) : "—"}
          </p>
        </div>
      </div>

      {/* ── Tab bar ───────────────────────────────────────────── */}
      <div className="flex border-b border-gray-200 px-4 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-shrink-0 px-4 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-[#8c52ff] text-[#8c52ff]"
                : "border-transparent text-gray-500 hover:text-black"
            }`}
          >
            {tab.label}
            {tab.key === "available" && availableJobs.length > 0 && (
              <span className="ml-1.5 text-xs bg-[#8c52ff] text-white rounded-full px-1.5 py-0.5">
                {availableJobs.length}
              </span>
            )}
            {tab.key === "jobs" && activeBookings.length > 0 && (
              <span className="ml-1.5 text-xs bg-black text-white rounded-full px-1.5 py-0.5">
                {activeBookings.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Active Jobs ───────────────────────────────────────── */}
      {activeTab === "jobs" && (
        <div>
          <div className="px-6 pt-6 pb-2">
            <p className="text-xs font-semibold text-gray-500 tracking-widest uppercase">Active Bookings</p>
          </div>

          {isLoadingBookings ? (
            <div className="flex justify-center py-16">
              <CarWashSpinner size="md" showText text="Loading bookings..." />
            </div>
          ) : activeBookings.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Icon icon={Car} size="xl" className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No active bookings</p>
            </div>
          ) : (
            <div>
              {activeBookings.map((booking, i) => (
                <div key={booking.id} className={`px-6 py-5 ${i < activeBookings.length - 1 ? "border-b border-gray-200" : ""}`}>
                  {/* Status + ID */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        booking.status === 'in_progress' ? 'bg-green-500' :
                        booking.status === 'assigned' ? 'bg-[#8c52ff]' :
                        booking.status === 'pending_assignment' ? 'bg-yellow-400' : 'bg-gray-300'
                      }`} />
                      <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                        {booking.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-medium text-[#8c52ff]">
                      {(booking as any).bookingRef || `#${booking.id}`}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="space-y-1 mb-4">
                    <div className="flex items-start gap-2">
                      <Icon icon={MapPin} size="xs" className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-black leading-snug">{booking.serviceLocation}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Icon icon={Clock} size="xs" className="text-gray-400 flex-shrink-0" />
                      <p className="text-sm text-gray-500">
                        {booking.date} at {booking.time}
                        {booking.serviceDuration ? ` · ${booking.serviceDuration} min` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Icon icon={DollarSign} size="xs" className="text-gray-400 flex-shrink-0" />
                      <p className="text-sm font-semibold text-black">{formatPrice(booking.totalPrice || 0)}</p>
                    </div>
                  </div>

                  {/* Add-ons selected by the customer (job-sheet line items) */}
                  {Array.isArray(booking.addOns) && booking.addOns.length > 0 && (
                    <div
                      className="mb-4 rounded-lg bg-[#faf7ff] border border-[#ece1ff] px-3 py-2"
                      data-testid={`booking-addons-${booking.id}`}
                    >
                      <p className="text-[10px] font-semibold tracking-widest text-[#8c52ff] uppercase mb-1.5">
                        Add-ons
                      </p>
                      <ul className="space-y-1">
                        {(booking.addOns as Array<{ id?: string; name?: string; price?: number; durationMinutes?: number }>).map((addon, idx) => (
                          <li
                            key={addon?.id ?? idx}
                            className="flex items-center justify-between text-xs text-[#333]"
                          >
                            <span className="truncate pr-2">{addon?.name ?? "Add-on"}</span>
                            <span className="text-[#666] shrink-0">
                              {typeof addon?.durationMinutes === "number" ? `+${addon.durationMinutes} min · ` : ""}
                              {typeof addon?.price === "number" ? `+$${addon.price}` : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Action buttons */}
                  {booking.status === 'pending_assignment' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => acceptBookingMutation.mutate(booking.id)}
                        disabled={acceptBookingMutation.isPending}
                        className="flex-1 py-2.5 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-50"
                      >
                        <Icon icon={CheckCircle} size="sm" className="inline mr-1.5" />
                        Accept
                      </button>
                      <button
                        onClick={() => rejectBookingMutation.mutate(booking.id)}
                        disabled={rejectBookingMutation.isPending}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-black text-sm font-medium"
                      >
                        <Icon icon={XCircle} size="sm" className="inline mr-1.5 text-gray-400" />
                        Decline
                      </button>
                    </div>
                  )}

                  {booking.status === 'assigned' && (
                    <div className="flex gap-2">
                      {!(booking as any).arrivalTime && (
                        <button
                          onClick={() => markArrivedMutation.mutate(booking.id)}
                          disabled={markArrivedMutation.isPending}
                          className="flex-1 py-2.5 rounded-xl bg-[#8c52ff] text-white text-sm font-medium disabled:opacity-60"
                        >
                          <Icon icon={MapPin} size="sm" className="inline mr-1.5" />
                          {markArrivedMutation.isPending ? "Confirming..." : "I've Arrived"}
                        </button>
                      )}
                      <button
                        onClick={() => startServiceMutation.mutate(booking.id)}
                        disabled={startServiceMutation.isPending}
                        className="flex-1 py-2.5 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-50"
                      >
                        <Icon icon={Play} size="sm" className="inline mr-1.5" />
                        Start Service
                      </button>
                    </div>
                  )}

                  {booking.status === 'in_progress' && (
                    confirmCompleteId === booking.id ? (
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
                        <p className="text-sm text-gray-700 text-center font-medium">Is the service finished?</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setConfirmCompleteId(null)}
                            className="flex-1 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              if (isCompletingRef.current) return;
                              isCompletingRef.current = true;
                              setIsCompleting(true);
                              setConfirmCompleteId(null);
                              completeServiceMutation.mutate(booking.id);
                            }}
                            disabled={completeServiceMutation.isPending || isCompleting}
                            className="flex-1 py-2 rounded-lg bg-black text-white text-sm font-medium disabled:opacity-50"
                          >
                            <Icon icon={CheckCircle} size="sm" className="inline mr-1.5" />
                            Yes, Complete
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmCompleteId(booking.id)}
                        disabled={completeServiceMutation.isPending}
                        className="w-full py-2.5 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-50"
                      >
                        <Icon icon={StopIcon} size="sm" className="inline mr-1.5" />
                        Mark Complete
                      </button>
                    )
                  )}

                  {/* Time adjustment panel */}
                  {(booking as any).arrivalTime && (
                    <TimeAdjustmentPanel
                      bookingId={booking.id}
                      baseDurationMinutes={(booking as any).estimatedDurationMinutes || 60}
                      arrivalTime={(booking as any).arrivalTime}
                      initialAdjustments={(booking as any).timeAdjustments || undefined}
                      initialNotes={(booking as any).providerNotes || ""}
                      estimatedCompletionTime={(booking as any).estimatedCompletionTime}
                      onUpdated={() => queryClient.invalidateQueries({ queryKey: ['/api/provider/active-bookings'] })}
                    />
                  )}

                  {/* Photo upload panel — shown after arrival */}
                  {(booking as any).arrivalTime && (
                    <PhotoUploadPanel bookingId={booking.id} status={booking.status} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Available Jobs ────────────────────────────────────── */}
      {activeTab === "available" && (
        <div>
          <div className="px-6 pt-6 pb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 tracking-widest uppercase">Available Jobs</p>
            <button
              onClick={() => refetchJobs()}
              className="text-xs text-[#8c52ff] font-medium"
            >
              Refresh
            </button>
          </div>

          {isLoadingJobs ? (
            <div className="flex justify-center py-16">
              <CarWashSpinner size="md" showText text="Finding jobs..." />
            </div>
          ) : availableJobs.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Icon icon={MapPin} size="xl" className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No jobs available right now</p>
              <p className="text-gray-300 text-xs mt-1">Check back soon or tap Refresh</p>
            </div>
          ) : (
            <div>
              {availableJobs.map((job, i) => (
                <div key={job.id} className={`px-6 py-5 ${i < availableJobs.length - 1 ? "border-b border-gray-200" : ""}`}>
                  {/* Ref + tier + distance */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-gray-100 text-gray-700 rounded-full px-2.5 py-1 font-medium">
                        {formatCategory(job.priceTier)}
                      </span>
                      {job.distance != null && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Icon icon={Navigation} size="xs" />
                          {job.distance} mi away
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono font-medium text-[#8c52ff]">
                      {(job as any).bookingRef || `#${job.id}`}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="space-y-1 mb-4">
                    <div className="flex items-start gap-2">
                      <Icon icon={MapPin} size="xs" className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-black leading-snug">{job.serviceLocation}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Icon icon={Clock} size="xs" className="text-gray-400 flex-shrink-0" />
                      <p className="text-sm text-gray-500">
                        {job.date && job.time ? `${new Date(job.date).toLocaleDateString()} at ${job.time}` : 'Time TBD'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Icon icon={DollarSign} size="xs" className="text-gray-400 flex-shrink-0" />
                      <p className="text-sm font-semibold text-black">{job.totalPrice ? formatPrice(job.totalPrice) : '$0.00'}</p>
                    </div>
                    {job.notes && <p className="text-sm text-gray-500 pl-5">{job.notes}</p>}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptJobMutation.mutate(job.id)}
                      disabled={acceptJobMutation.isPending || rejectJobMutation.isPending}
                      className="flex-1 py-2.5 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-50"
                    >
                      {acceptJobMutation.isPending ? 'Accepting...' : 'Accept Job'}
                    </button>
                    <button
                      onClick={() => rejectJobMutation.mutate(job.id)}
                      disabled={acceptJobMutation.isPending || rejectJobMutation.isPending}
                      className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm font-medium"
                    >
                      Pass
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Earnings ──────────────────────────────────────────── */}
      {activeTab === "earnings" && (
        <div>
          <div className="px-6 pt-6 pb-2">
            <p className="text-xs font-semibold text-gray-500 tracking-widest uppercase">Earnings</p>
          </div>

          {isLoadingEarnings ? (
            <div className="flex justify-center py-16">
              <CarWashSpinner size="md" showText text="Loading earnings..." />
            </div>
          ) : !earnings ? (
            <div className="px-6 py-16 text-center">
              <p className="text-gray-400 text-sm">Complete services to see earnings</p>
            </div>
          ) : (
            <div>
              {/* Total highlight */}
              <div className="px-6 py-6 border-b border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Total earned</p>
                <p className="text-4xl font-semibold text-black">{formatPrice(earnings.totalEarnings)}</p>
              </div>

              {/* Service breakdown */}
              <div className="px-6 pt-4 pb-2">
                <p className="text-xs font-semibold text-gray-500 tracking-widest uppercase">By Service Type</p>
              </div>
              {Object.entries(earnings.serviceTypeBreakdown).map(([type, count], i, arr) => (
                <div key={type} className={`px-6 py-4 flex items-center justify-between ${i < arr.length - 1 ? "border-b border-gray-200" : ""}`}>
                  <span className="text-sm text-black">{formatCategory(type)}</span>
                  <span className="text-sm font-semibold text-[#8c52ff]">{count} services</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Metrics ───────────────────────────────────────────── */}
      {activeTab === "metrics" && (
        <div>
          <div className="px-6 pt-6 pb-2">
            <p className="text-xs font-semibold text-gray-500 tracking-widest uppercase">Performance</p>
          </div>

          {isLoadingMetrics ? (
            <div className="flex justify-center py-16">
              <CarWashSpinner size="md" showText text="Loading stats..." />
            </div>
          ) : !metricsData ? (
            <div className="px-6 py-16 text-center">
              <p className="text-gray-400 text-sm">Complete services to see performance stats</p>
            </div>
          ) : (
            <div>
              {/* Total time highlight */}
              <div className="px-6 py-6 border-b border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Total service time</p>
                <p className="text-4xl font-semibold text-[#8c52ff]">{formatDuration(metricsData.totalServiceTime)}</p>
              </div>

              {/* Duration by service type */}
              <div className="px-6 pt-4 pb-2">
                <p className="text-xs font-semibold text-gray-500 tracking-widest uppercase">Avg Duration by Service</p>
              </div>
              {Object.entries(metricsData.averageDuration).length === 0 ? (
                <p className="px-6 py-4 text-sm text-gray-400">No data yet</p>
              ) : (
                Object.entries(metricsData.averageDuration).map(([category, duration], i, arr) => (
                  <div key={category} className={`px-6 py-4 flex items-center justify-between ${i < arr.length - 1 ? "border-b border-gray-200" : ""}`}>
                    <span className="text-sm text-black">{formatCategory(category)}</span>
                    <span className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                      <Icon icon={Clock} size="xs" className="text-gray-400" />
                      {formatDuration(duration)}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Profile ───────────────────────────────────────────── */}
      {activeTab === "profile" && (
        <ProviderProfileTab />
      )}
    </div>
  );
}