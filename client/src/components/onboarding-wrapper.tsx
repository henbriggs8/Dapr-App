import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface OnboardingWrapperProps {
  children: React.ReactNode;
}

export function OnboardingWrapper({ children }: OnboardingWrapperProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Only check onboarding for regular users (not admin/provider)
    if (user && !user.isAdmin && !user.isProvider) {
      const hasCompletedOnboarding = localStorage.getItem("onboardingCompleted");
      const hasAddress = localStorage.getItem("userAddress");
      const hasVehicle = localStorage.getItem("userVehicle");
      
      // If onboarding not completed, redirect to appropriate step
      if (!hasCompletedOnboarding) {
        if (!hasAddress) {
          setLocation("/onboarding/address");
          return;
        }
        if (!hasVehicle) {
          setLocation("/onboarding/car-profile");
          return;
        }
        // If has address and vehicle but not completed, show offer
        setLocation("/onboarding/first-wash-offer");
        return;
      }
    }
  }, [user, setLocation]);

  return <>{children}</>;
}