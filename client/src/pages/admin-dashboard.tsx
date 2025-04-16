import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PricingConfig, User } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Redirect } from "wouter";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { LogOut, DollarSign, MapPin, Users, BarChart, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import MapComponent from "@/components/google-map";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

// Types for the geography-based revenue data
interface RevenueLocation {
  latitude: number;
  longitude: number;
  location: string;
  revenue: number;
  bookingsCount: number;
}

interface RevenueData {
  totalRevenue: number;
  locationData: RevenueLocation[];
}

// Types for provider status summary
interface OnlineProvider {
  id: number;
  name: string;
  username: string;
  latitude?: number;
  longitude?: number;
  lastLocationUpdate?: string;
}

interface ProviderStatusSummary {
  totalProviders: number;
  onlineProviders: number;
  onlineProvidersList: OnlineProvider[];
}

const pricingSchema = z.object({
  basic: z.coerce.number().min(1),
  standard: z.coerce.number().min(1),
  premium: z.coerce.number().min(1),
});

export default function AdminDashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();

  // Redirect non-admin users
  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  // Fetch users
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  // Fetch pricing data
  const { data: pricing } = useQuery<PricingConfig>({
    queryKey: ["/api/pricing"],
  });
  
  // Fetch revenue by location data
  const { data: revenueData, isLoading: isLoadingRevenue } = useQuery<RevenueData>({
    queryKey: ["/api/admin/revenue-by-location"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  // Fetch provider status data
  const { data: providerStatus, isLoading: isLoadingProviderStatus } = useQuery<ProviderStatusSummary>({
    queryKey: ["/api/admin/provider-status"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const form = useForm<z.infer<typeof pricingSchema>>({
    resolver: zodResolver(pricingSchema),
    defaultValues: {
      basic: pricing?.basic,
      standard: pricing?.standard,
      premium: pricing?.premium,
    },
  });

  const updatePricingMutation = useMutation({
    mutationFn: async (data: z.infer<typeof pricingSchema>) => {
      const res = await apiRequest("PATCH", "/api/admin/pricing", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pricing"] });
      toast({
        title: "Pricing updated",
        description: "The pricing configuration has been updated successfully",
      });
    },
  });

  const userColumns: ColumnDef<User>[] = [
    {
      accessorKey: "username",
      header: "Username",
    },
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "isProvider",
      header: "Provider",
      cell: ({ row }) => (row.original.isProvider ? "Yes" : "No"),
    },
    {
      accessorKey: "rating",
      header: "Rating",
      cell: ({ row }) => row.original.rating?.toFixed(1) || "N/A",
    },
  ];
  
  const providerColumns: ColumnDef<OnlineProvider>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => row.original.name || row.original.username,
    },
    {
      accessorKey: "lastLocationUpdate",
      header: "Last Update",
      cell: ({ row }) => {
        if (!row.original.lastLocationUpdate) return "Unknown";
        const date = new Date(row.original.lastLocationUpdate);
        return date.toLocaleTimeString();
      }
    },
    {
      id: "status",
      header: "Status",
      cell: () => <Badge className="bg-green-500">Online</Badge>
    },
    {
      id: "location",
      header: "Location",
      cell: ({ row }) => {
        if (row.original.latitude && row.original.longitude) {
          return `${row.original.latitude.toFixed(4)}, ${row.original.longitude.toFixed(4)}`;
        }
        return "Unknown";
      }
    }
  ];
  
  const revenueLocationColumns: ColumnDef<RevenueLocation>[] = [
    {
      accessorKey: "location",
      header: "Location",
    },
    {
      accessorKey: "revenue",
      header: "Revenue",
      cell: ({ row }) => `$${(row.original.revenue / 100).toFixed(2)}`,
    },
    {
      accessorKey: "bookingsCount",
      header: "Bookings",
    },
  ];

  // Convert revenue location data to map markers
  const mapMarkers = revenueData?.locationData.map(location => ({
    id: location.location,
    name: `$${(location.revenue / 100).toFixed(2)} (${location.bookingsCount} bookings)`,
    latitude: location.latitude,
    longitude: location.longitude,
    isProvider: false,
  })) || [];

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-8">
        <CardHeader className="flex justify-between items-center">
          <CardTitle>Admin Dashboard</CardTitle>
          <Button 
            variant="outline"
            size="sm"
            className="text-red-500 hover:bg-red-50"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="h-4 w-4 mr-1" />
            {logoutMutation.isPending ? "Logging out..." : "Logout"}
          </Button>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-green-500" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${(revenueData?.totalRevenue || 0) / 100}
            </div>
            <p className="text-sm text-muted-foreground">
              Total from {revenueData?.locationData.length || 0} locations
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Users className="h-5 w-5 mr-2 text-blue-500" />
              Provider Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {providerStatus?.onlineProviders || 0} 
              <span className="text-sm text-muted-foreground ml-2">
                online of {providerStatus?.totalProviders || 0} total
              </span>
            </div>
            <Progress 
              value={providerStatus ? (providerStatus.onlineProviders / providerStatus.totalProviders) * 100 : 0} 
              className="h-2 mt-2"
            />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="revenue">
        <TabsList>
          <TabsTrigger value="revenue">
            <MapPin className="h-4 w-4 mr-2" />
            Revenue by Location
          </TabsTrigger>
          <TabsTrigger value="providers">
            <Activity className="h-4 w-4 mr-2" />
            Live Provider Status
          </TabsTrigger>
          <TabsTrigger value="pricing">
            <DollarSign className="h-4 w-4 mr-2" />
            Pricing
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle>Geographical Revenue Analysis</CardTitle>
              <CardDescription>
                View revenue data based on service locations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-[400px]">
                {isLoadingRevenue ? (
                  <div className="h-full flex items-center justify-center">
                    <p>Loading map data...</p>
                  </div>
                ) : mapMarkers.length > 0 ? (
                  <MapComponent 
                    providers={mapMarkers as any} 
                    zoom={11}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center bg-muted/20 rounded-md">
                    <p className="text-muted-foreground">No revenue data available yet</p>
                  </div>
                )}
              </div>
              
              <Separator />
              
              <div className="overflow-hidden">
                <h3 className="font-medium mb-2">Revenue by Location</h3>
                {revenueData?.locationData && revenueData.locationData.length > 0 ? (
                  <DataTable 
                    columns={revenueLocationColumns} 
                    data={revenueData.locationData} 
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">No revenue data available yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="providers">
          <Card>
            <CardHeader>
              <CardTitle>Live Provider Status</CardTitle>
              <CardDescription>
                Track service providers that are currently online
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                        <Activity className="h-6 w-6 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Online Providers</p>
                        <h3 className="text-2xl font-bold">{providerStatus?.onlineProviders || 0}</h3>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <Users className="h-6 w-6 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Total Providers</p>
                        <h3 className="text-2xl font-bold">{providerStatus?.totalProviders || 0}</h3>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {isLoadingProviderStatus ? (
                <div className="py-8 flex justify-center">
                  <p>Loading provider data...</p>
                </div>
              ) : providerStatus?.onlineProvidersList && providerStatus.onlineProvidersList.length > 0 ? (
                <>
                  <h3 className="font-medium mb-2">Online Providers</h3>
                  <DataTable 
                    columns={providerColumns} 
                    data={providerStatus.onlineProvidersList} 
                  />
                  
                  <div className="h-[400px] mt-6">
                    <h3 className="font-medium mb-2">Provider Locations</h3>
                    <MapComponent 
                      providers={providerStatus.onlineProvidersList.map(p => ({
                        id: p.id,
                        name: p.name || p.username,
                        latitude: p.latitude,
                        longitude: p.longitude,
                        isProvider: true,
                      })) as any} 
                      zoom={11}
                    />
                  </div>
                </>
              ) : (
                <div className="py-8 flex justify-center">
                  <p className="text-muted-foreground">No providers are online at the moment</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle>Manage Pricing</CardTitle>
              <CardDescription>
                Configure service pricing levels for all locations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((data) =>
                    updatePricingMutation.mutate(data)
                  )}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-[#8c52ff]/20 shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Basic Wash</CardTitle>
                        <CardDescription className="text-xs">
                          Exterior wash only - 30 min service
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <FormField
                          control={form.control}
                          name="basic"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Price ($)</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>

                    <Card className="border-[#8c52ff]/20 shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">The OG</CardTitle>
                        <CardDescription className="text-xs">
                          Maintenance clean, hand wash, vacuum and wipe down - 45 min service
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <FormField
                          control={form.control}
                          name="standard"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Price ($)</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>

                    <Card className="border-[#8c52ff]/20 shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Full Detail</CardTitle>
                        <CardDescription className="text-xs">
                          Complete interior and exterior detailing - 90 min premium service
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <FormField
                          control={form.control}
                          name="premium"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Price ($)</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </div>

                  <div className="mt-6 p-4 border border-[#8c52ff]/20 rounded-md bg-[#8c52ff]/5">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="font-medium">Pricing Summary</h3>
                        <p className="text-sm text-muted-foreground">
                          Service tiers and pricing overview
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Total Value</div>
                        <div className="text-2xl font-bold">
                          ${form.watch('basic') + form.watch('standard') + form.watch('premium') || 0}
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      type="submit"
                      disabled={updatePricingMutation.isPending}
                      className="w-full bg-[#8c52ff] hover:bg-[#7b45e0]"
                    >
                      {updatePricingMutation.isPending ? "Updating..." : "Update Pricing"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                View and manage all system users
              </CardDescription>
            </CardHeader>
            <CardContent>
              {users && <DataTable columns={userColumns} data={users} />}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}