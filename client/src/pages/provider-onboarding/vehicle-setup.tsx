import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Car, HelpCircle, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function VehicleSetupPage() {
  const [, setLocation] = useLocation();
  const [vin, setVin] = useState("");
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [showManualEntry, setShowManualEntry] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleVinCheck = () => {
    if (!vin) {
      toast({
        title: "VIN required",
        description: "Please enter your vehicle's VIN number",
        variant: "destructive",
      });
      return;
    }

    // Mock VIN validation
    if (vin.length !== 17) {
      toast({
        title: "Invalid VIN",
        description: "VIN must be 17 characters long",
        variant: "destructive",
      });
      return;
    }

    // Mock VIN decode
    toast({
      title: "VIN verified",
      description: "Vehicle information retrieved successfully",
    });

    // Mock populate fields
    setYear("2022");
    setMake("Toyota");
    setModel("Camry");
  };

  const handleContinue = () => {
    if (!year || !make || !model) {
      toast({
        title: "Missing information",
        description: "Please complete all vehicle information",
        variant: "destructive",
      });
      return;
    }

    // Save vehicle info
    localStorage.setItem(`provider-onboarding-vehicle-${user?.id}`, JSON.stringify({ vin, year, make, model }));
    localStorage.setItem(`provider-onboarding-vehicle-setup-${user?.id}`, 'true');
    setLocation('/provider-onboarding/bank-info');
  };

  const handleDapperVehicle = () => {
    localStorage.setItem(`provider-onboarding-vehicle-${user?.id}`, JSON.stringify({ dapperVehicle: true }));
    localStorage.setItem(`provider-onboarding-vehicle-setup-${user?.id}`, 'true');
    setLocation('/provider-onboarding/bank-info');
  };

  const handleBack = () => {
    setLocation('/provider-onboarding/id-verification');
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
            <div className="w-2 h-2 rounded-full bg-[#8c52ff]"></div>
            <div className="w-2 h-2 rounded-full bg-gray-300"></div>
          </div>

          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold text-gray-900">
              Tell us about your vehicle
            </h1>
            <p className="text-gray-600">
              We need this to help customers find you and estimate service times.
            </p>
          </div>

          {/* Vehicle Form */}
          <div className="space-y-6">
            {/* VIN Section */}
            {!showManualEntry && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">VIN Number</label>
                  <Input
                    type="text"
                    placeholder="Enter your 17-digit VIN"
                    value={vin}
                    onChange={(e) => setVin(e.target.value.toUpperCase())}
                    maxLength={17}
                    className="h-14 text-base rounded-lg border-gray-300 focus:border-[#8c52ff] focus:ring-[#8c52ff] font-mono"
                  />
                  <p className="text-xs text-gray-500">
                    Usually found on your dashboard or driver's side door
                  </p>
                </div>

                <Button
                  onClick={handleVinCheck}
                  disabled={vin.length !== 17}
                  className="w-full h-12 bg-[#8c52ff] hover:bg-[#8c52ff]/90 text-white text-base font-medium rounded-lg disabled:bg-gray-300"
                >
                  <Car className="w-4 h-4 mr-2" />
                  Verify VIN
                </Button>

                <div className="text-center">
                  <button
                    onClick={() => setShowManualEntry(true)}
                    className="flex items-center justify-center text-[#8c52ff] text-sm font-medium hover:underline mx-auto"
                  >
                    <HelpCircle className="w-4 h-4 mr-1" />
                    Don't know my VIN?
                  </button>
                </div>
              </div>
            )}

            {/* Manual Entry or VIN Results */}
            {(showManualEntry || year) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {showManualEntry && (
                  <div className="text-center pb-4">
                    <p className="text-sm text-gray-600">Enter your vehicle details manually</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Year</label>
                    <Input
                      type="text"
                      placeholder="2020"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="h-12 text-base rounded-lg border-gray-300 focus:border-[#8c52ff] focus:ring-[#8c52ff]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Make</label>
                    <Input
                      type="text"
                      placeholder="Toyota"
                      value={make}
                      onChange={(e) => setMake(e.target.value)}
                      className="h-12 text-base rounded-lg border-gray-300 focus:border-[#8c52ff] focus:ring-[#8c52ff]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Model</label>
                  <Input
                    type="text"
                    placeholder="Camry"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="h-12 text-base rounded-lg border-gray-300 focus:border-[#8c52ff] focus:ring-[#8c52ff]"
                  />
                </div>

                {year && make && model && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-green-50 border border-green-200 rounded-lg p-4"
                  >
                    <p className="text-sm font-medium text-green-800">
                      Vehicle: {year} {make} {model}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Ready to get started with your mobile detail service
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}
          </div>

          {/* Continue Button */}
          <Button
            onClick={handleContinue}
            disabled={!year || !make || !model}
            className="w-full h-14 bg-[#8c52ff] hover:bg-[#8c52ff]/90 text-white text-base font-medium rounded-lg disabled:bg-gray-300 disabled:text-gray-500"
          >
            Continue
          </Button>

          {/* Dapper Vehicle Option */}
          <button
            onClick={handleDapperVehicle}
            className="w-full flex items-center justify-center gap-2 text-[#8c52ff] text-sm font-medium py-2 hover:opacity-75 transition-opacity"
          >
            <Truck className="w-4 h-4" />
            I am using a Dapper vehicle instead
          </button>
        </div>
      </div>
    </div>
  );
}