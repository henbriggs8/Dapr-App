import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Booking, User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2, MapPin, Power } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
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

  const { data: activeBookings, isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings/active", user?.id],
    enabled: !!user?.id,
    refetchInterval: 10000 // Refetch every 10 seconds
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
                {activeBookings?.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-4 border rounded-md bg-card">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">Booking #{booking.id}</p>
                        <Badge variant={
                          booking.status === 'pending' ? 'secondary' :
                          booking.status === 'accepted' ? 'default' :
                          'destructive'
                        }>
                          {booking.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(booking.timestamp).toLocaleString()}
                      </p>
                      <p className="text-sm">
                        Service Location: {booking.serviceLocation}
                      </p>
                    </div>
                    <Button variant="outline">
                      View Details
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}