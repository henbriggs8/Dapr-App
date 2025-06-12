import { useLocation } from "wouter";
import { Calendar, HelpCircle, Building2, Car, Sparkles, Baby, Gift, Copy, Share } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function HomeScreen() {
  const [, setLocation] = useLocation();
  const [showReferralModal, setShowReferralModal] = useState(false);
  const { toast } = useToast();

  const referralLink = "https://autodapper.com/referral/henry123";

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      toast({
        title: "Link copied!",
        description: "Referral link copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Unable to copy link to clipboard",
        variant: "destructive",
      });
    }
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Get $20 off your first car wash!",
          text: "Join Dapper and get $20 off your first mobile car wash service.",
          url: referralLink,
        });
      } catch (err) {
        // User cancelled sharing or sharing failed
        copyToClipboard();
      }
    } else {
      // Fallback to copy
      copyToClipboard();
    }
  };

  const featureTiles = [
    {
      id: 1,
      icon: <HelpCircle className="h-6 w-6" />,
      label: "How It Works",
      route: "/how-it-works"
    },
    {
      id: 2,
      icon: <Car className="h-6 w-6" />,
      label: "Interior Cleaning",
      route: "/interior-cleaning"
    },
    {
      id: 3,
      icon: <Sparkles className="h-6 w-6" />,
      label: "Exterior Cleaning",
      route: "/exterior-cleaning"
    },
    {
      id: 4,
      icon: <Baby className="h-6 w-6" />,
      label: "Child Car Seat Cleaning",
      route: "/car-seat-cleaning"
    },
    {
      id: 5,
      icon: <HelpCircle className="h-6 w-6" />,
      label: "FAQ",
      route: "/faq"
    },
    {
      id: 6,
      icon: <Building2 className="h-6 w-6" />,
      label: "Corporate Packages",
      route: "/corporate"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative h-64 overflow-hidden">
        <img 
          src="/hero-lambo.jpg" 
          alt="Professional car detailing service"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <div className="text-center px-4">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-3xl md:text-4xl font-bold text-white mb-2"
            >
              Redefining the Car Wash
            </motion.h1>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-2xl"
            >
              🚗🧼
            </motion.div>
          </div>
        </div>
      </div>

      {/* Header Area */}
      <div className="px-4 pt-8 pb-6">
        <div className="max-w-md mx-auto">
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            onClick={() => setLocation("/booking")}
            className="w-full bg-gray-100 hover:bg-gray-200 rounded-xl p-6 text-left transition-colors duration-200 active:scale-95 transform"
          >
            <div className="flex items-center space-x-4">
              <div className="bg-[#8c52ff] rounded-full p-3">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Schedule Your Wash</h2>
                <p className="text-gray-600 text-sm mt-1">Tap to book your mobile car wash</p>
              </div>
            </div>
          </motion.button>
        </div>
      </div>

      {/* Logo Section */}
      <div className="px-4 py-8">
        <div className="max-w-md mx-auto flex justify-center">
          <motion.img
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            src="/dapper-logo-text.png"
            alt="Dapper Logo"
            className="h-24 w-auto"
          />
        </div>
      </div>

      {/* Feature Tiles Section */}
      <div className="px-4 pb-20">
        <div className="max-w-md mx-auto">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Services</h3>
          
          <div className="grid grid-cols-2 gap-3">
            {featureTiles.map((tile, index) => (
              <motion.button
                key={tile.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                onClick={() => setLocation(tile.route)}
                className="bg-white border border-gray-200 hover:border-[#8c52ff] rounded-xl p-4 text-left transition-all duration-200 hover:shadow-md active:scale-95 transform"
              >
                <div className="flex flex-col items-start space-y-3">
                  <div className="bg-gray-100 rounded-full p-2 text-[#8c52ff]">
                    {tile.icon}
                  </div>
                  <span className="font-semibold text-gray-900 text-sm leading-tight">
                    {tile.label}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Referral Banner */}
      <div className="px-4 pb-20">
        <div className="max-w-md mx-auto">
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            onClick={() => setShowReferralModal(true)}
            className="w-full bg-gradient-to-r from-[#8c52ff] to-[#7c47eb] hover:from-[#7c47eb] hover:to-[#6b3bdf] rounded-xl p-6 text-white transition-all duration-200 active:scale-95 transform shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 rounded-full p-3">
                  <Gift className="h-6 w-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-bold">Give $20, Get $20</h3>
                  <p className="text-white/90 text-sm">Refer friends and both save!</p>
                </div>
              </div>
              <div className="text-white/80">
                <Share className="h-5 w-5" />
              </div>
            </div>
          </motion.button>
        </div>
      </div>

      {/* Referral Modal */}
      <Dialog open={showReferralModal} onOpenChange={setShowReferralModal}>
        <DialogContent className="mx-4 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold">
              Give $20, Get $20
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 pt-4">
            <div className="text-center">
              <div className="bg-gradient-to-r from-[#8c52ff] to-[#7c47eb] rounded-full p-4 w-16 h-16 mx-auto mb-4">
                <Gift className="h-8 w-8 text-white" />
              </div>
              <p className="text-gray-600">
                Share your referral link and both you and your friend get $20 off your next wash!
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Your referral link:</label>
              <div className="flex gap-2">
                <Input 
                  value={referralLink} 
                  readOnly 
                  className="flex-1 bg-gray-50"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={shareLink}
                className="flex-1 bg-[#8c52ff] hover:bg-[#7c47eb] text-white"
              >
                <Share className="h-4 w-4 mr-2" />
                Share Link
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowReferralModal(false)}
                className="flex-1"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bottom spacing for mobile navigation */}
      <div className="pb-20 sm:pb-8"></div>
    </div>
  );
}