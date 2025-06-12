import { useLocation } from "wouter";
import { Home, Sparkles, Activity, User } from "lucide-react";
import { motion } from "framer-motion";

export default function TabNavigation() {
  const [location, setLocation] = useLocation();
  
  // Define tab items with their routes, icons, and labels
  const tabs = [
    {
      icon: Home,
      label: "Home",
      route: "/",
      active: location === "/"
    },
    {
      icon: Sparkles,
      label: "Services",
      route: "/services",
      active: location === "/services"
    },
    {
      icon: Activity,
      label: "Activity",
      route: "/activity",
      active: location === "/activity"
    },
    {
      icon: User,
      label: "Profile",
      route: "/profile",
      active: location === "/profile"
    }
  ];
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 dark:bg-gray-950 dark:border-gray-800 z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="grid grid-cols-4 h-16">
        {tabs.map((tab) => (
          <button
            key={tab.route}
            className="flex flex-col items-center justify-center relative"
            onClick={() => setLocation(tab.route)}
          >
            <div 
              className={`flex flex-col items-center justify-center ${
                tab.active ? "text-[#8c52ff]" : "text-muted-foreground"
              }`}
            >
              {tab.active && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -top-3 w-12 h-1 bg-[#8c52ff] rounded-b-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
              )}
              <tab.icon className={`h-5 w-5 mb-1 ${tab.active ? 'text-[#8c52ff]' : ''}`} />
              <span className="text-xs">{tab.label}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}