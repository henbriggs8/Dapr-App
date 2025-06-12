import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  MapPin, 
  Clock, 
  Phone, 
  MessageCircle, 
  CheckCircle, 
  Car,
  Droplets,
  Wind,
  Sparkles,
  Timer,
  Navigation,
  AlertCircle,
  Star,
  Camera,
  ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

const DETAILED_SERVICE_STAGES = [
  { 
    key: "dispatched", 
    label: "Dispatched", 
    icon: Navigation, 
    description: "Your Dapper Pro has been assigned and is preparing",
    progress: 5,
    color: "bg-blue-100 text-blue-600"
  },
  { 
    key: "en_route", 
    label: "On the way", 
    icon: Car, 
    description: "Driving to your location with professional equipment",
    progress: 15,
    color: "bg-indigo-100 text-indigo-600"
  },
  { 
    key: "arrived", 
    label: "Arrived", 
    icon: MapPin, 
    description: "Setting up equipment and preparing your vehicle",
    progress: 25,
    color: "bg-purple-100 text-purple-600"
  },
  { 
    key: "inspection", 
    label: "Initial Inspection", 
    icon: Camera, 
    description: "Documenting vehicle condition and planning service",
    progress: 35,
    color: "bg-pink-100 text-pink-600"
  },
  { 
    key: "exterior_prep", 
    label: "Exterior Prep", 
    icon: Droplets, 
    description: "Pre-rinse and wheel cleaning",
    progress: 45,
    color: "bg-cyan-100 text-cyan-600"
  },
  { 
    key: "exterior_wash", 
    label: "Exterior Washing", 
    icon: Sparkles, 
    description: "Hand washing with premium soap and microfiber",
    progress: 60,
    color: "bg-green-100 text-green-600"
  },
  { 
    key: "interior_cleaning", 
    label: "Interior Cleaning", 
    icon: Car, 
    description: "Vacuuming, wiping surfaces, and detailing",
    progress: 80,
    color: "bg-yellow-100 text-yellow-600"
  },
  { 
    key: "final_touches", 
    label: "Final Touches", 
    icon: Wind, 
    description: "Drying, polishing, and quality inspection",
    progress: 95,
    color: "bg-orange-100 text-orange-600"
  },
  { 
    key: "completed", 
    label: "Complete", 
    icon: CheckCircle, 
    description: "Service completed - your vehicle is ready!",
    progress: 100,
    color: "bg-green-100 text-green-600"
  }
];

interface ServiceProgressProps {
  bookingId?: string;
}

