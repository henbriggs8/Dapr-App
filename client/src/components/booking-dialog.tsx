import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { User, PricingConfig, bookingFormSchema } from "@shared/schema";
import { Button } from "./ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

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

  const form = useForm({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      serviceLocation: "",
      serviceLocationType: "home",
      priceTier: "basic",
      providerId: provider.id,
      timestamp: new Date().toISOString(),
    },
  });

  const bookingMutation = useMutation({
    mutationFn: async (formData: any) => {
      const res = await apiRequest("POST", "/api/bookings", formData);
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
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create booking",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (tier: string) => {
    form.setValue("priceTier", tier);
    const formData = form.getValues();
    bookingMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Book with {provider.name}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4 mb-4">
            <FormField
              control={form.control}
              name="serviceLocationType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="home" id="home" />
                        <Label htmlFor="home">Home</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="work" id="work" />
                        <Label htmlFor="work">Work</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="other" id="other" />
                        <Label htmlFor="other">Other</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="serviceLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

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
              onClick={() => onSubmit("basic")}
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
              onClick={() => onSubmit("standard")}
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
              onClick={() => onSubmit("premium")}
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