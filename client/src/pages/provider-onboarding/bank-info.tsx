import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, CreditCard, Clock, CheckCircle } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function BankInfoPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const handleStripeConnect = () => {
    toast({
      title: "Coming soon",
      description: "Stripe Connect bank setup will be available soon.",
    });
  };

  const handleContinue = () => {
    localStorage.setItem(`provider-onboarding-bank-info-${user?.id}`, 'true');
    localStorage.setItem(`provider-onboarding-complete-${user?.id}`, 'true');
    toast({
      title: "Welcome to Dapr!",
      description: "Your onboarding is complete. Welcome to the team!",
    });
    setLocation('/');
  };

  const handleBack = () => {
    setLocation('/provider-onboarding/vehicle-setup');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="p-6 pt-12">
        <button
          onClick={handleBack}
          className="flex items-center text-[#8c52ff] hover:text-[#8c52ff]/80 transition-colors"
        >
          <Icon icon={ArrowLeft} size="md" className="mr-2" />
          <span className="text-base font-medium">Back</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 pb-6">
        <div className="max-w-sm mx-auto w-full space-y-8">
          <div className="flex justify-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-gray-300"></div>
            <div className="w-2 h-2 rounded-full bg-gray-300"></div>
            <div className="w-2 h-2 rounded-full bg-[#8c52ff]"></div>
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold text-gray-900">Set Up Your Payouts</h1>
            <p className="text-gray-600">We'll send your earnings after each completed job.</p>
          </div>

          <div className="bg-[#8c52ff]/5 border border-[#8c52ff]/20 rounded-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-[#8c52ff]/10 rounded-xl flex items-center justify-center shrink-0">
                <Icon icon={Clock} size="md" className="text-[#8c52ff]" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Manual Payouts During Beta</h3>
                <p className="text-sm text-gray-600 mt-1">
                  During our beta period, payouts are processed manually within 3 business days of each completed job. No bank setup is required right now.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
                <Icon icon={CheckCircle} size="md" className="text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Automatic Payouts Coming Soon</h3>
                <p className="text-sm text-gray-600 mt-1">
                  We're rolling out Stripe Connect for instant, automatic bank transfers. You'll be notified when it's available.
                </p>
              </div>
            </div>
          </div>

          <motion.div
            whileTap={{ scale: 0.98 }}
            onClick={handleStripeConnect}
            className="border-2 border-dashed border-[#8c52ff]/30 rounded-xl p-5 cursor-pointer text-center hover:bg-[#8c52ff]/5 transition-colors"
          >
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 bg-[#8c52ff] rounded-lg flex items-center justify-center">
                <Icon icon={CreditCard} size="md" className="text-white" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">Connect your bank (Stripe Connect)</p>
                <p className="text-xs text-gray-500">Coming soon — automatic payouts</p>
              </div>
            </div>
          </motion.div>

          <div className="space-y-3">
            <Button
              onClick={handleContinue}
              className="w-full h-14 bg-[#8c52ff] hover:bg-[#8c52ff]/90 text-white text-base font-medium rounded-lg"
            >
              Complete Setup
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
