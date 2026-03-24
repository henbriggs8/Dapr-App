import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertUserSchema, Booking, Vehicle, insertVehicleSchema } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogOut, Car, Plus, Pencil, Trash2, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const profileSchema = insertUserSchema.extend({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  description: z.string().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
});

const vehicleSchema = insertVehicleSchema.extend({
  year: z.coerce.number().min(1900).max(new Date().getFullYear() + 1),
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  color: z.string().optional().or(z.literal("")),
  licensePlate: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

type VehicleFormValues = z.infer<typeof vehicleSchema>;

export default function ProfilePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "vehicles" | "bookings">("profile");

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });
  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user?.username,
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      address: user?.address || "",
      description: user?.description || "",
      latitude: user?.latitude || undefined,
      longitude: user?.longitude || undefined,
    },
  });

  const vehicleForm = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: { userId: user?.id, year: undefined, make: "", model: "", color: "", licensePlate: "", notes: "" },
  });

  useEffect(() => {
    if (selectedVehicle) {
      vehicleForm.reset({
        userId: selectedVehicle.userId,
        year: selectedVehicle.year,
        make: selectedVehicle.make,
        model: selectedVehicle.model,
        color: selectedVehicle.color || "",
        licensePlate: selectedVehicle.licensePlate || "",
        notes: selectedVehicle.notes || "",
      });
    } else {
      vehicleForm.reset({ userId: user?.id, year: undefined, make: "", model: "", color: "", licensePlate: "", notes: "" });
    }
  }, [selectedVehicle, user?.id, vehicleForm]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof profileSchema>) => {
      const res = await apiRequest("PATCH", "/api/user", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Profile updated", description: "Your changes have been saved" });
    },
  });

  const createVehicleMutation = useMutation({
    mutationFn: async (data: VehicleFormValues) => {
      const res = await apiRequest("POST", "/api/vehicles", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({ title: "Vehicle added" });
      setDialogOpen(false);
      setSelectedVehicle(null);
    },
  });

  const updateVehicleMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<Vehicle> }) => {
      const res = await apiRequest("PATCH", `/api/vehicles/${data.id}`, data.updates);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({ title: "Vehicle updated" });
      setDialogOpen(false);
      setSelectedVehicle(null);
    },
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/vehicles/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({ title: "Vehicle removed" });
    },
  });

  const handleVehicleSubmit = (data: VehicleFormValues) => {
    if (selectedVehicle) {
      updateVehicleMutation.mutate({ id: selectedVehicle.id, updates: data });
    } else {
      createVehicleMutation.mutate(data);
    }
  };

  const openVehicleDialog = (vehicle?: Vehicle) => {
    setSelectedVehicle(vehicle || null);
    setDialogOpen(true);
  };

  if (bookingsLoading || vehiclesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen pb-32">
        <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
      </div>
    );
  }

  const tabs = [
    { id: "profile" as const, label: "Profile" },
    ...(!user?.isProvider ? [{ id: "vehicles" as const, label: "Vehicles" }, { id: "bookings" as const, label: "Bookings" }] : []),
  ];

  return (
    <div
      className="min-h-screen bg-white font-sans"
      style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }}
    >
      {/* Header */}
      <div className="pt-14 pb-6 px-6 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 tracking-widest uppercase mb-1">Account</p>
            <h1 className="text-3xl font-medium tracking-tight text-black">{user?.name || "Profile"}</h1>
            {user?.email && <p className="text-sm text-gray-500 mt-1">{user.email}</p>}
          </div>
          <button
            onClick={() => {
              logoutMutation.mutate(undefined, {
                onSuccess: () => {
                  setLocation("/auth");
                  toast({ title: "Signed out" });
                },
              });
            }}
            disabled={logoutMutation.isPending}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-black transition-colors mt-1"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>

      {/* Book CTA row */}
      <button
        onClick={() => setLocation("/")}
        className="w-full flex items-center justify-between px-6 py-5 border-b border-gray-200"
      >
        <div className="flex items-center gap-3">
          <Car className="h-4 w-4 text-gray-400" />
          <span className="text-base text-black">Book a service</span>
        </div>
        <ChevronRight className="w-5 h-5 text-[#8c52ff]" />
      </button>

      {/* Tab Switcher */}
      <div className="flex border-b border-gray-200 px-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`mr-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-black text-black"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="px-6 pt-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => updateProfileMutation.mutate(data))}
              className="space-y-0"
            >
              {[
                { name: "name" as const, label: "Full Name", placeholder: "Your name", type: "text" },
                { name: "email" as const, label: "Email", placeholder: "you@example.com", type: "email" },
                { name: "phone" as const, label: "Phone", placeholder: "(123) 456-7890", type: "tel" },
                { name: "address" as const, label: "Home Address", placeholder: "123 Main St", type: "text" },
              ].map((fieldConfig) => (
                <FormField
                  key={fieldConfig.name}
                  control={form.control}
                  name={fieldConfig.name}
                  render={({ field }) => (
                    <FormItem className="py-5 border-b border-gray-200 space-y-1">
                      <FormLabel className="text-xs font-semibold text-gray-500 tracking-widest uppercase">
                        {fieldConfig.label}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type={fieldConfig.type}
                          placeholder={fieldConfig.placeholder}
                          {...field}
                          className="border-0 border-b border-gray-200 rounded-none px-0 text-base text-black placeholder:text-gray-300 focus-visible:ring-0 focus-visible:border-black transition-colors"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
              {user?.isProvider && (
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="py-5 border-b border-gray-200 space-y-1">
                      <FormLabel className="text-xs font-semibold text-gray-500 tracking-widest uppercase">
                        Business Description
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          className="border-0 border-b border-gray-200 rounded-none px-0 resize-none text-base placeholder:text-gray-300 focus-visible:ring-0"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <div className="pt-6">
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="bg-black text-white text-sm font-medium px-8 py-3 hover:bg-gray-900 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {updateProfileMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </Form>
        </div>
      )}

      {/* Vehicles Tab */}
      {activeTab === "vehicles" && (
        <div className="px-6 pt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xs font-semibold text-gray-500 tracking-widest uppercase">My Vehicles</h2>
            <button
              onClick={() => openVehicleDialog()}
              className="flex items-center gap-1 text-sm font-medium text-[#8c52ff]"
            >
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>

          {vehicles.length === 0 ? (
            <div className="py-16 text-center border-t border-gray-200">
              <p className="text-gray-500 mb-4">No vehicles added yet</p>
              <button
                onClick={() => openVehicleDialog()}
                className="text-sm font-medium text-[#8c52ff] underline underline-offset-4"
              >
                Add your first vehicle
              </button>
            </div>
          ) : (
            <div className="border-t border-gray-200">
              {vehicles.map((vehicle) => (
                <div key={vehicle.id} className="flex items-center justify-between py-5 border-b border-gray-200">
                  <div>
                    <h3 className="text-base font-medium text-black">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {[vehicle.color, vehicle.licensePlate].filter(Boolean).join(" · ")}
                    </p>
                    {vehicle.notes && (
                      <p className="text-xs text-gray-400 mt-0.5">{vehicle.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openVehicleDialog(vehicle)}
                      className="p-2 text-gray-400 hover:text-black transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Delete this vehicle?")) deleteVehicleMutation.mutate(vehicle.id);
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bookings Tab */}
      {activeTab === "bookings" && (
        <div className="px-6 pt-6">
          <h2 className="text-xs font-semibold text-gray-500 tracking-widest uppercase mb-4">Booking History</h2>
          {bookings.length === 0 ? (
            <div className="py-16 text-center border-t border-gray-200">
              <p className="text-gray-500">No bookings yet</p>
            </div>
          ) : (
            <div className="border-t border-gray-200">
              {bookings.map((booking) => (
                <div key={booking.id} className="flex justify-between items-center py-5 border-b border-gray-200">
                  <div>
                    <h3 className="text-base font-medium text-black capitalize">
                      {booking.priceTier} Package
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {new Date(booking.timestamp).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span className="text-sm text-gray-400 capitalize">{booking.status.replace("_", " ")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Vehicle Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-none">
          <DialogHeader>
            <DialogTitle className="text-lg font-medium">
              {selectedVehicle ? "Edit Vehicle" : "Add Vehicle"}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              {selectedVehicle ? "Update your vehicle details." : "Enter your vehicle details."}
            </DialogDescription>
          </DialogHeader>
          <Form {...vehicleForm}>
            <form onSubmit={vehicleForm.handleSubmit(handleVehicleSubmit)} className="space-y-4">
              {[
                { name: "year" as const, label: "Year", placeholder: "2023", type: "number" },
                { name: "make" as const, label: "Make", placeholder: "Toyota", type: "text" },
                { name: "model" as const, label: "Model", placeholder: "Camry", type: "text" },
                { name: "color" as const, label: "Color (optional)", placeholder: "Blue", type: "text" },
                { name: "licensePlate" as const, label: "License Plate (optional)", placeholder: "ABC123", type: "text" },
              ].map((fc) => (
                <FormField
                  key={fc.name}
                  control={vehicleForm.control}
                  name={fc.name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-gray-500 tracking-widest uppercase">{fc.label}</FormLabel>
                      <FormControl>
                        <Input
                          type={fc.type}
                          placeholder={fc.placeholder}
                          {...field}
                          onChange={(e) =>
                            fc.type === "number"
                              ? field.onChange(e.target.value ? Number(e.target.value) : undefined)
                              : field.onChange(e.target.value)
                          }
                          className="rounded-none border-gray-200"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
              <FormField
                control={vehicleForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-gray-500 tracking-widest uppercase">Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Special instructions..." {...field} className="rounded-none border-gray-200 resize-none" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <button
                  type="submit"
                  disabled={createVehicleMutation.isPending || updateVehicleMutation.isPending}
                  className="bg-black text-white text-sm font-medium px-6 py-2.5 hover:bg-gray-900 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {(createVehicleMutation.isPending || updateVehicleMutation.isPending) && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {selectedVehicle ? "Update Vehicle" : "Add Vehicle"}
                </button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
