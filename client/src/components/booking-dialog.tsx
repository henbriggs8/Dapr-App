import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { User, bookingFormSchema, Service, TimeSlot } from "@shared/schema";
import { Button } from "./ui/button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
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
import { AddressAutocomplete } from "./address-autocomplete";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Loader2, Clock, Calendar, Plus, Tag } from "lucide-react";
import { useState, useEffect } from "react";
import { getVehicleSizeFromStorage, type VehicleSize } from "@/utils/vehicle-size-detector";
import { ADD_ONS, getSelectedAddOnIds, clearSelectedAddOns } from "@/utils/add-ons";
import { useLocation } from "wouter";

interface PrefillData {
  selectedVehicle?: any;
  selectedLocation?: {
    address: string;
    latitude: number;
    longitude: number;
    type: 'address' | 'current';
  };
}

export default function BookingDialog({
  provider,
  open,
  onClose,
  serviceId,
  timeSlotId,
  prefillData
}: {
  provider: User;
  open: boolean;
  onClose: () => void;
  serviceId: number;
  timeSlotId: number;
  prefillData?: PrefillData;
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  
  // Get saved user data from onboarding
  const savedAddress = localStorage.getItem("userAddress");
  const savedVehicle = localStorage.getItem("userVehicle");
  
  const parsedAddress = savedAddress ? JSON.parse(savedAddress) : null;
  const parsedVehicle = savedVehicle ? JSON.parse(savedVehicle) : null;
  
  // Define add-ons — initialized from services-page selections in localStorage
  const [addOns, setAddOns] = useState<{
    id: string;
    name: string;
    price: number;
    selected: boolean;
  }[]>(() => {
    const preSelected = getSelectedAddOnIds();
    return ADD_ONS.map((a) => ({ ...a, selected: preSelected.includes(a.id) }));
  });
  
  // Track total price
  const [totalPrice, setTotalPrice] = useState<number>(0);
  
  // Track service coordinates for address autocomplete
  const [serviceCoordinates, setServiceCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Vehicle management state - use prefill data if available, otherwise detect from storage
  const detectedVehicleSize = getVehicleSizeFromStorage();
  const [vehicles, setVehicles] = useState<{
    id: number;
    size: VehicleSize;
    details: string;
    sizeMultiplier: number;
  }[]>(() => {
    // Use prefill vehicle if available
    if (prefillData?.selectedVehicle) {
      const vehicle = prefillData.selectedVehicle;
      const vehicleSize = getVehicleSizeFromStorage(); // Could enhance this to detect from vehicle data
      return [{
        id: vehicle.id,
        size: vehicleSize,
        details: `${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.color || 'Unknown color'})`,
        sizeMultiplier: vehicleSize === 'small' ? 0 : vehicleSize === 'medium' ? 0.15 : 0.3
      }];
    }
    
    // Fallback to parsed vehicle from storage
    return [{
      id: 1,
      size: detectedVehicleSize,
      details: parsedVehicle ? `${parsedVehicle.year} ${parsedVehicle.make} ${parsedVehicle.model} (${parsedVehicle.color})` : '',
      sizeMultiplier: detectedVehicleSize === 'small' ? 0 : detectedVehicleSize === 'medium' ? 0.15 : 0.3
    }];
  });
  
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
    onSuccess: (data, bookingId) => {
      // Close dialog and navigate to confirmation page
      onClose();
      navigate(`/booking-confirmation?booking=${bookingId}`);
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
  
  // Vehicle size selection handler (kept for backward compatibility but not used)
  const selectVehicleSize = (size: VehicleSize, vehicleId: number) => {
    console.log(`Selecting ${size} for vehicle ${vehicleId}`);
    const sizeMultiplier = size === 'small' ? 0 : size === 'medium' ? 0.15 : 0.3;
    
    setVehicles(prevVehicles => 
      prevVehicles.map(vehicle => 
        vehicle.id === vehicleId 
          ? { ...vehicle, size: size, sizeMultiplier: sizeMultiplier }
          : { ...vehicle }
      )
    );
  };
  
  // Add another vehicle
  const addVehicle = () => {
    const newVehicleId = Math.max(...vehicles.map(v => v.id)) + 1;
    console.log(`Adding vehicle with ID: ${newVehicleId}`);
    setVehicles(prevVehicles => {
      const newVehicles = [...prevVehicles, { 
        id: newVehicleId, 
        size: 'small' as VehicleSize, 
        details: '', 
        sizeMultiplier: 0 
      }];
      console.log('New vehicles array:', newVehicles);
      return newVehicles;
    });
  };
  
  // Remove vehicle
  const removeVehicle = (vehicleId: number) => {
    if (vehicles.length > 1) {
      setVehicles(vehicles.filter(v => v.id !== vehicleId));
    }
  };
  
  // Calculate total price when service, add-ons, or vehicles change
  useEffect(() => {
    if (service && service.price) {
      const basePrice = service.price || 0;
      const addOnTotal = addOns
        .filter((addon) => addon.selected)
        .reduce((sum, addon) => sum + addon.price, 0);
      
      // Calculate vehicle size adjustments using percentage multipliers
      const vehicleSizeTotal = vehicles.reduce((sum, vehicle) => sum + (basePrice * vehicle.sizeMultiplier), 0);
      
      setTotalPrice(basePrice + addOnTotal + vehicleSizeTotal);
    }
  }, [service, addOns, vehicles]);
  
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
      serviceLocation: user?.address || parsedAddress ? 
        `${parsedAddress.streetAddress}, ${parsedAddress.city}, ${parsedAddress.state} ${parsedAddress.zipCode}` : "",
      serviceLocationType: parsedAddress?.locationType?.toLowerCase() || "home",
      priceTier: service?.category || "basic",
      providerId: provider.id,
      serviceId: serviceId,
      timeSlotId: timeSlotId,
      timestamp: timeSlot ? `${timeSlot.date}T${timeSlot.startTime}:00` : new Date().toISOString(),
    },
  });

  const bookingMutation = useMutation({
    mutationFn: async (formData: any) => {
      console.log("Making booking API request with data:", formData);
      const res = await apiRequest("POST", "/api/bookings", formData);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Network error" }));
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
      }
      return await res.json();
    },
    onSuccess: (data) => {
      console.log("Booking created successfully:", data);
      
      // Invalidate multiple queries
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timeslots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/provider/active-bookings"] });
      
      // Store booking data for confirmation page
      localStorage.setItem('latest-booking', JSON.stringify(data));
      
      // Clear add-on selections after successful booking
      clearSelectedAddOns();
      
      // Close dialog
      onClose();
      
      toast({
        title: "Booking Confirmed!",
        description: `Your ${service?.name} service has been scheduled for ${timeSlot?.date} at ${timeSlot?.startTime}. Nearby detailers have been notified and will accept your job soon.`,
      });
      
      // Navigate to confirmation page
      setTimeout(() => {
        window.location.href = `/booking-confirmation?bookingId=${data.id}`;
      }, 1000);
    },
    onError: (error: Error) => {
      console.error("Booking creation failed:", error);
      
      // Check if it's an authentication error
      if (error.message.includes("Authentication required") || error.message.includes("401")) {
        toast({
          title: "Login Required",
          description: "Please log in to complete your booking.",
          variant: "destructive",
          action: (
            <button 
              onClick={() => window.location.href = "/auth"}
              className="text-sm underline"
            >
              Go to Login
            </button>
          ),
        });
      } else {
        toast({
          title: "Booking Failed",
          description: error.message || "Unable to create booking. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const onSubmit = (data: any) => {
    console.log("🚀 FORM SUBMIT TRIGGERED");
    console.log("Form submitted with data:", data);
    console.log("Current user:", user);
    console.log("Service:", service);
    console.log("Time slot:", timeSlot);
    
    // Check authentication first
    if (!user) {
      console.log("❌ User not authenticated");
      toast({
        title: "Login Required",
        description: "Please log in to complete your booking.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/auth";
      }, 2000);
      return;
    }
    
    if (!service) {
      console.log("❌ Service missing");
      toast({
        title: "Error",
        description: "Service information is missing",
        variant: "destructive",
      });
      return;
    }
    
    if (!timeSlot) {
      console.log("❌ Time slot missing");
      toast({
        title: "Error", 
        description: "Time slot information is missing",
        variant: "destructive",
      });
      return;
    }
    
    // Use user's profile address or set a default
    if (!data.serviceLocation?.trim()) {
      if (user?.address) {
        data.serviceLocation = user.address;
        console.log("✅ Using user profile address:", user.address);
      } else {
        // Set a default address to prevent blocking
        data.serviceLocation = "Customer Address - To be confirmed";
        console.log("⚠️ No address found, using default");
      }
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
    
    // Add service coordinates if available from address autocomplete
    if (serviceCoordinates) {
      data.serviceLatitude = serviceCoordinates.latitude;
      data.serviceLongitude = serviceCoordinates.longitude;
    }
    
    // Calculate add-ons total if any are selected
    const selectedAddOns = addOns.filter(addon => addon.selected);
    const addOnTotal = selectedAddOns.reduce((sum, addon) => sum + addon.price, 0);
    const vehicleSizeTotal = vehicles.reduce((sum, vehicle) => sum + vehicle.sizeMultiplier, 0);
    
    // Include comprehensive booking information
    data.addOns = selectedAddOns;
    data.addOnTotal = addOnTotal;
    data.vehicleSizeTotal = vehicleSizeTotal;
    data.vehicles = vehicles;
    data.totalPrice = Math.round(totalPrice); // Round to integer for database
    data.status = 'unassigned'; // Set as unassigned for detailer matching
    // Use coordinates from address autocomplete selection; fall back to saved address coords
    data.serviceLatitude = serviceCoordinates?.latitude ?? parsedAddress?.latitude ?? null;
    data.serviceLongitude = serviceCoordinates?.longitude ?? parsedAddress?.longitude ?? null;
    data.vehicleId = vehicles.length > 0 ? vehicles[0].id : null;
    data.notes = `Service for ${vehicles.map(v => v.details).join(', ')}`;
    
    console.log("✅ Final booking data:", data);
    console.log("🚀 Calling bookingMutation.mutate");
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
              
              <div className="text-muted-foreground">Base Price:</div>
              <div className="font-medium">${service?.price || 0}</div>
              
              <div className="text-muted-foreground">Vehicle Size:</div>
              <div className="font-medium">+${vehicles.reduce((sum, v) => sum + v.sizeMultiplier, 0)}</div>
              
              <div className="text-muted-foreground font-semibold">Total Price:</div>
              <div className="font-bold text-[#8c52ff]">${totalPrice}</div>
              
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
          <form 
            className="space-y-4" 
            onSubmit={(e) => {
              console.log("🔥 Form onSubmit event triggered");
              form.handleSubmit(onSubmit)(e);
            }}
          >
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
                  <FormControl>
                    <AddressAutocomplete
                      value={field.value || user?.address || ''}
                      onChange={(address, details) => {
                        field.onChange(address);
                        
                        // Store location coordinates in component state for submission
                        if (details?.geometry?.location) {
                          // These will be added to the booking data during submission
                          setServiceCoordinates({
                            latitude: details.geometry.location.lat(),
                            longitude: details.geometry.location.lng()
                          });
                        }
                      }}
                      label="Service Address"
                      placeholder="Start typing your service address..."
                      className="bg-green-50 border-green-200"
                    />
                  </FormControl>
                  <div className="text-xs text-green-600 mt-1">
                    Address auto-complete enabled. Click the location icon to use current location.
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Vehicle Selection */}
            <div className="space-y-4 mb-2">
              {vehicles.map((vehicle, index) => (
                <div key={vehicle.id} className="bg-slate-50 p-4 rounded-lg border">
                  <div className="flex justify-between items-center mb-3">
                    <div className="font-medium">Vehicle {index + 1}</div>
                    <div className="flex items-center gap-2">
                      {index === 0 && <Badge className="bg-[#8c52ff]">Primary</Badge>}
                      {vehicles.length > 1 && index > 0 && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeVehicle(vehicle.id)}
                          className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="font-medium text-sm">Vehicle Size (Auto-detected)</div>
                      <div className="bg-green-50 border border-green-200 rounded-md p-3 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <div>
                            <div className="text-sm font-medium capitalize text-green-800">{vehicle.size}</div>
                            <div className="text-xs text-green-600">
                              {vehicle.size === 'small' && 'Sedan, Coupe, Sports Car'}
                              {vehicle.size === 'medium' && 'Crossover, Small SUV, Pickup'}
                              {vehicle.size === 'large' && 'Large SUV, Van, Full-size Truck'}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm font-medium text-green-700">
                          {vehicle.size === 'small' && '+$0'}
                          {vehicle.size === 'medium' && '+$' + Math.round((service?.price || 0) * 0.15)}
                          {vehicle.size === 'large' && '+$' + Math.round((service?.price || 0) * 0.3)}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Based on your {parsedVehicle?.make} {parsedVehicle?.model}
                      </div>
                    </div>
                    
                    <div className="grid gap-2">
                      <div className="text-sm font-medium">Vehicle Details (Optional)</div>
                      <Input 
                        placeholder="Year, Make, Model (e.g., 2022 Honda Accord)" 
                        value={vehicle.details}
                        onChange={(e) => {
                          setVehicles(vehicles.map(v => 
                            v.id === vehicle.id 
                              ? { ...v, details: e.target.value }
                              : v
                          ));
                        }}
                      />
                      <div className="text-xs text-muted-foreground">This helps our team identify your vehicle</div>
                    </div>
                  </div>
                </div>
              ))}
              
              <Button 
                type="button" 
                variant="outline" 
                className="w-full flex items-center justify-center gap-2 border-dashed"
                onClick={addVehicle}
              >
                <Plus className="h-4 w-4" />
                <span className="text-sm">Add Another Vehicle</span>
              </Button>
            </div>
            
            {/* Promotions section - simplified */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Promotional Code</h3>
              </div>
              
              <div className="flex flex-col w-full">
                <div className="flex gap-2">
                  <Input id="promo-code" placeholder="Enter promotional code" className="flex-1" />
                  <Button type="button" variant="outline" size="sm">Apply</Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Enter a valid promotional code to receive a discount</p>
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
              type="button"
              className="w-full"
              disabled={bookingMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                console.log("Direct button click - bypassing form validation");
                
                // Get form values
                const values = form.getValues();
                console.log("Form values:", values);
                
                // Create booking data directly — use what the user entered in the address field
                const bookingData = {
                  serviceLocation: values.serviceLocation || user?.address || "",
                  serviceLocationType: values.serviceLocationType || "home",
                  priceTier: service?.category || "basic",
                  providerId: provider.id,
                  serviceId: serviceId,
                  timeSlotId: timeSlotId,
                  timestamp: timeSlot ? `${timeSlot.date}T${timeSlot.startTime}:00` : new Date().toISOString(),
                  addOns: addOns,
                  addOnTotal: addOns.filter(a => a.selected).reduce((sum, addon) => sum + addon.price, 0),
                  vehicleSizeTotal: vehicles.reduce((sum, vehicle) => sum + vehicle.sizeMultiplier, 0),
                  vehicles: vehicles,
                  totalPrice: totalPrice,
                  status: 'unassigned',
                  serviceLatitude: serviceCoordinates?.latitude ?? parsedAddress?.latitude ?? null,
                  serviceLongitude: serviceCoordinates?.longitude ?? parsedAddress?.longitude ?? null,
                  vehicleId: vehicles.length > 0 ? vehicles[0].id : null,
                  notes: `Service for ${vehicles.map(v => v.details).join(', ')}`,
                  date: timeSlot?.date,
                  time: timeSlot?.startTime
                };
                
                console.log("Direct booking submission:", bookingData);
                onSubmit(bookingData);
              }}
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