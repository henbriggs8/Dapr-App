import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import { OnboardingJourney } from './onboarding-journey';

export function OnboardingButton() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  const handleOpenOnboarding = () => {
    setShowOnboarding(true);
  };
  
  const handleCompleteOnboarding = () => {
    setShowOnboarding(false);
  };
  
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 gap-2 bg-white shadow-md border-[#8c52ff]/30 z-40 text-[#8c52ff] hover:bg-[#8c52ff]/5 hover:border-[#8c52ff] transition-all duration-300 animate-pulse-subtle"
        onClick={handleOpenOnboarding}
      >
        <HelpCircle className="h-4 w-4" />
        <span>Tour Dapper</span>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8c52ff] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#8c52ff]"></span>
        </span>
      </Button>
      
      <OnboardingJourney 
        show={showOnboarding} 
        onComplete={handleCompleteOnboarding}
      />
    </>
  );
}