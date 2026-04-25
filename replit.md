# Dapper Car Wash - Mobile Car Wash Service Platform

## Overview

Dapper is a comprehensive mobile car wash and detailing service platform. It offers a complete ecosystem for customers to book services, for service providers to manage operations, and for administrators to oversee the business. The platform emphasizes a mobile-first design, real-time updates, geolocation services, integrated payment processing, and intelligent rebooking based on customer behavior.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Mobile-First Design**: Responsive and optimized for mobile devices with PWA capabilities and touch-optimized interfaces, including specific handling for iOS Safari.
- **Desktop Experience**: Dedicated desktop layouts for marketing pages (`/corporate`, `/`) with cinematic dark themes and interactive elements.
- **Component Library**: Tailwind CSS with shadcn/ui for consistent and modern UI.
- **Animations**: Framer Motion for smooth transitions.

### Technical Implementations
- **Frontend**: React 18, TypeScript, Vite, TanStack Query for state management, Wouter for routing, React Hook Form with Zod for forms.
- **Backend**: Node.js with Express.js, TypeScript, Drizzle ORM for PostgreSQL, WebSocket server for real-time communication, modular routing.
- **Authentication**: Clerk for modern authentication (SMS OTP, email magic links) with integration for existing systems. Passport.js for legacy authentication.
- **Payment Processing**: Integrated with Square SDK for secure transactions and dynamic payment link generation.
- **GPS Tracking**: Real-time provider location tracking, ETA calculations, and interactive customer maps via WebSocket.
- **Dynamic Weather Suggestions**: Integration with OpenWeatherMap API for AI-powered service recommendations based on current and forecasted weather.
- **Booking System**: Three-tier service pricing, dynamic time slot management, one-click rebooking, and smart defaults.
- **Deployment**: Configured for Google Cloud Run and Replit, with PostgreSQL compatibility and automated migrations.

### Feature Specifications
- **User Management**: Multi-role authentication (customer, provider, admin), guided onboarding, comprehensive profile management.
- **Provider Network**: Geolocation-based assignment, status management, performance metrics.
- **Admin Dashboard**: CRUD operations for users, dynamic pricing control, analytics, real-time monitoring.
- **Deep Linking**: Handled for payment success redirection within the mobile app.
- **Address Autocomplete**: Utilizes Photon (OSM-backed) for vehicle location input on desktop.
- **Service Pages**: Dedicated `/services` marketing page with sticky anchor navigation, comparison table, and add-ons.

## External Dependencies

- **Database**: PostgreSQL (hosted on Neon Database) with Drizzle ORM.
- **Authentication**: Clerk, Passport.js.
- **Payment Processing**: Square SDK, Square Payments.
- **Mapping/Geolocation**: Google Maps API, Photon (komoot.io for address autocomplete).
- **Weather Data**: OpenWeatherMap API.
- **Real-time Communication**: WebSocket.