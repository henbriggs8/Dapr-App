import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Clock, Navigation, Car, Phone, CheckCircle, Loader2, Radio } from 'lucide-react';
import { Icon } from "@/components/ui/icon";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [lastPing, setLastPing] = useState<Date | null>(null);

  const { data: trackingData } = useQuery<TrackingInfo>({
    queryKey: [`/api/tracking/${bookingId}`],
    refetchInterval: 10000,
  });

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => setWsConnected(true);

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
          setLastPing(new Date());
        }

        if (data.type === 'provider_arrived' && data.bookingId === bookingId) {
          setArrivalStatus({
            arrived: true,
            arrivalTime: data.arrivalTime,
            estimatedCompletionTime: data.estimatedCompletionTime,
            extraTimeMinutes: 0,
            adjustmentDetails: [],
          });
          setLastPing(new Date());
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
        console.error('Tracking WS error:', error);
      }
    };

    socket.onclose = () => setWsConnected(false);
    return () => socket.close();
  }, [bookingId, trackingData]);

  const current = liveTracking || trackingData;
  const hasLiveLocation = !!current?.providerLocation;

  const formatETA = (eta: string | null) => {
    if (!eta) return null;
    const diff = Math.round((new Date(eta).getTime() - Date.now()) / 60000);
    if (diff <= 0) return 'Arriving now';
    if (diff < 60) return `${diff} min`;
    return `${Math.floor(diff / 60)}h ${diff % 60}m`;
  };

  const formatDistance = (d: number | null) => {
    if (!d) return null;
    return d < 1 ? `${(d * 5280).toFixed(0)} ft` : `${d.toFixed(1)} mi`;
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return null;
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const timeSincePing = lastPing
    ? Math.round((Date.now() - lastPing.getTime()) / 1000)
    : null;

  const steps = [
    { label: 'Booking confirmed', done: true },
    { label: arrivalStatus.arrived ? 'Provider arrived' : 'Provider en route', done: arrivalStatus.arrived, active: !arrivalStatus.arrived },
    { label: 'Service in progress', done: false, active: arrivalStatus.arrived },
    { label: 'Service completed', done: false },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-[17px] font-semibold text-black">Live Tracking</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
            <span className="text-[11px] text-gray-400">
              {wsConnected ? 'Connected' : 'Reconnecting...'}
            </span>
            {timeSincePing !== null && (
              <span className="text-[11px] text-gray-400">· updated {timeSincePing}s ago</span>
            )}
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-sm text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            Close
          </button>
        )}
      </div>

      <div className="max-w-md mx-auto px-4 py-5 space-y-4">

        {/* Status banner */}
        <AnimatePresence mode="wait">
          {arrivalStatus.arrived ? (
            <motion.div
              key="arrived"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-950 text-white rounded-2xl px-5 py-4 space-y-3"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#8c52ff] animate-pulse" />
                <span className="text-xs font-semibold text-[#8c52ff] uppercase tracking-widest">Provider On-Site</span>
              </div>
              {arrivalStatus.estimatedCompletionTime && (
                <div>
                  <p className="text-xs text-gray-400">Estimated finish</p>
                  <p className="text-3xl font-bold">{formatTime(arrivalStatus.estimatedCompletionTime)}</p>
                </div>
              )}
              {arrivalStatus.adjustmentDetails.length > 0 && (
                <div className="border-t border-gray-800 pt-3 space-y-1">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Time adjustments</p>
                  {arrivalStatus.adjustmentDetails.map((adj, i) => (
                    <div key={i} className="flex justify-between text-sm text-gray-300">
                      <span>{adj.label}</span>
                      <span>+{adj.minutes}m</span>
                    </div>
                  ))}
                </div>
              )}
              {arrivalStatus.providerNotes && (
                <p className="text-xs text-gray-400 border-t border-gray-800 pt-2 italic">"{arrivalStatus.providerNotes}"</p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="enroute"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#8c52ff] text-white rounded-2xl px-5 py-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest opacity-80 mb-1">Your Pro is on the way</p>
                  {formatETA(current?.eta || null) ? (
                    <p className="text-4xl font-bold">{formatETA(current?.eta || null)}</p>
                  ) : (
                    <p className="text-lg font-medium opacity-70">Calculating ETA…</p>
                  )}
                  {formatDistance(current?.distance || null) && (
                    <p className="text-sm opacity-70 mt-1">{formatDistance(current?.distance || null)} away</p>
                  )}
                </div>
                <motion.div
                  animate={{ x: [0, 6, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Icon icon={Car} size="xl" className="opacity-80" />
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Location status card */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Provider Location</span>
            {hasLiveLocation ? (
              <Badge className="bg-green-50 text-green-700 border-green-100 text-[10px] font-semibold">
                <Icon icon={Radio} size="xs" className="mr-1 animate-pulse" />
                Live
              </Badge>
            ) : (
              <Badge className="bg-gray-50 text-gray-400 border-gray-100 text-[10px]">Pending</Badge>
            )}
          </div>

          {hasLiveLocation ? (
            <div className="px-4 py-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#f3eeff] flex items-center justify-center flex-shrink-0">
                  <Icon icon={MapPin} size="sm" className="text-[#8c52ff]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-black">Location received</p>
                  <p className="text-xs text-gray-400">
                    {current?.providerLocation?.lat.toFixed(4)}°, {current?.providerLocation?.lng.toFixed(4)}°
                    {lastPing && <span className="ml-2">· {Math.round((Date.now() - lastPing.getTime()) / 1000)}s ago</span>}
                  </p>
                </div>
              </div>
              {(formatETA(current?.eta || null) || formatDistance(current?.distance || null)) && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {formatETA(current?.eta || null) && (
                    <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">ETA</p>
                      <p className="text-base font-bold text-black">{formatETA(current?.eta || null)}</p>
                    </div>
                  )}
                  {formatDistance(current?.distance || null) && (
                    <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Distance</p>
                      <p className="text-base font-bold text-black">{formatDistance(current?.distance || null)}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="px-4 py-6 flex items-center gap-3">
              <Icon icon={Loader2} size="md" className="text-gray-300 animate-spin flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-500">Waiting for provider GPS signal</p>
                <p className="text-xs text-gray-400 mt-0.5">Updates every 20 seconds once en route</p>
              </div>
            </div>
          )}
        </div>

        {/* Progress steps */}
        <div className="bg-white rounded-2xl border border-gray-100 px-4 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Service Progress</p>
          <div className="space-y-0">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    step.done ? 'bg-[#8c52ff]' :
                    step.active ? 'bg-[#8c52ff]' :
                    'bg-gray-100'
                  }`}>
                    {step.done ? (
                      <Icon icon={CheckCircle} size="xs" className="text-white" />
                    ) : step.active ? (
                      <motion.div
                        className="w-2 h-2 rounded-full bg-white"
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-gray-300" />
                    )}
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`w-0.5 h-6 mt-1 mb-1 ${step.done ? 'bg-[#8c52ff]' : 'bg-gray-100'}`} />
                  )}
                </div>
                <p className={`text-sm pt-0.5 ${step.done || step.active ? 'font-medium text-black' : 'text-gray-400'}`}>
                  {step.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <Button variant="outline" className="w-full rounded-xl h-11 text-sm font-medium">
          <Icon icon={Phone} size="sm" className="mr-2 text-gray-500" />
          Contact Provider
        </Button>
      </div>
    </div>
  );
}
