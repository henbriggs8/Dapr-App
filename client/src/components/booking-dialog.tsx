import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { User, bookingFormSchema, Service, TimeSlot } from "@shared/schema";
import { Button } from "./ui/button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Loader2, Clock, Calendar, Plus, Tag } from "lucide-react";
import { useState, useEffect } from "react";

export default function BookingDialog({
  provider,
  open,
  onClose,
  serviceId,
  timeSlotId
}: {
  provider: User;
  open: boolean;
  onClose: () => void;
  serviceId: number;
  timeSlotId: number;
}) {
  const { toast } = useToast();
  
  // Define add-ons
  const [addOns, setAddOns] = useState<{
    id: string;
    name: string;
    price: number;
    selected: boolean;
  }[]>([
    { id: "dog-hair", name: "Dog Hair Removal", price: 20, selected: false },
    { id: "car-seat", name: "Child Car Seat Steam Clean", price: 30, selected: false },
    { id: "odor", name: "Odor Eliminator", price: 50, selected: false },
    { id: "engine", name: "Engine Bay Detail", price: 50, selected: false },
    { id: "leather", name: "Leather Revive", price: 40, selected: false },
    { id: "stain", name: "Heavy Stain Removal", price: 50, selected: false },
  ]);
  
  // Track total price
  const [totalPrice, setTotalPrice] = useState<number>(0);
  
  // Fetch the selected service
  const { data: service, isLoading: serviceLoading } = useQuery<Service>({
    queryKey: ["/api/services", serviceId],
    queryFn: async () => {
      if (!serviceId) throw new Error("No service ID provided");
      const res = await fetch(`/api/services/${serviceId}`);
      if (!res.ok) throw new Error("Failed to fetch service");
      return res.json();
    },
    enabled: !!serviceId,
  });
  
  // Initialize total price from service when it's loaded
  useEffect(() => {
    if (service && typeof service.price === 'number') {
      console.log("Service loaded:", service);
      setTotalPrice(service.price);
    }
  }, [service]);
  
  // Payment mutation to handle creating a payment for the booking
  const paymentMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      const res = await apiRequest("POST", `/api/bookings/${bookingId}/create-payment`, {});
      return await res.json();
    },
    onSuccess: (data) => {
      // Redirect to Square payment page
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        toast({
          title: "Payment Error",
          description: "Could not generate payment link. Please try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Payment Error",
        description: error instanceof Error ? error.message : "Failed to set up payment",
        variant: "destructive",
      });
    },
  });
  
  // Toggle add-on selection
  const toggleAddOn = (id: string) => {
    setAddOns(
      addOns.map((addon) =>
        addon.id === id ? { ...addon, selected: !addon.selected } : addon
      )
    );
  };
  
  // Calculate total price when service or add-ons change
  useEffect(() => {
    if (service && service.price) {
      const basePrice = service.price || 0;
      const addOnTotal = addOns
        .filter((addon) => addon.selected)
        .reduce((sum, addon) => sum + addon.price, 0);
      
      setTotalPrice(basePrice + addOnTotal);
    }
  }, [service, addOns]);
  
  // Fetch the selected time slot
  const { data: timeSlot, isLoading: timeSlotLoading } = useQuery<TimeSlot>({
    queryKey: ["/api/timeslots", timeSlotId],
    queryFn: async () => {
      if (!timeSlotId) throw new Error("No time slot ID provided");
      const res = await fetch(`/api/timeslots/${timeSlotId}`);
      if (!res.ok) throw new Error("Failed to fetch time slot");
      return res.json();
    },
    enabled: !!timeSlotId,
  });

  const isLoading = serviceLoading || timeSlotLoading;

  const form = useForm({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      serviceLocation: "",
      serviceLocationType: "home",
      priceTier: service?.category || "basic",
      providerId: provider.id,
      serviceId: serviceId,
      timeSlotId: timeSlotId,
      timestamp: timeSlot ? `${timeSlot.date}T${timeSlot.startTime}:00` : new Date().toISOString(),
    },
  });

  const bookingMutation = useMutation({
    mutationFn: async (formData: any) => {
      const res = await apiRequest("POST", "/api/bookings", formData);
      return await res.json();
    },
    onSuccess: (data) => {
      // Invalidate multiple queries
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timeslots"] });
      
      toast({
        title: "Booking created",
        description: "Redirecting to payment...",
      });
      
      // Initiate payment for the booking
      paymentMutation.mutate(data.id);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create booking",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    if (!service) {
      toast({
        title: "Error",
        description: "Service information is missing",
        variant: "destructive",
      });
      return;
    }
    
    // Update form values with the latest service and time slot info
    data.priceTier = service.category || "basic";
    data.providerId = provider.id;
    data.serviceId = serviceId;
    data.timeSlotId = timeSlotId;
    data.timestamp = timeSlot ? `${timeSlot.date}T${timeSlot.startTime}:00` : new Date().toISOString();
    
    // Add date and time fields for better display in app
    if (timeSlot) {
      data.date = timeSlot.date;
      data.time = timeSlot.startTime;
    }
    
    // Calculate add-ons total if any are selected
    const selectedAddOns = addOns.filter(addon => addon.selected);
    const addOnTotal = selectedAddOns.reduce((sum, addon) => sum + addon.price, 0);
    
    // Always include price information
    data.addOns = selectedAddOns;
    data.addOnTotal = addOnTotal;
    data.totalPrice = service.price + addOnTotal;
    
    console.log("Submitting booking:", data);
    bookingMutation.mutate(data);
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="sr-only">Loading</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Book with {provider.name}</DialogTitle>
          <DialogDescription>
            Please confirm your booking details and provide a service location
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mb-6">
          <div className="border rounded-lg p-4 bg-muted/30">
            <h3 className="font-medium mb-2">Selected Service</h3>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="text-muted-foreground">Service:</div>
              <div className="font-medium">{service?.name}</div>
              
              <div className="text-muted-foreground">Price:</div>
              <div className="font-medium">${service?.price}</div>
              
              <div className="text-muted-foreground">Duration:</div>
              <div className="font-medium flex items-center">
                <Clock className="h-4 w-4 mr-1" /> {service?.duration} minutes
              </div>
            </div>
            
            {service && (
              <div className="text-sm">
                <div className="font-medium mb-1">Service Breakdown:</div>
                {service.category === "basic" && (
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Exterior Wash - ${Math.round(service.price * 0.9)}</li>
                    <li>Quick Detail - ${Math.round(service.price * 0.1)}</li>
                  </ul>
                )}
                {service.category === "standard" && (
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Hand Wash - ${Math.round(service.price * 0.4)}</li>
                    <li>Interior Vacuum - ${Math.round(service.price * 0.3)}</li>
                    <li>Interior Wipe Down - ${Math.round(service.price * 0.3)}</li>
                  </ul>
                )}
                {service.category === "premium" && (
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Exterior Detail - ${Math.round(service.price * 0.4)}</li>
                    <li>Carpet & Mats - ${Math.round(service.price * 0.25)}</li>
                    <li>Leather & Upholstery - ${Math.round(service.price * 0.25)}</li>
                    <li>Detailed Interior - ${Math.round(service.price * 0.1)}</li>
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="border rounded-lg p-4 bg-muted/30">
            <h3 className="font-medium mb-2">Selected Time</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-muted-foreground">Date:</div>
              <div className="font-medium flex items-center">
                <Calendar className="h-4 w-4 mr-1" /> {timeSlot && formatDate(timeSlot.date)}
              </div>
              
              <div className="text-muted-foreground">Time:</div>
              <div className="font-medium">{timeSlot?.startTime} - {timeSlot?.endTime}</div>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
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
              name="zipCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ZIP Code</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your ZIP code" {...field} maxLength={5} />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">We'll use this to route you to the nearest franchise location</p>
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
                    <Input placeholder="Enter your full address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Promotions section */}
            <div className="border rounded-lg p-4 bg-gradient-to-r from-purple-50 to-indigo-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Promotions & Rewards</h3>
                <Badge className="bg-[#8c52ff]">
                  Earn 100-300 Points
                </Badge>
              </div>
              
              <div className="grid gap-2">
                <div className="flex items-center justify-between border rounded-md p-3 bg-white hover:bg-purple-50 transition-colors">
                  <div className="flex items-center">
                    <Checkbox 
                      id="promo-first-wash"
                      className="mr-3"
                    />
                    <div>
                      <Label htmlFor="promo-first-wash" className="font-medium cursor-pointer">
                        First Wash Free
                      </Label>
                      <p className="text-xs text-muted-foreground">Just pay the tip! (New customers only)</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between border rounded-md p-3 bg-white hover:bg-purple-50 transition-colors">
                  <div className="flex items-center">
                    <Checkbox 
                      id="promo-credit"
                      className="mr-3"
                    />
                    <div>
                      <Label htmlFor="promo-credit" className="font-medium cursor-pointer">
                        $25 Free Credit
                      </Label>
                      <p className="text-xs text-muted-foreground">For booking premium services</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between border rounded-md p-3 bg-white hover:bg-purple-50 transition-colors">
                  <div className="flex flex-col w-full">
                    <Label htmlFor="referral-code" className="font-medium mb-1">
                      Referral Code
                    </Label>
                    <div className="flex gap-2">
                      <Input id="referral-code" placeholder="Enter code (Give $10, Get $10)" className="flex-1" />
                      <Button type="button" variant="outline" size="sm">Apply</Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Enter a friend's referral code</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 text-xs">
                <p className="font-medium text-[#8c52ff]">Dapper Rewards</p>
                <ul className="list-disc pl-5 mt-1 space-y-1 text-muted-foreground">
                  <li>Book = 100-300 points</li>
                  <li>Refer a friend = 300 points</li>
                  <li>Book 2x/month = 500 bonus points</li>
                  <li>Leave a review = 100 points</li>
                  <li>Join monthly plan = 1000 points</li>
                </ul>
              </div>
            </div>
            
            {/* Add-ons section */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Service Add-ons</h3>
                <div className="flex items-center">
                  <Tag className="h-4 w-4 mr-1 text-[#8c52ff]" />
                  <span className="text-sm text-muted-foreground">Select to customize your service</span>
                </div>
              </div>
              
              <div className="grid gap-2">
                {addOns.map((addon) => (
                  <div key={addon.id} className="flex items-center justify-between border rounded-md p-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center">
                      <Checkbox 
                        id={addon.id}
                        checked={addon.selected}
                        onCheckedChange={() => toggleAddOn(addon.id)}
                        className="mr-3"
                      />
                      <div>
                        <Label htmlFor={addon.id} className="font-medium cursor-pointer">
                          {addon.name}
                        </Label>
                        <p className="text-xs text-muted-foreground">+${addon.price}</p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${addon.selected ? 'bg-[#8c52ff] text-white' : 'bg-muted'}`}>
                      {addon.selected && <Plus className="h-3 w-3" />}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Show total when add-ons are selected */}
              {addOns.some(addon => addon.selected) && (
                <div className="mt-4 p-3 bg-muted/30 rounded-md">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Base service price:</span>
                    <span>${service?.price}</span>
                  </div>
                  {addOns.filter(a => a.selected).map(addon => (
                    <div key={addon.id} className="flex justify-between text-sm">
                      <span>{addon.name}:</span>
                      <span>+${addon.price}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold mt-2 pt-2 border-t">
                    <span>Total price:</span>
                    <span>${totalPrice}</span>
                  </div>
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={bookingMutation.isPending}
            >
              {bookingMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Confirm Booking - $${totalPrice || (service?.price || 0)}`
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}