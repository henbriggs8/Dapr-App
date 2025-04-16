import React from "react";
import { useLocation, Link } from "wouter";
import { Home, Car, Activity, User } from "lucide-react";

export default function TabNavigation() {
  const [location] = useLocation();

  const tabs = [
    {
      name: "Home",
      path: "/",
      icon: Home,
    },
    {
      name: "Services",
      path: "/services",
      icon: Car,
    },
    {
      name: "Activity",
      path: "/activity",
      icon: Activity,
    },
    {
      name: "Account",
      path: "/profile",
      icon: User,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="grid grid-cols-4 h-16">
        {tabs.map((tab) => {
          const isActive = location === tab.path;
          const Icon = tab.icon;
          
          return (
            <Link 
              key={tab.path} 
              href={tab.path}
              className="flex flex-col items-center justify-center"
            >
              <div 
                className={`flex flex-col items-center justify-center w-full transition-colors ${
                  isActive ? "text-[#8c52ff]" : "text-gray-500 hover:text-[#8c52ff]/70"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs mt-1">{tab.name}</span>
                {isActive && (
                  <div className="absolute bottom-0 w-6 h-1 bg-[#8c52ff] rounded-t-md" />
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}