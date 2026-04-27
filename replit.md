# Dapper Car Wash - Mobile Car Wash Service Platform

## Overview
Dapper is a comprehensive mobile car wash and detailing service platform designed to connect customers with service providers and administrators. Its primary purpose is to streamline the car wash booking and management process, offering a mobile-first experience, real-time updates, geolocation services, integrated payments, and intelligent rebooking features. The platform aims to capture market share by providing a seamless and efficient service for both users and service providers.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Mobile-First & Desktop Adaptive**: Responsive design optimized for mobile devices with PWA capabilities, including specific handling for iOS Safari. Dedicated desktop layouts for marketing pages with cinematic dark themes and interactive elements.
- **Component Library & Animations**: Utilizes Tailwind CSS with shadcn/ui for consistent UI and Framer Motion for smooth transitions.

### Technical Implementations
- **Icon System**: A uniform icon system enforced by a single `<Icon>` wrapper, ensuring consistent sizing and stroke width across the application. A guard script validates icon usage to prevent deviations.
- **Frontend**: Built with React 18, TypeScript, Vite, TanStack Query for state management, Wouter for routing, and React Hook Form with Zod for form validation.
- **Backend**: Powered by Node.js with Express.js, TypeScript, Drizzle ORM for PostgreSQL, and a WebSocket server for real-time communication.
- **Authentication**: Integrates Clerk for modern authentication methods (SMS OTP, email magic links) and Passport.js for legacy system compatibility.
- **Payment Processing**: Uses Square SDK for secure transactions and dynamic payment link generation.
- **Geolocation & Tracking**: Implements real-time provider location tracking, ETA calculations, and interactive customer maps via WebSockets.
- **Dynamic Weather Suggestions**: Leverages OpenWeatherMap API for AI-driven service recommendations based on weather data.
- **Booking System**: Features a three-tier service pricing model, dynamic time slot management, one-click rebooking, and smart default selections. Booking deep-linking allows pre-selection of services via URL parameters.
- **Deep Linking**: Handles payment success redirection and authenticates users via `ProtectedRoute` that honors the `redirect` query parameter after sign-in.
- **Deployment**: Configured for Google Cloud Run and Replit, supporting PostgreSQL and automated migrations.
- **Address Autocomplete**: Utilizes Photon (OSM-backed) for accurate vehicle location input on desktop.
- **Services Page**: A public marketing page distinct from the booking flow, featuring a sticky in-page anchor navigation, detailed service comparisons, and call-to-action buttons that deep-link to the booking system.
- **B2B (Fleets) Page**: A dedicated desktop-only page for corporate clients featuring a live pricing estimator and quote forms.
- **iOS In-App Payment**: Integrates Square checkout within the app via Capacitor Browser, with deep-linking for post-payment navigation.
- **Profile Page**: Redesigned with avatar, stats row (bookings, vehicles, avg rating), and four tabs — Profile, Vehicles, Bookings, and Settings. Settings tab includes notification toggles, account management links, Privacy Policy navigation, and a Delete Account flow (requires typing "DELETE" to confirm). Backend `DELETE /api/user` endpoint added.
- **Privacy Policy**: Full legal privacy policy at `/privacy` (public route, no auth required). Accessible from profile Settings tab. Content covers data collection, usage, sharing, third-party services, California privacy rights, and contact info.

## External Dependencies
- **Database**: PostgreSQL (hosted on Neon Database) with Drizzle ORM.
- **Authentication**: Clerk, Passport.js.
- **Payment Processing**: Square SDK, Square Payments.
- **Mapping/Geolocation**: Google Maps API, Photon (komoot.io).
- **Weather Data**: OpenWeatherMap API.
- **Real-time Communication**: WebSocket.