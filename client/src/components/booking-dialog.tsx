import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { User, PricingConfig } from "@shared/schema";
import { Button } from "./ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

export default function BookingDialog({
  provider,
  pricing,
  open,
  onClose,
}: {
  provider: User;
  pricing: PricingConfig;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();

  const bookingMutation = useMutation({
    mutationFn: async (tier: string) => {
      const res = await apiRequest("POST", "/api/bookings", {
        providerId: provider.id,
        priceTier: tier,
        timestamp: new Date().toISOString(),
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Booking successful",
        description: "Your car wash has been scheduled",
      });
      onClose();
    },
  });

  const book = (tier: string) => {
    bookingMutation.mutate(tier);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Book with {provider.name}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="basic">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="standard">Standard</TabsTrigger>
            <TabsTrigger value="premium">Premium</TabsTrigger>
          </TabsList>
          <TabsContent value="basic" className="space-y-4">
            <div className="text-2xl font-bold">${pricing.basic}</div>
            <ul className="space-y-2">
              <li>✓ Exterior Wash</li>
              <li>✓ Basic Cleaning</li>
            </ul>
            <Button
              onClick={() => book("basic")}
              disabled={bookingMutation.isPending}
              className="w-full"
            >
              Book Basic Wash
            </Button>
          </TabsContent>
          <TabsContent value="standard" className="space-y-4">
            <div className="text-2xl font-bold">${pricing.standard}</div>
            <ul className="space-y-2">
              <li>✓ Exterior Wash</li>
              <li>✓ Interior Vacuum</li>
              <li>✓ Window Cleaning</li>
            </ul>
            <Button
              onClick={() => book("standard")}
              disabled={bookingMutation.isPending}
              className="w-full"
            >
              Book Standard Wash
            </Button>
          </TabsContent>
          <TabsContent value="premium" className="space-y-4">
            <div className="text-2xl font-bold">${pricing.premium}</div>
            <ul className="space-y-2">
              <li>✓ Full Detail</li>
              <li>✓ Wax Treatment</li>
              <li>✓ Interior Deep Clean</li>
              <li>✓ Tire Shine</li>
            </ul>
            <Button
              onClick={() => book("premium")}
              disabled={bookingMutation.isPending}
              className="w-full"
            >
              Book Premium Wash
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}