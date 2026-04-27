import React from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Icon } from "@/components/ui/icon";
import { Button } from '@/components/ui/button';
import TrackingMap from '@/components/tracking-map';
import { Booking } from '@shared/schema';

export default function TrackingPage() {
  const [, setLocation] = useLocation();

  // Optional ?booking=ID query param picks a specific booking to track
  const requestedBookingId = (() => {
    try {
      const id = new URLSearchParams(window.location.search).get('booking');
      return id ? Number(id) : null;
    } catch { return null; }
  })();

  // Get active bookings that can be tracked
  const { data: activeBookings, isLoading } = useQuery<Booking[]>({
    queryKey: ['/api/tracking/active'],
  });

  const { data: requestedBooking } = useQuery<Booking>({
    queryKey: ['/api/bookings', requestedBookingId],
    enabled: !!requestedBookingId,
  });

  const handleBack = () => {
    setLocation('/');
  };

  const handleComplete = (bookingId: number) => {
    setLocation(`/review/${bookingId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tracking information...</p>
        </div>
      </div>
    );
  }

  // Prefer the explicitly requested booking (deep link from payment success)
  if (requestedBookingId) {
    return <TrackingMap bookingId={requestedBookingId} onClose={handleBack} onComplete={handleComplete} />;
  }

  // Otherwise fall back to the first active trackable booking
  if (activeBookings && activeBookings.length > 0) {
    const bookingToTrack = activeBookings[0];
    return <TrackingMap bookingId={bookingToTrack.id} onClose={handleBack} onComplete={handleComplete} />;
  }

  // No active trackable bookings
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Icon icon={ArrowLeft} size="lg" className="text-gray-700" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Track Service</h1>
          <div className="w-10" />
        </div>

        {/* No Active Tracking Message */}
        <div className="text-center py-12">
          <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Active Services to Track
          </h3>
          
          <p className="text-gray-600 mb-6">
            Once you book a service and it's confirmed, you'll be able to track your provider's location and estimated arrival time here.
          </p>

          <Button 
            onClick={() => setLocation('/')}
            className="bg-[#8c52ff] hover:bg-[#7c47eb]"
          >
            Book a Service
          </Button>
        </div>
      </div>
    </div>
  );
}