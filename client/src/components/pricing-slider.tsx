import React, { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Service } from "@shared/schema";
import { Loader2, Sparkles, Clock, CarFront, SprayCan, Brush } from "lucide-react";

type CostBreakdownItem = {
  name: string;
  description: string;
  price: number;
  duration: number;
};

export default function PricingSlider({
  onServiceSelect,
}: {
  onServiceSelect?: (service: Service) => void;
}) {
  const [selectedValue, setSelectedValue] = useState<number>(1);
  const [animatePrice, setAnimatePrice] = useState<boolean>(false);
  
  const { data: services, isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const getServiceByIndex = (index: number): Service | undefined => {
    if (!services || services.length === 0) return undefined;
    // Index is 0-based, but slider value is 1-based
    return services[index - 1] || services[0];
  };

  const selectedService = getServiceByIndex(selectedValue);

  // Generate detailed breakdown based on selected service
  const generateCostBreakdown = (): CostBreakdownItem[] => {
    if (!selectedService) return [];
    
    const items: CostBreakdownItem[] = [];
    
    if (selectedService.category === "basic") {
      items.push({
        name: "Exterior Wash",
        description: "Complete exterior cleaning",
        price: selectedService.price * 0.9, // 90% of the price
        duration: selectedService.duration * 0.8, // 80% of the duration
      });
      items.push({
        name: "Quick Detail",
        description: "Final touches and check",
        price: selectedService.price * 0.1, // 10% of the price
        duration: selectedService.duration * 0.2, // 20% of the duration
      });
    } 
    else if (selectedService.category === "standard") {
      items.push({
        name: "Hand Wash",
        description: "Thorough exterior cleaning",
        price: selectedService.price * 0.4, // 40% of the price
        duration: selectedService.duration * 0.4, // 40% of the duration
      });
      items.push({
        name: "Vacuum",
        description: "Interior vacuum and dust removal",
        price: selectedService.price * 0.3, // 30% of the price
        duration: selectedService.duration * 0.3, // 30% of the duration
      });
      items.push({
        name: "Wipe Down",
        description: "Interior surfaces cleaned",
        price: selectedService.price * 0.3, // 30% of the price
        duration: selectedService.duration * 0.3, // 30% of the duration
      });
    } 
    else if (selectedService.category === "premium") {
      items.push({
        name: "Exterior Detail",
        description: "Hand wash, wheels, glass, wax",
        price: selectedService.price * 0.4, // 40% of the price
        duration: selectedService.duration * 0.4, // 40% of the duration
      });
      items.push({
        name: "Carpet & Mats",
        description: "Deep cleaning and shampooing",
        price: selectedService.price * 0.25, // 25% of the price
        duration: selectedService.duration * 0.25, // 25% of the duration
      });
      items.push({
        name: "Leather & Upholstery",
        description: "Steam cleaning and conditioning",
        price: selectedService.price * 0.25, // 25% of the price
        duration: selectedService.duration * 0.25, // 25% of the duration
      });
      items.push({
        name: "Detailed Interior",
        description: "Cup holders, vents, console cleaning",
        price: selectedService.price * 0.1, // 10% of the price
        duration: selectedService.duration * 0.1, // 10% of the duration
      });
    }
    
    return items;
  };

  const costBreakdown = generateCostBreakdown();

  useEffect(() => {
    // Animate the price when service changes
    if (selectedService) {
      setAnimatePrice(true);
      const timer = setTimeout(() => setAnimatePrice(false), 500);
      return () => clearTimeout(timer);
    }
  }, [selectedService]);

  useEffect(() => {
    // Notify parent component when service changes
    if (selectedService && onServiceSelect) {
      onServiceSelect(selectedService);
    }
  }, [selectedService, onServiceSelect]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!services || services.length === 0) {
    return <div>No service tiers available</div>;
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "basic":
        return "bg-blue-500";
      case "standard":
        return "bg-green-500";
      case "premium":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Select Your Wash Package</span>
          <Badge
            className={`${getCategoryColor(
              selectedService?.category || "basic"
            )} text-white ml-2 transition-colors duration-300`}
          >
            {selectedService?.name || "Basic Wash"}
          </Badge>
        </CardTitle>
        <CardDescription>
          Choose from our service tiers to match your needs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          <div className="space-y-4">
            <Slider
              value={[selectedValue]}
              min={1}
              max={services?.length || 3}
              step={1}
              onValueChange={(value) => setSelectedValue(value[0])}
              className="py-4"
            />
            <div className="flex justify-between text-sm">
              {services?.map((service, index) => (
                <div 
                  key={service.id} 
                  className={`font-medium cursor-pointer ${
                    selectedValue === index + 1 ? "text-primary" : "text-muted-foreground"
                  }`}
                  onClick={() => setSelectedValue(index + 1)}
                >
                  {service.name}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">
                {selectedService?.description}
              </h3>
              <motion.div
                key={selectedService?.id}
                initial={{ scale: animatePrice ? 1.2 : 1 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
                className="text-2xl font-bold text-primary"
              >
                ${selectedService?.price ? (selectedService.price / 100).toFixed(2) : '0.00'}
              </motion.div>
            </div>
            <div className="text-sm text-muted-foreground">
              Estimated time: {selectedService?.duration || 0} min
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center">
              <Sparkles className="h-5 w-5 mr-2 text-primary" />
              Service Breakdown
            </h3>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedService?.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {costBreakdown.map((item, index) => {
                  let Icon = Clock;
                  
                  // Choose icon based on item name
                  if (item.name.includes("Exterior") || item.name.includes("Hand Wash")) {
                    Icon = CarFront;
                  } else if (item.name.includes("Quick Detail") || item.name.includes("Wipe Down")) {
                    Icon = SprayCan;
                  } else if (item.name.includes("Vacuum") || item.name.includes("Carpet") || item.name.includes("Interior")) {
                    Icon = Brush;
                  }
                  
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex justify-between items-start p-3 rounded-md border border-border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1 bg-muted rounded-md p-2">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.description}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <motion.div 
                          initial={{ scale: 0.9 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: index * 0.1 + 0.2 }}
                          className="font-medium text-primary"
                        >
                          ${item.price.toFixed(2)}
                        </motion.div>
                        <div className="text-sm text-muted-foreground flex items-center justify-end">
                          <Clock className="h-3 w-3 mr-1" />
                          {Math.round(item.duration)} min
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: costBreakdown.length * 0.1 + 0.3 }}
                  className="flex justify-between items-center pt-2 border-t"
                >
                  <div className="font-bold">Total</div>
                  <div className="font-bold text-lg">${selectedService?.price}</div>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}