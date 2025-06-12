import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Check, 
  Clock, 
  Car, 
  Sparkles, 
  Shield, 
  Crown,
  Star,
  Droplets,
  Wind,
  Brush
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Service } from "@shared/schema";

interface EnhancedServiceSelectionProps {
  services: Service[];
  selectedServiceId: number | null;
  onServiceSelect: (service: Service) => void;
  onBookNow: () => void;
}

const SERVICE_FEATURES = {
  1: [ // Basic
    "Exterior hand wash",
    "Streak-free windows", 
    "Tire cleaning",
    "Quick dry"
  ],
  2: [ // The OG
    "Everything in Basic",
    "Tire degreasing",
    "Interior vacuum", 
    "Dashboard wipe down",
    "Door jamb cleaning"
  ],
  3: [ // Premium
    "Everything in The OG",
    "Leather conditioning",
    "Engine bay cleaning",
    "Wheel polishing",
    "Interior detailing",
    "UV protection"
  ]
};

const SERVICE_ICONS = {
  1: Car,
  2: Sparkles,
  3: Crown
};

const SERVICE_COLORS = {
  1: "bg-blue-50 border-blue-200 text-blue-700",
  2: "bg-purple-50 border-purple-200 text-purple-700", 
  3: "bg-gold-50 border-yellow-200 text-yellow-700"
};

export function EnhancedServiceSelection({ 
  services, 
  selectedServiceId, 
  onServiceSelect, 
  onBookNow 
}: EnhancedServiceSelectionProps) {
  const [hoveredService, setHoveredService] = useState<number | null>(null);

  const selectedService = services.find(s => s.id === selectedServiceId);

  const getServiceIcon = (serviceId: number) => {
    return SERVICE_ICONS[serviceId as keyof typeof SERVICE_ICONS] || Car;
  };

  const getServiceFeatures = (serviceId: number) => {
    return SERVICE_FEATURES[serviceId as keyof typeof SERVICE_FEATURES] || [];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Choose Your Service</h2>
        <p className="text-gray-600">Select the perfect wash for your vehicle</p>
      </div>

      {/* Service Cards Grid */}
      <div className="grid gap-4">
        {services.map((service) => {
          const isSelected = selectedServiceId === service.id;
          const isHovered = hoveredService === service.id;
          const ServiceIcon = getServiceIcon(service.id);
          const features = getServiceFeatures(service.id);
          
          return (
            <motion.div
              key={service.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <Card 
                className={`cursor-pointer transition-all duration-300 ${
                  isSelected 
                    ? 'border-[#8c52ff] bg-purple-50 shadow-lg ring-2 ring-purple-100' 
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
                onClick={() => onServiceSelect(service)}
                onMouseEnter={() => setHoveredService(service.id)}
                onMouseLeave={() => setHoveredService(null)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        isSelected ? 'bg-purple-100' : 'bg-gray-100'
                      }`}>
                        <ServiceIcon className={`w-5 h-5 ${
                          isSelected ? 'text-purple-600' : 'text-gray-600'
                        }`} />
                      </div>
                      <div>
                        <CardTitle className="flex items-center space-x-2">
                          <span>{service.name}</span>
                          {service.id === 2 && (
                            <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                              Most Popular
                            </Badge>
                          )}
                          {service.id === 3 && (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                              Premium
                            </Badge>
                          )}
                        </CardTitle>
                        <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-[#8c52ff]">${service.price}</div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {service.duration}min
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <AnimatePresence>
                  {(isSelected || isHovered) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <CardContent className="pt-0">
                        <Separator className="mb-4" />
                        <div className="space-y-3">
                          <h4 className="font-medium text-sm flex items-center">
                            <Check className="w-4 h-4 mr-2 text-green-600" />
                            What's included:
                          </h4>
                          <div className="grid grid-cols-1 gap-2">
                            {features.map((feature, index) => (
                              <motion.div
                                key={feature}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="flex items-center text-sm text-gray-600"
                              >
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-3"></div>
                                {feature}
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>

                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute top-3 right-3"
                  >
                    <div className="w-6 h-6 bg-[#8c52ff] rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </motion.div>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Selected Service Summary */}
      <AnimatePresence>
        {selectedService && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="sticky bottom-4 z-10"
          >
            <Card className="bg-white border-2 border-[#8c52ff] shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="font-medium">{selectedService.name} Selected</div>
                      <div className="text-sm text-gray-600 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {selectedService.duration} minutes • ${selectedService.price}
                      </div>
                    </div>
                  </div>
                  <Button 
                    onClick={onBookNow}
                    className="bg-[#8c52ff] hover:bg-[#7c47e6] text-white px-6"
                  >
                    Book Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Service Comparison */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-lg">Why choose professional detailing?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-blue-600" />
              <span>Professional equipment</span>
            </div>
            <div className="flex items-center space-x-2">
              <Droplets className="w-4 h-4 text-blue-600" />
              <span>Eco-friendly products</span>
            </div>
            <div className="flex items-center space-x-2">
              <Star className="w-4 h-4 text-blue-600" />
              <span>Satisfaction guaranteed</span>
            </div>
            <div className="flex items-center space-x-2">
              <Wind className="w-4 h-4 text-blue-600" />
              <span>Convenient at your location</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}