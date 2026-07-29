import { Loader2 } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { useAuth } from "@/hooks/use-auth";
import HomeDesktop from "@/pages/home-desktop";

export function HomeWithOnboarding() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Icon icon={Loader2} size="xl" className="animate-spin text-border" />
      </div>
    );
  }

  // All visitors see the responsive marketing landing page.
  // Native iOS app handles the authenticated dashboard experience.
  return <HomeDesktop />;
}
