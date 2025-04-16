import React, { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Service } from "@shared/schema";
import { Loader2 } from "lucide-react";

export default function ServiceCards({
  onServiceSelect,
}: {
  onServiceSelect?: (service: Service) => void;
}) {
  const { data: services, isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  // Select first service by default when data is loaded
  useEffect(() => {
    if (services && services.length > 0 && onServiceSelect) {
      onServiceSelect(services[0]);
    }
  }, [services, onServiceSelect]);

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

  // Get appropriate icon for each service type
  const getServiceIcon = (category: string) => {
    switch (category) {
      case "basic":
        return (
          <img 
            src="/assets/water-drops-8.svg" 
            alt="Water drops" 
            className="h-8 w-8 text-white" 
            style={{ filter: 'brightness(0) invert(1)' }}
          />
        );
      case "standard":
        return (
          <img 
            src="/assets/vacuum-8.svg" 
            alt="Vacuum cleaner" 
            className="h-8 w-8 text-white" 
            style={{ filter: 'brightness(0) invert(1)' }}
          />
        );
      case "premium":
        return (
          <img 
            src="/assets/sparkles-icon.svg" 
            alt="Sparkles" 
            className="h-8 w-8 text-white" 
            style={{ filter: 'brightness(0) invert(1)' }}
          />
        );
      default:
        return (
          <img 
            src="/assets/water-drops-8.svg" 
            alt="Water drops" 
            className="h-8 w-8 text-white" 
            style={{ filter: 'brightness(0) invert(1)' }}
          />
        );
    }
  };

  // Get appropriate color for each service type
  const getServiceColor = (category: string) => {
    switch (category) {
      case "basic":
        return "bg-gradient-to-br from-[#8c52ff]/80 to-[#8c52ff]/90";
      case "standard":
        return "bg-gradient-to-br from-[#8c52ff]/85 to-[#6930c3]/95";
      case "premium":
        return "bg-gradient-to-br from-[#6930c3]/90 to-[#5e30a0]";
      default:
        return "bg-gradient-to-br from-[#8c52ff]/80 to-[#8c52ff]/90";
    }
  };

  // Get appropriate summary for each service type
  const getServiceSummary = (category: string) => {
    switch (category) {
      case "basic":
        return "Exterior wash and shine only";
      case "standard":
        return "Hand wash + quick vacuum and wipe down";
      case "premium":
        return "Complete interior & exterior detailing";
      default:
        return "Car wash service";
    }
  };

  return (
    <div className="w-full">
      <h2 className="text-xl font-bold mb-4">Select Your Service</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {services.map((service, index) => (
          <motion.div
            key={service.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -5 }}
            onClick={() => onServiceSelect && onServiceSelect(service)}
          >
            <Card className="cursor-pointer border-2 hover:border-[#8c52ff] transition-all duration-300 h-full overflow-hidden group">
              <div className={`relative ${getServiceColor(service.category)} p-5`}>
                <div className="absolute right-4 top-4 bg-white/20 rounded-full w-12 h-12 flex items-center justify-center backdrop-blur-sm">
                  {getServiceIcon(service.category)}
                </div>
                <CardHeader className="p-0 pb-3">
                  <CardTitle className="text-2xl text-white">{service.name}</CardTitle>
                  <CardDescription className="text-white/90 text-base">
                    {getServiceSummary(service.category)}
                  </CardDescription>
                </CardHeader>
                <div className="flex justify-between items-center">
                  <Badge className="bg-white/30 text-white backdrop-blur-sm">
                    {service.duration} min
                  </Badge>
                  <div className="text-white text-2xl font-bold">${service.price}</div>
                </div>
              </div>
              <CardContent className="p-4">
                <p className="text-muted-foreground text-sm">{service.description}</p>
                <div className="mt-3 text-sm font-medium text-[#8c52ff] group-hover:text-[#8c52ff] group-hover:underline transition-all duration-300">
                  Select this package →
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}