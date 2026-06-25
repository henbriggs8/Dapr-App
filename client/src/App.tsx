import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient, resolveUrl } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthenticateWithRedirectCallback } from "@clerk/clerk-react";
import { lazy, Suspense, ReactNode, useEffect, useRef, useState, useCallback } from "react";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { setBootStage } from "@/lib/boot-debug";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { WebSocketProvider } from "./hooks/use-websocket";
import { ProtectedRoute } from "./lib/protected-route";
import { Loader } from "@/components/ui/loader";
import { HomeWithOnboarding } from "@/components/home-with-onboarding";
import TabNavigation from "@/components/tab-navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { AuthGate } from "./components/auth-gate";

// ── Lazy-loaded pages ─────────────────────────────────────────────────────────
// Each page is only downloaded when the user actually navigates there,
// keeping the initial JS bundle under ~300 KB instead of 1.5 MB.
const NotFound = lazy(() => import("@/pages/not-found"));
const ClerkAuthPage = lazy(() => import("@/pages/clerk-auth-page"));
const OnboardingNameScreen = lazy(() => import("@/pages/onboarding-name-screen"));
const AddressScreen = lazy(() => import("@/pages/address-screen"));
const CarProfileScreen = lazy(() => import("@/pages/car-profile-screen"));
const FirstWashOffer = lazy(() => import("@/pages/first-wash-offer"));
const ReferralPage = lazy(() => import("@/pages/referral"));
const ProfilePage = lazy(() => import("@/pages/profile-page"));
const ActivityPage = lazy(() => import("@/pages/activity-page"));
const BookingDetails = lazy(() => import("@/pages/booking-details"));
const BookingConfirmation = lazy(() => import("@/pages/booking-confirmation"));
const ServiceProgress = lazy(() => import("@/pages/service-progress"));
const PaymentSuccessPage = lazy(() => import("@/pages/payment-success"));
const MatchingScreen = lazy(() => import("@/pages/matching-screen"));
const PostServiceReview = lazy(() => import("@/pages/post-service-review"));
const AdminDashboard = lazy(() => import("@/pages/admin-dashboard"));
const ProviderDashboard = lazy(() => import("@/pages/provider-dashboard"));
const TrackingPage = lazy(() => import("@/pages/tracking-page"));
const HowItWorks = lazy(() => import("@/pages/how-it-works"));
const InteriorCleaning = lazy(() => import("@/pages/interior-cleaning"));
const ExteriorCleaning = lazy(() => import("@/pages/exterior-cleaning"));
const CarSeatCleaning = lazy(() => import("@/pages/car-seat-cleaning"));
const FAQ = lazy(() => import("@/pages/faq"));
const Corporate = lazy(() => import("@/pages/corporate"));
const ServicesOverview = lazy(() => import("@/pages/services-overview"));
const PrivacyPolicy = lazy(() => import("@/pages/privacy-policy"));
const TermsOfService = lazy(() => import("@/pages/terms-of-service"));
const IdVerificationPage = lazy(() => import("@/pages/provider-onboarding/id-verification"));
const VehicleSetupPage = lazy(() => import("@/pages/provider-onboarding/vehicle-setup"));
const BankInfoPage = lazy(() => import("@/pages/provider-onboarding/bank-info"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader size="lg" />
    </div>
  );
}

