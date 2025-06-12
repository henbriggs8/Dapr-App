import { OnboardingWrapper } from "@/components/onboarding-wrapper";
import HomeScreen from "@/pages/home-screen";

export function HomeWithOnboarding() {
  return (
    <OnboardingWrapper>
      <HomeScreen />
    </OnboardingWrapper>
  );
}