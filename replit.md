# Dapper Car Wash - Mobile Car Wash Service Platform

## Overview
Dapper is a comprehensive mobile car wash and detailing service platform. It offers a complete ecosystem for customers to book services, for service providers to manage operations, and for administrators to oversee the business. The platform focuses on a mobile-first design, featuring real-time updates, geolocation, integrated payment processing, and intelligent rebooking based on customer behavior.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Framework**: React 18 with TypeScript.
- **Build Tool**: Vite.
- **UI Framework**: Tailwind CSS with shadcn/ui component library.
- **State Management**: TanStack Query (React Query) for server state.
- **Routing**: Wouter for client-side routing.
- **Animations**: Framer Motion for smooth transitions.
- **Forms**: React Hook Form with Zod validation.
- **Mobile-First Design**: Optimized for mobile devices, PWA ready, touch-optimized, with specific iOS Safari handling.
- **Desktop Home Page**: Features a dark cinematic design with purple accents and embedded UI widgets.
- **Corporate Page**: Desktop-only B2B page with a live pricing estimator and dark design language.
- **Services Marketing Page**: Dedicated public marketing/explainer page for services, with distinct desktop (dark cinematic) and mobile (light, accordion-based) layouts.

### Technical Implementations
- **Backend**: Node.js with Express.js (TypeScript, ES modules).
- **Database**: PostgreSQL with Drizzle ORM.
- **Session Management**: Express sessions.
- **Authentication**: Clerk for modern auth (SMS OTP, email magic links) with Passport.js support.
- **Real-time Communication**: WebSocket server for live updates.
- **User Management**: Multi-role authentication (customer, provider, admin), onboarding flows, and profile management.
- **Booking & Scheduling**: Three-tier service pricing, dynamic time slot management, real-time updates, vehicle integration, intelligent one-click rebooking, and smart defaults.
- **Real-time GPS Tracking**: Live provider location tracking, ETA calculations, interactive customer tracking map, and distance monitoring.
- **Dynamic Weather-Based Suggestions**: Integration with OpenWeatherMap API for AI-powered service recommendations based on current and forecasted weather.
- **Provider Network**: Geolocation-based assignment, status management, automated booking assignment, and performance metrics.
- **Payment Integration**: Complete payment processing via Square SDK, dynamic payment link generation, and revenue tracking.
- **Admin Dashboard**: Full CRUD for users, pricing control, analytics, and real-time monitoring.
- **Address Autocomplete**: Utilizes Photon (OSM-backed) for address suggestions on the desktop home page hero input.
- **Booking Flow**: Integrated service tier selection directly into the booking screen, replacing a separate services page. Deep-linking from services marketing page to pre-select service in booking.

### System Design Choices
- **Modular Architecture**: Modular routing and separated concerns for both frontend and backend.
- **Deployment**: Configured for Google Cloud Run and Replit, compatible with various PostgreSQL providers.
- **Monitoring**: Comprehensive request logging, centralized error handling, and performance optimizations.

## External Dependencies

### Core Technologies
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Authentication**: Clerk, Passport.js
- **Payment Processing**: Square SDK
- **Real-time**: WebSocket
- **Geolocation/Mapping**: Google Maps API
- **Weather Data**: OpenWeatherMap API
- **Database Hosting**: Neon Database (for PostgreSQL)
- **Address Autocomplete**: Photon (komoot.io)

### Development Tools
- **Language**: TypeScript
- **Bundler**: ESBuild (backend), Vite (frontend)
- **Database Migrations**: Drizzle Kit
- **Data Fetching/Caching**: TanStack Query