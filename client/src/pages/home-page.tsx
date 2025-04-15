import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { User, Service, TimeSlot } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Calendar, Clock } from "lucide-react";
import { CarWashSpinner } from "@/components/car-wash-spinner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import BookingDialog from "@/components/booking-dialog";
import { Badge } from "@/components/ui/badge";
import PricingSlider from "@/components/pricing-slider";

export default function HomePage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [selectedTimeSlotId, setSelectedTimeSlotId] = useState<number | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  
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
  
  const isLoading = providersLoading || servicesLoading || timeSlotsLoading;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <CarWashSpinner size="lg" text="Loading your car wash details..." />
      </div>
    );
  }
  
  const provider = providers?.[0]; // Use the first provider (our single car wash company)
  
  const handleBookNow = () => {
    if (selectedServiceId && selectedTimeSlotId) {
      setBookingOpen(true);
    }
  };
  
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Generate the next 7 days for date selection
  const generateDateOptions = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      dates.push({
        value: dateString,
        label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : date.toLocaleDateString('en-US', { weekday: 'short' })
      });
    }
    
    return dates;
  };
  
  const dateOptions = generateDateOptions();

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">{provider?.name}</h1>
          <p className="text-muted-foreground">{provider?.description}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/spinner-demo">
            <Button variant="outline" className="flex items-center gap-2">
              <span className="relative">
                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Spinner Demo
            </Button>
          </Link>
          <Link href="/profile">
            <Button variant="outline">Profile</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-12">
        <div className="md:col-span-8">
          <div className="mb-8">
            <PricingSlider 
              onServiceSelect={(service) => setSelectedServiceId(service.id)} 
            />
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Available Time Slots</CardTitle>
              <CardDescription>Select a date and time for your appointment</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={dateOptions[0].value} onValueChange={setSelectedDate}>
                <TabsList className="grid grid-cols-7 w-full">
                  {dateOptions.map((date) => (
                    <TabsTrigger key={date.value} value={date.value}>
                      {date.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {dateOptions.map((date) => (
                  <TabsContent key={date.value} value={date.value}>
                    <div className="mt-4">
                      <h3 className="font-medium mb-2">{formatDate(date.value)}</h3>
                      <div className="grid grid-cols-4 gap-2">
                        {timeSlots?.filter(slot => slot.date === date.value).map((slot) => (
                          <Button 
                            key={slot.id} 
                            variant={selectedTimeSlotId === slot.id ? "default" : "outline"}
                            className="justify-center"
                            onClick={() => setSelectedTimeSlotId(slot.id)}
                            disabled={!slot.isAvailable || slot.currentBookings >= slot.maxBookings}
                          >
                            {slot.startTime}
                          </Button>
                        ))}
                        {timeSlots?.filter(slot => slot.date === date.value).length === 0 && (
                          <p className="text-muted-foreground col-span-4 py-4 text-center">
                            No available time slots for this date
                          </p>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={handleBookNow}
                disabled={!selectedServiceId || !selectedTimeSlotId}
              >
                Book Appointment
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        <div className="md:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Selection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedServiceId ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Service:</span>
                    <span>{services?.find(s => s.id === selectedServiceId)?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Price:</span>
                    <span>${services?.find(s => s.id === selectedServiceId)?.price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Duration:</span>
                    <span>{services?.find(s => s.id === selectedServiceId)?.duration} min</span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Please select a service</p>
              )}
              
              <div className="border-t pt-4">
                {selectedTimeSlotId ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Date:</span>
                      <span>{formatDate(timeSlots?.find(t => t.id === selectedTimeSlotId)?.date || '')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Time:</span>
                      <span>{timeSlots?.find(t => t.id === selectedTimeSlotId)?.startTime}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Please select a time slot</p>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={handleBookNow}
                disabled={!selectedServiceId || !selectedTimeSlotId}
              >
                Book Appointment
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
      
      {provider && bookingOpen && (
        <BookingDialog
          provider={provider}
          open={bookingOpen}
          onClose={() => setBookingOpen(false)}
          serviceId={selectedServiceId!}
          timeSlotId={selectedTimeSlotId!}
        />
      )}
    </div>
  );
}