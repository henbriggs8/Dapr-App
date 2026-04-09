import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";

interface OnboardingWrapperProps {
  children: React.ReactNode;
}

export function OnboardingWrapper({ children }: OnboardingWrapperProps) {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user || user.isAdmin || user.isProvider || checked) return;
    if (location.startsWith("/onboarding/")) { setChecked(true); return; }

    const onboardingCompleted = localStorage.getItem("onboardingCompleted");
    if (onboardingCompleted) { setChecked(true); return; }

    const hasName    = localStorage.getItem("userName");
    const hasVehicle = localStorage.getItem("userVehicle");
    const skippedVehicle = localStorage.getItem("skipVehicle");

    if (!hasName) {
      setLocation("/onboarding/name");
    } else if (!hasVehicle && !skippedVehicle) {
      setLocation("/onboarding/car-profile");
    } else {
      localStorage.setItem("onboardingCompleted", "true");
    }

    setChecked(true);
  }, [user, location, setLocation, checked]);

  return <>{children}</>;
}
