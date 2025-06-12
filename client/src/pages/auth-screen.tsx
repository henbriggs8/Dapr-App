import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export default function AuthScreen() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"phone" | "email">("phone");
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [countryCode, setCountryCode] = useState("+1");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleContinue = () => {
    if (isLoginMode) {
      // Handle login logic (placeholder)
      console.log("Login attempt", { activeTab, email, phoneNumber, password });
      setLocation("/");
    } else {
      // Navigate to verification screen for signup
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
      {/* Header */}
      <div className="flex items-center justify-between p-4 pt-12">
        <button 
          onClick={handleBack}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="h-6 w-6 text-gray-700" />
        </button>
        <h1 className="text-xl font-semibold text-gray-900">
          {isLoginMode ? "Log in" : "Sign up"}
        </h1>
        <div className="w-10" /> {/* Spacer for centering */}
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
              Phone number
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
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
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
                isLoginMode 
                  ? (activeTab === "phone" ? !phoneNumber || !password : !email || !password)
                  : (activeTab === "phone" ? !phoneNumber : !email)
              }
              className="w-full h-14 text-base font-semibold bg-[#8c52ff] hover:bg-[#7c47eb] disabled:bg-gray-300 disabled:text-gray-500 rounded-lg"
            >
              {isLoginMode ? "Log in" : "Continue"}
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
                <span className="text-lg">🍎</span>
                <span>Continue with Apple</span>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full h-14 text-base font-medium border-gray-300 hover:bg-gray-50 rounded-lg"
              onClick={() => console.log("Continue with Google")}
            >
              <div className="flex items-center justify-center gap-3">
                <span className="text-lg">🔍</span>
                <span>Continue with Google</span>
              </div>
            </Button>
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