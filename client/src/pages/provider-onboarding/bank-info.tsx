import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, CreditCard, Building, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function BankInfoPage() {
  const [, setLocation] = useLocation();
  const [routingNumber, setRoutingNumber] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [accountType, setAccountType] = useState<"checking" | "savings">("checking");
  const [useStripeConnect, setUseStripeConnect] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleStripeConnect = () => {
    toast({
      title: "Stripe Connect",
      description: "This feature will be available soon. Bank details saved for manual setup.",
    });
    setUseStripeConnect(true);
  };

  const handleContinue = () => {
    if (!useStripeConnect && (!routingNumber || !accountNumber || accountNumber !== confirmAccountNumber)) {
      toast({
        title: "Missing information",
        description: "Please complete all bank details or use Stripe Connect",
        variant: "destructive",
      });
      return;
    }

    // Save bank info
    if (!useStripeConnect) {
      localStorage.setItem('provider-onboarding-bank', JSON.stringify({ 
        routingNumber, 
        accountNumber: accountNumber.slice(-4), // Only store last 4 digits
        accountType 
      }));
    }
    localStorage.setItem(`provider-onboarding-bank-info-${user?.id}`, 'true');
    localStorage.setItem(`provider-onboarding-complete-${user?.id}`, 'true');
    
    toast({
      title: "Welcome to Dapper!",
      description: "Your onboarding is complete. Welcome to the team!",
    });

    setLocation('/');
  };

  const handleSkip = () => {
    toast({
      title: "Bank setup skipped",
      description: "You can add payout details later in your profile settings",
    });
    localStorage.setItem(`provider-onboarding-complete-${user?.id}`, 'true');
    setLocation('/');
  };

  const handleBack = () => {
    setLocation('/provider-onboarding/vehicle-setup');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="p-6 pt-12">
        <button
          onClick={handleBack}
          className="flex items-center text-[#8c52ff] hover:text-[#8c52ff]/80 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          <span className="text-base font-medium">Back</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center px-6 pb-6">
        <div className="max-w-sm mx-auto w-full space-y-8">
          {/* Progress indicator */}
          <div className="flex justify-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-gray-300"></div>
            <div className="w-2 h-2 rounded-full bg-gray-300"></div>
            <div className="w-2 h-2 rounded-full bg-[#8c52ff]"></div>
          </div>

          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold text-gray-900">
              Set Up Your Payouts
            </h1>
            <p className="text-gray-600">
              So we know where to send your earnings
            </p>
          </div>

          {/* Payment Options */}
          <div className="space-y-6">
            {/* Stripe Connect Option */}
            <motion.div
              whileTap={{ scale: 0.98 }}
              onClick={handleStripeConnect}
              className={`border-2 rounded-lg p-6 cursor-pointer transition-colors ${
                useStripeConnect 
                  ? 'border-green-300 bg-green-50' 
                  : 'border-[#8c52ff] bg-[#8c52ff]/5 hover:bg-[#8c52ff]/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-[#8c52ff] rounded-lg flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Connect your bank</h3>
                    <p className="text-sm text-gray-600">Secure, instant setup</p>
                  </div>
                </div>
                {useStripeConnect && <CheckCircle className="w-6 h-6 text-green-500" />}
              </div>
            </motion.div>

            {/* OR Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>

            {/* Manual Bank Entry */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-gray-700">
                <Building className="w-5 h-5" />
                <span className="font-medium">Enter bank details manually</span>
              </div>

              {/* Account Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Account Type</label>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setAccountType("checking")}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                      accountType === "checking"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Checking
                  </button>
                  <button
                    onClick={() => setAccountType("savings")}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                      accountType === "savings"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Savings
                  </button>
                </div>
              </div>

              {/* Routing Number */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Routing Number</label>
                <Input
                  type="text"
                  placeholder="9-digit routing number"
                  value={routingNumber}
                  onChange={(e) => setRoutingNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  className="h-12 text-base rounded-lg border-gray-300 focus:border-[#8c52ff] focus:ring-[#8c52ff] font-mono"
                />
              </div>

              {/* Account Number */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Account Number</label>
                <Input
                  type="text"
                  placeholder="Account number"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                  className="h-12 text-base rounded-lg border-gray-300 focus:border-[#8c52ff] focus:ring-[#8c52ff] font-mono"
                />
              </div>

              {/* Confirm Account Number */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Confirm Account Number</label>
                <Input
                  type="text"
                  placeholder="Re-enter account number"
                  value={confirmAccountNumber}
                  onChange={(e) => setConfirmAccountNumber(e.target.value.replace(/\D/g, ''))}
                  className="h-12 text-base rounded-lg border-gray-300 focus:border-[#8c52ff] focus:ring-[#8c52ff] font-mono"
                />
                {confirmAccountNumber && accountNumber !== confirmAccountNumber && (
                  <p className="text-sm text-red-600">Account numbers don't match</p>
                )}
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleContinue}
              disabled={!useStripeConnect && (!routingNumber || !accountNumber || accountNumber !== confirmAccountNumber)}
              className="w-full h-14 bg-[#8c52ff] hover:bg-[#8c52ff]/90 text-white text-base font-medium rounded-lg disabled:bg-gray-300 disabled:text-gray-500"
            >
              Complete Setup
            </Button>
            
            <Button
              onClick={handleSkip}
              variant="ghost"
              className="w-full h-12 text-[#8c52ff] hover:bg-[#8c52ff]/5 text-base font-medium"
            >
              Skip for now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}