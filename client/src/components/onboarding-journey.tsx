import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronRight, Car, Calendar, MapPin, Star, Sparkles } from 'lucide-react';
import { Icon } from "@/components/ui/icon";
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { ImagePreloader } from './image-preloader';
import ReactConfetti from 'react-confetti';

interface OnboardingJourneyProps {
  onComplete: () => void;
  show: boolean;
}

export function OnboardingJourney({ onComplete, show }: OnboardingJourneyProps) {
  const [step, setStep] = useState(0);
  const [animatingOut, setAnimatingOut] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const { toast } = useToast();
  const [windowSize, setWindowSize] = useState({ 
    width: 0,
    height: 0
  });
  
  // Set window size after component mounts to avoid SSR issues
  useEffect(() => {
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight
    });
  }, []);
  
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const totalSteps = 5;
  
  const steps = [
    {
      title: "Welcome to Dapr",
      description: "Your premium car wash experience starts here",
      icon: Sparkles,
      tip: "We'll show you around the app in just a few steps",
      illustration: "/onboarding/welcome.svg"
    },
    {
      title: "Choose Your Service",
      description: "From a quick wash to full detailing, we've got you covered",
      icon: Car,
      tip: "Swipe through our service tiers to see what suits your needs",
      illustration: "/onboarding/services.svg"
    },
    {
      title: "Book Your Appointment",
      description: "Select a convenient time and location",
      icon: Calendar,
      tip: "You can schedule your service for today or plan ahead",
      illustration: "/onboarding/calendar.svg"
    },
    {
      title: "Track Your Service",
      description: "Watch your car transform in real time",
      icon: MapPin,
      tip: "Get live updates throughout your car wash experience",
      illustration: "/onboarding/tracking.svg"
    },
    {
      title: "Rate Your Experience",
      description: "Your feedback helps us improve",
      icon: Star,
      tip: "Let us know how we did after your service is complete",
      illustration: "/onboarding/rating.svg"
    }
  ];
  
  const handleNext = () => {
    if (step < totalSteps - 1) {
      setAnimatingOut(true);
      setTimeout(() => {
        setStep(step + 1);
        setAnimatingOut(false);
      }, 300);
    } else {
      // Show confetti celebration
      setShowConfetti(true);
      
      // Show completion toast
      toast({
        title: "You're all set!",
        description: "Now you're ready to enjoy Dapr services",
      });
      
      // Close onboarding after a delay to show confetti
      setTimeout(() => {
        setShowConfetti(false);
        onComplete();
      }, 3000);
    }
  };
  
  const handleSkip = () => {
    // Show skip toast
    toast({
      title: "Onboarding skipped",
      description: "You can always find help in the settings menu",
    });
    
    // Close onboarding
    onComplete();
  };
  
  const currentStep = steps[step];
  
  // Container variants for framer-motion
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.4,
        ease: "easeOut"
      }
    },
    exit: { 
      opacity: 0,
      y: -20,
      transition: { 
        duration: 0.3,
        ease: "easeIn"
      }
    }
  };
  
  // Icon variants for micro-animations
  const iconVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1,
      transition: { 
        delay: 0.2,
        duration: 0.3,
        type: "spring",
        stiffness: 200
      }
    }
  };
  
  // Gather all illustration paths for preloading
  const illustrationPaths = steps.map(step => step.illustration);
  
  // Only render if show is true
  if (!show) return null;
  
  return (
    <ImagePreloader imagePaths={illustrationPaths}>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
        {showConfetti && (
          <ReactConfetti
            width={windowSize.width}
            height={windowSize.height}
            colors={['#8c52ff', '#6930c3', '#ffffff', '#ffd700']}
            recycle={false}
            numberOfPieces={500}
          />
        )}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={containerVariants}
            initial="hidden"
            animate={animatingOut ? "exit" : "visible"}
            exit="exit"
            className="w-full max-w-md"
          >
            <Card className="w-full overflow-hidden border-[#8c52ff]/30">
              <div className="relative h-[220px] bg-gradient-to-r from-[#8c52ff]/90 to-[#6930c3] flex items-center justify-center">
                {/* Dapr logo */}
                <div className="absolute top-2 left-3 z-20">
                  <motion.img 
                    src="/assets/img/dapper-logo-white.png"
                    alt="Dapr Logo"
                    className="h-10 w-auto"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ 
                      opacity: 1, 
                      y: 0,
                      transition: { delay: 0.2, duration: 0.4 }
                    }}
                  />
                </div>
                
                {/* Decorative background elements */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-white/10" />
                  <div className="absolute top-20 -right-10 h-24 w-24 rounded-full bg-white/10" />
                  <div className="absolute -bottom-10 left-20 h-32 w-32 rounded-full bg-white/10" />
                </div>
                
                {/* Illustration with animation */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1,
                    transition: { delay: 0.1, duration: 0.4 }
                  }}
                  className="absolute inset-0 flex items-center justify-center p-4"
                >
                  <img 
                    src={currentStep.illustration} 
                    alt={currentStep.title}
                    className="max-h-[180px] object-contain z-10"
                  />
                </motion.div>
                
                {/* Icon with micro-interaction */}
                <motion.div
                  variants={iconVariants}
                  initial="hidden"
                  animate="visible"
                  className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center z-10 absolute bottom-0 right-6 translate-y-1/2"
                >
                  {currentStep.icon && <Icon icon={currentStep.icon} size="xl" className="text-white" />}
                </motion.div>
              </div>
            
              <div className="px-6 pt-6">
                <h3 className="text-xl font-semibold text-center">{currentStep.title}</h3>
                <p className="text-center text-muted-foreground mt-1">{currentStep.description}</p>
              </div>
              
              <CardContent className="p-6">
                <div className="flex items-center text-sm text-muted-foreground mb-6 p-3 bg-muted/50 rounded-md">
                  <div className="h-8 w-8 rounded-full bg-[#8c52ff]/10 flex items-center justify-center mr-3">
                    <Icon icon={Sparkles} size="sm" className="text-[#8c52ff]" />
                  </div>
                  <p>{currentStep.tip}</p>
                </div>
                
                <div className="mt-4 space-y-3">
                  <Progress 
                    value={((step + 1) / totalSteps) * 100} 
                    className="h-1"
                  />
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Step {step + 1} of {totalSteps}</span>
                    <span>{Math.round(((step + 1) / totalSteps) * 100)}% Complete</span>
                  </div>
                  
                  <div className="flex gap-2 mt-6">
                    <Button 
                      variant="outline"
                      onClick={handleSkip}
                      className="flex-1 bg-transparent"
                    >
                      Skip Tour
                    </Button>
                    <Button 
                      onClick={handleNext}
                      className="flex-1 bg-[#8c52ff] hover:bg-[#7b45e0]"
                    >
                      {step < totalSteps - 1 ? (
                        <>
                          Next
                          <Icon icon={ChevronRight} size="sm" className="ml-1" />
                        </>
                      ) : 'Get Started'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </ImagePreloader>
  );
}