import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Service } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Plus, Star, Info, Droplet, Settings, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

export default function ServicesPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const { data: services, isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });
  
  // Example add-ons
  const addOns = [
    {
      name: "Leather Treatment",
      description: "Deep condition and protect leather surfaces",
      price: 35,
      icon: Wrench,
    },
    {
      name: "Clay Bar Treatment",
      description: "Remove embedded contaminants from paint",
      price: 45,
      icon: Droplet,
    },
    {
      name: "Interior Sanitization",
      description: "Disinfect all interior surfaces",
      price: 25,
      icon: Info,
    },
    {
      name: "Premium Wax",
      description: "Long-lasting protection with premium carnauba wax",
      price: 30,
      icon: Star,
    },
  ];
  
  return (
    <div className="container mx-auto p-4 pb-20">
      <h1 className="text-3xl font-bold mb-2">Our Services</h1>
      <p className="text-muted-foreground mb-6">Explore our premium car detailing services</p>
      
      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-4">Core Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {services?.map((service) => (
              <Card key={service.id} className="border-2 hover:border-[#8c52ff] transition-all duration-300">
                <CardHeader>
                  <CardTitle>{service.name}</CardTitle>
                  <CardDescription>{service.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between mb-3">
                    <Badge variant="outline">{service.duration} min</Badge>
                    <span className="font-bold text-lg">${service.price}</span>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={() => setLocation("/")}
                  >
                    Book This Service
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
        
        <section>
          <h2 className="text-2xl font-semibold mb-4">Add-On Services</h2>
          <p className="text-muted-foreground mb-4">
            Enhance your car wash with these premium add-ons
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addOns.map((addon, index) => (
              <motion.div
                key={addon.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="flex items-center p-4 hover:shadow-md transition-shadow">
                  <div className="bg-[#8c52ff]/10 p-3 rounded-full mr-4">
                    <addon.icon className="h-6 w-6 text-[#8c52ff]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{addon.name}</h3>
                    <p className="text-sm text-muted-foreground">{addon.description}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-bold">${addon.price}</span>
                    <Button size="sm" variant="ghost" className="mt-1">
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>
        
        <section>
          <h2 className="text-2xl font-semibold mb-4">Premium Detailing</h2>
          <Card className="bg-[#5e17eb] text-white">
            <CardHeader>
              <CardTitle className="text-xl">Dapper Signature Detail</CardTitle>
              <CardDescription className="text-white/80">
                Our signature 3-hour comprehensive detail package
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-4">
                <li className="flex items-center">
                  <Star className="h-4 w-4 mr-2 text-yellow-300" />
                  Steam extraction
                </li>
                <li className="flex items-center">
                  <Star className="h-4 w-4 mr-2 text-yellow-300" />
                  Paint decontamination
                </li>
                <li className="flex items-center">
                  <Star className="h-4 w-4 mr-2 text-yellow-300" />
                  Full interior deep cleaning and conditioning
                </li>
                <li className="flex items-center">
                  <Star className="h-4 w-4 mr-2 text-yellow-300" />
                  Engine bay detailing
                </li>
              </ul>
              <div className="flex justify-between items-center">
                <div>
                  <Badge className="bg-white/20 text-white">180 min</Badge>
                  <div className="mt-2 text-xl font-bold">$299</div>
                </div>
                <Button className="bg-white text-[#5e17eb] hover:bg-white/90">
                  Book Premium
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}