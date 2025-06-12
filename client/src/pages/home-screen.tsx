import { useLocation } from "wouter";
import { Calendar, HelpCircle, Building2, Car, Sparkles, Baby } from "lucide-react";
import { motion } from "framer-motion";

export default function HomeScreen() {
  const [, setLocation] = useLocation();

  const featureTiles = [
    {
      id: 1,
      icon: <HelpCircle className="h-6 w-6" />,
      label: "How It Works",
      route: "/how-it-works"
    },
    {
      id: 2,
      icon: <Car className="h-6 w-6" />,
      label: "Interior Cleaning",
      route: "/interior-cleaning"
    },
    {
      id: 3,
      icon: <Sparkles className="h-6 w-6" />,
      label: "Exterior Cleaning",
      route: "/exterior-cleaning"
    },
    {
      id: 4,
      icon: <Baby className="h-6 w-6" />,
      label: "Child Car Seat Cleaning",
      route: "/car-seat-cleaning"
    },
    {
      id: 5,
      icon: <HelpCircle className="h-6 w-6" />,
      label: "FAQ",
      route: "/faq"
    },
    {
      id: 6,
      icon: <Building2 className="h-6 w-6" />,
      label: "Corporate Packages",
      route: "/corporate"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header Area */}
      <div className="px-4 pt-12 pb-6">
        <div className="max-w-md mx-auto">
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            onClick={() => setLocation("/booking")}
            className="w-full bg-gray-100 hover:bg-gray-200 rounded-xl p-6 text-left transition-colors duration-200 active:scale-95 transform"
          >
            <div className="flex items-center space-x-4">
              <div className="bg-[#8c52ff] rounded-full p-3">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Schedule Your Wash</h2>
                <p className="text-gray-600 text-sm mt-1">Tap to book your mobile car wash</p>
              </div>
            </div>
          </motion.button>
        </div>
      </div>

      {/* Feature Tiles Section */}
      <div className="px-4 pb-20">
        <div className="max-w-md mx-auto">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Services</h3>
          
          <div className="grid grid-cols-2 gap-3">
            {featureTiles.map((tile, index) => (
              <motion.button
                key={tile.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                onClick={() => setLocation(tile.route)}
                className="bg-white border border-gray-200 hover:border-[#8c52ff] rounded-xl p-4 text-left transition-all duration-200 hover:shadow-md active:scale-95 transform"
              >
                <div className="flex flex-col items-start space-y-3">
                  <div className="bg-gray-100 rounded-full p-2 text-[#8c52ff]">
                    {tile.icon}
                  </div>
                  <span className="font-semibold text-gray-900 text-sm leading-tight">
                    {tile.label}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom spacing for mobile navigation */}
      <div className="pb-20 sm:pb-8"></div>
    </div>
  );
}