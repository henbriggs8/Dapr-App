# Dapper Car Wash - Mobile Car Wash Service Platform

## Overview

Dapper is a comprehensive mobile car wash and detailing service platform. It offers a complete ecosystem for customers to book services, for service providers to manage operations, and for administrators to oversee the business. The platform emphasizes a mobile-first design, real-time updates, geolocation services, integrated payment processing, and intelligent rebooking based on customer behavior.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Mobile-First Design**: Responsive and optimized for mobile devices with PWA capabilities and touch-optimized interfaces, including specific handling for iOS Safari.
- **Desktop Experience**: Dedicated desktop layouts for marketing pages (`/`, `/corporate`, `/services`) with cinematic dark themes (#050505 background, #8c52ff purple accents) and interactive elements.
- **Component Library**: Tailwind CSS with shadcn/ui for consistent and modern UI.
- **Animations**: Framer Motion for smooth transitions.

### Technical Implementations
- **Frontend**: React 18, TypeScript, Vite, TanStack Query for state management, Wouter for routing, React Hook Form with Zod for forms.
- **Backend**: Node.js with Express.js, TypeScript, Drizzle ORM for PostgreSQL, WebSocket server for real-time communication, modular routing.
- **Authentication**: Clerk for modern authentication (SMS OTP, email magic links) with integration for existing systems. Passport.js for legacy authentication.
- **Payment Processing**: Integrated with Square SDK for secure transactions and dynamic payment link generation.
- **GPS Tracking**: Real-time provider location tracking, ETA calculations, and interactive customer maps via WebSocket.
- **Dynamic Weather Suggestions**: Integration with OpenWeatherMap API for AI-powered service recommendations based on current and forecasted weather.
- **Booking System**: Three-tier service pricing, dynamic time slot management, one-click rebooking, and smart defaults. The `booking-screen.tsx` accepts a `?service=<slug>` query param (read via `useSearch()`) and preselects the matching tier — preferred by exact case-insensitive name match against `service.name`, then category fallback — and smooth-scrolls to the When section.
- **Deployment**: Configured for Google Cloud Run and Replit, with PostgreSQL compatibility and automated migrations.

### Feature Specifications
- **User Management**: Multi-role authentication (customer, provider, admin), guided onboarding, comprehensive profile management.
- **Provider Network**: Geolocation-based assignment, status management, performance metrics.
- **Admin Dashboard**: CRUD operations for users, dynamic pricing control, analytics, real-time monitoring.
- **Deep Linking**: Handled for payment success redirection within the mobile app. `ProtectedRoute` redirects unauthenticated visitors to `/auth?redirect=<path+search>`, and both `clerk-auth-page.tsx` and `auth-page.tsx` honor that param after sign-in (same-origin in-app paths only, `/auth` excluded, to prevent open-redirect) — so deep-links like `/booking?service=<slug>` survive auth.
- **Address Autocomplete**: Utilizes Photon (OSM-backed) for vehicle location input on desktop.
- **Services Page (`/services`)**: Public marketing/explainer page distinct from `/booking`. Single component `client/src/pages/services-overview.tsx` switching by `useIsMobile()`. Desktop is dark cinematic with a fixed top nav, hero, **sticky in-page anchor nav** (sits below the top nav, jumps to each tier / Compare / Add-ons), 5-up Why-Dapper differentiators, four alternating tier blocks (Essential Wash $39 / Interior Detail $89 / Refresh Detail $149 / Dapper Black Label $299), full comparison table (13 features × 4 tiers), seven add-ons grid, final CTA, footer. Mobile is light/white with collapsible accordion tier sections, horizontally-scrollable comparison table (sticky feature column), expandable add-ons list. Every "Book this service" CTA navigates to `/booking?service=<slug>` so the tier is preselected after the visitor (re)authenticates if needed.

## External Dependencies

- **Database**: PostgreSQL (hosted on Neon Database) with Drizzle ORM.
- **Authentication**: Clerk, Passport.js.
- **Payment Processing**: Square SDK, Square Payments.
- **Mapping/Geolocation**: Google Maps API, Photon (komoot.io for address autocomplete).
- **Weather Data**: OpenWeatherMap API.
- **Real-time Communication**: WebSocket.

## Changelog

- **April 25, 2026** — Updated the three pricing cards in the desktop home page (`client/src/pages/home-desktop.tsx` Service Tiers section) to match the real Dapper services. Renamed Basic/Standard/Premium → **Essential Wash $39 (30 min)** / **Interior Detail $89 (60 min)** / **Refresh Detail $149 (90 min)** with the same descriptions, durations, and feature lists used on `/services`. Each Select-CTA now deep-links to `/booking?service=<slug>` (essential-wash / interior-detail / refresh-detail) via a new `goBookWith()` helper that wraps the auth-redirect (`/auth?redirect=...`) for signed-out visitors. Added a fourth flagship strip below the three cards for **Dapper Black Label Detail $299 (3 hrs)** with its own `?service=black-label` deep-link, so all four real tiers are now represented on the homepage.
- **April 25, 2026** — New public `/services` marketing/explainer page distinct from `/booking` (`client/src/pages/services-overview.tsx`). Desktop dark cinematic (#050505/#8c52ff, max-w-1120px) with **sticky in-page anchor nav** below the fixed top nav, hero, 5-up Why-Dapper differentiators, four tier blocks (Essential Wash $39 / Interior Detail $89 / Refresh Detail $149 / Dapper Black Label $299) each with positioning + Included/Best-for/Good-to-know lists + per-tier Book this CTA, comparison table (13 features × 4 tiers), seven add-ons grid (Leather Revive, Clay Bar, Engine Bay, Pet Hair, Extra Sanitization, Steam Extraction, Child Car Seat), final CTA, footer. Mobile light/white with accordion tier sections + horizontally-scrollable comparison table (sticky feature column). `/services` route swapped from `<Redirect to=/booking>` to a public `<Route component={ServicesOverview}>`. `home-desktop.tsx` `goServices` and `corporate-desktop.tsx` Services nav both restored to `/services`. Every per-tier "Book this" CTA deep-links to `/booking?service=<slug>`; `booking-screen.tsx` reads the param and preselects the matching tier (exact name match preferred, category fallback). `ProtectedRoute` + both auth pages now honor `/auth?redirect=<path+search>` (same-origin only, `/auth` excluded) so the deep-link survives sign-in.
- **April 25, 2026** — Address autocomplete on the desktop home hero "Vehicle location" input via Photon (komoot.io, OSM-backed) with 250ms debounce, ≥3 char trigger, suggestion dropdown, full keyboard nav (↑/↓/Enter/Esc), outside-click close. State + effect inline in `client/src/pages/home-desktop.tsx`.
- **April 23, 2026** — Desktop-only Fleets (B2B) page at `/corporate` (`client/src/pages/corporate-desktop.tsx`) with hero + live pricing estimator (7 vehicle tiers × 5 service pills, volume multipliers), Trusted-by logos, fleet use cases, quote form (auto-fills vehicle count + service from estimator and smooth-scrolls), FAQ accordion, final CTA. `corporate.tsx` switches via `useIsMobile()` — desktop renders `CorporateDesktop`, mobile keeps "Coming soon" placeholder.
- **April 23, 2026** — Separate desktop home page at `/` (`client/src/pages/home-desktop.tsx`). Dark cinematic with #8c52ff accents, embedded UI widgets, hero/how-it-works/tiers/value-prop/CTA/footer sections. `HomeWithOnboarding` switches on viewport via `useIsMobile()` (768px breakpoint): desktop renders `HomeDesktop` publicly (no auth, CTAs route signed-out users to `/auth`); mobile keeps the existing protected onboarding flow. The `/` route changed from `ProtectedRoute` to `Route` so unauthenticated desktop visitors see the marketing landing page. Section images live in `client/public/desktop/`.
- **April 22, 2026** — iOS in-app payment flow: Square checkout opens inside the app via Capacitor Browser (SFSafariViewController). After payment, the hosted `/payment-success` page deep-links to `com.autodapper.app://payment-success?bookingId=XXX`, caught by `DeepLinkHandler` in `App.tsx` which closes the in-app browser and routes to `/tracking?booking=XXX`. Tracking page accepts `?booking=` query param. Requires `com.autodapper.app` URL scheme registered in iOS `Info.plist`.
- Prior history: see git log for full chronological detail of provider acceptance flow, intelligent rebooking, weather-based suggestions, GPS tracking, Square payment integration, Clerk auth migration, multi-role onboarding, and the original three-tier booking model.
