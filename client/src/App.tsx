import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthenticateWithRedirectCallback } from "@clerk/clerk-react";
import NotFound from "@/pages/not-found";
import ProviderAuthPage from "@/pages/provider-auth-page";
import IdVerificationPage from "@/pages/provider-onboarding/id-verification";
import VehicleSetupPage from "@/pages/provider-onboarding/vehicle-setup";
import BankInfoPage from "@/pages/provider-onboarding/bank-info";
import ClerkAuthPage from "@/pages/clerk-auth-page";
import VerifyScreen from "@/pages/verify-screen";
import HomeScreen from "@/pages/home-screen";
import OnboardingNameScreen from "@/pages/onboarding-name-screen";
import AddressScreen from "@/pages/address-screen";
import CarProfileScreen from "@/pages/car-profile-screen";
import FirstWashOffer from "@/pages/first-wash-offer";
import BookingScreen from "@/pages/booking-screen";
import ProfilePage from "@/pages/profile-page";
import ServicesPage from "@/pages/services-page";
import ActivityPage from "@/pages/activity-page";
import BookingDetails from "@/pages/booking-details";
import BookingConfirmation from "@/pages/booking-confirmation";
import ServiceProgress from "@/pages/service-progress";
import PaymentSuccessPage from "@/pages/payment-success";
import AdminDashboard from "@/pages/admin-dashboard";
import ProviderDashboard from "@/pages/provider-dashboard";
import TrackingPage from "@/pages/tracking-page";
import HowItWorks from "@/pages/how-it-works";
import InteriorCleaning from "@/pages/interior-cleaning";
import ExteriorCleaning from "@/pages/exterior-cleaning";
import CarSeatCleaning from "@/pages/car-seat-cleaning";
import FAQ from "@/pages/faq";
import Corporate from "@/pages/corporate";

import { ReactNode, useEffect, useRef, useState } from "react";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { WebSocketProvider } from "./hooks/use-websocket";
import { ProtectedRoute } from "./lib/protected-route";
import { Loader } from "@/components/ui/loader";
import { HomeWithOnboarding } from "@/components/home-with-onboarding";
import TabNavigation from "@/components/tab-navigation";
import { AuthGate } from "./components/auth-gate";

function AdminRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader size="lg" />
        </div>
      </Route>
    );
  }

  if (!user?.isAdmin) {
    return (
      <Route path={path}>
        <Redirect to="/" />
      </Route>
    );
  }

  return (
    <Route path={path}>
      <Component />
    </Route>
  );
}

function ProviderRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader size="lg" />
        </div>
      </Route>
    );
  }

  if (!user?.isProvider) {
    return (
      <Route path={path}>
        <Redirect to="/" />
      </Route>
    );
  }

  return (
    <Route path={path}>
      <Component />
    </Route>
  );
}

function Router() {
  const { user } = useAuth();
  const [location] = useLocation();

  return (
    <>
      <Switch>
        {/* Public routes first */}
        <Route path="/sso-callback" component={() => (
          <AuthenticateWithRedirectCallback
            afterSignUpUrl="/onboarding/name"
            afterSignInUrl="/"
          />
        )} />
        <Route path="/auth" component={ClerkAuthPage} />
        <Route path="/auth/:rest*" component={ClerkAuthPage} />
        <Route path="/provider-auth" component={ProviderAuthPage} />
        <Route path="/verify" component={VerifyScreen} />
        <Route path="/onboarding/name" component={OnboardingNameScreen} />
        <Route path="/onboarding/address" component={AddressScreen} />
        <Route path="/onboarding/car-profile" component={CarProfileScreen} />
        <Route path="/onboarding/first-wash-offer" component={FirstWashOffer} />
        <Route path="/how-it-works" component={HowItWorks} />
        <Route path="/interior-cleaning" component={InteriorCleaning} />
        <Route path="/exterior-cleaning" component={ExteriorCleaning} />
        <Route path="/car-seat-cleaning" component={CarSeatCleaning} />
        <Route path="/faq" component={FAQ} />
        <Route path="/corporate" component={Corporate} />
        
        {/* Provider onboarding routes */}
        <Route path="/provider-onboarding/id-verification" component={IdVerificationPage} />
        <Route path="/provider-onboarding/vehicle-setup" component={VehicleSetupPage} />
        <Route path="/provider-onboarding/bank-info" component={BankInfoPage} />
        
        {/* Protected routes */}
        <ProtectedRoute path="/booking" component={BookingScreen} />
        <ProtectedRoute path="/services" component={ServicesPage} />
        <ProtectedRoute path="/activity" component={ActivityPage} />
        <ProtectedRoute path="/profile" component={ProfilePage} />
        <ProtectedRoute path="/booking-details/:id" component={BookingDetails} />
        <ProtectedRoute path="/booking-confirmation" component={BookingConfirmation} />
        <ProtectedRoute path="/service-progress" component={ServiceProgress} />
        <ProtectedRoute path="/tracking" component={TrackingPage} />
        <ProtectedRoute path="/payment-success" component={PaymentSuccessPage} />
        
        {/* Admin route */}
        <AdminRoute path="/admin" component={AdminDashboard} />
        
        {/* Home route - must come after all specific routes */}
        {user?.isProvider ? (
          <ProviderRoute path="/" component={ProviderDashboard} />
        ) : (
          <ProtectedRoute path="/" component={HomeWithOnboarding} />
        )}
        
        {/* Catch-all route for 404 */}
        <Route component={NotFound} />
      </Switch>
      
      {/* Show tab navigation for regular users only, not during onboarding */}
      {user && !user.isAdmin && !user.isProvider && !location.startsWith('/onboarding') && <TabNavigation />}
    </>
  );
}

function ClerkSyncWrapper({ children }: { children: ReactNode }) {
  const CLERK_AVAILABLE = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  if (!CLERK_AVAILABLE) {
    return <>{children}</>;
  }

  return <ClerkSyncInner>{children}</ClerkSyncInner>;
}

function ClerkSyncInner({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded: isAuthLoaded, getToken } = useClerkAuth();
  const { user: localUser, isLoading: isLocalLoading } = useAuth();
  const syncingRef = useRef(false);
  const [syncComplete, setSyncComplete] = useState(false);

  useEffect(() => {
    async function doSync() {
      if (syncingRef.current) return;
      if (!isAuthLoaded) return;
      if (!isSignedIn) {
        setSyncComplete(true);
        return;
      }
      if (localUser) {
        setSyncComplete(true);
        return;
      }
      if (isLocalLoading) return;

      syncingRef.current = true;
      try {
        const token = await getToken();
        if (!token) {
          setSyncComplete(true);
          return;
        }

        const res = await fetch('/api/auth/clerk-sync', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        if (res.ok) {
          const userData = await res.json();
          queryClient.setQueryData(['/api/user'], userData);
        }
      } catch (error) {
        console.error('Clerk sync error:', error);
      } finally {
        syncingRef.current = false;
        setSyncComplete(true);
      }
    }

    doSync();
  }, [isAuthLoaded, isSignedIn, localUser, isLocalLoading, getToken]);

  if (!syncComplete && isSignedIn && !localUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader size="lg" />
      </div>
    );
  }

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ClerkSyncWrapper>
          <WebSocketProvider>
            <Router />
            <Toaster />
          </WebSocketProvider>
        </ClerkSyncWrapper>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;