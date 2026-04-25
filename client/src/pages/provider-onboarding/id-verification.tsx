import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Upload, Camera, CheckCircle } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function IdVerificationPage() {
  const [, setLocation] = useLocation();
  const [frontIdUploaded, setFrontIdUploaded] = useState(false);
  const [backIdUploaded, setBackIdUploaded] = useState(false);
  const [selfieUploaded, setSelfieUploaded] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleFileUpload = (type: 'front' | 'back' | 'selfie') => {
    toast({
      title: "File uploaded",
      description: `${type === 'front' ? 'Front ID' : type === 'back' ? 'Back ID' : 'Selfie'} uploaded successfully`,
    });

    if (type === 'front') setFrontIdUploaded(true);
    if (type === 'back') setBackIdUploaded(true);
    if (type === 'selfie') setSelfieUploaded(true);
  };

  const handleContinue = () => {
    localStorage.setItem(`provider-onboarding-id-verification-${user?.id}`, 'true');
    setLocation('/provider-onboarding/vehicle-setup');
  };

  const handleSkip = () => {
    toast({
      title: "Verification skipped",
      description: "You can complete this later in your profile settings",
    });
    handleContinue();
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="p-6 pt-12">
        <button
          onClick={() => setLocation('/provider-auth')}
          className="flex items-center text-[#8c52ff] hover:text-[#8c52ff]/80 transition-colors"
        >
          <Icon icon={ArrowLeft} size="md" className="mr-2" />
          <span className="text-base font-medium">Back</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center px-6 pb-6">
        <div className="max-w-sm mx-auto w-full space-y-8">
          {/* Progress indicator */}
          <div className="flex justify-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-[#8c52ff]"></div>
            <div className="w-2 h-2 rounded-full bg-gray-300"></div>
            <div className="w-2 h-2 rounded-full bg-gray-300"></div>
          </div>

          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold text-gray-900">
              Verify Your Identity
            </h1>
            <p className="text-gray-600">
              This helps us keep the Dapper community safe.
            </p>
          </div>

          {/* Upload Sections */}
          <div className="space-y-6">
            {/* Front ID */}
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-900">Driver's License or ID</h3>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Front */}
                <motion.div
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleFileUpload('front')}
                  className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    frontIdUploaded 
                      ? 'border-green-300 bg-green-50' 
                      : 'border-gray-300 hover:border-[#8c52ff] hover:bg-gray-50'
                  }`}
                >
                  {frontIdUploaded ? (
                    <div className="space-y-2">
                      <Icon icon={CheckCircle} size="xl" className="text-green-500 mx-auto" />
                      <p className="text-sm font-medium text-green-700">Front Uploaded</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Icon icon={Upload} size="xl" className="text-gray-400 mx-auto" />
                      <p className="text-sm font-medium text-gray-600">Front</p>
                    </div>
                  )}
                </motion.div>

                {/* Back */}
                <motion.div
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleFileUpload('back')}
                  className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    backIdUploaded 
                      ? 'border-green-300 bg-green-50' 
                      : 'border-gray-300 hover:border-[#8c52ff] hover:bg-gray-50'
                  }`}
                >
                  {backIdUploaded ? (
                    <div className="space-y-2">
                      <Icon icon={CheckCircle} size="xl" className="text-green-500 mx-auto" />
                      <p className="text-sm font-medium text-green-700">Back Uploaded</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Icon icon={Upload} size="xl" className="text-gray-400 mx-auto" />
                      <p className="text-sm font-medium text-gray-600">Back</p>
                    </div>
                  )}
                </motion.div>
              </div>
            </div>

            {/* Selfie */}
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-900">Selfie (Optional)</h3>
              
              <motion.div
                whileTap={{ scale: 0.98 }}
                onClick={() => handleFileUpload('selfie')}
                className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  selfieUploaded 
                    ? 'border-green-300 bg-green-50' 
                    : 'border-gray-300 hover:border-[#8c52ff] hover:bg-gray-50'
                }`}
              >
                {selfieUploaded ? (
                  <div className="space-y-2">
                    <Icon icon={CheckCircle} size="xl" className="text-green-500 mx-auto" />
                    <p className="text-sm font-medium text-green-700">Selfie Uploaded</p>
                    <p className="text-xs text-green-600">For future face match verification</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Icon icon={Camera} size="xl" className="text-gray-400 mx-auto" />
                    <p className="text-sm font-medium text-gray-600">Take or Upload Selfie</p>
                    <p className="text-xs text-gray-500">For future face match verification</p>
                  </div>
                )}
              </motion.div>
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleContinue}
              disabled={!frontIdUploaded || !backIdUploaded}
              className="w-full h-14 bg-[#8c52ff] hover:bg-[#8c52ff]/90 text-white text-base font-medium rounded-lg disabled:bg-gray-300 disabled:text-gray-500"
            >
              Continue
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