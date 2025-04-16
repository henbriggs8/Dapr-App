import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Booking, User, Service, Vehicle } from "@shared/schema";
import { LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CarWashSpinner } from "@/components/car-wash-spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress"; 
import { Separator } from "@/components/ui/separator";
import { 
  MapPin, CheckCircle, XCircle, Clock, UserCircle, CalendarClock, ArrowRight, 
  PlayCircle, StopCircle, Timer, Coins, BarChart3, Star, ChevronUp, Car, Calendar 
} from "lucide-react";

const serviceStages = [
  { id: "on_the_way", label: "On The Way" },
  { id: "arrival", label: "Arrived" },
  { id: "exterior_washing", label: "Exterior Washing" },
  { id: "interior_cleaning", label: "Interior Cleaning" },
  { id: "finishing", label: "Finishing Touches" },
  { id: "completed", label: "Completed" }
];

// Interface for provider earnings
interface ProviderEarnings {
  totalEarnings: number;
  completedServices: number;
  averageRating: number;
  serviceTypeBreakdown: { [key: string]: number };
}

// Interface for provider service metrics
interface ProviderMetrics {
  averageDuration: { [key: string]: number };
  totalServiceTime: number;
}

export default function ProviderDashboard() {
  const { user, logoutMutation } = useAuth();
  const { status: wsStatus, sendMessage } = useWebSocket();
  const { toast } = useToast();
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [expandedBooking, setExpandedBooking] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("active-bookings");
  const [earningsPeriod, setEarningsPeriod] = useState<"today" | "week" | "month">("month");
  const [locationError, setLocationError] = useState<string>();
  const [bookingsTimeframe, setBookingsTimeframe] = useState<"day" | "week" | "month">("day");
  
  // Fetch active bookings
  const { data: activeBookings, isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/provider/active-bookings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/provider/active-bookings");
      return await res.json();
    },
    enabled: !!user && user.isProvider,
    refetchInterval: 10000 // Refetch every 10 seconds
  });
  
  // Fetch bookings by timeframe
  const { data: timeframeBookings, isLoading: timeframeLoading } = useQuery<Booking[]>({
    queryKey: ["/api/provider/bookings", bookingsTimeframe],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/provider/bookings/${bookingsTimeframe}`);
      return await res.json();
    },
    enabled: !!user && user.isProvider && activeTab === "bookings-history"
  });
  
  // Check for any booking assignments
  const { data: assignmentData, isLoading: assignmentLoading, refetch: refetchAssignments } = useQuery({
    queryKey: ["/api/provider/assignments"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/provider/assignments");
      return await res.json();
    },
    enabled: !!user && user.isProvider && user.currentStatus === "online",
    refetchInterval: 30000 // Check for new assignments every 30 seconds
  });

  // Fetch all services
  const { data: services, isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    enabled: !!user && user.isProvider
  });

  // Fetch all vehicles
  const { data: vehicles, isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
    enabled: !!user && user.isProvider
  });

  // Fetch provider earnings
  const { data: earningsData, isLoading: isLoadingEarnings } = useQuery<ProviderEarnings>({
    queryKey: ["/api/provider/earnings", earningsPeriod],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/provider/earnings?period=${earningsPeriod}`);
      return await res.json();
    },
    enabled: !!user && user.isProvider && activeTab === "earnings"
  });

  // Fetch provider service metrics
  const { data: metricsData, isLoading: isLoadingMetrics } = useQuery<ProviderMetrics>({
    queryKey: ["/api/provider/metrics"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/provider/metrics");
      return await res.json();
    },
    enabled: !!user && user.isProvider && activeTab === "metrics"
  });

  const isLoading = bookingsLoading || servicesLoading || vehiclesLoading;

  // Provider status mutation
  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await apiRequest("POST", "/api/providers/status", { status });
      return await res.json();
    },
    onSuccess: (updatedUser: User) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      toast({
        title: "Status updated",
        description: `You are now ${updatedUser.currentStatus}.`,
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update status",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update booking status mutation
  const updateBookingMutation = useMutation({
    mutationFn: async ({ id, status, stage }: { id: number, status: string, stage?: string }) => {
      const res = await apiRequest("POST", `/api/bookings/${id}/status`, { status, stage });
      return await res.json();
    },
    onSuccess: (updatedBooking: Booking) => {
      queryClient.invalidateQueries({ queryKey: ["/api/provider/active-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      
      // Send notification via WebSocket
      if (wsStatus === "connected") {
        sendMessage({
          type: "booking_update",
          bookingId: updatedBooking.id,
          status: updatedBooking.status,
          stage: updatedBooking.currentStage
        });
      }
      
      toast({
        title: "Booking updated",
        description: `Status changed to ${updatedBooking.status}${updatedBooking.currentStage ? ` (${updatedBooking.currentStage})` : ''}`,
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update booking",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Service timer mutations
  const startServiceMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/bookings/${id}/start`);
      return await res.json();
    },
    onSuccess: (booking: Booking) => {
      queryClient.invalidateQueries({ queryKey: ["/api/provider/active-bookings"] });
      toast({
        title: "Service started",
        description: `Timer started for booking #${booking.id}.`,
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start timer",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const completeServiceMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/bookings/${id}/complete`);
      return await res.json();
    },
    onSuccess: (booking: Booking) => {
      queryClient.invalidateQueries({ queryKey: ["/api/provider/active-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/provider/earnings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/provider/metrics"] });
      
      toast({
        title: "Service completed",
        description: `Service completed in ${booking.serviceDuration} minutes.`,
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to complete service",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Accept booking assignment mutation
  const acceptBookingMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/provider/bookings/${id}/accept`);
      return await res.json();
    },
    onSuccess: (booking: Booking) => {
      queryClient.invalidateQueries({ queryKey: ["/api/provider/assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/provider/active-bookings"] });
      
      toast({
        title: "Booking accepted",
        description: "You've accepted the new booking. It's now in your active bookings.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to accept booking",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Reject booking assignment mutation
  const rejectBookingMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/provider/bookings/${id}/reject`);
      return await res.json();
    },
    onSuccess: (booking: Booking) => {
      queryClient.invalidateQueries({ queryKey: ["/api/provider/assignments"] });
      
      toast({
        title: "Booking rejected",
        description: "You've rejected the booking. It will be offered to another provider.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reject booking",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update provider location
  useEffect(() => {
    if (user?.isProvider && user.currentStatus === 'online') {
      let watchId: number;
      
      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          async (position) => {
            try {
              await apiRequest("POST", "/api/providers/location", {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              });
            } catch (error) {
              console.error('Error updating location:', error);
            }
          },
          (error) => {
            setLocationError(error.message);
            console.error('Geolocation error:', error);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 30000,
            timeout: 27000
          }
        );
      }
      
      return () => {
        if (watchId) {
          navigator.geolocation.clearWatch(watchId);
        }
      };
    }
  }, [user]);

  const updateStatus = (status: string) => {
    statusMutation.mutate(status);
  };

  const updateBookingStage = (booking: Booking, stage: string) => {
    updateBookingMutation.mutate({
      id: booking.id,
      status: stage === 'completed' ? 'completed' : 'in_progress',
      stage
    });
  };

  const cancelBooking = (booking: Booking) => {
    updateBookingMutation.mutate({
      id: booking.id,
      status: 'cancelled'
    });
  };

  const startService = (bookingId: number) => {
    startServiceMutation.mutate(bookingId);
  };

  const completeService = (bookingId: number) => {
    completeServiceMutation.mutate(bookingId);
  };

  // Format date and time for display
  const formatDateTime = (date: string, time: string) => {
    return `${date} at ${time}`;
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100); // Convert cents to dollars
  };

  // Format duration in minutes to hours and minutes
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // Get service name by ID
  const getServiceName = (serviceId: number) => {
    const service = services?.find(s => s.id === serviceId);
    return service?.name || "Unknown";
  };

  // Get vehicle by ID
  const getVehicle = (vehicleId: number | null) => {
    if (!vehicleId) return null;
    return vehicles?.find(v => v.id === vehicleId);
  };

  // Get category name with proper capitalization
  const formatCategory = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <CarWashSpinner size="lg" showText text="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Provider Dashboard</h1>
        <div className="flex items-center gap-4">
          {locationError ? (
            <div className="text-destructive flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location Error: {locationError}
            </div>
          ) : (
            <div className="text-green-600 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location tracking active
            </div>
          )}
          <Badge variant={wsStatus === "connected" ? "default" : "outline"} className={wsStatus === "connected" ? "bg-green-500 hover:bg-green-600" : ""}>
            {wsStatus}
          </Badge>
          <Badge variant={user?.currentStatus === "online" ? "default" : "outline"} className={user?.currentStatus === "online" ? "bg-green-500 hover:bg-green-600" : ""}>
            {user?.currentStatus}
          </Badge>
          <Button 
            variant={user?.currentStatus === "online" ? "outline" : "default"}
            className={user?.currentStatus === "online" ? "" : "bg-[#8c52ff] hover:bg-[#7a45e0]"}
            onClick={() => updateStatus(user?.currentStatus === "online" ? "offline" : "online")}
            disabled={statusMutation.isPending}
          >
            {statusMutation.isPending ? "Updating..." : user?.currentStatus === "online" ? "Go Offline" : "Go Online"}
          </Button>
          <Button 
            variant="outline"
            size="sm"
            className="text-red-500 hover:bg-red-50"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="h-4 w-4 mr-1" />
            {logoutMutation.isPending ? "Logging out..." : "Logout"}
          </Button>
        </div>
      </div>

      {/* Booking Assignment Alert */}
      {assignmentData && 'id' in assignmentData && (
        <Card className="mb-6 bg-amber-50 border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex items-center">
              <Clock className="h-5 w-5 mr-2 text-amber-600" />
              New Booking Assignment
            </CardTitle>
            <CardDescription>
              You have a new booking assignment waiting for your response
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold mb-2">Booking Details</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">Booking ID:</span> #{assignmentData.id}</p>
                    <p><span className="font-medium">Service:</span> {getServiceName(assignmentData.serviceId)}</p>
                    <p><span className="font-medium">Date/Time:</span> {assignmentData.date && assignmentData.time ? 
                      formatDateTime(assignmentData.date, assignmentData.time) : 
                      'As soon as possible'
                    }</p>
                    <p><span className="font-medium">Location:</span> {assignmentData.serviceLocation}</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-2">Vehicle Information</h3>
                  {assignmentData.vehicleId ? (
                    <div className="space-y-2">
                      <p>
                        <Car className="h-4 w-4 inline mr-2 text-muted-foreground" />
                        {getVehicle(assignmentData.vehicleId)?.year} {getVehicle(assignmentData.vehicleId)?.make} {getVehicle(assignmentData.vehicleId)?.model}
                      </p>
                      <p><span className="font-medium">Color:</span> {getVehicle(assignmentData.vehicleId)?.color}</p>
                      <p><span className="font-medium">License Plate:</span> {getVehicle(assignmentData.vehicleId)?.licensePlate}</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No vehicle information provided</p>
                  )}
                </div>
              </div>
              
              <div className="mt-4 flex justify-end gap-4">
                <Button 
                  variant="outline"
                  className="border-red-500 text-red-500 hover:bg-red-50"
                  onClick={() => rejectBookingMutation.mutate(assignmentData.id)}
                  disabled={rejectBookingMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {rejectBookingMutation.isPending ? 'Rejecting...' : 'Reject Booking'}
                </Button>
                <Button 
                  className="bg-[#8c52ff] hover:bg-[#7a45e0]"
                  onClick={() => acceptBookingMutation.mutate(assignmentData.id)}
                  disabled={acceptBookingMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {acceptBookingMutation.isPending ? 'Accepting...' : 'Accept Booking'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Tabs 
        defaultValue="active-bookings" 
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid grid-cols-4 w-full md:w-[80%] lg:w-[60%]">
          <TabsTrigger value="active-bookings" className="text-xs sm:text-sm py-1">Active</TabsTrigger>
          <TabsTrigger value="bookings-history" className="text-xs sm:text-sm py-1">History</TabsTrigger>
          <TabsTrigger value="earnings" className="text-xs sm:text-sm py-1">Earnings</TabsTrigger>
          <TabsTrigger value="metrics" className="text-xs sm:text-sm py-1">Metrics</TabsTrigger>
        </TabsList>
        
        {/* Add Booking History Tab */}
        <TabsContent value="bookings-history" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>History</CardTitle>
                  <CardDescription>
                    View your past and upcoming bookings
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={bookingsTimeframe === "day" ? "default" : "outline"}
                    size="sm"
                    className={bookingsTimeframe === "day" ? "bg-[#8c52ff] hover:bg-[#7a45e0]" : ""}
                    onClick={() => setBookingsTimeframe("day")}
                  >
                    Today
                  </Button>
                  <Button
                    variant={bookingsTimeframe === "week" ? "default" : "outline"}
                    size="sm"
                    className={bookingsTimeframe === "week" ? "bg-[#8c52ff] hover:bg-[#7a45e0]" : ""}
                    onClick={() => setBookingsTimeframe("week")}
                  >
                    This Week
                  </Button>
                  <Button
                    variant={bookingsTimeframe === "month" ? "default" : "outline"}
                    size="sm"
                    className={bookingsTimeframe === "month" ? "bg-[#8c52ff] hover:bg-[#7a45e0]" : ""}
                    onClick={() => setBookingsTimeframe("month")}
                  >
                    This Month
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {timeframeLoading ? (
                <div className="flex items-center justify-center py-10">
                  <CarWashSpinner size="md" showText text="Loading bookings..." />
                </div>
              ) : !timeframeBookings || timeframeBookings.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-lg text-muted-foreground">No bookings found for this time period.</p>
                  <p className="text-sm text-muted-foreground mt-2">Try selecting a different timeframe.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {timeframeBookings.map((booking) => {
                    const service = services?.find(s => s.id === booking.serviceId);
                    // Determine status color
                    let statusColor = "bg-gray-200";
                    if (booking.status === "pending") statusColor = "bg-yellow-200 text-yellow-700";
                    if (booking.status === "confirmed") statusColor = "bg-green-200 text-green-700";
                    if (booking.status === "in_progress") statusColor = "bg-blue-200 text-blue-700";
                    if (booking.status === "completed") statusColor = "bg-purple-200 text-purple-700";
                    if (booking.status === "cancelled") statusColor = "bg-red-200 text-red-700";
                    if (booking.status === "assigned") statusColor = "bg-orange-200 text-orange-700";
                    
                    return (
                      <div key={booking.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium">Booking #{booking.id}</p>
                              <div className={`text-xs px-2 py-1 rounded-full ${statusColor}`}>
                                {booking.status.replace('_', ' ')}
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              <Calendar className="inline h-3 w-3 mr-1" /> 
                              {booking.date && booking.time 
                                ? formatDateTime(booking.date, booking.time)
                                : new Date(booking.timestamp).toLocaleString()
                              }
                            </p>
                            <p className="text-sm mt-1">
                              <span className="font-medium">Service:</span> {service?.name}
                            </p>
                            {booking.serviceLocation && (
                              <p className="text-sm text-muted-foreground">
                                <MapPin className="inline h-3 w-3 mr-1" /> 
                                {booking.serviceLocation}
                              </p>
                            )}
                          </div>
                          <div>
                            {booking.rating ? (
                              <div className="flex items-center">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star 
                                    key={star} 
                                    className={`h-4 w-4 ${star <= (booking.rating || 0) 
                                      ? "text-yellow-400 fill-yellow-400" 
                                      : "text-gray-300"}`} 
                                  />
                                ))}
                              </div>
                            ) : booking.status === 'completed' ? (
                              <p className="text-xs text-muted-foreground">No rating yet</p>
                            ) : null}
                            {booking.serviceDuration && (
                              <p className="text-sm text-muted-foreground mt-1">
                                <Timer className="inline h-3 w-3 mr-1" /> 
                                {formatDuration(booking.serviceDuration)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Active Bookings Tab */}
        <TabsContent value="active-bookings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active</CardTitle>
              <CardDescription>
                Manage your current job assignments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!activeBookings || activeBookings.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-lg text-muted-foreground">No active bookings at the moment.</p>
                  <p className="text-sm text-muted-foreground mt-2">New bookings will appear here when customers make a reservation.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {activeBookings.map((booking) => {
                    const service = services?.find(s => s.id === booking.serviceId);
                    const vehicle = getVehicle(booking.vehicleId);
                    const isExpanded = expandedBooking === booking.id;
                    
                    return (
                      <Card key={booking.id} className={`border ${isExpanded ? 'border-[#8c52ff]' : 'border-border'}`}>
                        <div
                          className="flex justify-between items-center p-4 cursor-pointer"
                          onClick={() => setExpandedBooking(isExpanded ? null : booking.id)}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">Booking #{booking.id}</p>
                              <Badge 
                                variant={
                                  booking.status === 'in_progress' ? "secondary" : 
                                  booking.status === 'pending' ? "outline" : "default"
                                }
                                className={booking.status === 'completed' ? 'bg-green-500 hover:bg-green-600' : ''}
                              >
                                {booking.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            <CardDescription className="flex items-center gap-1 mt-1">
                              <CalendarClock className="h-3 w-3" /> 
                              {booking.date && booking.time 
                                ? formatDateTime(booking.date, booking.time)
                                : booking.timestamp
                              }
                            </CardDescription>
                          </div>
                          <div className="flex gap-2 items-center">
                            {!booking.startTime && booking.status === 'in_progress' ? (
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="text-green-500 border-green-500"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startService(booking.id);
                                }}
                                disabled={startServiceMutation.isPending}
                              >
                                <PlayCircle className="h-4 w-4 mr-1" />
                                Start Timer
                              </Button>
                            ) : booking.startTime && !booking.endTime ? (
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="text-red-500 border-red-500"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  completeService(booking.id);
                                }}
                                disabled={completeServiceMutation.isPending}
                              >
                                <StopCircle className="h-4 w-4 mr-1" />
                                End Timer
                              </Button>
                            ) : null}
                            <span className="transform transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                              <ChevronUp className="h-5 w-5" />
                            </span>
                          </div>
                        </div>
                        
                        {isExpanded && (
                          <div className="p-4 border-t">
                            <div className="grid gap-4 md:grid-cols-2 mb-4">
                              <div>
                                <h3 className="text-sm font-semibold mb-2">Service Details</h3>
                                <div className="space-y-1 text-sm">
                                  <p className="flex items-center">
                                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                                    {booking.date}
                                  </p>
                                  <p className="flex items-center">
                                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                                    {booking.time}
                                  </p>
                                  <p className="flex items-center">
                                    <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                                    {booking.serviceLocation} ({booking.serviceLocationType})
                                  </p>
                                  <p>
                                    <span className="font-medium">Service: </span>
                                    {service?.name}
                                  </p>
                                  <p>
                                    <span className="font-medium">Price: </span>
                                    ${service?.price}
                                  </p>
                                  <p>
                                    <span className="font-medium">Duration: </span>
                                    {service?.duration} min
                                  </p>
                                  {booking.startTime && (
                                    <p>
                                      <span className="font-medium">Started: </span>
                                      {new Date(booking.startTime).toLocaleTimeString()}
                                    </p>
                                  )}
                                  {booking.endTime && (
                                    <p>
                                      <span className="font-medium">Completed: </span>
                                      {new Date(booking.endTime).toLocaleTimeString()}
                                    </p>
                                  )}
                                  {booking.serviceDuration && (
                                    <p>
                                      <span className="font-medium">Actual Duration: </span>
                                      {formatDuration(booking.serviceDuration)}
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              <div>
                                <h3 className="text-sm font-semibold mb-2">Vehicle Information</h3>
                                {vehicle ? (
                                  <div className="space-y-1 text-sm">
                                    <p className="flex items-center">
                                      <Car className="h-4 w-4 mr-2 text-muted-foreground" />
                                      {vehicle.year} {vehicle.make} {vehicle.model}
                                    </p>
                                    <p>
                                      <span className="font-medium">Color: </span>
                                      {vehicle.color}
                                    </p>
                                    <p>
                                      <span className="font-medium">License: </span>
                                      {vehicle.licensePlate}
                                    </p>
                                  </div>
                                ) : (
                                  <p className="text-muted-foreground">No vehicle information</p>
                                )}
                                
                                {booking.notes && (
                                  <div className="mt-3">
                                    <h3 className="text-sm font-semibold mb-1">Notes</h3>
                                    <p className="text-sm text-muted-foreground">{booking.notes}</p>
                                  </div>
                                )}

                                {booking.rating && (
                                  <div className="mt-3">
                                    <h3 className="text-sm font-semibold mb-1">Customer Rating</h3>
                                    <div className="flex items-center">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <Star 
                                          key={star} 
                                          className={`h-4 w-4 ${star <= (booking.rating || 0) 
                                            ? "text-yellow-400 fill-yellow-400" 
                                            : "text-gray-300"}`} 
                                        />
                                      ))}
                                      <span className="ml-2 text-sm">({booking.rating}/5)</span>
                                    </div>
                                    {booking.ratingComment && (
                                      <p className="text-sm text-muted-foreground mt-1">
                                        "{booking.ratingComment}"
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {booking.status === 'in_progress' && (
                              <div className="mt-4">
                                <h3 className="text-sm font-semibold mb-2">Service Progress</h3>
                                <div className="flex flex-wrap gap-2">
                                  {serviceStages.map((stage, index) => {
                                    const isActive = booking.currentStage === stage.id;
                                    const isPast = serviceStages.findIndex(s => s.id === booking.currentStage) > index;
                                    
                                    return (
                                      <Button 
                                        key={stage.id}
                                        size="sm"
                                        className={`text-xs ${isActive ? 'bg-[#8c52ff] hover:bg-[#7a45e0]' : isPast ? 'bg-green-500 hover:bg-green-600' : ''}`}
                                        variant={isActive || isPast ? "default" : "outline"}
                                        onClick={() => updateBookingStage(booking, stage.id)}
                                      >
                                        {isPast && !isActive && <CheckCircle className="h-3 w-3 mr-1" />}
                                        {stage.label}
                                        {isActive && <ArrowRight className="h-3 w-3 ml-1" />}
                                      </Button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            
                            <div className="flex justify-between mt-4 pt-4 border-t">
                              {booking.status === 'pending' ? (
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => cancelBooking(booking)}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="bg-[#8c52ff] hover:bg-[#7a45e0]"
                                    onClick={() => updateBookingStage(booking, 'on_the_way')}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Accept
                                  </Button>
                                </div>
                              ) : booking.status === 'in_progress' ? (
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => cancelBooking(booking)}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="bg-green-500 hover:bg-green-600"
                                    onClick={() => updateBookingStage(booking, 'completed')}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Complete Service
                                  </Button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Earnings Tab */}
        <TabsContent value="earnings">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center">
                    <Coins className="h-5 w-5 mr-2 text-[#8c52ff]" />
                    Earnings Overview
                  </CardTitle>
                  <CardDescription>Track your earnings and service breakdown</CardDescription>
                </div>
                <div className="flex gap-2 items-center">
                  <Button 
                    size="sm" 
                    variant={earningsPeriod === "today" ? "default" : "outline"}
                    className={earningsPeriod === "today" ? "bg-[#8c52ff] hover:bg-[#7a45e0]" : ""}
                    onClick={() => setEarningsPeriod("today")}
                  >
                    Today
                  </Button>
                  <Button 
                    size="sm" 
                    variant={earningsPeriod === "week" ? "default" : "outline"}
                    className={earningsPeriod === "week" ? "bg-[#8c52ff] hover:bg-[#7a45e0]" : ""}
                    onClick={() => setEarningsPeriod("week")}
                  >
                    Week
                  </Button>
                  <Button 
                    size="sm" 
                    variant={earningsPeriod === "month" ? "default" : "outline"}
                    className={earningsPeriod === "month" ? "bg-[#8c52ff] hover:bg-[#7a45e0]" : ""}
                    onClick={() => setEarningsPeriod("month")}
                  >
                    Month
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingEarnings ? (
                <div className="flex justify-center py-10">
                  <CarWashSpinner size="md" showText text="Loading earnings data..." />
                </div>
              ) : !earningsData ? (
                <div className="py-10 text-center text-muted-foreground">
                  No earnings data available
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Earnings Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Total Earnings</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-[#8c52ff]">
                          {formatCurrency(earningsData.totalEarnings)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {earningsPeriod === "today" ? "Today" : 
                           earningsPeriod === "week" ? "This week" : "This month"}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Completed Services</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-[#8c52ff]">
                          {earningsData.completedServices}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {earningsPeriod === "today" ? "Today" : 
                           earningsPeriod === "week" ? "This week" : "This month"}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Average Rating</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-[#8c52ff] flex items-center">
                          {earningsData.averageRating.toFixed(1)}
                          <Star className="h-5 w-5 ml-1 text-yellow-400 fill-yellow-400" />
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Based on {earningsData.completedServices} reviews
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Service Breakdown */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Service Type Breakdown</h3>
                    <div className="space-y-4">
                      {Object.entries(earningsData.serviceTypeBreakdown).map(([category, count]) => {
                        const percentage = (count / earningsData.completedServices) * 100;
                        return (
                          <div key={category} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center">
                                <div className={`w-3 h-3 rounded-full bg-[#8c52ff] mr-2`}></div>
                                <span>{formatCategory(category)}</span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {count} services ({percentage.toFixed(0)}%)
                              </div>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Payment Structure */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Payment Structure</h3>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Your cut:</p>
                            <p className="text-lg font-semibold">70%</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Platform fee:</p>
                            <p className="text-lg font-semibold">30%</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Payment method:</p>
                            <p className="text-lg font-semibold">Direct deposit</p>
                          </div>
                        </div>
                        <Separator />
                        <p className="text-sm mt-4">
                          Payments are processed weekly every Monday. Contact support if you have any questions about your earnings.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Metrics Tab */}
        <TabsContent value="metrics">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-[#8c52ff]" />
                Service Metrics
              </CardTitle>
              <CardDescription>
                Track your service performance and timing metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingMetrics ? (
                <div className="flex justify-center py-10">
                  <CarWashSpinner size="md" showText text="Loading service metrics..." />
                </div>
              ) : !metricsData ? (
                <div className="py-10 text-center text-muted-foreground">
                  No service metrics available yet. Complete some services to see your metrics.
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Service Duration Metrics */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Service Duration</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Average Duration by Service Type</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {Object.entries(metricsData.averageDuration).length > 0 ? (
                              Object.entries(metricsData.averageDuration).map(([category, duration]) => (
                                <div key={category} className="flex justify-between items-center">
                                  <div>
                                    <span className="font-medium">{formatCategory(category)}</span>
                                  </div>
                                  <div className="flex items-center">
                                    <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                                    <span>{formatDuration(duration)}</span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-muted-foreground text-sm">No service duration data yet</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Total Service Time</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-[#8c52ff]">
                            {formatDuration(metricsData.totalServiceTime)}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Across all completed services
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                  
                  {/* Efficiency Tips */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Efficiency Tips</h3>
                    <Card>
                      <CardContent className="p-4">
                        <div className="space-y-4">
                          <div className="flex items-start gap-2">
                            <ChevronUp className="h-4 w-4 text-green-500 mt-0.5" />
                            <div>
                              <p className="font-medium">Preparation is key</p>
                              <p className="text-sm text-muted-foreground">
                                Have all your supplies organized and ready before arriving at the service location.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <ChevronUp className="h-4 w-4 text-green-500 mt-0.5" />
                            <div>
                              <p className="font-medium">Track each service accurately</p>
                              <p className="text-sm text-muted-foreground">
                                Always use the service timer to get accurate metrics and improve your efficiency.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <ChevronUp className="h-4 w-4 text-green-500 mt-0.5" />
                            <div>
                              <p className="font-medium">Quality comes first</p>
                              <p className="text-sm text-muted-foreground">
                                While efficiency is important, never compromise on quality to save time.
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Rating Performance */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Rating Performance</h3>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Customer Feedback</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="text-2xl font-bold">
                            {user?.rating?.toFixed(1) || "N/A"}
                          </div>
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star 
                                key={star} 
                                className={`h-5 w-5 ${star <= (user?.rating || 0) 
                                  ? "text-yellow-400 fill-yellow-400" 
                                  : "text-gray-300"}`} 
                              />
                            ))}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            ({user?.ratingCount || 0} reviews)
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Maintaining a high rating improves your visibility to customers and increases your booking opportunities.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}