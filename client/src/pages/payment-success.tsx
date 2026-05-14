import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Capacitor } from "@capacitor/core";
import { resolveUrl, queryClient } from "@/lib/queryClient";
import { CarWashSpinner } from "@/components/car-wash-spinner";

// This page is the redirect target for Stripe after checkout.
//
// On iOS native:  fires the custom-scheme deep link so the DeepLinkHandler
//                 in App.tsx can close the in-app browser and route to /matching.
//                 The page content is never visible to the user.
//
// On web:         verifies payment server-side, then navigates in-app to /matching.

export default function PaymentSuccessPage() {
  const [, navigate] = useLocation();
  const [statusMsg, setStatusMsg] = useState("Confirming your payment…");

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
        navigate("/");
        return;
      }

      // ── iOS native ────────────────────────────────────────────────────────
      // Fire the deep link immediately. DeepLinkHandler closes the browser and
      // pushes /matching?booking=X into the in-app router.
      if (Capacitor.isNativePlatform()) {
        const deepLink = `com.autodapper.app://payment-success?bookingId=${bookingId}`;
        console.log("[PaymentSuccess] iOS — firing deep link:", deepLink);
        window.location.href = deepLink;
        return;
      }

      // ── Web ───────────────────────────────────────────────────────────────
      // Verify payment with the server, then route to /matching in-app.
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

  // Shown on web for < 1 second while we verify + redirect
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
      <CarWashSpinner size="lg" showText={false} />
      <p className="text-sm text-gray-500 animate-pulse">{statusMsg}</p>
    </div>
  );
}
