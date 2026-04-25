import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Booking, Service, TimeSlot, Vehicle } from "@shared/schema";
import { 
  Clock, 
  Calendar, 
  Car, 
  MapPin, 
  RefreshCw, 
  Zap,
  Star,
  TrendingUp
} from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { CarWashSpinner } from "@/components/car-wash-spinner";
import BookingDialog from "@/components/booking-dialog";

interface QuickRebookProps {
  userBookings: Booking[];
  services: Service[];
  timeSlots: TimeSlot[];
  vehicles: Vehicle[];
  provider?: any;
}

interface RebookSuggestion {
  booking: Booking;
  service: Service;
  suggestedDate: string;
  suggestedTime: string;
  confidence: number;
  reason: string;
  vehicle?: Vehicle;
  timeSlot?: TimeSlot;
}

export default function QuickRebook({ 
  userBookings, 
  services, 
  timeSlots, 
  vehicles,
  provider 
}: QuickRebookProps) {
  const { toast } = useToast();
  const [selectedSuggestion, setSelectedSuggestion] = useState<RebookSuggestion | null>(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);

  // Analyze booking patterns and generate intelligent suggestions
  const generateRebookSuggestions = (): RebookSuggestion[] => {
    if (!userBookings.length || !services.length) return [];

    const completedBookings = userBookings
      .filter(booking => booking.status === 'completed')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (completedBookings.length === 0) return [];

    const suggestions: RebookSuggestion[] = [];

    // Analyze the most recent booking for immediate rebooking
    const mostRecent = completedBookings[0];
    const recentService = services.find(s => s.id === mostRecent.serviceId);
    
    if (recentService) {
      // Calculate suggested date based on service type and frequency
      const daysSinceLastService = Math.floor(
        (Date.now() - new Date(mostRecent.timestamp).getTime()) / (1000 * 60 * 60 * 24)
      );

      let suggestedDaysFromNow = 0;
      let reason = "";
      let confidence = 80;

      // Intelligent scheduling based on service type
      if (recentService.category === 'basic') {
        // Basic wash - suggest more frequent rebooking
        if (daysSinceLastService >= 14) {
          suggestedDaysFromNow = 1; // Tomorrow
          reason = "Your car is due for a refresh";
          confidence = 90;
        } else if (daysSinceLastService >= 7) {
          suggestedDaysFromNow = 3;
          reason = "Maintain that fresh look";
          confidence = 75;
        }
      } else if (recentService.category === 'standard') {
        // Standard service - moderate frequency
        if (daysSinceLastService >= 21) {
          suggestedDaysFromNow = 1;
          reason = "Time for your regular detail";
          confidence = 95;
        } else if (daysSinceLastService >= 14) {
          suggestedDaysFromNow = 7;
          reason = "Keep your vehicle pristine";
          confidence = 80;
        }
      } else if (recentService.category === 'premium') {
        // Premium service - less frequent but maintain quality
        if (daysSinceLastService >= 45) {
          suggestedDaysFromNow = 1;
          reason = "Premium care is overdue";
          confidence = 95;
        } else if (daysSinceLastService >= 30) {
          suggestedDaysFromNow = 7;
          reason = "Maintain premium condition";
          confidence = 85;
        }
      }

      if (suggestedDaysFromNow > 0) {
        // Find preferred time based on history
        const preferredTimes = completedBookings
          .map(b => b.time)
          .filter(Boolean)
          .reduce((acc: {[key: string]: number}, time) => {
            if (time) {
              acc[time] = (acc[time] || 0) + 1;
            }
            return acc;
          }, {});

        const mostPreferredTime = Object.entries(preferredTimes)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || "09:00";

        const suggestedDate = new Date();
        suggestedDate.setDate(suggestedDate.getDate() + suggestedDaysFromNow);
        
        // Find the best available time slot
        const availableSlots = timeSlots.filter(slot => 
          slot.date === suggestedDate.toISOString().split('T')[0] &&
          slot.isAvailable &&
          slot.currentBookings < slot.maxBookings
        );

        const preferredSlot = availableSlots.find(slot => 
          slot.startTime === mostPreferredTime
        ) || availableSlots[0];

        if (preferredSlot) {
          suggestions.push({
            booking: mostRecent,
            service: recentService,
            suggestedDate: suggestedDate.toISOString().split('T')[0],
            suggestedTime: preferredSlot.startTime,
            confidence,
            reason,
            vehicle: vehicles.find(v => v.id === mostRecent.vehicleId),
            timeSlot: preferredSlot
          });
        }
      }
    }

    // Analyze service upgrade opportunities
    const serviceFrequency = completedBookings.reduce((acc: {[key: string]: number}, booking) => {
      const service = services.find(s => s.id === booking.serviceId);
      if (service) {
        acc[service.category] = (acc[service.category] || 0) + 1;
      }
      return acc;
    }, {});

    // Suggest upgrade if customer frequently books basic services
    if (serviceFrequency.basic >= 3 && !serviceFrequency.standard) {
      const standardService = services.find(s => s.category === 'standard');
      if (standardService) {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        const availableSlots = timeSlots.filter(slot => 
          slot.date === nextWeek.toISOString().split('T')[0] &&
          slot.isAvailable &&
          slot.currentBookings < slot.maxBookings
        );

        if (availableSlots.length > 0) {
          suggestions.push({
            booking: mostRecent,
            service: standardService,
            suggestedDate: nextWeek.toISOString().split('T')[0],
            suggestedTime: availableSlots[0].startTime,
            confidence: 70,
            reason: "Ready for an upgrade? Try our premium service",
            vehicle: vehicles.find(v => v.id === mostRecent.vehicleId),
            timeSlot: availableSlots[0]
          });
        }
      }
    }

    return suggestions.slice(0, 2); // Return top 2 suggestions
  };

  const suggestions = generateRebookSuggestions();

  const createRebookingMutation = useMutation({
    mutationFn: async (suggestion: RebookSuggestion) => {
      if (!suggestion.timeSlot) throw new Error("No time slot available");
      
      const bookingData = {
        serviceId: suggestion.service.id,
        timeSlotId: suggestion.timeSlot.id,
        vehicleId: suggestion.vehicle?.id || null,
        date: suggestion.suggestedDate,
        time: suggestion.suggestedTime,
        priceTier: suggestion.service.category,
        serviceLocation: suggestion.booking.serviceLocation,
        serviceLocationType: suggestion.booking.serviceLocationType,
        serviceLatitude: suggestion.booking.serviceLatitude,
        serviceLongitude: suggestion.booking.serviceLongitude,
        totalPrice: suggestion.service.price * 100, // Convert to cents
      };

      const res = await apiRequest("POST", "/api/bookings", bookingData);
      return await res.json();
    },
    onSuccess: (newBooking: Booking) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timeslots"] });
      toast({
        title: "Booking confirmed!",
        description: "Your service has been rebooked successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Booking failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleQuickRebook = (suggestion: RebookSuggestion) => {
    setSelectedSuggestion(suggestion);
    setBookingDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return "bg-green-100 text-green-800 border-green-200";
    if (confidence >= 80) return "bg-blue-100 text-blue-800 border-blue-200";
    return "bg-yellow-100 text-yellow-800 border-yellow-200";
  };

  if (suggestions.length === 0) {
    return null; // Don't show component if no suggestions
  }

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon icon={Zap} size="md" className="text-[#8c52ff]" />
            Quick Rebook
          </CardTitle>
          <CardDescription>
            Smart suggestions based on your service history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {suggestions.map((suggestion, index) => (
              <div 
                key={index}
                className="border rounded-lg p-4 hover:border-[#8c52ff]/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-gray-900">
                        {suggestion.service.name}
                      </h4>
                      <Badge className={getConfidenceColor(suggestion.confidence)}>
                        {suggestion.confidence}% match
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {suggestion.reason}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-[#8c52ff]">
                      ${suggestion.service.price}
                    </div>
                    <div className="text-xs text-gray-500">
                      {suggestion.service.duration} min
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Icon icon={Calendar} size="sm" />
                    <span>{formatDate(suggestion.suggestedDate)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Icon icon={Clock} size="sm" />
                    <span>{formatTime(suggestion.suggestedTime)}</span>
                  </div>
                  {suggestion.vehicle && (
                    <div className="flex items-center gap-2 text-gray-600 col-span-2">
                      <Icon icon={Car} size="sm" />
                      <span>
                        {suggestion.vehicle.year} {suggestion.vehicle.make} {suggestion.vehicle.model}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-600 col-span-2">
                    <Icon icon={MapPin} size="sm" />
                    <span className="truncate">{suggestion.booking.serviceLocation}</span>
                  </div>
                </div>

                <Button 
                  onClick={() => handleQuickRebook(suggestion)}
                  disabled={createRebookingMutation.isPending}
                  className="w-full bg-[#8c52ff] hover:bg-[#8c52ff]/90"
                >
                  {createRebookingMutation.isPending ? (
                    <>
                      <CarWashSpinner size="sm" />
                      <span className="ml-2">Booking...</span>
                    </>
                  ) : (
                    <>
                      <Icon icon={RefreshCw} size="sm" className="mr-2" />
                      Book Again
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Booking Dialog */}
      {bookingDialogOpen && selectedSuggestion && provider && (
        <BookingDialog
          open={bookingDialogOpen}
          onClose={() => {
            setBookingDialogOpen(false);
            setSelectedSuggestion(null);
          }}
          provider={provider}
          serviceId={selectedSuggestion.service.id}
          timeSlotId={selectedSuggestion.timeSlot?.id || 0}
          timeSlot={selectedSuggestion.timeSlot as any}
          prefillData={{
            selectedVehicle: selectedSuggestion.vehicle,
            selectedLocation: {
              address: selectedSuggestion.booking.serviceLocation,
              latitude: selectedSuggestion.booking.serviceLatitude || 0,
              longitude: selectedSuggestion.booking.serviceLongitude || 0,
              type: selectedSuggestion.booking.serviceLocationType as 'address' | 'current'
            }
          }}
        />
      )}
    </>
  );
}