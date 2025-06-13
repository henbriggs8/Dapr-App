import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import ProviderAuthPage from "@/pages/provider-auth-page";
import AuthScreen from "@/pages/auth-screen";
import VerifyScreen from "@/pages/verify-screen";
import HomeScreen from "@/pages/home-screen";
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
import { HomeWithOnboarding } from "@/components/home-with-onboarding";
import TabNavigation from "@/components/tab-navigation";

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

  return (
    <>
      <Switch>
        {user?.isProvider ? (
          <ProviderRoute path="/" component={ProviderDashboard} />
        ) : (
          <ProtectedRoute path="/" component={HomeWithOnboarding} />
        )}
        <ProtectedRoute path="/booking" component={BookingScreen} />
        <ProtectedRoute path="/services" component={ServicesPage} />
        <ProtectedRoute path="/activity" component={ActivityPage} />
        <ProtectedRoute path="/profile" component={ProfilePage} />
        <ProtectedRoute path="/booking-details/:id" component={BookingDetails} />
        <ProtectedRoute path="/booking-confirmation" component={BookingConfirmation} />
        <ProtectedRoute path="/service-progress" component={ServiceProgress} />
        <ProtectedRoute path="/payment-success" component={PaymentSuccessPage} />
        <Route path="/how-it-works" component={HowItWorks} />
        <Route path="/interior-cleaning" component={InteriorCleaning} />
        <Route path="/exterior-cleaning" component={ExteriorCleaning} />
        <Route path="/car-seat-cleaning" component={CarSeatCleaning} />
        <Route path="/faq" component={FAQ} />
        <Route path="/corporate" component={Corporate} />
        <Route path="/verify" component={VerifyScreen} />
        <Route path="/onboarding/address" component={AddressScreen} />
        <Route path="/onboarding/car-profile" component={CarProfileScreen} />
        <Route path="/onboarding/first-wash-offer" component={FirstWashOffer} />
        <AdminRoute path="/admin" component={AdminDashboard} />
        <Route path="/auth" component={AuthScreen} />
        <Route path="/auth-old" component={AuthPage} />
        <Route path="/provider-auth" component={ProviderAuthPage} />
        <Route component={NotFound} />
      </Switch>
      
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