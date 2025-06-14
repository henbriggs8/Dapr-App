import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronDown, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export default function ProviderAuthPage() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"phone" | "email">("phone");
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [countryCode, setCountryCode] = useState("+1");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const { user, loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();

  // Handle user redirects with useEffect to avoid setState during render
  useEffect(() => {
    if (user) {
      if (user.isProvider) {
        // Check if onboarding is complete
        const onboardingComplete = localStorage.getItem('provider-onboarding-complete');
        if (!onboardingComplete) {
          setLocation('/provider-onboarding/id-verification');
        } else {
          setLocation('/provider');
        }
      } else {
        setLocation('/');
      }
    }
  }, [user, setLocation]);

  if (user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            {/* Circular loading ring */}
            <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-[#8c52ff] border-t-transparent rounded-full animate-spin"></div>
            {/* Car icon in center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Car className="w-6 h-6 text-[#8c52ff]" />
            </div>
          </div>
          <p className="text-gray-600 text-lg">Redirecting...</p>
        </div>
      </div>
    );
  }

  const handleBack = () => {
    setLocation('/auth');
  };

  const handleAuth = async () => {
    const identifier = activeTab === "phone" ? `${countryCode}${phoneNumber}` : email;
    
    if (!identifier || !password || (!isLoginMode && !fullName)) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const authData = {
      username: identifier,
      password,
      isProvider: true,
      ...(isLoginMode ? {} : { name: fullName }),
    };

    try {
      if (isLoginMode) {
        await loginMutation.mutateAsync(authData);
      } else {
        await registerMutation.mutateAsync(authData);
      }
    } catch (error) {
      // Error handling is done in the mutation's onError callback
    }
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
          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold text-gray-900">
              {isLoginMode ? "Welcome back, Detail Pro" : "Join the Dapper Team"}
            </h1>
            <p className="text-gray-600">
              {isLoginMode 
                ? "Sign in to access your provider dashboard" 
                : "Start your career as a professional car care specialist"
              }
            </p>
          </div>

          {/* Auth Form */}
          <div className="space-y-6">
            {/* Tab Selection */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab("phone")}
                className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "phone"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Phone
              </button>
              <button
                onClick={() => setActiveTab("email")}
                className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "email"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Email
              </button>
            </div>

            {/* Full Name (Register only) */}
            {!isLoginMode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <label className="text-sm font-medium text-gray-700">Full Name</label>
                <Input
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-14 text-base rounded-lg border-gray-300 focus:border-[#8c52ff] focus:ring-[#8c52ff]"
                />
              </motion.div>
            )}

            {/* Phone/Email Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                {activeTab === "phone" ? "Phone Number" : "Email Address"}
              </label>
              
              {activeTab === "phone" ? (
                <div className="flex gap-2">
                  <div className="relative">
                    <button className="flex items-center justify-center w-20 h-14 border border-gray-300 rounded-lg bg-white">
                      <span className="text-sm font-medium">{countryCode}</span>
                      <ChevronDown className="w-4 h-4 ml-1 text-gray-400" />
                    </button>
                  </div>
                  <Input
                    type="tel"
                    placeholder="Phone number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="flex-1 h-14 text-base rounded-lg border-gray-300 focus:border-[#8c52ff] focus:ring-[#8c52ff]"
                  />
                </div>
              ) : (
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 text-base rounded-lg border-gray-300 focus:border-[#8c52ff] focus:ring-[#8c52ff]"
                />
              )}
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <Input
                type="password"
                placeholder={isLoginMode ? "Enter your password" : "Create a secure password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 text-base rounded-lg border-gray-300 focus:border-[#8c52ff] focus:ring-[#8c52ff]"
              />
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleAuth}
              disabled={loginMutation.isPending || registerMutation.isPending}
              className="w-full h-14 bg-[#8c52ff] hover:bg-[#8c52ff]/90 text-white text-base font-medium rounded-lg"
            >
              {(loginMutation.isPending || registerMutation.isPending)
                ? (isLoginMode ? "Signing In..." : "Creating Account...")
                : (isLoginMode ? "Sign In" : "Join Our Team")
              }
            </Button>

            {/* Toggle Login/Signup */}
            <div className="text-center">
              <button
                onClick={() => {
                  setIsLoginMode(!isLoginMode);
                  setPassword("");
                  setFullName("");
                }}
                className="text-[#8c52ff] text-base font-medium hover:underline"
              >
                {isLoginMode ? "New to Dapper? Join our team" : "Already a Detail Pro? Sign in"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}