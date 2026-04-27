import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Clock, Navigation, Car, Phone } from 'lucide-react';
import { Icon } from "@/components/ui/icon";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

interface TrackingMapProps {
  bookingId: number;
  onClose?: () => void;
}

interface TrackingInfo {
  providerLocation: { lat: number; lng: number } | null;
  customerLocation: { lat: number; lng: number } | null;
  eta: string | null;
  distance: number | null;
  lastUpdate: string | null;
}

interface ArrivalStatus {
  arrived: boolean;
  arrivalTime: string | null;
  estimatedCompletionTime: string | null;
  extraTimeMinutes: number;
  adjustmentDetails: Array<{ label: string; minutes: number }>;
  providerNotes?: string;
}

export default function TrackingMap({ bookingId, onClose }: TrackingMapProps) {
  const [wsConnected, setWsConnected] = useState(false);
  const [liveTracking, setLiveTracking] = useState<TrackingInfo | null>(null);
  const [arrivalStatus, setArrivalStatus] = useState<ArrivalStatus>({
    arrived: false,
    arrivalTime: null,
    estimatedCompletionTime: null,
    extraTimeMinutes: 0,
    adjustmentDetails: [],
  });

  // Query for initial tracking data
  const { data: trackingData } = useQuery<TrackingInfo>({
    queryKey: [`/api/tracking/${bookingId}`],
    refetchInterval: 10000,
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      setWsConnected(true);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'location_update' && data.bookingId === bookingId) {
          setLiveTracking({
            providerLocation: { lat: data.latitude, lng: data.longitude },
            customerLocation: trackingData?.customerLocation || null,
            eta: data.eta,
            distance: data.distance,
            lastUpdate: new Date().toISOString(),
          });
        }

        if (data.type === 'provider_arrived' && data.bookingId === bookingId) {
          setArrivalStatus({
            arrived: true,
            arrivalTime: data.arrivalTime,
            estimatedCompletionTime: data.estimatedCompletionTime,
            extraTimeMinutes: 0,
            adjustmentDetails: [],
          });
        }

        if (data.type === 'eta_update' && data.bookingId === bookingId) {
          setArrivalStatus((prev) => ({
            ...prev,
            estimatedCompletionTime: data.estimatedCompletionTime,
            extraTimeMinutes: data.extraTimeMinutes || 0,
            adjustmentDetails: data.adjustments?.filter((a: any) => a.selected) || [],
            providerNotes: data.providerNotes,
          }));
        }
      } catch (error) {
        console.error('GPS tracking WebSocket message error:', error);
      }
    };

    socket.onclose = () => {
      setWsConnected(false);
    };

    return () => socket.close();
  }, [bookingId, trackingData]);

  const currentTracking = liveTracking || trackingData;

  const formatCompletionTime = (isoString: string | null) => {
    if (!isoString) return null;
    return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatETA = (eta: string | null) => {
    if (!eta) return 'Calculating...';
    
    const etaDate = new Date(eta);
    const now = new Date();
    const diffMinutes = Math.round((etaDate.getTime() - now.getTime()) / (1000 * 60));
    
    if (diffMinutes <= 0) return 'Arriving now';
    if (diffMinutes <= 60) return `${diffMinutes} min`;
    
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  const formatDistance = (distance: number | null) => {
    if (!distance) return 'Calculating...';
    return distance < 1 ? `${(distance * 5280).toFixed(0)} ft` : `${distance.toFixed(1)} mi`;
  };

  const formatLastUpdate = (lastUpdate: string | null) => {
    if (!lastUpdate) return 'No updates yet';
    
    const updateTime = new Date(lastUpdate);
    const now = new Date();
    const diffMinutes = Math.round((now.getTime() - updateTime.getTime()) / (1000 * 60));
    
    if (diffMinutes === 0) return 'Just now';
    if (diffMinutes === 1) return '1 minute ago';
    return `${diffMinutes} minutes ago`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Track Your Service</h1>
          {onClose && (
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          )}
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
          <span className="text-sm text-gray-600">
            {wsConnected ? 'Live tracking active' : 'Connecting...'}
          </span>
        </div>

        {/* Map Placeholder */}
        <Card>
          <CardContent className="p-0">
            <div className="h-64 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center relative overflow-hidden">
              {/* Animated Background */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-blue-300/20 to-purple-300/20"
                animate={{
                  backgroundPosition: ['0% 0%', '100% 100%'],
                }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  repeatType: 'reverse',
                }}
              />
              
              {/* Provider Location Indicator */}
              {currentTracking?.providerLocation && (
                <motion.div
                  className="absolute top-1/3 left-1/2 transform -translate-x-1/2"
                  animate={{
                    y: [0, -10, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                >
                  <div className="flex flex-col items-center">
                    <div className="bg-blue-500 text-white p-2 rounded-full shadow-lg">
                      <Icon icon={Car} size="md" />
                    </div>
                    <div className="text-xs font-medium text-gray-700 mt-1">Provider</div>
                  </div>
                </motion.div>
              )}

              {/* Customer Location Indicator */}
              {currentTracking?.customerLocation && (
                <div className="absolute bottom-1/3 right-1/3 transform translate-x-1/2">
                  <div className="flex flex-col items-center">
                    <div className="bg-green-500 text-white p-2 rounded-full shadow-lg">
                      <Icon icon={MapPin} size="md" />
                    </div>
                    <div className="text-xs font-medium text-gray-700 mt-1">You</div>
                  </div>
                </div>
              )}

              {/* Route Line */}
              {currentTracking?.providerLocation && currentTracking?.customerLocation && (
                <svg className="absolute inset-0 w-full h-full">
                  <motion.path
                    d="M 50% 33% Q 60% 50% 66% 66%"
                    stroke="#6366f1"
                    strokeWidth="3"
                    strokeDasharray="10,5"
                    fill="none"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </svg>
              )}

              {/* No Data State */}
              {!currentTracking?.providerLocation && (
                <div className="text-center text-gray-500">
                  <Icon icon={Navigation} size="xl" className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Waiting for provider location...</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Arrival banner */}
        {arrivalStatus.arrived && (
          <div className="bg-gray-950 text-white rounded-xl px-5 py-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#8c52ff] animate-pulse" />
              <span className="text-sm font-semibold text-[#8c52ff] uppercase tracking-widest">Provider Arrived</span>
            </div>
            {arrivalStatus.estimatedCompletionTime && (
              <div>
                <p className="text-xs text-gray-400">Estimated completion</p>
                <p className="text-3xl font-bold">{formatCompletionTime(arrivalStatus.estimatedCompletionTime)}</p>
              </div>
            )}
            {arrivalStatus.adjustmentDetails.length > 0 && (
              <div className="border-t border-gray-800 pt-3 space-y-1">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Time adjustments</p>
                {arrivalStatus.adjustmentDetails.map((adj, i) => (
                  <div key={i} className="flex justify-between text-sm text-gray-300">
                    <span>{adj.label}</span>
                    <span>+{adj.minutes}m</span>
                  </div>
                ))}
              </div>
            )}
            {arrivalStatus.providerNotes && (
              <p className="text-xs text-gray-400 border-t border-gray-800 pt-2">{arrivalStatus.providerNotes}</p>
            )}
          </div>
        )}

        {/* Status Cards */}
        {!arrivalStatus.arrived && (
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Icon icon={Clock} size="sm" />
                  Estimated Arrival
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatETA(currentTracking?.eta || null)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Icon icon={Navigation} size="sm" />
                  Distance Away
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatDistance(currentTracking?.distance || null)}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Service Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Service Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Current Status:</span>
              <Badge variant="secondary" className={arrivalStatus.arrived ? "bg-[#8c52ff]/10 text-[#8c52ff]" : "bg-blue-100 text-blue-800"}>
                {arrivalStatus.arrived ? "Provider On-Site" : "Provider En Route"}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Last Update:</span>
              <span className="text-sm font-medium">
                {formatLastUpdate(currentTracking?.lastUpdate || null)}
              </span>
            </div>

            <Button className="w-full" variant="outline">
              <Icon icon={Phone} size="sm" className="mr-2" />
              Contact Provider
            </Button>
          </CardContent>
        </Card>

        {/* Progress Indicators */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Service Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
                <span className="text-sm">Booking confirmed</span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${arrivalStatus.arrived ? "bg-green-500" : "bg-blue-500"}`}>
                  {arrivalStatus.arrived ? (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  ) : (
                    <motion.div
                      className="w-2 h-2 rounded-full bg-white"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  )}
                </div>
                <span className="text-sm font-medium">{arrivalStatus.arrived ? "Provider arrived" : "Provider on the way"}</span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${arrivalStatus.arrived ? "bg-[#8c52ff]" : "bg-gray-300"}`}>
                  {arrivalStatus.arrived && (
                    <motion.div
                      className="w-full h-full rounded-full bg-[#8c52ff]"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}
                </div>
                <span className={`text-sm ${arrivalStatus.arrived ? "font-medium" : "text-gray-500"}`}>Service in progress</span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-gray-300" />
                <span className="text-sm text-gray-500">Service completed</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}