function AdminRoute({
  path,
  component: Component,
}: {
  path: string;
  component: React.LazyExoticComponent<() => React.JSX.Element> | (() => React.JSX.Element);
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <PageLoader />
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
  component: React.LazyExoticComponent<() => React.JSX.Element> | (() => React.JSX.Element);
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <PageLoader />
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
      <Suspense fallback={<PageLoader />}>
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
          <Route path="/provider-auth"><Redirect to="/auth" /></Route>
          <Route path="/verify"><Redirect to="/auth" /></Route>
          <Route path="/onboarding/name" component={OnboardingNameScreen} />
          <Route path="/onboarding/address" component={AddressScreen} />
          <Route path="/onboarding/car-profile" component={CarProfileScreen} />
          <Route path="/onboarding/first-wash-offer" component={FirstWashOffer} />
          <Route path="/referral" component={ReferralPage} />
          <Route path="/how-it-works" component={HowItWorks} />
          <Route path="/interior-cleaning" component={InteriorCleaning} />
          <Route path="/exterior-cleaning" component={ExteriorCleaning} />
          <Route path="/car-seat-cleaning" component={CarSeatCleaning} />
          <Route path="/faq" component={FAQ} />
          <Route path="/corporate" component={Corporate} />
          <Route path="/privacy" component={PrivacyPolicy} />
          <Route path="/terms" component={TermsOfService} />

          {/* Provider onboarding routes */}
          <Route path="/provider-onboarding/id-verification" component={IdVerificationPage} />
          <Route path="/provider-onboarding/vehicle-setup" component={VehicleSetupPage} />
          <Route path="/provider-onboarding/bank-info" component={BankInfoPage} />

          {/* Protected routes */}
          <Route path="/services" component={ServicesOverview} />
          <ProtectedRoute path="/activity" component={ActivityPage} />
          <ProtectedRoute path="/profile" component={ProfilePage} />
          <ProtectedRoute path="/booking-details/:id" component={BookingDetails} />
          <ProtectedRoute path="/booking-confirmation" component={BookingConfirmation} />
          <ProtectedRoute path="/service-progress" component={ServiceProgress} />
          <ProtectedRoute path="/tracking" component={TrackingPage} />
          <ProtectedRoute path="/matching" component={MatchingScreen} />
          <ProtectedRoute path="/payment-success" component={PaymentSuccessPage} />
          <ProtectedRoute path="/review/:bookingId" component={PostServiceReview} />

          {/* Admin route */}
          <AdminRoute path="/admin" component={AdminDashboard} />

          {/* Home route - must come after all specific routes */}
          {user?.isAdmin ? (
            <Route path="/"><Redirect to="/admin" /></Route>
          ) : user?.isProvider ? (
            <ProviderRoute path="/" component={ProviderDashboard} />
          ) : (
            <Route path="/" component={HomeWithOnboarding} />
          )}

          {/* Catch-all route for 404 */}
          <Route component={NotFound} />
        </Switch>
      </Suspense>

      {/* Show tab navigation for regular users on mobile only, not during onboarding */}
      <MobileTabNavigation location={location} />
    </>
  );
}

