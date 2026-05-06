import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader } from "@/components/ui/loader";
import { ServiceProgress } from "@/components/service-progress";
import { Booking, Service, TimeSlot, Vehicle } from "@shared/schema";
import { format } from "date-fns";
import { ChevronLeft, Calendar, Clock, Car, MapPin } from "lucide-react";
import { Icon } from "@/components/ui/icon";

export default function BookingDetails() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { status: wsStatus } = useWebSocket();
  const [bookingId, setBookingId] = useState<number | null>(null);
  
  // Get the booking ID from the URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (id) {
      setBookingId(parseInt(id));
    }
  }, []);
  
  // Fetch bookings data
  const { data: bookings, isLoading: isLoadingBookings } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
    enabled: !!user,
  });
  
  // Fetch services data
  const { data: services, isLoading: isLoadingServices } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    enabled: !!user,
  });
  
  // Fetch time slots data
  const { data: timeSlots, isLoading: isLoadingTimeSlots } = useQuery<TimeSlot[]>({
    queryKey: ["/api/timeslots"],
    enabled: !!user,
  });
  
  // Fetch vehicles data
  const { data: vehicles, isLoading: isLoadingVehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
    enabled: !!user,
  });
  
  const isLoading = isLoadingBookings || isLoadingServices || isLoadingTimeSlots || isLoadingVehicles;
  
  // Find the current booking
  const booking = bookingId && bookings ? bookings.find(b => b.id === bookingId) : null;
  const service = booking && services ? services.find(s => s.id === booking.serviceId) : null;
  const timeSlot = booking && timeSlots ? timeSlots.find(t => t.id === booking.timeSlotId) : null;
  const vehicle = booking && vehicles && booking.vehicleId ? vehicles.find(v => v.id === booking.vehicleId) : null;
  
  if (isLoading) {
    return (
      <div className="container max-w-screen-md mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <Loader size="lg" />
        </div>
      </div>
    );
  }
  
  if (!booking || !service || !timeSlot) {
    return (
      <div className="container max-w-screen-md mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Booking Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>The booking you're looking for doesn't exist or you don't have access to it.</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => setLocation("/")}>
              <Icon icon={ChevronLeft} size="sm" className="mr-2" /> Back to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // Format the booking date
  const bookingDate = timeSlot.date ? format(new Date(timeSlot.date), 'EEEE, MMMM d, yyyy') : 'Unknown Date';
  
  return (
    <div className="container max-w-screen-md mx-auto px-4 py-8">
      <div className="mb-6 flex items-center">
        <Button variant="outline" onClick={() => setLocation("/")} className="mr-3">
          <Icon icon={ChevronLeft} size="sm" className="mr-2" /> Back
        </Button>
        <h1 className="text-2xl font-bold">Booking Details</h1>
      </div>
      
      {/* Service Progress Tracking */}
      <ServiceProgress bookingId={booking.id} />
      
      {/* Booking Information */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center">
            <Icon icon={Calendar} size="md" className="mr-2 text-muted-foreground" />
            <span>{bookingDate}</span>
          </div>
          
          <div className="flex items-center">
            <Icon icon={Clock} size="md" className="mr-2 text-muted-foreground" />
            <span>{timeSlot.startTime} - {timeSlot.endTime}</span>
          </div>
          
          <div className="flex items-center">
            <Icon icon={MapPin} size="md" className="mr-2 text-muted-foreground" />
            <span>{booking.serviceLocation} ({booking.serviceLocationType})</span>
          </div>
          
          {vehicle && (
            <div className="flex items-center">
              <Icon icon={Car} size="md" className="mr-2 text-muted-foreground" />
              <span>{vehicle.year} {vehicle.make} {vehicle.model} {vehicle.color && `(${vehicle.color})`}</span>
            </div>
          )}
          
          <div className="mt-4 pt-4 border-t">
            <h3 className="font-semibold text-lg mb-2">{service.name}</h3>
            <p className="text-muted-foreground text-sm">{service.description}</p>
            <div className="flex justify-between items-center mt-3">
              <span className="font-semibold">${service.price}</span>
              <span className="text-muted-foreground text-sm">{service.duration} minutes</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-4">
          <div className="text-sm text-muted-foreground font-mono">
            {(booking as any).bookingRef || `#${booking.id}`}
          </div>
          <div>
            <Badge 
              variant={booking.status === "completed" ? "default" : "outline"} 
              className={booking.status === "completed" ? "bg-green-500 hover:bg-green-600" : ""}
            >
              {booking.status.replace('_', ' ')}
            </Badge>
          </div>
        </CardFooter>
      </Card>
      
      {/* WebSocket connection status */}
      <div className="mt-6 text-sm text-center text-muted-foreground">
        Real-time updates: 
        <span className={wsStatus === "connected" ? "text-green-500 ml-1" : "text-amber-500 ml-1"}>
          {wsStatus}
        </span>
      </div>
    </div>
  );
}