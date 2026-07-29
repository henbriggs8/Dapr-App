import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { OnboardingWrapper } from "@/components/onboarding-wrapper";
import HomeScreen from "@/pages/home-screen";
import HomeDesktop from "@/pages/home-desktop";

export function HomeWithOnboarding() {
  const isMobile = useIsMobile();
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Icon icon={Loader2} size="xl" className="animate-spin text-border" />
      </div>
    );
  }

  // Authenticated mobile users: onboarding flow + home screen dashboard.
  if (isMobile && user) {
    return (
      <OnboardingWrapper>
        <HomeScreen />
      </OnboardingWrapper>
    );
  }

  // All other cases (desktop always, mobile unauthenticated): marketing landing page.
  return <HomeDesktop />;
}
