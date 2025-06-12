import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import AuthScreen from "@/pages/auth-screen";
import VerifyScreen from "@/pages/verify-screen";
import HomeScreen from "@/pages/home-screen";
import BookingScreen from "@/pages/booking-screen";
import ProfilePage from "@/pages/profile-page";
import ServicesPage from "@/pages/services-page";
import ActivityPage from "@/pages/activity-page";
import BookingDetails from "@/pages/booking-details";
import PaymentSuccessPage from "@/pages/payment-success";
import AdminDashboard from "@/pages/admin-dashboard";
import ProviderDashboard from "@/pages/provider-dashboard";
import HowItWorks from "@/pages/how-it-works";
import InteriorCleaning from "@/pages/interior-cleaning";
import ExteriorCleaning from "@/pages/exterior-cleaning";
import CarSeatCleaning from "@/pages/car-seat-cleaning";
import FAQ from "@/pages/faq";
import Corporate from "@/pages/corporate";

import { AuthProvider, useAuth } from "./hooks/use-auth";
import { WebSocketProvider } from "./hooks/use-websocket";
import { ProtectedRoute } from "./lib/protected-route";
import { Loader } from "@/components/ui/loader";
import { OnboardingJourney } from "@/components/onboarding-journey";
import TabNavigation from "@/components/tab-navigation";
import { useState, useEffect } from "react";

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

  return <Component />;
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

  return <Component />;
}

function Router() {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Show onboarding for regular (non-admin, non-provider) users after login
  useEffect(() => {
    if (user && !user.isAdmin && !user.isProvider) {
      // Check if onboarding has been completed before
      const hasCompletedOnboarding = localStorage.getItem('dapper_onboarding_completed');
      
      if (!hasCompletedOnboarding) {
        // Show onboarding after a short delay to ensure smooth transition
        const timer = setTimeout(() => {
          setShowOnboarding(true);
        }, 1000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [user]);
  
  const handleOnboardingComplete = () => {
    // Mark onboarding as completed in localStorage
    localStorage.setItem('dapper_onboarding_completed', 'true');
    setShowOnboarding(false);
  };

  return (
    <>
      <Switch>
        {user?.isProvider ? (
          <ProviderRoute path="/" component={ProviderDashboard} />
        ) : (
          <Route path="/" component={HomeScreen} />
        )}
        <ProtectedRoute path="/booking" component={BookingScreen} />
        <ProtectedRoute path="/services" component={ServicesPage} />
        <ProtectedRoute path="/activity" component={ActivityPage} />
        <ProtectedRoute path="/profile" component={ProfilePage} />
        <ProtectedRoute path="/booking-details/:id" component={BookingDetails} />
        <ProtectedRoute path="/payment-success" component={PaymentSuccessPage} />
        <Route path="/how-it-works" component={HowItWorks} />
        <Route path="/interior-cleaning" component={InteriorCleaning} />
        <Route path="/exterior-cleaning" component={ExteriorCleaning} />
        <Route path="/car-seat-cleaning" component={CarSeatCleaning} />
        <Route path="/faq" component={FAQ} />
        <Route path="/corporate" component={Corporate} />
        <Route path="/verify" component={VerifyScreen} />
        <AdminRoute path="/admin" component={AdminDashboard} />
        <Route path="/auth" component={AuthScreen} />
        <Route path="/auth-old" component={AuthPage} />
        <Route component={NotFound} />
      </Switch>
      
      {/* Onboarding Journey with Micro-Interactions */}
      <OnboardingJourney 
        show={showOnboarding} 
        onComplete={handleOnboardingComplete}
      />
      
      {/* Show tab navigation for regular users only */}
      {user && !user.isAdmin && !user.isProvider && <TabNavigation />}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WebSocketProvider>
          <Router />
          <Toaster />
        </WebSocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;