import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { useIsMobile } from "@/hooks/use-mobile";
import CorporateDesktop from "@/pages/corporate-desktop";

export default function Corporate() {
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();

  if (!isMobile) {
    return <CorporateDesktop />;
  }

  return (
    <div className="min-h-screen bg-white px-4 pt-12 pb-20">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="flex items-center gap-2"
          >
            <Icon icon={ArrowLeft} size="sm" />
            Back
          </Button>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">Corporate Packages</h1>
        <p className="text-gray-600">Coming soon...</p>
      </div>
    </div>
  );
}
