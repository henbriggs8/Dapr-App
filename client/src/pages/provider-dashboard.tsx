import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Booking, Service, User, Vehicle } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2, MapPin, Power, CheckCircle, ChevronRight, ChevronDown, Car, Clock, Calendar } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/use-websocket";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ProviderDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [locationError, setLocationError] = useState<string>();

  const { sendMessage, status: wsStatus } = useWebSocket();
  const [expandedBooking, setExpandedBooking] = useState<number | null>(null);
  const [activeStage, setActiveStage] = useState<string | null>(null);
  
  // Get active bookings for the provider
  const { data: activeBookings, isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings/active", user?.id],
    enabled: !!user?.id,
    refetchInterval: 10000 // Refetch every 10 seconds
  });
  
  // Get services
  const { data: services, isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    enabled: !!user?.id,
  });
  
  // Get vehicles
  const { data: vehicles, isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
    enabled: !!user?.id,
  });
  
  const isLoading = bookingsLoading || servicesLoading || vehiclesLoading;
  
  // Mutation to update booking status
  const updateBookingStatusMutation = useMutation({
    mutationFn: async ({ id, status, stage }: { id: number; status: string; stage?: string }) => {
      const res = await apiRequest('POST', `/api/bookings/${id}/status`, { status, stage });
      return await res.json();
    },
    onSuccess: (updatedBooking: Booking) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/active"] });
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
        title: "Booking Updated",
        description: `Status changed to ${updatedBooking.status}${updatedBooking.currentStage ? ` (${updatedBooking.currentStage})` : ''}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    if (!user?.isProvider) return;

    const updateLocation = async (position: GeolocationPosition) => {
      try {
        await fetch('/api/provider/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }),
        });
        queryClient.invalidateQueries({ queryKey: ["/api/provider/location"] });
      } catch (error) {
        console.error('Failed to update location:', error);
      }
    };

    const watchId = navigator.geolocation.watchPosition(
      updateLocation,
      (error) => setLocationError(error.message),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [user]);

  const toggleStatus = async () => {
    try {
      const newStatus = user?.currentStatus === 'online' ? 'offline' : 'online';
      const response = await fetch('/api/provider/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      const updatedUser = await response.json();
      queryClient.setQueryData(["/api/auth/me"], updatedUser);

      toast({
        title: "Status Updated",
        description: `You are now ${newStatus}`,
        variant: newStatus === 'online' ? 'default' : 'destructive',
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Field Agent Dashboard</h1>
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
          <Button 
            variant={user?.currentStatus === 'online' ? 'default' : 'outline'}
            onClick={toggleStatus}
          >
            <Power className="mr-2 h-4 w-4" />
            {user?.currentStatus === 'online' ? 'Go Offline' : 'Go Online'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Active Bookings</CardTitle>
            <CardDescription>
              Manage your current service requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeBookings?.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No active bookings
              </p>
            ) : (
              <div className="space-y-4">
                {activeBookings?.map((booking) => {
                  const service = services?.find(s => s.id === booking.serviceId);
                  const vehicle = vehicles?.find(v => v.id === booking.vehicleId);
                  const isExpanded = expandedBooking === booking.id;
                  
                  // Service stages for car wash
                  const serviceStages = [
                    { id: 'on_the_way', label: 'Detail Pro On The Way' },
                    { id: 'arrival', label: 'Arrival at Location' },
                    { id: 'exterior_washing', label: 'Exterior Washing' },
                    { id: 'interior_cleaning', label: 'Interior Cleaning' },
                    { id: 'finishing', label: 'Finishing Touches' },
                    { id: 'completed', label: 'Service Completed' }
                  ];
                  
                  return (
                    <Card key={booking.id}>
                      <div
                        className="flex justify-between items-center p-4 cursor-pointer"
                        onClick={() => setExpandedBooking(isExpanded ? null : booking.id)}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">Booking #{booking.id}</p>
                            <Badge variant={
                              booking.status === 'in_progress' ? 'secondary' :
                              booking.status === 'completed' ? 'default' :
                              booking.status === 'cancelled' ? 'destructive' :
                              'outline'
                            }
                            className={booking.status === 'completed' ? 'bg-green-500 hover:bg-green-600' : ''}
                            >
                              {booking.status.replace('_', ' ')}
                            </Badge>
                            {booking.currentStage && (
                              <Badge variant="outline" className="bg-slate-100">
                                {serviceStages.find(s => s.id === booking.currentStage)?.label || booking.currentStage}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(booking.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center">
                          {wsStatus === "connected" ? (
                            <div className="text-green-500 text-xs mr-2">
                              <span className="inline-block h-2 w-2 rounded-full bg-green-500 mr-1"></span>
                              Live
                            </div>
                          ) : (
                            <div className="text-amber-500 text-xs mr-2">
                              <span className="inline-block h-2 w-2 rounded-full bg-amber-500 mr-1"></span>
                              Offline
                            </div>
                          )}
                          <ChevronDown className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
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
                            </div>
                          </div>
                          
                          <div className="border-t pt-4 mt-2">
                            <h3 className="text-sm font-semibold mb-3">Update Status</h3>
                            
                            {/* Status update controls */}
                            <div className="space-y-3">
                              {booking.status !== 'in_progress' && booking.status !== 'completed' && (
                                <Button 
                                  className="w-full"
                                  onClick={() => updateBookingStatusMutation.mutate({
                                    id: booking.id,
                                    status: 'in_progress',
                                    stage: 'on_the_way'
                                  })}
                                  disabled={updateBookingStatusMutation.isPending}
                                >
                                  Start Service
                                </Button>
                              )}
                              
                              {booking.status === 'in_progress' && (
                                <>
                                  <div className="grid grid-cols-2 gap-2">
                                    {serviceStages.map((stage) => (
                                      <Button
                                        key={stage.id}
                                        variant={booking.currentStage === stage.id ? "default" : "outline"}
                                        className={booking.currentStage === stage.id ? "border-2 border-primary" : ""}
                                        onClick={() => {
                                          setActiveStage(stage.id);
                                          updateBookingStatusMutation.mutate({
                                            id: booking.id,
                                            status: 'in_progress',
                                            stage: stage.id
                                          });
                                        }}
                                        disabled={updateBookingStatusMutation.isPending}
                                      >
                                        {stage.label}
                                      </Button>
                                    ))}
                                  </div>
                                  
                                  <Button 
                                    className="w-full bg-green-500 hover:bg-green-600"
                                    onClick={() => updateBookingStatusMutation.mutate({
                                      id: booking.id,
                                      status: 'completed',
                                      stage: 'completed'
                                    })}
                                    disabled={updateBookingStatusMutation.isPending}
                                  >
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Complete Service
                                  </Button>
                                </>
                              )}
                              
                              {booking.status === 'completed' && (
                                <p className="text-green-600 text-center py-2 flex items-center justify-center">
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Service completed
                                </p>
                              )}
                            </div>
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
      </div>
    </div>
  );
}