import { useState } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { SiApple, SiGoogle } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import dapperVanImage from "../dapper-van.png";

export default function AuthScreen() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"phone" | "email">("phone");
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [countryCode, setCountryCode] = useState("+1");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();

  const handleContinue = async () => {
    if (isLoginMode) {
      // Handle login with actual authentication
      const credentials = activeTab === "phone" 
        ? { username: phoneNumber, password }
        : { username: email, password };
      
      try {
        await loginMutation.mutateAsync(credentials);
        setLocation("/");
      } catch (error) {
        // Error is handled by the mutation's onError
      }
    } else {
      // For signup, we'll simulate the flow by storing signup data and going to verification
      // In a real app, this would trigger SMS/email verification
      const signupData = activeTab === "phone"
        ? { type: "phone", value: phoneNumber }
        : { type: "email", value: email };
      
      // Store signup data for verification screen
      localStorage.setItem("pendingSignup", JSON.stringify(signupData));
      setLocation("/verify");
    }
  };

  const handleSkip = () => {
    setLocation("/");
  };

  const handleBack = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header with Back Button - Positioned Absolutely */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 pt-12">
        <button 
          onClick={handleBack}
          className="p-2 hover:bg-white/90 bg-white/80 backdrop-blur-sm rounded-full transition-colors shadow-sm"
        >
          <Icon icon={ArrowLeft} size="lg" className="text-gray-700" />
        </button>
        <h1 className="text-xl font-semibold text-gray-900 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm">
          {isLoginMode ? "Log in" : "Sign up"}
        </h1>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Hero Image */}
      <div className="w-full h-64 overflow-hidden">
        <img 
          src={dapperVanImage} 
          alt="Dapper mobile car wash van"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 py-8">
        <div className="max-w-sm mx-auto space-y-8">
          
          {/* Tabs */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab("phone")}
              className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all ${
                activeTab === "phone"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Phone
            </button>
            <button
              onClick={() => setActiveTab("email")}
              className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all ${
                activeTab === "email"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Email
            </button>
          </div>

          {/* Input Section */}
          <div className="space-y-4">
            {activeTab === "phone" ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="flex gap-2">
                  {/* Country Code Dropdown */}
                  <div className="relative">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-4 pr-10 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#8c52ff] focus:border-transparent"
                    >
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+44">🇬🇧 +44</option>
                      <option value="+33">🇫🇷 +33</option>
                      <option value="+49">🇩🇪 +49</option>
                      <option value="+81">🇯🇵 +81</option>
                    </select>
                    <Icon icon={ChevronDown} size="sm" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  
                  {/* Phone Number Input */}
                  <Input
                    type="tel"
                    placeholder="Phone number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="flex-1 h-14 px-4 text-base border-gray-300 focus:ring-[#8c52ff] focus:border-transparent"
                  />
                </div>

                {/* Password field for login mode */}
                {isLoginMode && (
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-14 px-4 text-base border-gray-300 focus:ring-[#8c52ff] focus:border-transparent"
                  />
                )}

                {/* Disclaimer - only show in signup mode */}
                {!isLoginMode && (
                  <p className="text-xs text-gray-600 leading-relaxed">
                    We will send a text with a verification code. Message and data rates may apply. 
                    By continuing, you agree to our{" "}
                    <button className="text-[#8c52ff] underline">Terms of Service</button>.
                  </p>
                )}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 px-4 text-base border-gray-300 focus:ring-[#8c52ff] focus:border-transparent"
                />

                {/* Password field for login mode */}
                {isLoginMode && (
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-14 px-4 text-base border-gray-300 focus:ring-[#8c52ff] focus:border-transparent"
                  />
                )}
              </motion.div>
            )}

            {/* Continue Button */}
            <Button
              onClick={handleContinue}
              disabled={
                (isLoginMode 
                  ? (activeTab === "phone" ? !phoneNumber || !password : !email || !password)
                  : (activeTab === "phone" ? !phoneNumber : !email)) ||
                loginMutation.isPending || registerMutation.isPending
              }
              className="w-full h-14 text-base font-semibold bg-[#8c52ff] hover:bg-[#7c47eb] disabled:bg-gray-300 disabled:text-gray-500 rounded-lg"
            >
              {loginMutation.isPending || registerMutation.isPending 
                ? "Please wait..." 
                : (isLoginMode ? "Log in" : "Continue")
              }
            </Button>

            {/* Toggle Login/Signup */}
            <div className="text-center">
              <button
                onClick={() => {
                  setIsLoginMode(!isLoginMode);
                  setPassword("");
                }}
                className="text-[#8c52ff] text-base font-medium hover:underline"
              >
                {isLoginMode ? "Don't have an account? Sign up" : "Already have account? Login"}
              </button>
            </div>
          </div>

          {/* OR Divider */}
          <div className="relative">
            <Separator className="bg-gray-200" />
            <div className="absolute inset-0 flex justify-center">
              <span className="bg-white px-4 text-sm text-gray-500">or</span>
            </div>
          </div>

          {/* Social Buttons */}
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full h-14 text-base font-medium border-gray-300 hover:bg-gray-50 rounded-lg"
              onClick={() => console.log("Continue with Apple")}
            >
              <div className="flex items-center justify-center gap-3">
                <SiApple className="text-xl" />
                <span>Continue with Apple</span>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full h-14 text-base font-medium border-gray-300 hover:bg-gray-50 rounded-lg"
              onClick={() => console.log("Continue with Google")}
            >
              <div className="flex items-center justify-center gap-3">
                <SiGoogle className="text-xl" />
                <span>Continue with Google</span>
              </div>
            </Button>
          </div>

          {/* Provider Sign Up Section */}
          <div className="pt-4 border-t border-gray-200">
            <div className="text-center mb-3">
              <p className="text-sm text-gray-600">Are you a car care professional?</p>
            </div>
            <Link href="/provider-auth">
              <Button
                variant="outline"
                className="w-full h-14 text-base font-medium border-[#8c52ff] text-[#8c52ff] hover:bg-[#8c52ff]/5 rounded-lg"
              >
                <div className="flex items-center justify-center gap-3">
                  <span className="text-lg">🚗</span>
                  <span>Sign up to be a Detail Pro</span>
                </div>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Skip Link */}
      <div className="p-6 pb-8">
        <div className="text-center">
          <button
            onClick={handleSkip}
            className="text-[#8c52ff] text-base font-medium hover:underline"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}