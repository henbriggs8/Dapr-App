import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User, Booking } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Redirect } from "wouter";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { 
  LogOut, 
  Users, 
  Calendar, 
  DollarSign, 
  BarChart3, 
  Search, 
  Filter,
  Eye,
  UserX,
  UserCheck,
  MoreHorizontal,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Radio,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle2,
  Zap,
  RefreshCw,
  Car
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

// Enhanced types for admin dashboard
interface AdminBooking extends Booking {
  customerName?: string;
  providerName?: string;
  serviceName?: string;
}

interface EarningsData {
  totalRevenue: number;
  monthlyRevenue: number;
  weeklyRevenue: number;
  todayRevenue: number;
  averageBookingValue: number;
  totalBookings: number;
}

interface AnalyticsData {
  totalJobs: number;
  completedJobs: number;
  cancelledJobs: number;
  userGrowth: {
    totalUsers: number;
    newUsersThisMonth: number;
    totalProviders: number;
    activeProviders: number;
  };
  topServices: Array<{
    name: string;
    count: number;
    revenue: number;
  }>;
  topProviders: Array<{
    id: number;
    name: string;
    completedJobs: number;
    revenue: number;
    rating: number;
  }>;
}

export default function AdminDashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Role-based access check
  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/users");
      return await res.json();
    },
  });

  // Fetch all bookings (auto-refresh for dispatch)
  const { data: bookings = [], isLoading: bookingsLoading, dataUpdatedAt: bookingsUpdatedAt } = useQuery<AdminBooking[]>({
    queryKey: ["/api/admin/bookings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/bookings");
      return await res.json();
    },
    refetchInterval: 15000,
  });

  // Fetch provider status (auto-refresh)
  const { data: providerStatus = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/provider-status"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/provider-status");
      return await res.json();
    },
    refetchInterval: 15000,
  });

  // Fetch earnings data
  const { data: earnings } = useQuery<EarningsData>({
    queryKey: ["/api/admin/earnings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/earnings");
      return await res.json();
    },
  });

  // Fetch analytics data
  const { data: analytics } = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/analytics"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/analytics");
      return await res.json();
    },
  });

  // User management mutations
  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: number; action: 'activate' | 'deactivate' }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/status`, { action });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User status updated",
        description: "User status has been successfully updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update user status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Booking management mutations
  const reassignBookingMutation = useMutation({
    mutationFn: async ({ bookingId, providerId }: { bookingId: number; providerId: number }) => {
      const res = await apiRequest("PATCH", `/api/admin/bookings/${bookingId}/reassign`, { providerId });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookings"] });
      toast({
        title: "Booking reassigned",
        description: "Booking has been successfully reassigned",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reassign booking",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelBookingMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      const res = await apiRequest("PATCH", `/api/admin/bookings/${bookingId}/cancel`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookings"] });
      toast({
        title: "Booking cancelled",
        description: "Booking has been successfully cancelled",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to cancel booking",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === "all" || 
                       (roleFilter === "provider" && user.isProvider) ||
                       (roleFilter === "customer" && !user.isProvider && !user.isAdmin) ||
                       (roleFilter === "admin" && user.isAdmin);
    
    const matchesStatus = statusFilter === "all" ||
                         (statusFilter === "active" && user.currentStatus !== "inactive") ||
                         (statusFilter === "inactive" && user.currentStatus === "inactive");
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Users table columns
  const userColumns: ColumnDef<User>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium"
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name || row.original.username}</div>
          <div className="text-sm text-gray-500">{row.original.email}</div>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => {
        const user = row.original;
        if (user.isAdmin) return <Badge variant="destructive">Admin</Badge>;
        if (user.isProvider) return <Badge variant="default">Detail Pro</Badge>;
        return <Badge variant="secondary">Customer</Badge>;
      },
    },
    {
      accessorKey: "currentStatus",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.currentStatus;
        const variant = status === "online" ? "default" : status === "offline" ? "secondary" : "outline";
        return <Badge variant={variant}>{status}</Badge>;
      },
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => row.original.email || "Not provided",
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const user = row.original;
        const isActive = user.currentStatus !== "inactive";
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Eye className="mr-2 h-4 w-4" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => toggleUserStatusMutation.mutate({
                  userId: user.id,
                  action: isActive ? 'deactivate' : 'activate'
                })}
              >
                {isActive ? (
                  <>
                    <UserX className="mr-2 h-4 w-4" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <UserCheck className="mr-2 h-4 w-4" />
                    Reactivate
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Bookings table columns
  const bookingColumns: ColumnDef<AdminBooking>[] = [
    {
      accessorKey: "customerName",
      header: "Customer",
      cell: ({ row }) => row.original.customerName || "Unknown Customer",
    },
    {
      accessorKey: "providerName",
      header: "Assigned Pro",
      cell: ({ row }) => row.original.providerName || "Unassigned",
    },
    {
      accessorKey: "serviceName",
      header: "Service",
      cell: ({ row }) => row.original.serviceName || "Unknown Service",
    },
    {
      accessorKey: "date",
      header: "Date & Time",
      cell: ({ row }) => {
        const booking = row.original;
        return (
          <div>
            <div className="font-medium">{booking.date || "No date"}</div>
            <div className="text-sm text-gray-500">{booking.time || "No time"}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "serviceLocation",
      header: "Location",
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate">
          {row.original.serviceLocation || "Not specified"}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        const variant = status === "completed" ? "default" : 
                       status === "cancelled" ? "destructive" : 
                       status === "in_progress" ? "secondary" : "outline";
        return <Badge variant={variant}>{status}</Badge>;
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const booking = row.original;
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              {booking.status === "pending" && (
                <DropdownMenuItem
                  onClick={() => {
                    // This would open a provider selection dialog
                    toast({
                      title: "Reassign booking",
                      description: "Reassignment feature would open here",
                    });
                  }}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Reassign
                </DropdownMenuItem>
              )}
              {booking.status !== "cancelled" && booking.status !== "completed" && (
                <DropdownMenuItem
                  onClick={() => cancelBookingMutation.mutate(booking.id)}
                  className="text-red-600"
                >
                  <UserX className="mr-2 h-4 w-4" />
                  Cancel
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      // Error handling is done in the mutation's onError callback
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-1">Manage users, bookings, and analytics</p>
            </div>
            <Button onClick={handleLogout} variant="outline" className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="dispatch" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dispatch" className="flex items-center gap-2">
              <Radio className="h-4 w-4" />
              Dispatch
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="bookings" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Bookings
            </TabsTrigger>
            <TabsTrigger value="earnings" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Earnings
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Dispatch Tab */}
          <TabsContent value="dispatch" className="space-y-4">
            {/* Live Stats Bar */}
            {(() => {
              const unassigned = bookings.filter(b => b.status === "pending" && !b.providerId);
              const active = bookings.filter(b => b.status === "in_progress" || b.status === "accepted");
              const onlineProviders = providerStatus.filter((p: any) => p.status === "online");
              const todayCompleted = bookings.filter(b => {
                const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
                return b.status === "completed" && b.date === today;
              });

              return (
                <>
                  <div className="grid grid-cols-4 gap-4">
                    <Card className="border-red-100 bg-red-50">
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-red-600 uppercase tracking-wide">Unassigned</p>
                            <p className="text-3xl font-bold text-red-700">{unassigned.length}</p>
                          </div>
                          <AlertCircle className="h-8 w-8 text-red-400" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-blue-100 bg-blue-50">
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Active Jobs</p>
                            <p className="text-3xl font-bold text-blue-700">{active.length}</p>
                          </div>
                          <Zap className="h-8 w-8 text-blue-400" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-green-100 bg-green-50">
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Pros Online</p>
                            <p className="text-3xl font-bold text-green-700">{onlineProviders.length}</p>
                          </div>
                          <Car className="h-8 w-8 text-green-400" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Done Today</p>
                            <p className="text-3xl font-bold text-gray-800">{todayCompleted.length}</p>
                          </div>
                          <CheckCircle2 className="h-8 w-8 text-gray-400" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Auto-refresh indicator */}
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <RefreshCw className="h-3 w-3" />
                    Auto-refreshing every 15s · Last updated {new Date(bookingsUpdatedAt).toLocaleTimeString()}
                  </div>

                  {/* Main dispatch layout */}
                  <div className="grid grid-cols-3 gap-4 items-start">
                    {/* Job Queue — 2/3 */}
                    <div className="col-span-2 space-y-4">
                      {/* Unassigned Jobs */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            Needs Assignment
                            {unassigned.length > 0 && (
                              <Badge variant="destructive" className="ml-1">{unassigned.length}</Badge>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {unassigned.length === 0 ? (
                            <p className="text-sm text-gray-400 py-4 text-center">All jobs are assigned</p>
                          ) : unassigned.map((job) => (
                            <div key={job.id} className="flex items-start justify-between p-3 rounded-lg border border-red-100 bg-red-50/40">
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm">#{job.id} — {job.serviceName || job.priceTier}</span>
                                  <Badge variant="outline" className="text-xs">${job.totalPrice}</Badge>
                                </div>
                                <p className="text-xs text-gray-600 flex items-center gap-1">
                                  <MapPin className="h-3 w-3" /> {job.serviceLocation || "Address not set"}
                                </p>
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> {job.date ? `${job.date} ${job.time ?? ""}`.trim() : "ASAP"}
                                </p>
                                <p className="text-xs text-gray-500">Customer: {job.customerName || `User #${job.userId}`}</p>
                              </div>
                              <div className="ml-3 min-w-[160px]">
                                <Select
                                  onValueChange={(providerId) => {
                                    reassignBookingMutation.mutate({ bookingId: job.id, providerId: parseInt(providerId) });
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Assign to pro…" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {onlineProviders.length === 0 && (
                                      <SelectItem value="none" disabled>No pros online</SelectItem>
                                    )}
                                    {onlineProviders.map((p: any) => (
                                      <SelectItem key={p.id} value={String(p.id)}>
                                        {p.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>

                      {/* Active Jobs */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Zap className="h-4 w-4 text-blue-500" />
                            In Progress
                            {active.length > 0 && (
                              <Badge className="ml-1 bg-blue-500">{active.length}</Badge>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {active.length === 0 ? (
                            <p className="text-sm text-gray-400 py-4 text-center">No active jobs right now</p>
                          ) : active.map((job) => (
                            <div key={job.id} className="flex items-start justify-between p-3 rounded-lg border bg-blue-50/30">
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm">#{job.id} — {job.serviceName || job.priceTier}</span>
                                  <Badge className="text-xs bg-blue-500">
                                    {job.status === "in_progress" ? "Washing" : "Accepted"}
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-600 flex items-center gap-1">
                                  <MapPin className="h-3 w-3" /> {job.serviceLocation || "Address not set"}
                                </p>
                                <p className="text-xs text-gray-500">Customer: {job.customerName || `User #${job.userId}`}</p>
                                <p className="text-xs text-gray-500">Pro: {job.providerName || `Provider #${job.providerId}`}</p>
                              </div>
                              <div className="ml-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-8 text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => cancelBookingMutation.mutate(job.id)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </div>

                    {/* Provider Roster — 1/3 */}
                    <div className="col-span-1">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Car className="h-4 w-4" />
                            Detail Pros
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {providerStatus.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-4">No providers found</p>
                          ) : (
                            [...providerStatus]
                              .sort((a: any, b: any) => (b.status === "online" ? 1 : 0) - (a.status === "online" ? 1 : 0))
                              .map((p: any) => {
                                const currentJob = active.find(b => b.providerId === p.id);
                                const isOnline = p.status === "online";
                                return (
                                  <div key={p.id} className={`p-3 rounded-lg border ${isOnline ? "border-green-100 bg-green-50/40" : "border-gray-100 bg-gray-50/40 opacity-60"}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-green-500" : "bg-gray-300"}`} />
                                      <span className="text-sm font-medium truncate">{p.name}</span>
                                    </div>
                                    {currentJob ? (
                                      <p className="text-xs text-blue-600 flex items-center gap-1">
                                        <Zap className="h-3 w-3" /> Job #{currentJob.id} · {currentJob.serviceName || currentJob.priceTier}
                                      </p>
                                    ) : isOnline ? (
                                      <p className="text-xs text-green-600">Available</p>
                                    ) : (
                                      <p className="text-xs text-gray-400">Offline</p>
                                    )}
                                    {p.lastLocation && (
                                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1 truncate">
                                        <MapPin className="h-3 w-3 shrink-0" />
                                        {p.lastLocation}
                                      </p>
                                    )}
                                  </div>
                                );
                              })
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </>
              );
            })()}
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage Detail Pros and Customers
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Filters and Search */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by name, username, or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="customer">Customers</SelectItem>
                      <SelectItem value="provider">Detail Pros</SelectItem>
                      <SelectItem value="admin">Admins</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Users Table */}
                <DataTable
                  columns={userColumns}
                  data={filteredUsers}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Booking Management</CardTitle>
                <CardDescription>
                  View and manage all upcoming appointments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={bookingColumns}
                  data={bookings}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Earnings Tab */}
          <TabsContent value="earnings" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${earnings?.totalRevenue?.toLocaleString() || "0"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    All time revenue
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${earnings?.monthlyRevenue?.toLocaleString() || "0"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Booking Value</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${earnings?.averageBookingValue?.toFixed(2) || "0"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Per booking
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {earnings?.totalBookings?.toLocaleString() || "0"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    All completed
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Job Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle>Job Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Total Jobs</span>
                    <span className="font-bold">{analytics?.totalJobs || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Completed Jobs</span>
                    <span className="font-bold text-green-600">{analytics?.completedJobs || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Cancelled Jobs</span>
                    <span className="font-bold text-red-600">{analytics?.cancelledJobs || 0}</span>
                  </div>
                </CardContent>
              </Card>

              {/* User Growth */}
              <Card>
                <CardHeader>
                  <CardTitle>User Growth</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Total Users</span>
                    <span className="font-bold">{analytics?.userGrowth.totalUsers || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>New Users This Month</span>
                    <span className="font-bold text-blue-600">{analytics?.userGrowth.newUsersThisMonth || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Total Providers</span>
                    <span className="font-bold">{analytics?.userGrowth.totalProviders || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Active Providers</span>
                    <span className="font-bold text-green-600">{analytics?.userGrowth.activeProviders || 0}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Top Services */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Services</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics?.topServices?.map((service, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span>{service.name}</span>
                        <div className="text-right">
                          <div className="font-bold">{service.count} jobs</div>
                          <div className="text-sm text-gray-500">${service.revenue}</div>
                        </div>
                      </div>
                    )) || (
                      <p className="text-gray-500">No service data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Top Providers */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Providers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics?.topProviders?.map((provider, index) => (
                      <div key={provider.id} className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{provider.name}</div>
                          <div className="text-sm text-gray-500">★ {provider.rating.toFixed(1)}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{provider.completedJobs} jobs</div>
                          <div className="text-sm text-gray-500">${provider.revenue}</div>
                        </div>
                      </div>
                    )) || (
                      <p className="text-gray-500">No provider data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}