import { useLocation } from "wouter";
import { CalendarCheck, MapPin, Activity, User } from "lucide-react";

export default function TabNavigation() {
  const [location, setLocation] = useLocation();

  const tabs = [
    { icon: CalendarCheck, label: "Book", route: "/booking" },
    { icon: MapPin, label: "Track", route: "/tracking" },
    { icon: Activity, label: "Activity", route: "/activity" },
    { icon: User, label: "Profile", route: "/profile" },
  ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)", paddingTop: "10px" }}
    >
      <div className="grid grid-cols-4">
        {tabs.map((tab) => {
          const active = location === tab.route;
          return (
            <button
              key={tab.route}
              className="flex flex-col items-center justify-center py-2 gap-1"
              onClick={() => setLocation(tab.route)}
            >
              <tab.icon
                className={`h-5 w-5 ${active ? "text-[#8c52ff]" : "text-gray-400"}`}
              />
              <span
                className={`text-xs font-medium ${active ? "text-[#8c52ff]" : "text-gray-400"}`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
