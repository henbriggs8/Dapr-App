import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Service } from "@shared/schema";
import { Loader2, Check } from "lucide-react";

export default function ServiceCards({
  onServiceSelect,
}: {
  onServiceSelect?: (service: Service) => void;
}) {
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  
  const { data: services, isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  // Select first service by default when data is loaded only once, using a ref to avoid multiple re-runs
  const initialSelectionMade = React.useRef(false);
  
  useEffect(() => {
    if (services && services.length > 0 && onServiceSelect && !initialSelectionMade.current) {
      console.log("Making initial service selection");
      initialSelectionMade.current = true;
      setSelectedServiceId(services[0].id);
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
            src="/assets/water-droplet.svg" 
            alt="Water droplet" 
            className="h-5 w-5 text-white" 
            style={{ filter: 'brightness(0) invert(1)' }}
          />
        );
      case "standard":
        return (
          <img 
            src="/assets/vacuum-8.svg" 
            alt="Vacuum cleaner" 
            className="h-5 w-5 text-white" 
            style={{ filter: 'brightness(0) invert(1)' }}
          />
        );
      case "premium":
        return (
          <img 
            src="/assets/star-icon.svg" 
            alt="Star" 
            className="h-5 w-5 text-white" 
            style={{ filter: 'brightness(0) invert(1)' }}
          />
        );
      default:
        return (
          <img 
            src="/assets/water-droplet.svg" 
            alt="Water droplet" 
            className="h-5 w-5 text-white" 
            style={{ filter: 'brightness(0) invert(1)' }}
          />
        );
    }
  };

  // Get appropriate color for each service type
  const getServiceColor = (category: string) => {
    switch (category) {
      case "basic":
        return "bg-gradient-to-br from-[#b491fa]/90 to-[#b491fa]";
      case "standard":
        return "bg-gradient-to-br from-[#8c52ff]/85 to-[#6930c3]/95";
      case "premium":
        return "bg-gradient-to-br from-[#5e17eb]/90 to-[#5e17eb]";
      default:
        return "bg-gradient-to-br from-[#b491fa]/90 to-[#b491fa]";
    }
  };

  // Get appropriate summary for each service type
  const getServiceSummary = (category: string) => {
    switch (category) {
      case "basic":
        return "Exterior wash and shine only";
      case "standard":
        return "Hand wash + interior cleanup";
      case "premium":
        return "Complete interior & exterior detailing";
      default:
        return "Car wash service";
    }
  };

  // Create bullet point descriptions for each service
  const getServiceBulletPoints = (category: string) => {
    switch (category) {
      case "basic":
        return [
          "Exterior hand wash",
          "Streak free windows"
        ];
      case "standard":
        return [
          "Hand wash",
          "Tires degreased",
          "Streak free windows",
          "Vacuum and wipe down"
        ];
      case "premium":
        return [
          "Everything in O.G. plus",
          "Carpets shampoo",
          "Carpets/mats restored",
          "Steam clean", 
          "Cupholder & Dash clean",
          "Steam extraction",
          "Paint decontamination",
          "Dapper scent"
        ];
      default:
        return ["Car wash service"];
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
            onClick={() => {
              if (onServiceSelect) {
                console.log("Service selected:", service);
                setSelectedServiceId(service.id);
                onServiceSelect(service);
              }
            }}
          >
            <Card className={`cursor-pointer border-2 ${selectedServiceId === service.id ? 'border-[#8c52ff] shadow-lg' : 'border-muted'} hover:border-[#8c52ff] hover:shadow-lg active:scale-95 transition-all duration-300 h-full overflow-hidden group`}>
              <div className={`relative ${getServiceColor(service.category)} p-5`}>
                <div className="absolute right-2 top-2 bg-white/20 rounded-full w-6 h-6 flex items-center justify-center backdrop-blur-sm">
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
                  <div className="text-white text-2xl font-bold">
                    ${service.category === "basic" ? "39–59" : 
                       service.category === "standard" ? "58–78" : 
                       service.category === "premium" ? "167–197" : 
                       service.price}
                  </div>
                </div>
              </div>
              <CardContent className="p-4">
                <ul className="text-muted-foreground text-sm space-y-1 list-disc pl-4">
                  {getServiceBulletPoints(service.category).map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
                <div className="mt-3 flex justify-between items-center">
                  <div className="text-sm font-medium text-[#8c52ff] group-hover:text-[#8c52ff] group-hover:underline transition-all duration-300">
                    Select this package →
                  </div>
                  {selectedServiceId === service.id && (
                    <Check className="h-5 w-5 text-[#8c52ff]" />
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}