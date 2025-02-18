import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Booking } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2, MapPin } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

export default function ProviderDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [locationError, setLocationError] = useState<string>();

  const { data: activeBookings, isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings/active", user?.id],
    enabled: !!user?.id
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
          <Button onClick={() => {
            toast({
              title: "Status Updated",
              description: "Your availability status has been updated"
            });
          }}>
            Toggle Availability
          </Button>
        </div>
      </div>
      
      <div className="grid gap-6">
        <div className="rounded-lg border p-4">
          <h2 className="text-xl font-semibold mb-4">Active Bookings</h2>
          {activeBookings?.length === 0 ? (
            <p className="text-muted-foreground">No active bookings</p>
          ) : (
            <div className="space-y-4">
              {activeBookings?.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-4 border rounded-md">
                  <div>
                    <p className="font-medium">Booking #{booking.id}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(booking.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Button variant="outline">
                    View Details
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
