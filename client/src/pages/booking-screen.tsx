import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { User, Service, TimeSlot, Booking } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Calendar, Clock, ChevronRight, Car, ArrowLeft } from "lucide-react";
import { CarWashSpinner } from "@/components/car-wash-spinner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import BookingDialog from "@/components/booking-dialog";
import { Badge } from "@/components/ui/badge";
import ServiceCards from "@/components/service-cards";
import { EnhancedServiceSelection } from "@/components/enhanced-service-selection";
import { OnboardingButton } from "@/components/onboarding-button";
import QuickRebook from "@/components/quick-rebook";

export default function BookingScreen() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [selectedTimeSlotId, setSelectedTimeSlotId] = useState<number | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [, setLocation] = useLocation();
  
  // Query providers (we'll still need the company info)
  const { data: providers, isLoading: providersLoading } = useQuery<User[]>({
    queryKey: ["/api/providers"],
  });
  
  // Query services
  const { data: services, isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });
  
  // Query time slots for the selected date
  const { data: timeSlots, isLoading: timeSlotsLoading } = useQuery<TimeSlot[]>({
    queryKey: ["/api/timeslots", selectedDate],
    enabled: !!selectedDate,
  });
  
  // Query user bookings
  const { data: bookings, isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
    enabled: !!user,
  });
  
  const isLoading = providersLoading || servicesLoading || timeSlotsLoading || bookingsLoading;
  
  const handleServiceSelect = (service: Service) => {
    console.log("Service selected in BookingScreen:", service);
    setSelectedServiceId(service.id);
  };
  
  const handleTimeSlotSelect = (timeSlot: TimeSlot) => {
    setSelectedTimeSlotId(timeSlot.id);
    
    if (selectedServiceId && providers && providers.length > 0) {
      setBookingOpen(true);
    }
  };
  
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Reset time for comparison
    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    
    if (date.getTime() === today.getTime()) {
      return "Today";
    } else if (date.getTime() === tomorrow.getTime()) {
      return "Tomorrow";
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };
  
  const getAvailableTimeSlots = () => {
    if (!timeSlots) return [];
    
    return timeSlots.filter(slot => 
      slot.date === selectedDate && 
      slot.isAvailable && 
      slot.currentBookings < slot.maxBookings
    );
  };
  
  const getDateOptions = () => {
    const dates = [];
    const today = new Date();
    
    // Allow booking up to 30 days in advance
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    return dates;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <CarWashSpinner size="lg" showText text="Loading booking options..." />
      </div>
    );
  }

  const provider = providers?.[0]; // Dapper company
  const availableTimeSlots = getAvailableTimeSlots();

  return (
    <div className="w-full min-h-screen px-4 sm:px-6 lg:px-8 py-4" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom) + 20px)' }}>
      <div className="max-w-4xl mx-auto">
        
        {/* Header with Back Button */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Book Your Service</h1>
        </div>

        {/* Onboarding Button */}
        <OnboardingButton />

        {/* Quick Rebook Suggestions */}
        {bookings && bookings.length > 0 && (
          <QuickRebook 
            userBookings={bookings}
            services={services || []}
            timeSlots={timeSlots || []}
            vehicles={[]} // Will be enhanced when vehicle system is implemented
            provider={provider}
          />
        )}

        {/* Enhanced Service Selection */}
        <div className="mb-8">
          <EnhancedServiceSelection 
            services={services || []}
            selectedServiceId={selectedServiceId}
            onServiceSelect={handleServiceSelect}
            onBookNow={() => {
              if (selectedServiceId && !selectedTimeSlotId) {
                // Auto-select first available time slot for today
                const availableSlots = getAvailableTimeSlots();
                if (availableSlots.length > 0) {
                  setSelectedTimeSlotId(availableSlots[0].id);
                  setBookingOpen(true);
                }
              } else if (selectedServiceId && selectedTimeSlotId) {
                setBookingOpen(true);
              }
            }}
          />
        </div>

        {/* Date and Time Selection */}
        {selectedServiceId && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Select Time
              </CardTitle>
              <CardDescription className="flex items-center justify-between">
                <span>Same-day service available</span>
                <button
                  onClick={() => {
                    // Toggle between today and date picker
                    const today = new Date().toISOString().split('T')[0];
                    if (selectedDate === today) {
                      // Show date picker options for next few days
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      setSelectedDate(tomorrow.toISOString().split('T')[0]);
                    } else {
                      setSelectedDate(today);
                    }
                  }}
                  className="text-[#8c52ff] text-sm font-medium hover:underline"
                >
                  {selectedDate === new Date().toISOString().split('T')[0] 
                    ? "Schedule for later?" 
                    : "Back to today"
                  }
                </button>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Date Selection (only show if not today) */}
              {selectedDate !== new Date().toISOString().split('T')[0] && (
                <div className="mb-6">
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {getDateOptions().slice(1, 8).map((date) => (
                      <button
                        key={date}
                        onClick={() => setSelectedDate(date)}
                        className={`flex-shrink-0 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          selectedDate === date
                            ? "border-[#8c52ff] bg-[#8c52ff]/5 text-[#8c52ff]"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        {formatDate(date)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Time Slots */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {timeSlots
                  ?.filter(slot => 
                    slot.date === selectedDate && 
                    slot.isAvailable && 
                    slot.currentBookings < slot.maxBookings
                  )
                  .map((timeSlot) => (
                    <Button
                      key={timeSlot.id}
                      variant="outline"
                      className="flex flex-col items-center p-4 h-auto hover:border-[#8c52ff] hover:bg-[#8c52ff]/5"
                      onClick={() => handleTimeSlotSelect(timeSlot)}
                    >
                      <Clock className="h-4 w-4 mb-1" />
                      <span className="font-medium">
                        {formatTime(timeSlot.startTime)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {timeSlot.maxBookings - timeSlot.currentBookings} spots left
                      </span>
                    </Button>
                  ))}
              </div>
              
              {timeSlots?.filter(slot => 
                slot.date === selectedDate && 
                slot.isAvailable && 
                slot.currentBookings < slot.maxBookings
              ).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No available time slots for {selectedDate === new Date().toISOString().split('T')[0] ? 'today' : 'this date'}</p>
                  <p className="text-sm">
                    {selectedDate === new Date().toISOString().split('T')[0] 
                      ? "Try scheduling for tomorrow" 
                      : "Please try another date"
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent Bookings */}
        {user && bookings && bookings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Bookings</CardTitle>
              <CardDescription>Your booking history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bookings.slice(0, 3).map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="font-medium">{booking.priceTier}</p>
                      <p className="text-sm text-muted-foreground">
                        {booking.date} at {booking.time}
                      </p>
                    </div>
                    <Badge variant={
                      booking.status === 'completed' ? 'default' :
                      booking.status === 'in_progress' ? 'secondary' :
                      booking.status === 'confirmed' ? 'outline' : 'destructive'
                    }>
                      {booking.status}
                    </Badge>
                  </div>
                ))}
              </div>
              
              {bookings.length > 3 && (
                <div className="mt-4 text-center">
                  <Link href="/activity">
                    <Button variant="ghost" size="sm" className="text-[#8c52ff]">
                      View all bookings
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Booking Dialog */}
      {bookingOpen && selectedServiceId && selectedTimeSlotId && provider && (
        <BookingDialog
          open={bookingOpen}
          onClose={() => setBookingOpen(false)}
          provider={provider}
          serviceId={selectedServiceId}
          timeSlotId={selectedTimeSlotId}
        />
      )}
    </div>
  );
}