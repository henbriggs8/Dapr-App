import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader } from "@/components/ui/loader";
import { ServiceProgress } from "@/components/service-progress";
import { Booking, Service, TimeSlot, Vehicle } from "@shared/schema";
import { format } from "date-fns";
import { ChevronLeft, Calendar, Clock, Car, MapPin, X, HelpCircle } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function BookingDetails() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { status: wsStatus } = useWebSocket();
  const { toast } = useToast();
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id') || window.location.pathname.split('/').pop();
    if (id && !isNaN(Number(id))) {
      setBookingId(parseInt(id));
    }
  }, []);

  const { data: bookings, isLoading: isLoadingBookings } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
    enabled: !!user,
  });

  const { data: services, isLoading: isLoadingServices } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    enabled: !!user,
  });

  const { data: timeSlots, isLoading: isLoadingTimeSlots } = useQuery<TimeSlot[]>({
    queryKey: ["/api/timeslots"],
    enabled: !!user,
  });

  const { data: vehicles, isLoading: isLoadingVehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
    enabled: !!user,
  });

  const cancelMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/bookings/${bookingId}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setShowCancelDialog(false);
      toast({ title: "Booking cancelled", description: "Your booking has been cancelled." });
    },
    onError: (err: any) => {
      setShowCancelDialog(false);
      const msg = err?.message || "";
      if (msg.includes("2 hours")) {
        toast({ title: "Cannot cancel", description: "Cancellations within 2 hours of your appointment cannot be processed here. Please contact support.", variant: "destructive" });
      } else {
        toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
      }
    },
  });

  const isLoading = isLoadingBookings || isLoadingServices || isLoadingTimeSlots || isLoadingVehicles;

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

  const bookingDate = timeSlot.date ? format(new Date(timeSlot.date), 'EEEE, MMMM d, yyyy') : 'Unknown Date';
  const canCancel = booking.status === 'pending' || booking.status === 'confirmed';

  return (
    <div className="container max-w-screen-md mx-auto px-4 py-8">
      {/* Cancel confirmation dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancel Booking?</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure? Cancellations within 2 hours of your appointment may not be eligible for a refund.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowCancelDialog(false)}
                disabled={cancelMutation.isPending}
              >
                Keep Booking
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? "Cancelling…" : "Yes, Cancel"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center">
        <Button variant="outline" onClick={() => setLocation("/activity")} className="mr-3">
          <Icon icon={ChevronLeft} size="sm" className="mr-2" /> Back
        </Button>
        <h1 className="text-2xl font-bold">Booking Details</h1>
      </div>

      <ServiceProgress bookingId={booking.id} />

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
        <CardFooter className="flex flex-col gap-3 border-t pt-4">
          <div className="flex justify-between items-center w-full">
            <div className="text-sm text-muted-foreground font-mono">
              {(booking as any).bookingRef || `#${booking.id}`}
            </div>
            <Badge
              variant={booking.status === "completed" ? "default" : "outline"}
              className={booking.status === "completed" ? "bg-green-500 hover:bg-green-600" : ""}
            >
              {booking.status.replace('_', ' ')}
            </Badge>
          </div>

          {/* Customer actions */}
          <div className="flex gap-2 w-full pt-1">
            <Button
              variant="outline"
              className="flex-1 text-sm gap-2"
              onClick={() => setLocation("/faq")}
            >
              <Icon icon={HelpCircle} size="sm" />
              Get Help
            </Button>
            {canCancel && (
              <Button
                variant="outline"
                className="flex-1 text-sm text-red-600 border-red-200 hover:bg-red-50 gap-2"
                onClick={() => setShowCancelDialog(true)}
              >
                <Icon icon={X} size="sm" />
                Cancel Booking
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>

      <div className="mt-6 text-sm text-center text-muted-foreground">
        Real-time updates:
        <span className={wsStatus === "connected" ? "text-green-500 ml-1" : "text-amber-500 ml-1"}>
          {wsStatus}
        </span>
      </div>
    </div>
  );
}
