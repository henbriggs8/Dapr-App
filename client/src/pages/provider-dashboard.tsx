import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { CarWashSpinner } from "@/components/car-wash-spinner";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User, Booking } from "@shared/schema";
import { 
  MapPin, 
  Clock, 
  DollarSign, 
  Star, 
  Users, 
  Car, 
  CheckCircle, 
  XCircle, 
  Play, 
  Square as StopIcon,
  BarChart3,
  Calendar,
  TrendingUp
} from "lucide-react";
import { useState } from "react";
import { ProviderProfileTab } from "@/components/provider-profile-tab";

interface ProviderEarnings {
  totalEarnings: number;
  completedServices: number;
  averageRating: number;
  serviceTypeBreakdown: { [key: string]: number };
}

interface ProviderMetrics {
  averageDuration: { [key: string]: number };
  totalServiceTime: number;
}

export default function ProviderDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(user?.currentStatus === 'online');

  // Fetch active bookings
  const { data: activeBookings = [], isLoading: isLoadingBookings, refetch: refetchBookings } = useQuery<Booking[]>({
    queryKey: ['/api/provider/active-bookings'],
  });

  // Fetch available jobs (within 15 miles)
  const { data: availableJobs = [], isLoading: isLoadingJobs, refetch: refetchJobs } = useQuery<(Booking & { distance: number })[]>({
    queryKey: ['/api/provider/available-jobs'],
  });

  // Accept job mutation
  const acceptJobMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      const res = await apiRequest("POST", `/api/provider/accept-job/${bookingId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Job Accepted",
        description: "You have successfully accepted this job!",
      });
      refetchJobs();
      refetchBookings();
      queryClient.invalidateQueries({ queryKey: ['/api/provider/active-bookings'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reject job mutation
  const rejectJobMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      const res = await apiRequest("POST", `/api/provider/reject-job/${bookingId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Job Rejected",
        description: "Job has been removed from your available jobs.",
      });
      refetchJobs();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fetch provider earnings
  const { data: earnings, isLoading: isLoadingEarnings } = useQuery<ProviderEarnings>({
    queryKey: ['/api/provider/earnings'],
  });

  // Fetch provider metrics
  const { data: metricsData, isLoading: isLoadingMetrics } = useQuery<ProviderMetrics>({
    queryKey: ['/api/provider/metrics'],
  });

  // Update provider status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await apiRequest("PATCH", "/api/provider/status", { status });
      return await res.json();
    },
    onSuccess: (updatedUser: User) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      setIsOnline(updatedUser.currentStatus === 'online');
      toast({
        title: "Status updated",
        description: `You are now ${updatedUser.currentStatus}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update location mutation
  const updateLocationMutation = useMutation({
    mutationFn: async () => {
      if (!navigator.geolocation) {
        throw new Error("Geolocation is not supported");
      }

      return new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          (error) => reject(new Error("Failed to get location")),
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });
    },
    onSuccess: async (location) => {
      const res = await apiRequest("PATCH", "/api/provider/location", location);
      const updatedUser = await res.json();
      queryClient.setQueryData(["/api/user"], updatedUser);
      toast({
        title: "Location updated",
        description: "Your location has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update location",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Accept booking mutation
  const acceptBookingMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      const res = await apiRequest("POST", `/api/bookings/${bookingId}/accept`);
      return await res.json();
    },
    onSuccess: (updatedBooking: Booking) => {
      queryClient.invalidateQueries({ queryKey: ['/api/provider/active-bookings'] });
      toast({
        title: "Booking accepted",
        description: "You have successfully accepted the booking",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to accept booking",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reject booking mutation
  const rejectBookingMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      const res = await apiRequest("POST", `/api/bookings/${bookingId}/reject`);
      return await res.json();
    },
    onSuccess: (booking: Booking) => {
      queryClient.invalidateQueries({ queryKey: ['/api/provider/active-bookings'] });
      toast({
        title: "Booking rejected",
        description: "The booking has been rejected",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reject booking",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Start service mutation
  const startServiceMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      const res = await apiRequest("POST", `/api/bookings/${bookingId}/start`);
      return await res.json();
    },
    onSuccess: (booking: Booking) => {
      queryClient.invalidateQueries({ queryKey: ['/api/provider/active-bookings'] });
      toast({
        title: "Service started",
        description: "Timer has been started for this service",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start service",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Complete service mutation
  const completeServiceMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      const res = await apiRequest("POST", `/api/bookings/${bookingId}/complete`);
      return await res.json();
    },
    onSuccess: (booking: Booking) => {
      queryClient.invalidateQueries({ queryKey: ['/api/provider/active-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/provider/earnings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/provider/metrics'] });
      toast({
        title: "Service completed",
        description: "The service has been marked as completed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to complete service",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStatusToggle = (checked: boolean) => {
    const newStatus = checked ? 'online' : 'offline';
    updateStatusMutation.mutate(newStatus);
  };

  const updateBookingStage = (booking: Booking, stage: string) => {
    // Implementation for updating booking stage
  };

  const cancelBooking = (booking: Booking) => {
    // Implementation for canceling booking
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatCategory = (category: string) => {
    return category.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending_assignment':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'assigned':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <CarWashSpinner size="lg" showText text="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-20">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm">
          <div className="space-y-4">
            {/* Title Section */}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Provider Dashboard</h1>
              <p className="text-sm sm:text-base text-gray-600">Welcome back, {user.username}!</p>
            </div>
            
            {/* Controls Section - Stack on mobile */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              {/* Status Toggle */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">Status:</span>
                <Switch
                  checked={isOnline}
                  onCheckedChange={handleStatusToggle}
                  disabled={updateStatusMutation.isPending}
                />
                <span className={`text-sm font-medium ${isOnline ? 'text-green-600' : 'text-gray-500'}`}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              
              {/* Update Location Button */}
              <Button 
                onClick={() => updateLocationMutation.mutate()}
                disabled={updateLocationMutation.isPending}
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
              >
                <MapPin className="h-4 w-4 mr-2" />
                {updateLocationMutation.isPending ? 'Updating...' : 'Update Location'}
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                    <p className="text-2xl font-bold">
                      {earnings ? formatPrice(earnings.totalEarnings) : '$0.00'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Completed Services</p>
                    <p className="text-2xl font-bold">
                      {earnings?.completedServices || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Star className="h-8 w-8 text-yellow-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Average Rating</p>
                    <p className="text-2xl font-bold">
                      {earnings?.averageRating ? earnings.averageRating.toFixed(1) : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Car className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Jobs</p>
                    <p className="text-2xl font-bold">
                      {activeBookings.filter(b => ['assigned', 'in_progress'].includes(b.status)).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="jobs" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="jobs">Active Jobs</TabsTrigger>
            <TabsTrigger value="available">Available Jobs</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
            <TabsTrigger value="metrics">Performance</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          {/* Active Jobs Tab */}
          <TabsContent value="jobs">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-[#8c52ff]" />
                  Active Bookings
                </CardTitle>
                <CardDescription>
                  Manage your current and upcoming service appointments
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingBookings ? (
                  <div className="flex justify-center py-10">
                    <CarWashSpinner size="md" showText text="Loading bookings..." />
                  </div>
                ) : activeBookings.length === 0 ? (
                  <div className="text-center py-10">
                    <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No active bookings at the moment</p>
                    <p className="text-sm text-gray-400 mt-2">
                      New bookings will appear here when assigned to you
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeBookings.map((booking) => (
                      <div key={booking.id} className="border rounded-lg p-4 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium">Booking #{booking.id}</h3>
                              <Badge className={getStatusBadgeColor(booking.status)}>
                                {booking.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <div className="flex items-center">
                                <MapPin className="h-4 w-4 mr-2" />
                                {booking.serviceLocation}
                              </div>
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-2" />
                                {booking.date} at {booking.time}
                              </div>
                              <div className="flex items-center">
                                <DollarSign className="h-4 w-4 mr-2" />
                                {formatPrice(booking.totalPrice || 0)}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex space-x-2">
                            {booking.status === 'pending_assignment' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => acceptBookingMutation.mutate(booking.id)}
                                  disabled={acceptBookingMutation.isPending}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => rejectBookingMutation.mutate(booking.id)}
                                  disabled={rejectBookingMutation.isPending}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Reject
                                </Button>
                              </>
                            )}
                            
                            {booking.status === 'assigned' && (
                              <Button
                                size="sm"
                                onClick={() => startServiceMutation.mutate(booking.id)}
                                disabled={startServiceMutation.isPending}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <Play className="h-4 w-4 mr-2" />
                                Start Service
                              </Button>
                            )}
                            
                            {booking.status === 'in_progress' && (
                              <Button
                                size="sm"
                                onClick={() => completeServiceMutation.mutate(booking.id)}
                                disabled={completeServiceMutation.isPending}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <StopIcon className="h-4 w-4 mr-2" />
                                Complete
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Available Jobs Tab */}
          <TabsContent value="available">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-[#8c52ff]" />
                  Available Jobs Near You
                </CardTitle>
                <CardDescription>
                  Jobs within 15 miles of your location that you can accept
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingJobs ? (
                  <div className="flex justify-center py-10">
                    <CarWashSpinner size="md" showText text="Finding nearby jobs..." />
                  </div>
                ) : availableJobs.length === 0 ? (
                  <div className="text-center py-10">
                    <Car className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No jobs available</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      There are currently no jobs available within 15 miles of your location.
                    </p>
                    <Button 
                      onClick={() => refetchJobs()}
                      variant="outline"
                      className="mt-4"
                    >
                      Refresh Jobs
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {availableJobs.map((job) => (
                      <div key={job.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                {formatCategory(job.priceTier)}
                              </Badge>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                {job.distance} miles away
                              </Badge>
                            </div>
                            
                            <div className="space-y-1">
                              <h4 className="font-medium text-gray-900">Car Wash Service</h4>
                              <div className="flex items-center text-sm text-gray-600">
                                <MapPin className="h-4 w-4 mr-1" />
                                {job.serviceLocation}
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <Clock className="h-4 w-4 mr-1" />
                                {job.date && job.time ? `${new Date(job.date).toLocaleDateString()} at ${job.time}` : 'Time TBD'}
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <DollarSign className="h-4 w-4 mr-1" />
                                {job.totalPrice ? formatPrice(job.totalPrice) : '$0.00'}
                              </div>
                            </div>
                            
                            {job.notes && (
                              <p className="text-sm text-gray-600">{job.notes}</p>
                            )}
                          </div>
                          
                          <div className="flex flex-col sm:flex-row gap-2 min-w-0 sm:min-w-fit">
                            <Button
                              onClick={() => acceptJobMutation.mutate(job.id)}
                              disabled={acceptJobMutation.isPending || rejectJobMutation.isPending}
                              className="bg-green-600 hover:bg-green-700 text-white"
                              size="sm"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              {acceptJobMutation.isPending ? 'Accepting...' : 'Accept Job'}
                            </Button>
                            <Button
                              onClick={() => rejectJobMutation.mutate(job.id)}
                              disabled={acceptJobMutation.isPending || rejectJobMutation.isPending}
                              variant="outline"
                              size="sm"
                              className="border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              {rejectJobMutation.isPending ? 'Rejecting...' : 'Pass'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Earnings Tab */}
          <TabsContent value="earnings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-[#8c52ff]" />
                  Earnings Overview
                </CardTitle>
                <CardDescription>
                  Track your earnings and service breakdown
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingEarnings ? (
                  <div className="flex justify-center py-10">
                    <CarWashSpinner size="md" showText text="Loading earnings..." />
                  </div>
                ) : !earnings ? (
                  <div className="py-10 text-center text-muted-foreground">
                    No earnings data available yet. Complete some services to see your earnings.
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Service Type Breakdown */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">Service Type Breakdown</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(earnings.serviceTypeBreakdown).map(([type, count]) => (
                          <Card key={type}>
                            <CardContent className="p-4">
                              <div className="text-center">
                                <p className="text-2xl font-bold text-[#8c52ff]">{count}</p>
                                <p className="text-sm text-gray-600">{formatCategory(type)}</p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Metrics Tab */}
          <TabsContent value="metrics">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-[#8c52ff]" />
                  Service Metrics
                </CardTitle>
                <CardDescription>
                  Track your service performance and timing metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingMetrics ? (
                  <div className="flex justify-center py-10">
                    <CarWashSpinner size="md" showText text="Loading service metrics..." />
                  </div>
                ) : !metricsData ? (
                  <div className="py-10 text-center text-muted-foreground">
                    No service metrics available yet. Complete some services to see your metrics.
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Service Duration Metrics */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">Service Duration</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Average Duration by Service Type</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {Object.entries(metricsData.averageDuration).length > 0 ? (
                                Object.entries(metricsData.averageDuration).map(([category, duration]) => (
                                  <div key={category} className="flex justify-between items-center">
                                    <div>
                                      <span className="font-medium">{formatCategory(category)}</span>
                                    </div>
                                    <div className="flex items-center">
                                      <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                                      <span>{formatDuration(duration)}</span>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-muted-foreground text-sm">No service duration data yet</p>
                              )}
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Total Service Time</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-center py-6">
                              <div className="text-3xl font-bold text-[#8c52ff] mb-2">
                                {formatDuration(metricsData.totalServiceTime)}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Total time spent on services
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <ProviderProfileTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}