function MobileTabNavigation({ location }: { location: string }) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  if (!isMobile) return null;
  if (!user || user.isAdmin || user.isProvider) return null;
  if (location.startsWith('/onboarding')) return null;
  return <TabNavigation />;
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
  const [failedAt, setFailedAt] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finishSync = useCallback((ok: boolean, reason?: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    syncingRef.current = false;
    if (ok) {
      setBootStage('ready');
      setSyncComplete(true);
    } else {
      setBootStage('failed', reason);
      setFailedAt(reason ?? 'unknown');
    }
  }, []);

  useEffect(() => {
    async function doSync() {
      if (syncingRef.current) return;
      if (!isAuthLoaded) return;

      setBootStage('clerk-loaded', `isSignedIn=${isSignedIn}`);

      if (!isSignedIn) {
        setBootStage('signed-out');
        setSyncComplete(true);
        return;
      }
      if (localUser) {
        setBootStage('loading-user', 'already cached');
        finishSync(true);
        return;
      }
      if (isLocalLoading) return;

      syncingRef.current = true;

      // Hard 15-second timeout — prevents eternal spinner
      timeoutRef.current = setTimeout(() => {
        setBootStage('timeout', 'sync did not complete within 15s');
        setFailedAt('Timed out after 15s');
      }, 15000);

      try {
        setBootStage('getting-token');
        const token = await getToken();
        if (!token) {
          finishSync(false, 'getToken() returned null');
          return;
        }
        setBootStage('token-ok', `len=${token.length}`);

        setBootStage('syncing', resolveUrl('/api/auth/clerk-sync'));
        const res = await fetch(resolveUrl('/api/auth/clerk-sync'), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        setBootStage('sync-ok', `status=${res.status}`);

        if (res.ok) {
          const userData = await res.json();
          setBootStage('loading-user', `id=${userData?.id}`);
          queryClient.setQueryData(['/api/user'], userData);
          finishSync(true);
        } else {
          const body = await res.text().catch(() => '');
          finishSync(false, `clerk-sync ${res.status}: ${body.slice(0, 120)}`);
        }
      } catch (err: any) {
        finishSync(false, String(err?.message ?? err));
      }
    }

    doSync();
  }, [isAuthLoaded, isSignedIn, localUser, isLocalLoading, getToken, finishSync]);

  // Timeout / failure: show error + retry instead of hanging forever
  if (failedAt) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-8 text-center">
        <p className="text-red-500 font-medium">Something went wrong loading your account</p>
        <p className="text-sm text-muted-foreground font-mono break-all">{failedAt}</p>
        <button
          className="mt-2 px-6 py-2 rounded-full bg-[#8c52ff] text-white text-sm font-medium"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!syncComplete && isSignedIn && !localUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader size="lg" />
      </div>
    );
  }

  return <>{children}</>;
}

function DeepLinkHandler() {
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;
        const { App: CapApp } = await import("@capacitor/app");
        const { Browser } = await import("@capacitor/browser");

        const handle = await CapApp.addListener("appUrlOpen", async (event) => {
          try {
            const url = new URL(event.url);
            const host = url.host || url.pathname.replace(/^\/+/, "").split("/")[0];

            // ── SSO callback (Apple / Google sign-in) ──────────────────────
            if (url.protocol.startsWith("com.autodapper.app") && host.includes("sso-callback")) {
              console.log("[Auth] SSO deep-link received, closing browser and navigating to /sso-callback");
              try { await Browser.close(); } catch {}
              const params = event.url.replace(/^com\.autodapper\.app:\/\/sso-callback/, "");
              window.location.href = "/sso-callback" + params;
              return;
            }

            // ── Payment success ────────────────────────────────────────────
            if (url.protocol.startsWith("com.autodapper.app") && host.includes("payment-success")) {
              const bookingId =
                url.searchParams.get("bookingId") ||
                url.searchParams.get("booking") ||
                (() => { try { return sessionStorage.getItem("pendingPaymentBookingId"); } catch { return null; } })();
              console.log("[Payment] success redirect detected, bookingId=", bookingId);
              try { await Browser.close(); } catch {}
              try { sessionStorage.removeItem("pendingPaymentBookingId"); } catch {}
              if (bookingId) {
                console.log("[Payment] navigating to Matching for bookingId=", bookingId);
                window.history.pushState({}, "", `/matching?booking=${bookingId}`);
                window.dispatchEvent(new PopStateEvent("popstate"));
              }
              return;
            }

            // ── Payment cancel ─────────────────────────────────────────────
            if (url.protocol.startsWith("com.autodapper.app") && host.includes("payment-cancel")) {
              console.log("[Payment] cancel redirect detected, returning to booking");
              try { await Browser.close(); } catch {}
            }
          } catch (e) {
            console.log("[DeepLink] appUrlOpen handler error", e);
          }
        });
        cleanup = () => { handle.remove(); };
      } catch {}
    })();
    return () => { if (cleanup) cleanup(); };
  }, []);
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ClerkSyncWrapper>
          <WebSocketProvider>
            <DeepLinkHandler />
            <Router />
            <Toaster />
          </WebSocketProvider>
        </ClerkSyncWrapper>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
