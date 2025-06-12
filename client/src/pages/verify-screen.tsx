import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function VerifyScreen() {
  const [, setLocation] = useLocation();
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { toast } = useToast();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Start cooldown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleInputChange = (index: number, value: string) => {
    // Only allow numeric input
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1); // Only take the last character
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Handle backspace
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newCode = [...code];
    
    for (let i = 0; i < pastedText.length; i++) {
      newCode[i] = pastedText[i];
    }
    setCode(newCode);

    // Focus the next empty input or the last one
    const nextIndex = Math.min(pastedText.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const isCodeComplete = code.every(digit => digit !== "");

  const handleContinue = async () => {
    if (!isCodeComplete) return;

    setIsLoading(true);
    const enteredCode = code.join("");

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (enteredCode === "123456") {
      toast({
        title: "Verification successful!",
        description: "Welcome to Dapper",
      });
      
      // Check if user needs onboarding
      const hasCompletedOnboarding = localStorage.getItem("onboardingCompleted");
      const hasAddress = localStorage.getItem("userAddress");
      
      if (!hasCompletedOnboarding && !hasAddress) {
        setLocation("/onboarding/address");
      } else {
        setLocation("/");
      }
    } else {
      toast({
        title: "Invalid code",
        description: "Please check your code and try again",
        variant: "destructive",
      });
      // Clear the code
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
    setIsLoading(false);
  };

  const handleResendCode = () => {
    if (resendCooldown > 0) return;
    
    setResendCooldown(30);
    toast({
      title: "Code sent",
      description: "A new verification code has been sent",
    });
  };

  const handleBack = () => {
    setLocation("/auth");
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pt-12">
        <button 
          onClick={handleBack}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="h-6 w-6 text-gray-700" />
        </button>
        <h1 className="text-xl font-semibold text-gray-900">Verify your phone</h1>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 py-8">
        <div className="max-w-sm mx-auto space-y-8">
          
          {/* Subtitle */}
          <div className="text-center">
            <p className="text-gray-600 text-base">
              Enter the 6-digit code we sent to you
            </p>
          </div>

          {/* Code Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <div className="flex justify-center gap-3">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={el => inputRefs.current[index] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className="w-12 h-14 text-center text-xl font-semibold border-2 border-gray-300 rounded-lg focus:border-[#8c52ff] focus:outline-none transition-colors"
                />
              ))}
            </div>

            {/* Continue Button */}
            <Button
              onClick={handleContinue}
              disabled={!isCodeComplete || isLoading}
              className="w-full h-14 text-base font-semibold bg-[#8c52ff] hover:bg-[#7c47eb] disabled:bg-gray-300 disabled:text-gray-500 rounded-lg"
            >
              {isLoading ? "Verifying..." : "Continue"}
            </Button>
          </motion.div>

          {/* Resend Code */}
          <div className="text-center">
            <button
              onClick={handleResendCode}
              disabled={resendCooldown > 0}
              className="text-[#8c52ff] text-base font-medium hover:underline disabled:text-gray-400 disabled:no-underline"
            >
              {resendCooldown > 0 
                ? `Resend code in ${resendCooldown}s`
                : "Resend code"
              }
            </button>
          </div>

          {/* Helper Text */}
          <div className="text-center">
            <p className="text-sm text-gray-500">
              Didn't receive a code? Check your spam folder or try resending.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom spacing */}
      <div className="pb-8" />
    </div>
  );
}