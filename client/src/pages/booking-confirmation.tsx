import { useLocation } from "wouter";
import { CheckCircle, Clock, MapPin, Car, Phone, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import Confetti from "react-confetti";

export default function BookingConfirmation() {
  const [, setLocation] = useLocation();
  const [showConfetti, setShowConfetti] = useState(true);
  const [countdown, setCountdown] = useState(8);
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  // Get booking details from URL params or localStorage
  const urlParams = new URLSearchParams(window.location.search);
  const bookingId = urlParams.get('bookingId');
  
  const { data: booking } = useQuery({
    queryKey: [`/api/bookings/${bookingId}`],
    enabled: !!bookingId,
  });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    
    // Stop confetti after 3 seconds
    const confettiTimer = setTimeout(() => {
      setShowConfetti(false);
    }, 3000);

    // Auto-redirect to service progress after 8 seconds
    const redirectTimer = setTimeout(() => {
      setLocation(`/service-progress?bookingId=${bookingId}`);
    }, 8000);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(confettiTimer);
      clearTimeout(redirectTimer);
    };
  }, [bookingId, setLocation]);

  const estimatedArrival = new Date(Date.now() + 30 * 60000); // 30 minutes from now

  return (
    <div className="min-h-screen bg-gray-50 px-4 pt-8 pb-20">
      {showConfetti && (
        <Confetti
          width={dimensions.width}
          height={dimensions.height}
          recycle={false}
          numberOfPieces={200}
          gravity={0.3}
        />
      )}

      <div className="max-w-md mx-auto space-y-6">
        {/* Success Header */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center space-y-4"
        >
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Booking Confirmed!</h1>
            <p className="text-gray-600 mt-2">Your car wash is on the way</p>
          </div>
        </motion.div>

        {/* Booking Details Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Booking ID</span>
                <span className="font-mono text-sm">#{bookingId || 'D123456'}</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-medium">Estimated Arrival</div>
                  <div className="text-sm text-gray-600">
                    {estimatedArrival.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })} - {new Date(estimatedArrival.getTime() + 15 * 60000).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-red-600" />
                <div>
                  <div className="font-medium">Service Location</div>
                  <div className="text-sm text-gray-600">
                    {(booking as any)?.serviceLocation || "Your saved address"}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Car className="w-5 h-5 text-purple-600" />
                <div>
                  <div className="font-medium">Vehicle</div>
                  <div className="text-sm text-gray-600">
                    {(() => {
                      try {
                        const vehicle = JSON.parse(localStorage.getItem("userVehicle") || "{}");
                        return `${vehicle.year} ${vehicle.make} ${vehicle.model}` || "Your vehicle";
                      } catch {
                        return "Your vehicle";
                      }
                    })()}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-medium">Service</div>
                  <div className="text-sm text-gray-600">
                    {(booking as any)?.serviceName || "The OG"} - ${(booking as any)?.totalPrice || "58"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Provider Contact */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <Car className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-medium">Your Dapper Pro</div>
                    <div className="text-sm text-gray-600">Marcus Johnson</div>
                  </div>
                </div>
                <Button size="sm" variant="outline">
                  <Phone className="w-4 h-4 mr-1" />
                  Call
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Next Steps */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="bg-blue-50 rounded-lg p-4"
        >
          <h3 className="font-medium text-blue-900 mb-2">What happens next?</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start space-x-2">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2"></div>
              <span>Your Dapper Pro will arrive at the estimated time</span>
            </li>
            <li className="flex items-start space-x-2">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2"></div>
              <span>You'll receive real-time updates via SMS</span>
            </li>
            <li className="flex items-start space-x-2">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2"></div>
              <span>No need to be present - we'll take care of everything</span>
            </li>
          </ul>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.0 }}
          className="space-y-3"
        >
          <Button 
            className="w-full h-12 bg-[#8c52ff] hover:bg-[#7c47e6]"
            onClick={() => setLocation(`/service-progress?bookingId=${bookingId}`)}
          >
            Track Your Service
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full h-12"
            onClick={() => setLocation("/")}
          >
            Back to Home
          </Button>
        </motion.div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 pt-4">
          Need help? Call us at <span className="text-purple-600 font-medium">(555) 123-WASH</span>
        </div>
      </div>
    </div>
  );
}