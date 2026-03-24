import { useLocation } from "wouter";
import { Calendar, Building2, Car, Sparkles, Baby, HelpCircle, Gift, Copy, Share, Droplets, ChevronRight } from "lucide-react";
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
      toast({ title: "Link copied!", description: "Referral link copied to clipboard" });
    } catch {
      toast({ title: "Copy failed", description: "Unable to copy link", variant: "destructive" });
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
      } catch {
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  const featureTiles = [
    { icon: Droplets, label: "Full Car Cleaning", route: "/services" },
    { icon: Car, label: "Interior Cleaning", route: "/interior-cleaning" },
    { icon: Sparkles, label: "Exterior Cleaning", route: "/exterior-cleaning" },
    { icon: Baby, label: "Child Car Seat Cleaning", route: "/car-seat-cleaning" },
    { icon: HelpCircle, label: "FAQ", route: "/faq" },
    { icon: Building2, label: "Corporate Packages", route: "/corporate" },
  ];

  return (
    <div className="min-h-screen bg-white font-sans" style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }}>
      {/* Hero */}
      <div className="relative h-56 overflow-hidden">
        <img
          src="/hero-final.jpg"
          alt="Professional car detailing"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50 flex flex-col justify-end px-6 pb-6">
          <p className="text-xs font-semibold tracking-widest text-white/60 uppercase mb-1">Dapper</p>
          <h1 className="text-2xl font-medium text-white tracking-tight">Redefining the Car Wash</h1>
        </div>
      </div>

      {/* Book CTA */}
      <div className="px-6 pt-8 pb-6 border-b border-gray-200">
        <button
          onClick={() => setLocation("/booking")}
          className="w-full flex items-center justify-between group"
        >
          <div>
            <h2 className="text-lg font-medium text-black">Get a Wash</h2>
            <p className="text-sm text-gray-500 mt-0.5">In as little as 15 minutes</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">Book now</span>
            <ChevronRight className="w-5 h-5 text-[#8c52ff]" />
          </div>
        </button>
      </div>

      {/* Services List */}
      <div className="px-6 pt-6 pb-2">
        <h3 className="text-xs font-semibold text-gray-500 tracking-widest uppercase mb-4">Services</h3>
        <div className="border-t border-gray-200">
          {featureTiles.map((tile) => (
            <button
              key={tile.route}
              onClick={() => setLocation(tile.route)}
              className="w-full flex items-center justify-between py-5 border-b border-gray-200 group"
            >
              <div className="flex items-center gap-4">
                <tile.icon className="h-5 w-5 text-gray-400" />
                <span className="text-base text-black">{tile.label}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-[#8c52ff]" />
            </button>
          ))}
        </div>
      </div>

      {/* Referral Strip */}
      <div className="px-6 pt-6">
        <button
          onClick={() => setShowReferralModal(true)}
          className="w-full bg-gray-950 text-white p-5 flex items-center justify-between hover:bg-black transition-colors"
        >
          <div className="text-left">
            <p className="text-xs font-semibold tracking-widest text-white/50 uppercase mb-1">Refer a Friend</p>
            <h3 className="text-base font-medium">Give $20, Get $20</h3>
          </div>
          <ChevronRight className="w-5 h-5 text-[#8c52ff]" />
        </button>
      </div>

      {/* Referral Modal */}
      <Dialog open={showReferralModal} onOpenChange={setShowReferralModal}>
        <DialogContent className="mx-4 rounded-none border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-medium">Give $20, Get $20</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <p className="text-sm text-gray-500 leading-relaxed">
              Share your referral link and both you and your friend get $20 off your next wash.
            </p>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 tracking-widest uppercase">Your referral link</label>
              <div className="flex gap-2">
                <Input value={referralLink} readOnly className="flex-1 rounded-none border-gray-200 bg-gray-50 text-sm" />
                <Button variant="outline" size="sm" onClick={copyToClipboard} className="rounded-none border-gray-200">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <Button onClick={shareLink} className="flex-1 bg-black hover:bg-gray-900 text-white rounded-none">
                <Share className="h-4 w-4 mr-2" /> Share Link
              </Button>
              <Button variant="outline" onClick={() => setShowReferralModal(false)} className="flex-1 rounded-none border-gray-200">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
