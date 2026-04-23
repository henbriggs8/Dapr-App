import { useEffect, useState } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Booking } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckIcon, LucideAlertTriangle, ArrowLeft } from "lucide-react";
import { Loader2 } from "lucide-react";
import { CarWashSpinner } from "@/components/car-wash-spinner";

export default function PaymentSuccessPage() {
  const [match, params] = useRoute("/payment-success");
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get the booking ID from the query params
  const urlParams = new URLSearchParams(window.location.search);
  const bookingId = urlParams.get("booking");

  useEffect(() => {
    const verifyPayment = async () => {
      if (!bookingId) {
        setError("No booking ID provided");
        setLoading(false);
        return;
      }

      try {
        // Get booking details
        const bookingRes = await fetch(`/api/bookings/${bookingId}`);
        if (!bookingRes.ok) {
          throw new Error("Failed to fetch booking details");
        }
        
        const bookingData = await bookingRes.json();
        setBooking(bookingData);
        
        // Verify payment status
        const verifyRes = await fetch(`/api/bookings/${bookingId}/verify-payment`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          }
        });
        
        if (!verifyRes.ok) {
          throw new Error("Failed to verify payment");
        }
        
        const verifyData = await verifyRes.json();
        
        // Handle verification result
        if (verifyData.verified) {
          toast({
            title: "Payment Successful",
            description: "Your booking has been confirmed",
            variant: "default",
          });

          // Invalidate bookings query to refresh data
          queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });

          // Only NOW (after Square has actually confirmed payment) try to
          // deep-link back into the native iOS app so it can close the
          // in-app browser and route to the tracking page.
          try {
            const deepLink = `com.autodapper.app://payment-success?bookingId=${bookingId}`;
            console.log("[Payment] payment verified, firing success deep link:", deepLink);
            setTimeout(() => { window.location.href = deepLink; }, 250);
          } catch (e) {
            console.log("[Payment] success deep link failed", e);
          }
        } else {
          // Payment is still processing
          toast({
            title: "Payment Processing",
            description: "Your payment is being processed. We'll notify you when it's complete.",
            variant: "default",
          });
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Payment verification error:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred");
        setLoading(false);
        
        toast({
          title: "Verification Error",
          description: "There was an issue verifying your payment. Please contact support.",
          variant: "destructive",
        });
      }
    };

    verifyPayment();
  }, [bookingId, toast]);

  return (
    <div className="container mx-auto py-10 max-w-lg">
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Payment Status</CardTitle>
          <CardDescription>
            {loading ? "Verifying your payment..." : "Thank you for your payment!"}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex flex-col items-center">
          {loading ? (
            <div className="my-12 flex flex-col items-center">
              <CarWashSpinner size="lg" />
              <p className="mt-4 text-muted-foreground">Verifying payment status...</p>
            </div>
          ) : error ? (
            <div className="my-8 flex flex-col items-center">
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <LucideAlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-lg font-medium mb-2">Payment Verification Failed</h3>
              <p className="text-center text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => navigate("/")}>Return to Home</Button>
            </div>
          ) : (
            <div className="my-8 flex flex-col items-center">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <CheckIcon className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium mb-2">Thank You for Your Payment!</h3>
              <p className="text-center text-muted-foreground mb-6">
                {booking?.isPaid
                  ? "Your payment has been successfully processed and your booking is confirmed."
                  : "Your payment is being processed. We'll notify you when it's complete."}
              </p>
              
              {booking && (
                <div className="w-full bg-muted p-4 rounded-md mb-6">
                  <h4 className="font-medium mb-2">Booking Details</h4>
                  <p><span className="text-muted-foreground">Booking ID:</span> {booking.id}</p>
                  <p><span className="text-muted-foreground">Date:</span> {booking.date}</p>
                  <p><span className="text-muted-foreground">Time:</span> {booking.time}</p>
                  <p><span className="text-muted-foreground">Status:</span> 
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                      booking.status === 'confirmed' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {booking.status === 'confirmed' ? 'Confirmed' : 'Processing'}
                    </span>
                  </p>
                </div>
              )}
              
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => navigate("/")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Return to Home
                </Button>
                <Button onClick={() => navigate("/activity")}>
                  View My Bookings
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}