export default function ServiceProgress() {
  const urlParams = new URLSearchParams(window.location.search);
  const bookingId = urlParams.get('bookingId');
  const [, setLocation] = useLocation();
  const [currentStage, setCurrentStage] = useState("dispatched");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [estimatedCompletion, setEstimatedCompletion] = useState(45);
  const [providerLocation, setProviderLocation] = useState({ lat: 40.7128, lng: -74.0060 });
  const [recentUpdates, setRecentUpdates] = useState([
    { time: "Just now", message: "Service has been dispatched", type: "info" },
    { time: "2 min ago", message: "Marcus is gathering equipment", type: "progress" },
    { time: "5 min ago", message: "Booking confirmed", type: "success" }
  ]);

  // Simulate real-time progress updates
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    // Simulate stage progression for demo
    const stageTimer = setInterval(() => {
      const currentIndex = DETAILED_SERVICE_STAGES.findIndex(stage => stage.key === currentStage);
      if (currentIndex < DETAILED_SERVICE_STAGES.length - 1) {
        const nextStage = DETAILED_SERVICE_STAGES[currentIndex + 1];
        setCurrentStage(nextStage.key);
        
        // Add update message
        setRecentUpdates(prev => [
          { 
            time: "Just now", 
            message: `${nextStage.label}: ${nextStage.description}`, 
            type: "progress" 
          },
          ...prev.slice(0, 4)
        ]);
        
        // Update estimated completion time
        setEstimatedCompletion(prev => Math.max(0, prev - 8));
      }
    }, 15000); // Change stage every 15 seconds for demo

    return () => {
      clearInterval(timer);
      clearInterval(stageTimer);
    };
  }, [currentStage]);

  const getCurrentStageData = () => {
    return DETAILED_SERVICE_STAGES.find(stage => stage.key === currentStage) || DETAILED_SERVICE_STAGES[0];
  };

  const getCurrentStageIndex = () => {
    return DETAILED_SERVICE_STAGES.findIndex(stage => stage.key === currentStage);
  };

  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatEstimatedTime = (minutes: number) => {
    if (minutes <= 0) return "Almost done!";
    if (minutes < 60) return `${minutes} min remaining`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m remaining`;
  };

  const currentStageData = getCurrentStageData();
  const currentStageIndex = getCurrentStageIndex();

  return (
    <div className="min-h-screen bg-gray-50 px-4 pt-4 pb-20">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setLocation("/")}
            className="p-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-bold">Service in Progress</h1>
          <div className="w-8"></div>
        </div>

        {/* Provider Info Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src="/placeholder-avatar.jpg" />
                  <AvatarFallback className="bg-purple-100 text-purple-600">
                    MJ
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">Marcus Johnson</div>
                  <div className="text-sm text-muted-foreground flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    Dapper Pro • 4.9★ • 2.1 mi away
                  </div>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button size="sm" variant="outline">
                  <Phone className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline">
                  <MessageCircle className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Status Card */}
        <Card className="border-2 border-purple-200 bg-purple-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <div className={`p-2 rounded-lg ${currentStageData.color}`}>
                  <currentStageData.icon className="w-5 h-5" />
                </div>
                <span>{currentStageData.label}</span>
              </CardTitle>
              <Badge variant="secondary" className="flex items-center space-x-1">
                <Timer className="w-3 h-3" />
                <span>{formatElapsedTime(elapsedTime)}</span>
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground ml-11">
              {currentStageData.description}
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Overall Progress</span>
                  <span>{currentStageData.progress}%</span>
                </div>
                <Progress value={currentStageData.progress} className="h-3" />
              </div>
              
              {currentStage !== "completed" && (
                <div className="flex items-center justify-between text-sm bg-white rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">ETA:</span>
                  </div>
                  <span className="text-blue-600 font-medium">
                    {formatEstimatedTime(estimatedCompletion)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Progress Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Service Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {DETAILED_SERVICE_STAGES.map((stage, index) => {
                const isCompleted = index < currentStageIndex;
                const isCurrent = index === currentStageIndex;
                const isUpcoming = index > currentStageIndex;
                const StageIcon = stage.icon;

                return (
                  <motion.div
                    key={stage.key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center space-x-3 relative ${
                      isCompleted ? 'opacity-100' : 
                      isCurrent ? 'opacity-100' : 
                      'opacity-50'
                    }`}
                  >
                    {/* Connecting Line */}
                    {index < DETAILED_SERVICE_STAGES.length - 1 && (
                      <div className={`absolute left-4 top-8 w-0.5 h-8 ${
                        isCompleted ? 'bg-green-400' : 
                        isCurrent ? 'bg-purple-400' : 
                        'bg-gray-200'
                      }`} />
                    )}
                    
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 relative ${
                      isCompleted 
                        ? 'bg-green-100 border-green-400 text-green-600' 
                        : isCurrent 
                        ? 'bg-purple-100 border-purple-400 text-purple-600' 
                        : 'bg-gray-100 border-gray-200 text-gray-400'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : isCurrent ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        >
                          <StageIcon className="w-4 h-4" />
                        </motion.div>
                      ) : (
                        <StageIcon className="w-4 h-4" />
                      )}
                      
                      {/* Pulse animation for current stage */}
                      {isCurrent && (
                        <motion.div
                          className="absolute inset-0 rounded-full bg-purple-400"
                          animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className={`font-medium ${
                        isCompleted || isCurrent ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        {stage.label}
                      </div>
                      {isCurrent && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-sm text-purple-600 font-medium"
                        >
                          In progress...
                        </motion.div>
                      )}
                      {isCompleted && (
                        <div className="text-xs text-green-600">
                          ✓ Completed
                        </div>
                      )}
                    </div>
                    
                    {isCompleted && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Done
                      </Badge>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Live Updates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live Updates</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <AnimatePresence>
                {recentUpdates.map((update, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start space-x-3 text-sm"
                  >
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      update.type === "success" ? "bg-green-500" :
                      update.type === "progress" ? "bg-purple-500" :
                      "bg-blue-500"
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span>{update.message}</span>
                        <span className="text-muted-foreground text-xs">{update.time}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>

        {/* Completion Actions */}
        {currentStage === "completed" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4 text-center">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <h3 className="font-bold text-green-900 mb-2">Service Complete!</h3>
                <p className="text-green-700 text-sm mb-4">
                  Your vehicle is sparkling clean and ready to go.
                </p>
                <div className="space-y-2">
                  <Button className="w-full bg-green-600 hover:bg-green-700">
                    <Star className="w-4 h-4 mr-2" />
                    Rate Your Service
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Camera className="w-4 h-4 mr-2" />
                    View Photos
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}