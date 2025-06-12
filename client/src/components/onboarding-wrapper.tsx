import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";

interface OnboardingWrapperProps {
  children: React.ReactNode;
}

export function OnboardingWrapper({ children }: OnboardingWrapperProps) {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [shouldCheckOnboarding, setShouldCheckOnboarding] = useState(true);

  useEffect(() => {
    // Only check onboarding for regular users (not admin/provider) and only once
    if (user && !user.isAdmin && !user.isProvider && shouldCheckOnboarding) {
      // Prevent checking onboarding if already on an onboarding page
      if (location.startsWith("/onboarding/")) {
        setShouldCheckOnboarding(false);
        return;
      }

      const hasCompletedOnboarding = localStorage.getItem("onboardingCompleted");
      const hasAddress = localStorage.getItem("userAddress");
      const hasVehicle = localStorage.getItem("userVehicle");
      
      // If onboarding not completed, redirect to appropriate step
      if (!hasCompletedOnboarding) {
        if (!hasAddress) {
          setLocation("/onboarding/address");
          setShouldCheckOnboarding(false);
          return;
        }
        if (!hasVehicle) {
          setLocation("/onboarding/car-profile");
          setShouldCheckOnboarding(false);
          return;
        }
        // If has address and vehicle but not completed, show offer
        setLocation("/onboarding/first-wash-offer");
        setShouldCheckOnboarding(false);
        return;
      }
      
      setShouldCheckOnboarding(false);
    }
  }, [user, location, setLocation, shouldCheckOnboarding]);

  return <>{children}</>;
}