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

  // Desktop: show the public marketing landing page (auth-gated CTAs handle login).
  if (!isMobile) {
    return <HomeDesktop />;
  }

  // Mobile: keep existing behavior — require auth, then onboarding + home.
  if (!user) {
    return <Redirect to="/auth" />;
  }

  return (
    <OnboardingWrapper>
      <HomeScreen />
    </OnboardingWrapper>
  );
}
