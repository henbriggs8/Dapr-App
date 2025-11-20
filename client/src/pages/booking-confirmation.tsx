import { useEffect, useState } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Calendar, Clock, MapPin, Car, ArrowRight, Home, RefreshCw, User, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Booking, Service, TimeSlot, User as UserType } from "@shared/schema";
import { CarWashSpinner } from "@/components/car-wash-spinner";
import confetti from "react-confetti";

export default function BookingConfirmation() {
  const [match, params] = useRoute("/booking-confirmation");
  const [, navigate] = useLocation();
  const [showConfetti, setShowConfetti] = useState(true);
  const [bookingId, setBookingId] = useState<number | null>(null);

  // Get booking ID from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("booking");
    if (id) {
      setBookingId(parseInt(id));
    }
  }, []);

  // Stop confetti after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Fetch booking details
  const { data: bookings, isLoading: isLoadingBookings } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
    enabled: !!bookingId,
  });

  // Fetch services
  const { data: services, isLoading: isLoadingServices } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    enabled: !!bookingId,
  });

  // Fetch time slots
  const { data: timeSlots, isLoading: isLoadingTimeSlots } = useQuery<TimeSlot[]>({
    queryKey: ["/api/timeslots"],
    enabled: !!bookingId,
  });

  // Fetch providers
  const { data: providers, isLoading: isLoadingProviders } = useQuery<UserType[]>({
    queryKey: ["/api/providers"],
    enabled: !!bookingId,
  });

  const isLoading = isLoadingBookings || isLoadingServices || isLoadingTimeSlots || isLoadingProviders;
  
  // Countdown timer state
  const [timeUntilService, setTimeUntilService] = useState<string>("");

  // Find the specific booking
  const booking = bookingId && bookings ? bookings.find(b => b.id === bookingId) : null;
  const service = booking && services ? services.find(s => s.id === booking.serviceId) : null;
  const timeSlot = booking && timeSlots ? timeSlots.find(t => t.id === booking.timeSlotId) : null;
  const provider = providers && providers.length > 0 ? providers[0] : null;

  // Calculate time until service
  useEffect(() => {
    if (!timeSlot) return;

    const calculateTimeRemaining = () => {
      const serviceDateTime = new Date(`${timeSlot.date}T${timeSlot.startTime}`);
      const now = new Date();
      const diff = serviceDateTime.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeUntilService("Service time has passed");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeUntilService(`${days} day${days > 1 ? 's' : ''}, ${hours} hour${hours > 1 ? 's' : ''}`);
      } else if (hours > 0) {
        setTimeUntilService(`${hours} hour${hours > 1 ? 's' : ''}, ${minutes} minute${minutes > 1 ? 's' : ''}`);
      } else {
        setTimeUntilService(`${minutes} minute${minutes > 1 ? 's' : ''}`);
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [timeSlot]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
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
        weekday: 'long',
        year: 'numeric',
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <CarWashSpinner size="lg" showText text="Loading confirmation..." />
      </div>
    );
  }

  if (!bookingId) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">No Booking Selected</CardTitle>
            <CardDescription>
              To view a booking confirmation, you need to access this page through the booking process or with a valid booking ID.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={() => navigate("/booking")} 
              className="w-full bg-[#8c52ff] hover:bg-[#8c52ff]/90"
            >
              Book a Service
            </Button>
            <Button 
              onClick={() => navigate("/activity")} 
              variant="outline"
              className="w-full"
            >
              View Booking History
            </Button>
            <Button 
              onClick={() => navigate("/")} 
              variant="outline"
              className="w-full"
            >
              <Home className="h-4 w-4 mr-2" />
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!booking || !service || !timeSlot) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Booking Not Found</CardTitle>
            <CardDescription>
              We couldn't find booking #{bookingId}. Please check your booking history or contact support.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={() => navigate("/activity")} 
              className="w-full bg-[#8c52ff] hover:bg-[#8c52ff]/90"
            >
              View Booking History
            </Button>
            <Button 
              onClick={() => navigate("/")} 
              variant="outline"
              className="w-full"
            >
              <Home className="h-4 w-4 mr-2" />
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#8c52ff]/5 to-blue-50 p-4 relative overflow-hidden">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <div 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: `
                radial-gradient(circle at 20% 50%, rgba(140, 82, 255, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 40% 80%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)
              `,
              opacity: showConfetti ? 1 : 0,
              transition: 'opacity 3s ease-in-out'
            }}
          />
        </div>
      )}

      <div className="max-w-2xl mx-auto pt-8 pb-20">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6 relative">
            <CheckCircle className="h-10 w-10 text-green-600" />
            <div className="absolute -top-1 -right-1">
              <div className="w-6 h-6 bg-[#8c52ff] rounded-full animate-pulse" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Hitting the restart button on your car
          </h1>
          
          <p className="text-lg text-gray-600 mb-6">
            Your appointment has been confirmed and sent to your detail pro!
          </p>

          <div className="flex items-center justify-center gap-2 text-sm text-[#8c52ff] bg-[#8c52ff]/10 rounded-full px-4 py-2 inline-flex">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Processing your request...</span>
          </div>
        </div>

        {/* Countdown Timer Card */}
        {timeUntilService && (
          <Card className="mb-6 bg-gradient-to-br from-[#8c52ff] to-purple-600 text-white border-none shadow-lg">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-sm font-medium opacity-90 mb-2">Service Appointment In</div>
                <div className="text-4xl font-bold mb-2">{timeUntilService}</div>
                <div className="flex items-center justify-center gap-2 text-sm opacity-90">
                  <Clock className="h-4 w-4" />
                  <span>{timeSlot && formatDate(timeSlot.date)} at {timeSlot && formatTime(timeSlot.startTime)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Provider Card */}
        {provider && (
          <Card className="mb-6 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-[#8c52ff]" />
                Your Service Professional
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-[#8c52ff] to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {provider.name ? provider.name.charAt(0) : 'D'}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{provider.name || 'Dapper Service Pro'}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{provider.rating || '5.0'}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      • {provider.ratingCount || '0'} services completed
                    </span>
                  </div>
                  {provider.description && (
                    <p className="text-sm text-gray-600 mt-2">{provider.description}</p>
                  )}
                </div>
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="text-sm text-blue-800">
                  <strong>{provider.name || 'Your pro'}</strong> will contact you shortly to confirm your appointment and answer any questions.
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Booking Details Card */}
        <Card className="mb-6 border-2 border-green-200 shadow-lg">
          <CardHeader className="bg-green-50">
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Car className="h-5 w-5" />
              Booking Confirmation
            </CardTitle>
            <CardDescription className="text-green-700">
              Booking #{booking.id} • {service.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {/* Service Details */}
            <div className="flex items-center justify-between pb-4 border-b">
              <div>
                <h3 className="font-semibold text-gray-900">{service.name}</h3>
                <p className="text-sm text-gray-600">{service.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge 
                    variant="outline" 
                    className={
                      service.category === 'basic' ? 'border-blue-200 text-blue-700' :
                      service.category === 'standard' ? 'border-purple-200 text-purple-700' :
                      'border-amber-200 text-amber-700'
                    }
                  >
                    {service.category.charAt(0).toUpperCase() + service.category.slice(1)}
                  </Badge>
                  <span className="text-xs text-gray-500">• {service.duration} minutes</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[#8c52ff]">
                  {formatPrice(service.price)}
                </div>
              </div>
            </div>

            {/* Appointment Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Calendar className="h-5 w-5 text-[#8c52ff]" />
                <div>
                  <div className="text-sm text-gray-600">Date</div>
                  <div className="font-medium">{formatDate(timeSlot.date)}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Clock className="h-5 w-5 text-[#8c52ff]" />
                <div>
                  <div className="text-sm text-gray-600">Time</div>
                  <div className="font-medium">{formatTime(timeSlot.startTime)}</div>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <MapPin className="h-5 w-5 text-[#8c52ff] mt-0.5" />
              <div>
                <div className="text-sm text-gray-600">Service Location</div>
                <div className="font-medium">{booking.serviceLocation}</div>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-center">
                <div className="text-blue-800 font-medium">Status: Confirmed</div>
                <div className="text-sm text-blue-600 mt-1">
                  Your detail pro will be notified and will contact you shortly
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">What happens next?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-[#8c52ff] text-white rounded-full flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div>
                <div className="font-medium">Provider Assignment</div>
                <div className="text-sm text-gray-600">
                  Your request is being matched with an available detail pro in your area
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-[#8c52ff] text-white rounded-full flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div>
                <div className="font-medium">Confirmation Call</div>
                <div className="text-sm text-gray-600">
                  Your detail pro will contact you to confirm the appointment details
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-bold">
                3
              </div>
              <div>
                <div className="font-medium text-gray-500">Service Day</div>
                <div className="text-sm text-gray-400">
                  Your detail pro will arrive at the scheduled time to service your vehicle
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            onClick={() => navigate(`/booking-details?id=${booking.id}`)}
            className="w-full bg-[#8c52ff] hover:bg-[#8c52ff]/90 text-white py-3"
            size="lg"
          >
            View Booking Details
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          
          <Button 
            onClick={() => navigate("/")}
            variant="outline"
            className="w-full py-3"
            size="lg"
          >
            <Home className="h-4 w-4 mr-2" />
            Return to Home
          </Button>
        </div>

        {/* Support Note */}
        <div className="text-center mt-8 p-4 bg-white rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">
            Need to make changes or have questions about your booking?
          </p>
          <p className="text-sm text-[#8c52ff] font-medium mt-1">
            Contact us at support@dapper.com or (555) 123-WASH
          </p>
        </div>
      </div>


    </div>
  );
}