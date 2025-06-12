import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Droplets, Shield, Truck, Star, Quote } from "lucide-react";
import { motion } from "framer-motion";

export default function HomeScreen() {
  const [, setLocation] = useLocation();

  const valueCards = [
    {
      icon: <Droplets className="h-8 w-8 text-[#8c52ff]" />,
      title: "Steam Clean",
      description: "Professional steam cleaning for deep sanitization"
    },
    {
      icon: <Shield className="h-8 w-8 text-[#8c52ff]" />,
      title: "Kid + Pet Safe",
      description: "Eco-friendly products safe for your family"
    },
    {
      icon: <Truck className="h-8 w-8 text-[#8c52ff]" />,
      title: "Mobile Convenience",
      description: "We come to you wherever you are"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Hero Section */}
      <div className="px-4 sm:px-6 lg:px-8 pt-12 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Book mobile detailing{" "}
              <span className="text-[#8c52ff]">to your door</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Premium car wash and detailing services that come to you. Professional, convenient, and eco-friendly.
            </p>
            
            <Button
              size="lg"
              className="bg-[#8c52ff] hover:bg-[#7c47eb] text-white px-8 py-4 text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
              onClick={() => setLocation("/booking")}
            >
              Book Now
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Value Proposition Cards */}
      <div className="px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {valueCards.map((card, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="text-center hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
                  <CardHeader className="pb-4">
                    <div className="flex justify-center mb-4">
                      {card.icon}
                    </div>
                    <CardTitle className="text-xl font-semibold text-gray-900">
                      {card.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-gray-600 text-base">
                      {card.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonial Section */}
      <div className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card className="bg-[#8c52ff]/5 border-[#8c52ff]/20 text-center">
              <CardContent className="pt-8 pb-8">
                {/* 5-Star Rating */}
                <div className="flex justify-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-6 w-6 text-yellow-400 fill-current"
                    />
                  ))}
                </div>
                
                {/* Quote */}
                <div className="relative">
                  <Quote className="h-8 w-8 text-[#8c52ff]/30 absolute -top-2 -left-2" />
                  <blockquote className="text-lg sm:text-xl text-gray-800 font-medium italic mb-4 px-8">
                    "Dapper transformed my car! The convenience of mobile service and the quality of work exceeded my expectations. My car looks brand new!"
                  </blockquote>
                  <Quote className="h-8 w-8 text-[#8c52ff]/30 absolute -bottom-2 -right-2 rotate-180" />
                </div>
                
                <p className="text-gray-600 font-medium">
                  — Sarah M., Satisfied Customer
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Bottom spacing for mobile navigation */}
      <div className="pb-20 sm:pb-8"></div>
    </div>
  );
}