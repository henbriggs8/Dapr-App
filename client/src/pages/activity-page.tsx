import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Booking, Service, TimeSlot } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Bell, Gift, MessageSquare, ChevronRight } from "lucide-react";
import { formatDistance } from "date-fns";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useLocation } from "wouter";

export default function ActivityPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("bookings");
  
  // Query bookings
  const { data: bookings, isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
    enabled: !!user,
  });
  
  // Query services (to get service details for bookings)
  const { data: services, isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });
  
  // Query time slots (to get time details for bookings)
  const { data: timeSlots, isLoading: timeSlotsLoading } = useQuery<TimeSlot[]>({
    queryKey: ["/api/timeslots"],
  });
  
  const isLoading = bookingsLoading || servicesLoading || timeSlotsLoading;
  
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Mock notifications for demo purposes
  const notifications = [
    {
      id: 1,
      title: "Booking Reminder",
      message: "Your car wash appointment is tomorrow at 2:00 PM",
      time: "2 hours ago",
      read: false,
      type: "reminder"
    },
    {
      id: 2,
      title: "Service Update",
      message: "Your car wash service has been completed! Rate your experience.",
      time: "1 day ago",
      read: true,
      type: "update"
    },
    {
      id: 3,
      title: "Special Offer",
      message: "Get 15% off your next premium detail this week only!",
      time: "3 days ago",
      read: true,
      type: "promotion"
    }
  ];
  
  // Mock loyalty data
  const loyaltyPoints = 750;
  const nextRewardAt = 1000;
  const loyaltyTier = "Silver";
  
  return (
    <div className="w-full min-h-screen px-4 sm:px-6 lg:px-8 py-4 pb-20 sm:pb-24" style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))' }}>
      <h1 className="text-3xl font-bold mb-2">Activity</h1>
      <p className="text-muted-foreground mb-6">Track your bookings and rewards</p>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 w-full mb-6">
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
        </TabsList>
        
        <TabsContent value="bookings" className="mt-0">
          {isLoading ? (
            <div className="text-center py-8">Loading your bookings...</div>
          ) : bookings && bookings.length > 0 ? (
            <div className="space-y-4">
              {bookings.map((booking) => {
                const service = services?.find(s => s.id === booking.serviceId);
                const timeSlot = timeSlots?.find(t => t.id === booking.timeSlotId);
                
                return (
                  <Card 
                    key={booking.id} 
                    className="cursor-pointer border hover:border-[#8c52ff] transition-all"
                    onClick={() => setLocation(`/booking?id=${booking.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`mt-1 rounded-full w-3 h-3 ${
                            booking.status === 'completed' ? 'bg-green-500' : 
                            booking.status === 'in_progress' ? 'bg-blue-500' : 
                            booking.status === 'cancelled' ? 'bg-red-500' : 
                            'bg-amber-500'
                          }`} />
                          <div>
                            <h3 className="font-medium">{service?.name}</h3>
                            <p className="text-sm text-muted-foreground flex items-center mt-1">
                              <Calendar className="h-3 w-3 inline mr-1" />
                              {timeSlot ? formatDate(timeSlot.date) : 'Loading...'}
                              {timeSlot && (
                                <>
                                  <span className="mx-1">•</span>
                                  <Clock className="h-3 w-3 inline mx-1" />
                                  {timeSlot.startTime}
                                </>
                              )}
                            </p>
                            {booking.status === 'in_progress' && (
                              <div className="mt-2">
                                <div className="flex justify-between text-xs mb-1">
                                  <span>Service in progress</span>
                                  <span>75%</span>
                                </div>
                                <Progress value={75} className="h-2" />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Badge 
                            variant={
                              booking.status === 'completed' ? 'default' : 
                              booking.status === 'in_progress' ? 'secondary' : 
                              booking.status === 'cancelled' ? 'destructive' : 
                              'outline'
                            }
                            className={booking.status === 'completed' ? 'bg-green-500 hover:bg-green-600' : ''}
                          >
                            {booking.status.replace('_', ' ')}
                          </Badge>
                          <ChevronRight className="h-5 w-5 text-muted-foreground ml-2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border-dashed border-2">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground mb-4">You don't have any bookings yet</p>
                <Button onClick={() => setLocation("/")}>Book a Service</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="messages" className="mt-0">
          <div className="space-y-4">
            {notifications.map((notification) => (
              <Card key={notification.id} className={`border ${!notification.read ? 'bg-muted/30 border-[#8c52ff]/30' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`rounded-full p-2 ${
                      notification.type === 'reminder' ? 'bg-blue-100 text-blue-500' :
                      notification.type === 'update' ? 'bg-green-100 text-green-500' :
                      'bg-amber-100 text-amber-500'
                    }`}>
                      {notification.type === 'reminder' ? (
                        <Bell className="h-5 w-5" />
                      ) : notification.type === 'update' ? (
                        <MessageSquare className="h-5 w-5" />
                      ) : (
                        <Gift className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className="font-medium">{notification.title}</h3>
                        <span className="text-xs text-muted-foreground">{notification.time}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="loyalty" className="mt-0">
          <Card className="mb-6 bg-gradient-to-r from-[#8c52ff] to-[#5e17eb] text-white">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Dapper Rewards</span>
                <span className="text-3xl">{loyaltyPoints}</span>
              </CardTitle>
              <CardDescription className="text-white/80">
                {loyaltyTier} Member
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-sm flex justify-between">
                  <span>Next reward at {nextRewardAt} points</span>
                  <span>{Math.round((loyaltyPoints / nextRewardAt) * 100)}%</span>
                </div>
                <Progress value={(loyaltyPoints / nextRewardAt) * 100} className="h-2 bg-white/20" />
              </div>
            </CardContent>
          </Card>
          
          <h3 className="font-semibold text-lg mb-4">Your Benefits</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Avatar className="h-10 w-10 border border-[#8c52ff]">
                <AvatarFallback className="bg-[#8c52ff]/20 text-[#8c52ff]">🎁</AvatarFallback>
              </Avatar>
              <div>
                <h4 className="font-medium">Free Birthday Detail</h4>
                <p className="text-sm text-muted-foreground">
                  One free Basic wash during your birthday month
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Avatar className="h-10 w-10 border border-[#8c52ff]">
                <AvatarFallback className="bg-[#8c52ff]/20 text-[#8c52ff]">💰</AvatarFallback>
              </Avatar>
              <div>
                <h4 className="font-medium">10% Off Every 5th Wash</h4>
                <p className="text-sm text-muted-foreground">
                  Automatic discount applied to qualifying bookings
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Avatar className="h-10 w-10 border border-[#8c52ff]">
                <AvatarFallback className="bg-[#8c52ff]/20 text-[#8c52ff]">⚡</AvatarFallback>
              </Avatar>
              <div>
                <h4 className="font-medium">Priority Booking</h4>
                <p className="text-sm text-muted-foreground">
                  Access to premium time slots before they're released
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}