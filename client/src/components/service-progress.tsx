import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CarWashSpinner } from "@/components/car-wash-spinner";
import { Progress } from "@/components/ui/progress";
import { Booking, Service } from "@shared/schema";

const serviceStages = [
  { id: "detail_pro_otw", label: "Detail Pro On The Way" },
  { id: "arrival", label: "Detail Pro Has Arrived" },
  { id: "exterior_washing", label: "Exterior Washing" },
  { id: "interior_cleaning", label: "Interior Cleaning" },
  { id: "finishing", label: "Finishing Up" },
  { id: "completed", label: "Service Completed" }
];

function getActiveServiceStage(booking: Booking): string | null {
  // First check if currentStage is available directly
  if (booking.currentStage) return booking.currentStage;
  
  // Fallback to parsing from notes for backward compatibility
  if (!booking.notes) return null;
  
  const match = booking.notes.match(/Current stage: (.+)/);
  return match ? match[1] : null;
}

function getProgressPercentage(currentStage: string | null): number {
  if (!currentStage) return 0;
  
  const stageIndex = serviceStages.findIndex(stage => stage.id === currentStage);
  if (stageIndex === -1) return 0;
  
  return Math.round(((stageIndex + 1) / serviceStages.length) * 100);
}

export function ServiceProgress({ bookingId }: { bookingId: number }) {
  const { user } = useAuth();
  const { status: wsStatus } = useWebSocket();
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  
  // Fetch booking details
  const { data: bookings } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
    enabled: !!user
  });
  
  // Fetch service details for the booking
  const { data: services } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    enabled: !!user
  });
  
  const booking = bookings?.find(b => b.id === bookingId);
  const service = services?.find(s => booking && s.id === booking.serviceId);
  
  useEffect(() => {
    if (booking) {
      const stage = getActiveServiceStage(booking);
      setCurrentStage(stage);
      setProgress(getProgressPercentage(stage));
    }
  }, [booking]);
  
  if (!booking || !service) {
    return (
      <Card className="w-full mb-6">
        <CardHeader>
          <CardTitle>Service Progress</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6">
          <p>Loading service details...</p>
        </CardContent>
      </Card>
    );
  }
  
  const isActive = booking.status === "in_progress";
  const isCompleted = booking.status === "completed";
  const isPending = booking.status === "pending";

  return (
    <Card className="w-full mb-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Service Progress</CardTitle>
        <Badge 
          variant={
            isCompleted ? "default" : 
            isActive ? "secondary" : 
            isPending ? "outline" : "destructive"
          }
          className={isCompleted ? "bg-green-500 hover:bg-green-600" : ""}
        >
          {booking.status.replace('_', ' ')}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-4">
          {isActive && (
            <>
              <div className="mb-4">
                <CarWashSpinner size="lg" showText={true} text={currentStage ? serviceStages.find(s => s.id === currentStage)?.label : 'Processing'} />
              </div>
              <Progress value={progress} className="w-full h-2 mb-2" />
              <div className="w-full flex justify-between text-xs text-muted-foreground mt-1">
                <span>Started</span>
                <span>In Progress</span>
                <span>Complete</span>
              </div>
            </>
          )}
          
          {isPending && (
            <div className="text-center py-4">
              <p className="mb-2">Your booking is scheduled and waiting to begin.</p>
              <p className="text-muted-foreground text-sm">
                Service: {service.name}
              </p>
            </div>
          )}
          
          {isCompleted && (
            <div className="text-center py-4">
              <h3 className="text-xl font-semibold mb-2">Service Completed!</h3>
              <p className="text-muted-foreground">
                Thank you for choosing Dapper!
              </p>
            </div>
          )}
          
          {booking.status === "cancelled" && (
            <div className="text-center py-4">
              <p className="text-destructive">This booking was cancelled.</p>
            </div>
          )}
        </div>
        
        <div className="mt-2 text-sm">
          <p className="flex justify-between">
            <span className="text-muted-foreground">Service:</span>
            <span className="font-medium">{service.name}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-muted-foreground">WebSocket:</span>
            <span className={wsStatus === "connected" ? "text-green-500" : "text-amber-500"}>
              {wsStatus}
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}