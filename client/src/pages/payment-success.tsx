import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Capacitor } from "@capacitor/core";
import { resolveUrl, queryClient } from "@/lib/queryClient";
import { CarWashSpinner } from "@/components/car-wash-spinner";
import { AlertCircle } from "lucide-react";
import { Icon } from "@/components/ui/icon";

export default function PaymentSuccessPage() {
  const [, navigate] = useLocation();
  const [statusMsg, setStatusMsg] = useState("Confirming your payment…");
  const [error, setError] = useState(false);

  const bookingId = (() => {
    try {
      const id = new URLSearchParams(window.location.search).get("booking");
      return id || sessionStorage.getItem("pendingPaymentBookingId") || null;
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    const run = async () => {
      if (!bookingId) {
        setError(true);
        return;
      }

      if (Capacitor.isNativePlatform()) {
        const deepLink = `com.autodapper.app://payment-success?bookingId=${bookingId}`;
        window.location.href = deepLink;
        return;
      }

      try {
        setStatusMsg("Verifying payment…");
        const res = await fetch(resolveUrl(`/api/bookings/${bookingId}/verify-payment`), {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (res.ok) {
          queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
          queryClient.invalidateQueries({ queryKey: [`/api/bookings/${bookingId}`] });
        }
      } catch (e) {
        console.error("[PaymentSuccess] verify error:", e);
      } finally {
        setStatusMsg("Payment confirmed! Finding your Pro…");
        setTimeout(() => navigate(`/matching?booking=${bookingId}`), 600);
      }
    };

    run();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 px-6">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
          <Icon icon={AlertCircle} size="xl" className="text-red-500" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">We couldn't confirm your booking</h2>
          <p className="text-sm text-gray-500 mb-6">
            Your payment may have gone through. Please contact support and we'll sort it out.
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => navigate("/activity")}
            className="w-full py-3 bg-[#8c52ff] text-white rounded-xl text-sm font-semibold"
          >
            View My Bookings
          </button>
          <button
            onClick={() => navigate("/faq")}
            className="w-full py-3 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold"
          >
            Contact Support
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
      <CarWashSpinner size="lg" showText={false} />
      <p className="text-sm text-gray-500 animate-pulse">{statusMsg}</p>
    </div>
  );
}
