import { CarWashSpinner } from "@/components/car-wash-spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import { 
  Check, 
  Navigation, 
  CarFront, 
  Droplets, 
  Brush, 
  SprayCan,
  Clock
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

// Define the service stages
const serviceStages = [
  {
    id: 1,
    name: "Dispatch",
    description: "Detail pro is on their way",
    icon: Navigation,
    duration: 5  // in seconds for demo
  },
  {
    id: 2,
    name: "Arrival",
    description: "Detail pro is at your location",
    icon: CarFront,
    duration: 5
  },
  {
    id: 3,
    name: "Exterior Washing",
    description: "Detail pro is washing the exterior",
    icon: Droplets,
    duration: 8
  },
  {
    id: 4,
    name: "Interior Cleaning",
    description: "Your interior is now being done",
    icon: Brush,
    duration: 8
  },
  {
    id: 5,
    name: "Finishing",
    description: "Applying finishing touches",
    icon: SprayCan,
    duration: 4
  },
  {
    id: 6,
    name: "Complete",
    description: "Your service is now complete!",
    icon: Check,
    duration: 0
  }
];

export default function SpinnerDemo() {
  const { toast } = useToast();
  const [showText, setShowText] = useState(true);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [trackingActive, setTrackingActive] = useState(false);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(0);
  
  // Calculate total estimated time
  const totalDuration = serviceStages.reduce((total, stage) => total + stage.duration, 0);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let progressTimer: NodeJS.Timeout | null = null;
    
    if (trackingActive && currentStage < serviceStages.length) {
      // Update remaining time
      const remainingStages = serviceStages.slice(currentStage);
      const timeRemaining = remainingStages.reduce((total, stage) => total + stage.duration, 0);
      setEstimatedTimeRemaining(timeRemaining);
      
      // Progress animation
      let stageProgress = 0;
      const stageDuration = serviceStages[currentStage]?.duration || 1;
      
      progressTimer = setInterval(() => {
        stageProgress += 1;
        const overallProgress = 
          ((currentStage / serviceStages.length) * 100) + 
          ((stageProgress / stageDuration) * (100 / serviceStages.length));
        
        setProgress(Math.min(overallProgress, 100));
        
        // Update estimated time
        const updatedTimeRemaining = timeRemaining - (stageProgress / stageDuration) * stageDuration;
        setEstimatedTimeRemaining(Math.max(0, updatedTimeRemaining));
      }, 1000);
      
      // Stage transition
      timer = setTimeout(() => {
        if (currentStage < serviceStages.length - 1) {
          setCurrentStage(current => current + 1);
          
          // Notify of stage change
          toast({
            title: serviceStages[currentStage + 1].name,
            description: serviceStages[currentStage + 1].description,
          });
        } else {
          setTrackingActive(false);
          toast({
            title: "Service Complete!",
            description: "Your car service has been completed successfully.",
            variant: "default",
          });
        }
      }, stageDuration * 1000);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
      if (progressTimer) clearInterval(progressTimer);
    };
  }, [currentStage, trackingActive, toast]);

  const startServiceTracking = () => {
    setTrackingActive(true);
    setCurrentStage(0);
    setProgress(0);
    toast({
      title: serviceStages[0].name,
      description: serviceStages[0].description,
    });
  };

  const resetTracking = () => {
    setTrackingActive(false);
    setCurrentStage(0);
    setProgress(0);
  };

  const startLoadingDemo = () => {
    setLoadingDemo(true);
    toast({
      title: "Loading Demo Started",
      description: "The spinner will automatically stop after 3 seconds",
    });
    setTimeout(() => {
      setLoadingDemo(false);
      toast({
        title: "Loading Complete!",
        description: "Demo loading process has finished",
        variant: "default",
      });
    }, 3000);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Car Wash Service Tracker</h1>
        <Link href="/">
          <Button>Back to Home</Button>
        </Link>
      </div>

      {trackingActive ? (
        <div className="mb-10">
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle>Your Service Progress</CardTitle>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Estimated time: {Math.ceil(estimatedTimeRemaining)} {Math.ceil(estimatedTimeRemaining) === 1 ? 'minute' : 'minutes'} remaining
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Progress value={progress} className="h-2" />
              </div>
              
              <div className="mt-8">
                <div className="relative">
                  {/* Progress line */}
                  <div className="absolute left-6 top-0 bottom-0 w-[2px] bg-muted" />
                  
                  {/* Service stages */}
                  <div className="space-y-8">
                    {serviceStages.map((stage, index) => {
                      const StageIcon = stage.icon;
                      const isActive = index === currentStage;
                      const isCompleted = index < currentStage;
                      
                      return (
                        <div key={stage.id} className="relative flex items-start">
                          <div className="absolute left-0 top-0 flex h-12 w-12 items-center justify-center">
                            <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 ${
                              isActive 
                                ? 'border-primary bg-primary/10'
                                : isCompleted
                                  ? 'border-primary/50 bg-primary/10'
                                  : 'border-muted bg-muted/10'
                            }`}>
                              <StageIcon className={`h-5 w-5 ${
                                isActive 
                                  ? 'text-primary'
                                  : isCompleted
                                    ? 'text-primary/70'
                                    : 'text-muted-foreground/50'
                              }`} />
                            </div>
                          </div>
                          
                          <div className="ml-16">
                            <div className="flex items-center">
                              <h3 className={`font-medium ${
                                isActive
                                  ? 'text-foreground'
                                  : isCompleted
                                    ? 'text-foreground/70'
                                    : 'text-muted-foreground'
                              }`}>
                                {stage.name}
                              </h3>
                              
                              {isActive && (
                                <Badge className="ml-2 bg-primary/20 text-primary border-primary/30">
                                  In Progress
                                </Badge>
                              )}
                              
                              {isCompleted && (
                                <Badge className="ml-2 bg-green-100 text-green-800 border-green-200">
                                  Completed
                                </Badge>
                              )}
                            </div>
                            
                            <p className={`mt-1 text-sm ${
                              isActive
                                ? 'text-muted-foreground'
                                : isCompleted
                                  ? 'text-muted-foreground/70'
                                  : 'text-muted-foreground/50'
                            }`}>
                              {stage.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-center">
            <Button variant="outline" onClick={resetTracking}>
              Reset Tracking Demo
            </Button>
          </div>
        </div>
      ) : loadingDemo ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <CarWashSpinner size="lg" showText={showText} />
        </div>
      ) : (
        <>
          <Card className="mb-10">
            <CardHeader>
              <CardTitle>Service Tracking Demo</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-center w-full">
                <CarWashSpinner 
                  size="lg" 
                  showText={true} 
                  text="Track your service progress in real-time" 
                />
              </div>
              <div className="mt-4">
                <Button onClick={startServiceTracking} className="w-full sm:w-auto">
                  Start Service Tracking Demo
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Small Spinner</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <CarWashSpinner size="sm" showText={showText} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Medium Spinner</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <CarWashSpinner size="md" showText={showText} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Large Spinner</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <CarWashSpinner size="lg" showText={showText} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Interactive Demo</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Switch 
                    id="show-text-mode" 
                    checked={showText}
                    onCheckedChange={setShowText}
                  />
                  <Label htmlFor="show-text-mode">Show Text</Label>
                </div>
                <Button onClick={startLoadingDemo}>
                  Start Loading Demo
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}