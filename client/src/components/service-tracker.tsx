import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Timer
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useWebSocket } from "@/hooks/use-websocket";

interface ServiceTrackerProps {
  bookingId: number;
  initialStatus?: string;
  providerName?: string;
  estimatedArrival?: string;
}

const SERVICE_STAGES = [
  { 
    key: "en_route", 
    label: "On the way", 
    icon: Car, 
    description: "Your provider is heading to your location",
    progress: 20
  },
  { 
    key: "arrived", 
    label: "Arrived", 
    icon: MapPin, 
    description: "Provider has arrived and is setting up",
    progress: 30
  },
  { 
    key: "pre_wash", 
    label: "Pre-wash", 
    icon: Droplets, 
    description: "Initial rinse and preparation",
    progress: 45
  },
  { 
    key: "washing", 
    label: "Washing", 
    icon: Sparkles, 
    description: "Hand washing and detailing in progress",
    progress: 70
  },
  { 
    key: "drying", 
    label: "Drying", 
    icon: Wind, 
    description: "Final drying and touch-ups",
    progress: 90
  },
  { 
    key: "completed", 
    label: "Complete", 
    icon: CheckCircle, 
    description: "Service completed successfully",
    progress: 100
  }
];

export function ServiceTracker({ 
  bookingId, 
  initialStatus = "en_route",
  providerName = "Marcus Johnson",
  estimatedArrival 
}: ServiceTrackerProps) {
  const [currentStage, setCurrentStage] = useState(initialStatus);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showProviderLocation, setShowProviderLocation] = useState(false);
  
  const { isConnected, sendMessage } = useWebSocket();

  // Simulate real-time updates
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Get current stage data
  const getCurrentStageData = () => {
    return SERVICE_STAGES.find(stage => stage.key === currentStage) || SERVICE_STAGES[0];
  };

  const getCurrentStageIndex = () => {
    return SERVICE_STAGES.findIndex(stage => stage.key === currentStage);
  };

  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentStageData = getCurrentStageData();
  const currentStageIndex = getCurrentStageIndex();

  return (
    <div className="space-y-4">
      {/* Provider Info Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src="/placeholder-avatar.jpg" />
                <AvatarFallback className="bg-purple-100 text-purple-600">
                  {providerName.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{providerName}</div>
                <div className="text-sm text-muted-foreground flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Dapper Pro • 4.9★
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

      {/* Service Progress Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <currentStageData.icon className="w-5 h-5 text-purple-600" />
              <span>{currentStageData.label}</span>
            </CardTitle>
            <Badge variant="secondary" className="flex items-center space-x-1">
              <Timer className="w-3 h-3" />
              <span>{formatElapsedTime(elapsedTime)}</span>
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {currentStageData.description}
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Service Progress</span>
                <span>{currentStageData.progress}%</span>
              </div>
              <Progress value={currentStageData.progress} className="h-2" />
            </div>

            {/* Stage Timeline */}
            <div className="space-y-3">
              {SERVICE_STAGES.map((stage, index) => {
                const isCompleted = index < currentStageIndex;
                const isCurrent = index === currentStageIndex;
                const StageIcon = stage.icon;

                return (
                  <motion.div
                    key={stage.key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex items-center space-x-3 ${
                      isCompleted || isCurrent ? 'opacity-100' : 'opacity-40'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isCompleted 
                        ? 'bg-green-100 text-green-600' 
                        : isCurrent 
                        ? 'bg-purple-100 text-purple-600' 
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <StageIcon className="w-4 h-4" />
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
                          className="text-sm text-muted-foreground"
                        >
                          In progress...
                        </motion.div>
                      )}
                    </div>
                    {isCompleted && (
                      <div className="text-xs text-green-600">
                        ✓ Complete
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Updates Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Live Updates</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center space-x-2"
              >
                <div className="w-1.5 h-1.5 bg-purple-600 rounded-full"></div>
                <span className="text-muted-foreground">2 min ago</span>
                <span>Starting {currentStageData.label.toLowerCase()} process</span>
              </motion.div>
            </AnimatePresence>
            
            {currentStage === "en_route" && estimatedArrival && (
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                <span className="text-muted-foreground">5 min ago</span>
                <span>Estimated arrival: {estimatedArrival}</span>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
              <span className="text-muted-foreground">8 min ago</span>
              <span>Service started</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ETA Card */}
      {currentStage !== "completed" && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-medium text-blue-900">Estimated completion</div>
                  <div className="text-sm text-blue-700">
                    {currentStage === "en_route" ? "25-30 minutes" : "15-20 minutes"}
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="bg-white text-blue-700 border-blue-300">
                On schedule
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}