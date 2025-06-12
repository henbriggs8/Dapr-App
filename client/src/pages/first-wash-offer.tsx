import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Gift, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FirstWashOffer() {
  const [, setLocation] = useLocation();

  const handleBookFreeWash = () => {
    // Mark onboarding as completed
    localStorage.setItem("onboardingCompleted", "true");
    
    // Navigate to booking screen
    setLocation("/booking");
  };

  const handleNotNow = () => {
    // Mark onboarding as completed but skip the free wash
    localStorage.setItem("onboardingCompleted", "true");
    
    // Navigate to home screen
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-white px-4 pt-12 pb-8">
      {/* Header */}
      <div className="flex items-center mb-8">
        <button
          onClick={() => setLocation("/onboarding/car-profile")}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-full"
        >
          <ArrowLeft className="h-6 w-6 text-gray-600" />
        </button>
        <h1 className="text-xl font-semibold text-gray-900 ml-4">
          Welcome Offer
        </h1>
      </div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center flex-1 flex flex-col justify-center"
      >
        {/* Icon with Animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-[#8c52ff] to-[#7c47eb] rounded-full mb-8 mx-auto relative"
        >
          <Gift className="h-12 w-12 text-white" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute -top-2 -right-2"
          >
            <Sparkles className="h-8 w-8 text-yellow-400" />
          </motion.div>
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold text-gray-900 mb-4"
        >
          Get Your First Wash Free
        </motion.h2>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-lg text-gray-600 mb-2 leading-relaxed"
        >
          Just cover the tip — we'll handle the rest
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-base text-gray-500 mb-12 leading-relaxed"
        >
          Experience premium car detailing at your location with our welcome offer
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-4"
        >
          <Button
            onClick={handleBookFreeWash}
            className="w-full h-14 text-base font-semibold bg-[#8c52ff] hover:bg-[#7c47eb] rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            Book My Free Wash
          </Button>

          <button
            onClick={handleNotNow}
            className="w-full h-12 text-gray-500 font-medium hover:text-gray-700 transition-colors"
          >
            Not now
          </button>
        </motion.div>

        {/* Fine Print */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 pt-8 border-t border-gray-100"
        >
          <p className="text-xs text-gray-400 leading-relaxed">
            *Free wash includes exterior wash and interior vacuum. Tip for detailer not included. 
            Valid for new customers only. One per household.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}