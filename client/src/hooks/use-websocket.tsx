import { useEffect, useRef, useState, useCallback, ReactNode, createContext, useContext } from "react";
import { useAuth } from "./use-auth";
import { useToast } from "./use-toast";
import { queryClient } from "@/lib/queryClient";

type WebSocketStatus = "connecting" | "connected" | "disconnected";

type CompletionSubscriber = (bookingId: number) => void;

type WebSocketContextType = {
  status: WebSocketStatus;
  sendMessage: (message: object) => void;
  subscribeToBookingCompletion: (fn: CompletionSubscriber) => () => void;
};

export const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const socketRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<WebSocketStatus>("disconnected");
  const { toast } = useToast();
  const completionSubscribersRef = useRef<Set<CompletionSubscriber>>(new Set());

  const subscribeToBookingCompletion = useCallback((fn: CompletionSubscriber) => {
    completionSubscribersRef.current.add(fn);
    return () => { completionSubscribersRef.current.delete(fn); };
  }, []);
  
  const connect = useCallback(() => {
    if (!user) {
      setStatus("disconnected");
      return;
    }
    
    try {
      setStatus("connecting");
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      socketRef.current = new WebSocket(wsUrl);
      
      socketRef.current.onopen = () => {
        setStatus("connected");
        console.log("WebSocket connection established");
        
        // Register with the server using the user's ID
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({
            type: "auth",
            userId: user.id
          }));
        }
      };
      
      socketRef.current.onclose = () => {
        setStatus("disconnected");
        console.log("WebSocket connection closed");
        
        // Try to reconnect after delay
        setTimeout(() => {
          if (user) {
            connect();
          }
        }, 5000);
      };
      
      socketRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        setStatus("disconnected");
      };
      
      socketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          console.log("WebSocket message received:", data);
          
          if (data.type === "auth_confirmed") {
            console.log("WebSocket auth confirmed for user:", data.userId);
          } else if (data.type === "job_accepted") {
            // A provider accepted a job — refresh customer bookings and provider active list
            queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
            // Also invalidate the specific booking query so the matching screen transitions instantly
            if (data.bookingId) {
              queryClient.invalidateQueries({ queryKey: [`/api/bookings/${data.bookingId}`] });
            }
            queryClient.invalidateQueries({ queryKey: ["/api/provider/active-bookings"] });
            queryClient.invalidateQueries({ queryKey: ["/api/provider/available-jobs"] });
          } else if (data.type === "new_job_available") {
            // A new booking was created — refresh provider available jobs and alert them
            queryClient.invalidateQueries({ queryKey: ["/api/provider/available-jobs"] });
            if (user?.isProvider) {
              toast({
                title: "New job near you!",
                description: "A customer just booked in your area. Check the Available tab.",
                duration: 8000,
              });
            }
          } else if (data.type === "booking_update") {
            // Invalidate booking queries to refresh data
            queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
            queryClient.invalidateQueries({ queryKey: ["/api/tracking/active"] });
            // Invalidate the specific booking query used by the tracking page
            if (data.booking?.id) {
              queryClient.invalidateQueries({ queryKey: [`/api/bookings/${data.booking.id}`] });
            }
            
            if (data.booking) {
              const { status, stage, id } = data.booking;
              const isCompleted = status === 'completed';
              
              // Notify all completion subscribers (tracking page, service-progress page, etc.)
              if (isCompleted && typeof id === 'number') {
                completionSubscribersRef.current.forEach(fn => fn(id));
              }

              // Format the stage message if available
              const stageLabels: Record<string, string> = {
                'on_the_way': 'Detail Pro On The Way',
                'arrival': 'Arrival at Location',
                'exterior_washing': 'Exterior Washing',
                'interior_cleaning': 'Interior Cleaning',
                'finishing': 'Finishing Touches',
                'completed': 'Service Completed'
              };
              
              let message = isCompleted
                ? 'Your vehicle is ready! Tap to rate your experience.'
                : `Your booking status is now: ${status.replace('_', ' ')}`;
              if (!isCompleted && stage && stageLabels[stage]) {
                message = `${message} - ${stageLabels[stage]}`;
              }
              
              toast({
                title: isCompleted ? "Service Complete!" : "Booking Update",
                description: message,
                duration: isCompleted ? 10000 : 5000,
                action: isCompleted ? (
                  <button
                    onClick={() => window.location.href = `/review/${id}`}
                    className="bg-primary text-white px-3 py-1 rounded-md text-xs"
                  >
                    Rate
                  </button>
                ) : (
                  <button
                    onClick={() => window.location.href = `/booking-details/${id}`}
                    className="bg-primary text-white px-3 py-1 rounded-md text-xs"
                  >
                    View
                  </button>
                )
              });
            }
          }
        } catch (error) {
          console.error("Error processing WebSocket message:", error);
        }
      };
    } catch (error) {
      console.error("Error connecting to WebSocket:", error);
      setStatus("disconnected");
    }
  }, [user, toast]);
  
  const sendMessage = useCallback((message: object) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.warn("Cannot send message, WebSocket is not connected");
    }
  }, []);
  
  // Connect and disconnect on mount/unmount or when user changes
  useEffect(() => {
    if (user) {
      connect();
    } else if (socketRef.current) {
      socketRef.current.close();
      setStatus("disconnected");
    }
    
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [user, connect]);
  
  return (
    <WebSocketContext.Provider value={{ status, sendMessage, subscribeToBookingCompletion }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
}
