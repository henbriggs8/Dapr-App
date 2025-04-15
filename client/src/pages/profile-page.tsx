import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertUserSchema, Booking, Vehicle, insertVehicleSchema } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Phone, Home, LogOut, Car, Plus, Pencil, Trash2 } from "lucide-react";
import RatingDisplay from "@/components/rating-display";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

const profileSchema = insertUserSchema.extend({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  description: z.string().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
});

// Create a Zod schema for validating vehicle form inputs
const vehicleSchema = insertVehicleSchema.extend({
  year: z.coerce.number().min(1900, "Year must be at least 1900").max(new Date().getFullYear() + 1, `Year cannot exceed ${new Date().getFullYear() + 1}`),
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  color: z.string().optional().or(z.literal("")),
  licensePlate: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal(""))
});

type VehicleFormValues = z.infer<typeof vehicleSchema>;

export default function ProfilePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

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

  const updateProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof profileSchema>) => {
      const res = await apiRequest("PATCH", "/api/user", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Profile updated",
        description: "Your changes have been saved successfully",
      });
    },
  });

  if (bookingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user?.profileImage || undefined} />
                <AvatarFallback>{user?.name?.[0]}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{user?.name}</CardTitle>
                {user?.isProvider && (
                  <RatingDisplay 
                    rating={user.rating || 5} 
                    count={user.ratingCount || 0} 
                  />
                )}
              </div>
            </div>
            <Button 
              variant="destructive" 
              size="sm"
              className="flex items-center gap-2"
              disabled={logoutMutation.isPending}
              onClick={() => {
                logoutMutation.mutate(undefined, {
                  onSuccess: () => {
                    setLocation('/auth');
                    toast({
                      title: "Signed out",
                      description: "You have been successfully signed out",
                    });
                  }
                });
              }}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </CardHeader>
        </Card>

        <Tabs defaultValue="profile">
          <TabsList className="w-full">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            {!user?.isProvider && (
              <>
                <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
                <TabsTrigger value="bookings">Bookings</TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Edit Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit((data) =>
                      updateProfileMutation.mutate(data)
                    )}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Mail className="h-4 w-4" /> Email Address
                          </FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="you@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Phone className="h-4 w-4" /> Phone Number
                          </FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="(123) 456-7890" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Home className="h-4 w-4" /> Home Address
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="123 Main St, Anytown, CA 12345" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {user?.isProvider && (
                      <>
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Business Description</FormLabel>
                              <FormControl>
                                <Textarea {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="latitude"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Latitude</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="any" 
                                    {...field} 
                                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="longitude"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Longitude</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="any" 
                                    {...field}
                                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </>
                    )}

                    <Button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                    >
                      Save Changes
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings">
            <div className="grid gap-4">
              {bookings.map((booking) => (
                <Card key={booking.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">
                          Booking #{booking.id}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(booking.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium capitalize">
                          {booking.priceTier} Package
                        </div>
                        <div className="text-sm text-muted-foreground capitalize">
                          Status: {booking.status}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}