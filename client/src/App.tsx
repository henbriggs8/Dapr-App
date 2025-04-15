import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import ProfilePage from "@/pages/profile-page";
import AdminDashboard from "@/pages/admin-dashboard";
import ProviderDashboard from "@/pages/provider-dashboard";
import SpinnerDemo from "@/pages/spinner-demo";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import { Loader } from "@/components/ui/loader";

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
    <Switch>
      {user?.isProvider ? (
        <ProviderRoute path="/" component={ProviderDashboard} />
      ) : (
        <ProtectedRoute path="/" component={HomePage} />
      )}
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <AdminRoute path="/admin" component={AdminDashboard} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/spinner-demo" component={SpinnerDemo} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;