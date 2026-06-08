import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { useAuth } from "@/hooks/use-auth";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertUserSchema, Booking, Vehicle, insertVehicleSchema, SavedAddress } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, LogOut, Car, Plus, Pencil, Trash2, ChevronRight,
  Bell, Shield, UserX, Settings, Star, Calendar, Hash, KeyRound, Eye, EyeOff, CreditCard,
  MapPin, Home, Briefcase
} from "lucide-react";
import { Icon } from "@/components/ui/icon";
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
import { Badge } from "@/components/ui/badge";
import { YEARS, CAR_MAKES, CAR_MODELS } from "@/utils/car-data";

const selectCls = "flex h-11 w-full border border-gray-200 bg-white px-3 text-sm text-black outline-none appearance-none rounded-none focus:border-black transition-colors";

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
  userId: z.number().optional(),
  year: z.coerce.number().min(1900).max(new Date().getFullYear() + 1),
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  color: z.string().optional().or(z.literal("")),
  licensePlate: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

type VehicleFormValues = z.infer<typeof vehicleSchema>;

function getInitials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function statusColor(status: string) {
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
    in_progress: "bg-purple-100 text-purple-700",
  };
  return map[status] ?? "bg-gray-100 text-gray-600";
}

export default function ProfilePage() {
  const { user, logoutMutation } = useAuth();
  const { user: clerkUser } = useUser();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "vehicles" | "bookings" | "settings">("profile");
  const [addrDialogOpen, setAddrDialogOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<SavedAddress | null>(null);
  const [addrLabel, setAddrLabel] = useState<"home" | "work" | "other">("home");
  const [addrText, setAddrText] = useState("");
  const [addrIsDefault, setAddrIsDefault] = useState(false);
  const [dialogMake, setDialogMake] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [pwDialogOpen, setPwDialogOpen] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwShowCurrent, setPwShowCurrent] = useState(false);
  const [pwShowNew, setPwShowNew] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });
  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });
  const { data: savedAddrs = [] } = useQuery<SavedAddress[]>({
    queryKey: ["/api/addresses"],
  });

  const { data: savedMethodsData } = useQuery<{ methods: Array<{ id: string; brand: string; last4: string; expMonth: number; expYear: number }> }>({
    queryKey: ["/api/payment-methods"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/payment-methods");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
  const savedMethods = savedMethodsData?.methods ?? [];

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
      setDialogMake(selectedVehicle.make || "");
    } else {
      vehicleForm.reset({ userId: user?.id, year: undefined, make: "", model: "", color: "", licensePlate: "", notes: "" });
      setDialogMake("");
    }
  }, [selectedVehicle, user?.id, vehicleForm]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof profileSchema>) => {
      const res = await apiRequest("PATCH", "/api/user/profile", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Profile updated", description: "Your changes have been saved" });
    },
  });

  const createAddressMutation = useMutation({
    mutationFn: async (data: { label: string; address: string; isDefault: boolean }) => {
      const res = await apiRequest("POST", "/api/addresses", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/addresses"] });
      toast({ title: "Address saved" });
      setAddrDialogOpen(false);
    },
    onError: () => toast({ title: "Failed to save address", variant: "destructive" }),
  });

  const updateAddressMutation = useMutation({
    mutationFn: async (data: { id: number; label: string; address: string; isDefault: boolean }) => {
      const res = await apiRequest("PATCH", `/api/addresses/${data.id}`, { label: data.label, address: data.address, isDefault: data.isDefault });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/addresses"] });
      toast({ title: "Address updated" });
      setAddrDialogOpen(false);
    },
    onError: () => toast({ title: "Failed to update address", variant: "destructive" }),
  });

  const deleteAddressMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/addresses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/addresses"] });
      toast({ title: "Address removed" });
    },
    onError: () => toast({ title: "Failed to remove address", variant: "destructive" }),
  });

  function openAddrDialog(addr?: SavedAddress) {
    if (addr) {
      setSelectedAddress(addr);
      setAddrLabel(addr.label as "home" | "work" | "other");
      setAddrText(addr.address);
      setAddrIsDefault(addr.isDefault);
    } else {
      setSelectedAddress(null);
      setAddrLabel("home");
      setAddrText("");
      setAddrIsDefault(savedAddrs.length === 0);
    }
    setAddrDialogOpen(true);
  }

  function submitAddrDialog() {
    if (!addrText.trim()) return;
    if (selectedAddress) {
      updateAddressMutation.mutate({ id: selectedAddress.id, label: addrLabel, address: addrText.trim(), isDefault: addrIsDefault });
    } else {
      createAddressMutation.mutate({ label: addrLabel, address: addrText.trim(), isDefault: addrIsDefault });
    }
  }

  const createVehicleMutation = useMutation({
    mutationFn: async (data: VehicleFormValues) => {
      const res = await apiRequest("POST", "/api/vehicles", data);
      return await res.json();
    },
    onSuccess: (newVehicle) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      localStorage.setItem("userVehicle", JSON.stringify({ year: String(newVehicle.year), make: newVehicle.make, model: newVehicle.model }));
      toast({ title: "Vehicle added" });
      setDialogOpen(false);
      setSelectedVehicle(null);
    },
    onError: (err: any) => {
      toast({ title: "Failed to add vehicle", description: err?.message || "Please try again.", variant: "destructive" });
    },
  });

  const updateVehicleMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<Vehicle> }) => {
      const res = await apiRequest("PATCH", `/api/vehicles/${data.id}`, data.updates);
      return await res.json();
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      localStorage.setItem("userVehicle", JSON.stringify({ year: String(updated.year), make: updated.make, model: updated.model }));
      toast({ title: "Vehicle updated" });
      setDialogOpen(false);
      setSelectedVehicle(null);
    },
    onError: (err: any) => {
      toast({ title: "Failed to update vehicle", description: err?.message || "Please try again.", variant: "destructive" });
    },
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/vehicles/${id}`);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      const remaining = (vehicles as Vehicle[]).filter((v) => v.id !== deletedId);
      if (remaining.length > 0) {
        const first = remaining[0];
        localStorage.setItem("userVehicle", JSON.stringify({ year: String(first.year), make: first.make, model: first.model }));
      } else {
        localStorage.removeItem("userVehicle");
      }
      toast({ title: "Vehicle removed" });
    },
  });

  const deleteCardMutation = useMutation({
    mutationFn: async (pmId: string) => {
      await apiRequest("DELETE", `/api/payment-methods/${pmId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
      toast({ title: "Card removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove card", variant: "destructive" });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/user");
    },
    onSuccess: async () => {
      const clerkInstance = (window as any).Clerk;
      if (clerkInstance?.signOut) {
        try { await clerkInstance.signOut(); } catch (_) {}
      }
      logoutMutation.mutate(undefined, {
        onSuccess: () => setLocation("/auth"),
      });
      toast({ title: "Account deleted", description: "Your account has been permanently removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete account. Please try again.", variant: "destructive" });
    },
  });

  const handleChangePassword = async () => {
    setPwError("");
    if (!pwNew || pwNew.length < 8) { setPwError("New password must be at least 8 characters."); return; }
    if (pwNew !== pwConfirm) { setPwError("Passwords don't match."); return; }
    if (!clerkUser) { setPwError("Not signed in."); return; }
    setPwLoading(true);
    try {
      await clerkUser.updatePassword({ currentPassword: pwCurrent || undefined, newPassword: pwNew });
      toast({ title: "Password updated", description: "Your password has been changed successfully." });
      setPwDialogOpen(false);
      setPwCurrent(""); setPwNew(""); setPwConfirm("");
    } catch (err: any) {
      const msg = err?.errors?.[0]?.message || err?.message || "Failed to update password.";
      setPwError(msg);
    } finally {
      setPwLoading(false);
    }
  };

  const handleVehicleSubmit = (data: VehicleFormValues) => {
    if (selectedVehicle) {
      updateVehicleMutation.mutate({ id: selectedVehicle.id, updates: data });
    } else {
      createVehicleMutation.mutate(data);
    }
  };

  const openVehicleDialog = (vehicle?: Vehicle) => {
    setSelectedVehicle(vehicle || null);
    setDialogMake(vehicle?.make || "");
    setDialogOpen(true);
  };

  const handleSignOut = async () => {
    const clerkInstance = (window as any).Clerk;
    if (clerkInstance?.signOut) {
      try { await clerkInstance.signOut(); } catch (_) {}
    }
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setLocation("/auth");
        toast({ title: "Signed out" });
      },
    });
  };

  if (bookingsLoading || vehiclesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen pb-32">
        <Icon icon={Loader2} size="xl" className="animate-spin text-gray-300" />
      </div>
    );
  }

  const completedBookings = bookings.filter((b) => b.status === "completed");
  const avgRating = completedBookings.filter((b) => b.rating).length > 0
    ? (completedBookings.reduce((sum, b) => sum + (b.rating || 0), 0) / completedBookings.filter((b) => b.rating).length).toFixed(1)
    : null;

  const tabs = [
    { id: "profile" as const, label: "Profile" },
    ...(!user?.isProvider ? [
      { id: "vehicles" as const, label: "Vehicles" },
      { id: "bookings" as const, label: "Bookings" },
    ] : []),
    { id: "settings" as const, label: "Settings" },
  ];

  return (
    <div
      className="min-h-screen bg-white font-sans"
      style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }}
    >
      {/* Header — avatar + name + sign out */}
      <div className="pt-14 pb-6 px-6 bg-white border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-[#8c52ff] flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-xl font-semibold text-white tracking-tight">
                {getInitials(user?.name)}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-0.5">Account</p>
              <h1 className="text-2xl font-semibold tracking-tight text-black leading-tight">
                {user?.name || "Profile"}
              </h1>
              {user?.email && (
                <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            disabled={logoutMutation.isPending}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-black transition-colors mt-1 flex-shrink-0"
          >
            <Icon icon={LogOut} size="sm" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>

        {/* Stats row */}
        {!user?.isProvider && (
          <div className="flex gap-4 mt-5">
            <div className="flex-1 bg-gray-50 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Icon icon={Calendar} size="xs" className="text-gray-400" />
                <span className="text-lg font-semibold text-black">{bookings.length}</span>
              </div>
              <p className="text-xs text-gray-500">Bookings</p>
            </div>
            <div className="flex-1 bg-gray-50 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Icon icon={Car} size="xs" className="text-gray-400" />
                <span className="text-lg font-semibold text-black">{vehicles.length}</span>
              </div>
              <p className="text-xs text-gray-500">Vehicles</p>
            </div>
            {avgRating && (
              <div className="flex-1 bg-gray-50 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Icon icon={Star} size="xs" className="text-[#8c52ff]" />
                  <span className="text-lg font-semibold text-black">{avgRating}</span>
                </div>
                <p className="text-xs text-gray-500">Avg Rating</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Book CTA row */}
      <button
        onClick={() => setLocation("/")}
        className="w-full flex items-center justify-between px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#f3eeff] flex items-center justify-center flex-shrink-0">
            <Icon icon={Car} size="sm" className="text-[#8c52ff]" />
          </div>
          <span className="text-base font-medium text-black">Book a service</span>
        </div>
        <Icon icon={ChevronRight} size="md" className="text-[#8c52ff]" />
      </button>

      {/* Tab Switcher */}
      <div className="flex border-b border-gray-100 px-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`mr-5 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "border-[#8c52ff] text-[#8c52ff]"
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
              ].map((fieldConfig) => (
                <FormField
                  key={fieldConfig.name}
                  control={form.control}
                  name={fieldConfig.name}
                  render={({ field }) => (
                    <FormItem className="py-5 border-b border-gray-100 space-y-1">
                      <FormLabel className="text-xs font-semibold text-gray-400 tracking-widest uppercase">
                        {fieldConfig.label}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type={fieldConfig.type}
                          placeholder={fieldConfig.placeholder}
                          {...field}
                          className="border-0 border-b border-gray-100 rounded-none px-0 text-base text-black placeholder:text-gray-300 focus-visible:ring-0 focus-visible:border-[#8c52ff] transition-colors"
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
                    <FormItem className="py-5 border-b border-gray-100 space-y-1">
                      <FormLabel className="text-xs font-semibold text-gray-400 tracking-widest uppercase">
                        Business Description
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          className="border-0 border-b border-gray-100 rounded-none px-0 resize-none text-base placeholder:text-gray-300 focus-visible:ring-0"
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
                  className="bg-black text-white text-sm font-medium px-8 py-3 hover:bg-gray-900 transition-colors disabled:opacity-50 flex items-center gap-2 rounded-sm"
                >
                  {updateProfileMutation.isPending && <Icon icon={Loader2} size="sm" className="animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </Form>

          {/* Addresses section */}
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xs font-semibold text-gray-400 tracking-widest uppercase">Addresses</h2>
              <button
                onClick={() => openAddrDialog()}
                className="flex items-center gap-1.5 text-sm font-medium text-[#8c52ff] hover:text-[#7c47eb] transition-colors"
              >
                <Icon icon={Plus} size="sm" /> Add
              </button>
            </div>

            {savedAddrs.length === 0 ? (
              <div className="py-10 text-center border border-dashed border-gray-200 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
                  <Icon icon={MapPin} size="md" className="text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm mb-2">No saved addresses yet</p>
                <button onClick={() => openAddrDialog()} className="text-sm font-medium text-[#8c52ff] underline underline-offset-4">
                  Add your first address
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {savedAddrs.map((addr) => {
                  const LabelIcon = addr.label === "home" ? Home : addr.label === "work" ? Briefcase : MapPin;
                  const iconBg = addr.label === "home" ? "#f3eeff" : addr.label === "work" ? "#eef2ff" : "#f5f5f5";
                  const iconColor = addr.label === "home" ? "#8c52ff" : addr.label === "work" ? "#6366f1" : "#6b7280";
                  return (
                    <div key={addr.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: iconBg }}>
                          <Icon icon={LabelIcon} size="sm" style={{ color: iconColor }} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-black capitalize">{addr.label}</p>
                            {addr.isDefault && (
                              <span className="text-[10px] font-semibold bg-[#f3eeff] text-[#8c52ff] px-1.5 py-0.5 rounded-full tracking-wide">Default</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate">{addr.address}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => openAddrDialog(addr)} className="p-2 text-gray-400 hover:text-black transition-colors rounded-lg hover:bg-gray-100">
                          <Icon icon={Pencil} size="sm" />
                        </button>
                        <button
                          onClick={() => { if (confirm("Remove this address?")) deleteAddressMutation.mutate(addr.id); }}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                        >
                          <Icon icon={Trash2} size="sm" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Address Dialog */}
      <Dialog open={addrDialogOpen} onOpenChange={(o) => { if (!o) setAddrDialogOpen(false); }}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle>{selectedAddress ? "Edit Address" : "Add Address"}</DialogTitle>
            <DialogDescription>Save a location for quick access during booking.</DialogDescription>
          </DialogHeader>

          {/* Label picker */}
          <div className="space-y-4 mt-2">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Label</p>
              <div className="flex gap-2">
                {(["home", "work", "other"] as const).map((lbl) => {
                  const LblIcon = lbl === "home" ? Home : lbl === "work" ? Briefcase : MapPin;
                  return (
                    <button
                      key={lbl}
                      onClick={() => setAddrLabel(lbl)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                        addrLabel === lbl
                          ? "bg-[#8c52ff] text-white border-[#8c52ff]"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Icon icon={LblIcon} size="xs" />
                      <span className="capitalize">{lbl}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Address</p>
              <input
                type="text"
                value={addrText}
                onChange={(e) => setAddrText(e.target.value)}
                placeholder="123 Main St, City, State"
                className="w-full border-0 border-b border-gray-200 text-base text-black placeholder:text-gray-300 outline-none focus:border-[#8c52ff] transition-colors py-2 bg-transparent"
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setAddrIsDefault(!addrIsDefault)}
                className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 ${addrIsDefault ? "bg-[#8c52ff]" : "bg-gray-200"}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full mt-1 transition-transform shadow-sm ${addrIsDefault ? "translate-x-5" : "translate-x-1"}`} />
              </div>
              <span className="text-sm text-gray-700">Set as default address</span>
            </label>
          </div>

          <DialogFooter className="mt-6 flex gap-2">
            <Button variant="outline" onClick={() => setAddrDialogOpen(false)} className="flex-1">Cancel</Button>
            <Button
              onClick={submitAddrDialog}
              disabled={!addrText.trim() || createAddressMutation.isPending || updateAddressMutation.isPending}
              className="flex-1 bg-[#8c52ff] hover:bg-[#7c47eb] text-white"
            >
              {(createAddressMutation.isPending || updateAddressMutation.isPending) && <Icon icon={Loader2} size="sm" className="animate-spin mr-2" />}
              {selectedAddress ? "Save Changes" : "Save Address"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vehicles Tab */}
      {activeTab === "vehicles" && (
        <div className="px-6 pt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xs font-semibold text-gray-400 tracking-widest uppercase">My Vehicles</h2>
            <button
              onClick={() => openVehicleDialog()}
              className="flex items-center gap-1.5 text-sm font-medium text-[#8c52ff] hover:text-[#7c47eb] transition-colors"
            >
              <Icon icon={Plus} size="sm" /> Add vehicle
            </button>
          </div>

          {vehicles.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-gray-200 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <Icon icon={Car} size="md" className="text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm mb-3">No vehicles added yet</p>
              <button
                onClick={() => openVehicleDialog()}
                className="text-sm font-medium text-[#8c52ff] underline underline-offset-4"
              >
                Add your first vehicle
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {vehicles.map((vehicle) => (
                <div key={vehicle.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-gray-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#f3eeff] flex items-center justify-center flex-shrink-0">
                      <Icon icon={Car} size="sm" className="text-[#8c52ff]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-black">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </h3>
                      {(vehicle.color || vehicle.licensePlate) && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {[vehicle.color, vehicle.licensePlate].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {vehicle.notes && (
                        <p className="text-xs text-gray-400 mt-0.5">{vehicle.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openVehicleDialog(vehicle)}
                      className="p-2 text-gray-400 hover:text-black transition-colors rounded-lg hover:bg-gray-100"
                    >
                      <Icon icon={Pencil} size="sm" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Delete this vehicle?")) deleteVehicleMutation.mutate(vehicle.id);
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                    >
                      <Icon icon={Trash2} size="sm" />
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
          <h2 className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-4">Booking History</h2>
          {bookings.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-gray-200 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <Icon icon={Calendar} size="md" className="text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm">No bookings yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <div key={booking.id} className="flex justify-between items-center p-4 border border-gray-100 rounded-xl hover:border-gray-200 transition-colors">
                  <div>
                    <h3 className="text-sm font-semibold text-black capitalize">
                      {booking.priceTier} Package
                    </h3>
                    <p className="text-xs font-mono text-[#8c52ff] mt-0.5">
                      {(booking as any).bookingRef || `#${booking.id}`}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(booking.timestamp).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    {booking.rating && (
                      <div className="flex items-center gap-1 mt-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} className={`text-xs ${i < (booking.rating || 0) ? "text-[#8c52ff]" : "text-gray-200"}`}>★</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Badge className={`text-xs border-0 ${statusColor(booking.status)}`}>
                    {booking.status.replace("_", " ")}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="px-6 pt-6 space-y-6">
          {/* Notifications section */}
          <div>
            <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-3">Notifications</p>
            <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-100">
              <div className="flex items-center justify-between px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center">
                    <Icon icon={Bell} size="sm" className="text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-black">Service updates</p>
                    <p className="text-xs text-gray-500">Booking status & arrival alerts</p>
                  </div>
                </div>
                <span className="text-[11px] font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">Coming soon</span>
              </div>
              <div className="flex items-center justify-between px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center">
                    <Icon icon={Star} size="sm" className="text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-black">Promotions & offers</p>
                    <p className="text-xs text-gray-500">Deals and seasonal discounts</p>
                  </div>
                </div>
                <span className="text-[11px] font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">Coming soon</span>
              </div>
            </div>
          </div>

          {/* Payment methods section */}
          {savedMethods.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-3">Payment methods</p>
              <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-100">
                {savedMethods.map((card) => (
                  <div key={card.id} className="flex items-center justify-between px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#f3eeff] flex items-center justify-center">
                        <Icon icon={CreditCard} size="sm" className="text-[#8c52ff]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-black capitalize">
                          {card.brand} •••• {card.last4}
                        </p>
                        <p className="text-xs text-gray-500">Expires {card.expMonth}/{String(card.expYear).slice(-2)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteCardMutation.mutate(card.id)}
                      disabled={deleteCardMutation.isPending}
                      className="text-red-400 text-[13px] font-medium disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Account section */}
          <div>
            <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-3">Account</p>
            <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-100">
              <button
                onClick={() => setActiveTab("profile")}
                className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#f3eeff] flex items-center justify-center">
                    <Icon icon={Settings} size="sm" className="text-[#8c52ff]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-black">Edit profile</p>
                    <p className="text-xs text-gray-500">Name, email, phone, address</p>
                  </div>
                </div>
                <Icon icon={ChevronRight} size="sm" className="text-gray-400" />
              </button>

              {!user?.isProvider && (
                <button
                  onClick={() => setActiveTab("vehicles")}
                  className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#f3eeff] flex items-center justify-center">
                      <Icon icon={Car} size="sm" className="text-[#8c52ff]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-black">Manage vehicles</p>
                      <p className="text-xs text-gray-500">{vehicles.length} {vehicles.length === 1 ? "vehicle" : "vehicles"} saved</p>
                    </div>
                  </div>
                  <Icon icon={ChevronRight} size="sm" className="text-gray-400" />
                </button>
              )}

              <button
                onClick={() => { setPwError(""); setPwCurrent(""); setPwNew(""); setPwConfirm(""); setPwDialogOpen(true); }}
                className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#f3eeff] flex items-center justify-center">
                    <Icon icon={KeyRound} size="sm" className="text-[#8c52ff]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-black">Change password</p>
                    <p className="text-xs text-gray-500">Update your account password</p>
                  </div>
                </div>
                <Icon icon={ChevronRight} size="sm" className="text-gray-400" />
              </button>

              <button
                onClick={handleSignOut}
                disabled={logoutMutation.isPending}
                className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                    <Icon icon={LogOut} size="sm" className="text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-black">Sign out</p>
                    <p className="text-xs text-gray-500">Log out of this device</p>
                  </div>
                </div>
                <Icon icon={ChevronRight} size="sm" className="text-gray-400" />
              </button>
            </div>
          </div>

          {/* Privacy & Legal section */}
          <div>
            <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-3">Privacy & Legal</p>
            <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-100">
              <button
                onClick={() => setLocation("/privacy")}
                className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                    <Icon icon={Shield} size="sm" className="text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-black">Privacy policy</p>
                    <p className="text-xs text-gray-500">How we use your data</p>
                  </div>
                </div>
                <Icon icon={ChevronRight} size="sm" className="text-gray-400" />
              </button>
              <button
                onClick={() => setLocation('/terms')}
                className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                  <Icon icon={Hash} size="sm" className="text-gray-500" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-black">Terms of service</p>
                </div>
                <Icon icon={ChevronRight} size="sm" className="text-gray-400" />
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div>
            <p className="text-xs font-semibold text-red-400 tracking-widest uppercase mb-3">Danger Zone</p>
            <div className="border border-red-100 rounded-xl overflow-hidden">
              <button
                onClick={() => { setDeleteConfirmText(""); setDeleteDialogOpen(true); }}
                className="w-full flex items-center justify-between px-4 py-4 hover:bg-red-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
                    <Icon icon={UserX} size="sm" className="text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-red-600">Delete account</p>
                    <p className="text-xs text-red-400">Permanently remove your account and data</p>
                  </div>
                </div>
                <Icon icon={ChevronRight} size="sm" className="text-red-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {selectedVehicle ? "Edit Vehicle" : "Add Vehicle"}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              {selectedVehicle ? "Update your vehicle details." : "Enter your vehicle details."}
            </DialogDescription>
          </DialogHeader>
          <Form {...vehicleForm}>
            <form onSubmit={(e) => { e.preventDefault(); vehicleForm.handleSubmit(handleVehicleSubmit)(); }} className="space-y-4">
              <FormField
                control={vehicleForm.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-gray-400 tracking-widest uppercase">Year</FormLabel>
                    <FormControl>
                      <select
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        className={selectCls}
                      >
                        <option value="">Select year</option>
                        {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={vehicleForm.control}
                name="make"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-gray-400 tracking-widest uppercase">Make</FormLabel>
                    <FormControl>
                      <select
                        value={field.value || ""}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          setDialogMake(e.target.value);
                          vehicleForm.setValue("model", "");
                        }}
                        className={selectCls}
                      >
                        <option value="">Select make</option>
                        {CAR_MAKES.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={vehicleForm.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-gray-400 tracking-widest uppercase">Model</FormLabel>
                    <FormControl>
                      <select
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value)}
                        disabled={!dialogMake}
                        className={selectCls + (!dialogMake ? " opacity-40" : "")}
                      >
                        <option value="">{dialogMake ? "Select model" : "Select make first"}</option>
                        {(dialogMake && CAR_MODELS[dialogMake] ? CAR_MODELS[dialogMake] : []).map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {[
                { name: "color" as const, label: "Color (optional)", placeholder: "Blue" },
                { name: "licensePlate" as const, label: "License Plate (optional)", placeholder: "ABC123" },
              ].map((fc) => (
                <FormField
                  key={fc.name}
                  control={vehicleForm.control}
                  name={fc.name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-gray-400 tracking-widest uppercase">{fc.label}</FormLabel>
                      <FormControl>
                        <Input placeholder={fc.placeholder} {...field} className="rounded-sm border-gray-200" />
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
                    <FormLabel className="text-xs font-semibold text-gray-400 tracking-widest uppercase">Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Special instructions..." {...field} className="rounded-sm border-gray-200 resize-none" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <button
                  type="button"
                  onClick={() => vehicleForm.handleSubmit(handleVehicleSubmit)()}
                  disabled={createVehicleMutation.isPending || updateVehicleMutation.isPending}
                  className="bg-black text-white text-sm font-medium px-6 py-2.5 hover:bg-gray-900 transition-colors disabled:opacity-50 flex items-center gap-2 rounded-sm"
                >
                  {(createVehicleMutation.isPending || updateVehicleMutation.isPending) && (
                    <Icon icon={Loader2} size="sm" className="animate-spin" />
                  )}
                  {selectedVehicle ? "Update Vehicle" : "Add Vehicle"}
                </button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={pwDialogOpen} onOpenChange={(open) => { setPwDialogOpen(open); if (!open) setPwError(""); }}>
        <DialogContent className="sm:max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Change password</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Choose a new password for your account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div>
              <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-1.5">Current password</p>
              <div className="relative">
                <input
                  type={pwShowCurrent ? "text" : "password"}
                  value={pwCurrent}
                  onChange={(e) => setPwCurrent(e.target.value)}
                  placeholder="Enter current password"
                  className="h-11 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 pr-10 text-[14px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#8c52ff] transition"
                />
                <button type="button" onClick={() => setPwShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Icon icon={pwShowCurrent ? EyeOff : Eye} size="sm" />
                </button>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-1.5">New password</p>
              <div className="relative">
                <input
                  type={pwShowNew ? "text" : "password"}
                  value={pwNew}
                  onChange={(e) => setPwNew(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="h-11 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 pr-10 text-[14px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#8c52ff] transition"
                />
                <button type="button" onClick={() => setPwShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Icon icon={pwShowNew ? EyeOff : Eye} size="sm" />
                </button>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-1.5">Confirm new password</p>
              <input
                type="password"
                value={pwConfirm}
                onChange={(e) => setPwConfirm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
                placeholder="Repeat new password"
                className="h-11 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-[14px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#8c52ff] transition"
              />
            </div>
            {pwError && (
              <p className="text-[12px] text-red-500 bg-red-50 rounded-lg px-3 py-2">{pwError}</p>
            )}
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setPwDialogOpen(false)} className="rounded-lg">Cancel</Button>
            <Button
              onClick={handleChangePassword}
              disabled={pwLoading || !pwNew || !pwConfirm}
              className="rounded-lg bg-[#111] hover:bg-[#222] text-white"
            >
              {pwLoading ? <Icon icon={Loader2} size="sm" className="animate-spin" /> : "Update password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-red-600">Delete account?</DialogTitle>
            <DialogDescription className="text-sm text-gray-600 mt-2">
              This will permanently delete your account, all bookings, vehicles, and personal data. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            <p className="text-xs text-gray-500 mb-2 font-medium">
              Type <span className="font-bold text-black">DELETE</span> to confirm
            </p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="border-red-200 focus-visible:ring-red-300 text-sm"
            />
          </div>
          <DialogFooter className="flex gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmText !== "DELETE" || deleteAccountMutation.isPending}
              onClick={() => deleteAccountMutation.mutate()}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {deleteAccountMutation.isPending && <Icon icon={Loader2} size="sm" className="animate-spin mr-2" />}
              Delete account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
