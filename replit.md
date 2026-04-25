# Dapper Car Wash - Mobile Car Wash Service Platform

## Overview

Dapper is a comprehensive mobile car wash and detailing service platform designed for customers, service providers, and administrators. It aims to modernize the car wash industry by offering a seamless booking experience, real-time service tracking, and intelligent service recommendations. The platform is built with a mobile-first approach, integrating features like geolocation, secure payment processing, and AI-driven rebooking suggestions to enhance user convenience and operational efficiency. The project's ambition is to create a leading, intuitive platform for on-demand car care, expanding into B2B fleet services and continuously improving user engagement through smart, personalized features.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Technologies
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query, Wouter, Framer Motion, React Hook Form with Zod.
- **Backend**: Node.js, Express.js, TypeScript, ES modules.
- **Database**: PostgreSQL with Drizzle ORM.
- **Authentication**: Clerk (SMS OTP, email magic links) with Passport.js legacy support.
- **Real-time**: WebSocket for live updates.
- **Deployment**: Configured for Google Cloud Run and Replit hosting.

### Key Features
- **User Management**: Multi-role authentication (customer, provider, admin), comprehensive profiles, onboarding flows.
- **Booking & Scheduling**: Three-tier service pricing, dynamic time slot management, real-time booking status, one-click rebooking, smart defaults.
- **Real-time GPS Tracking**: Live provider location, ETA calculations, interactive customer tracking map.
- **Dynamic Weather-Based Suggestions**: AI-powered service recommendations based on OpenWeatherMap data, 5-day forecast.
- **Provider Network**: Geolocation-based assignment, status management, performance metrics.
- **Payment Integration**: Square SDK for secure payment processing, dynamic payment links, revenue tracking.
- **Admin Dashboard**: User and pricing management, analytics, real-time monitoring.
- **UI/UX**: Mobile-first responsive design, PWA ready, touch-optimized, dark cinematic theme for desktop, light theme for mobile.
- **B2B Fleet Services**: Dedicated desktop page with pricing estimator, use cases, and quote form.
- **Services Marketing Page**: Public-facing marketing page detailing service offerings, differentiators, comparison table, and add-ons.
- **Address Autocomplete**: Photon (OSM-backed) integration for location input on desktop.
- **iOS Integration**: Capacitor configuration for iOS app, in-app Square payment flow with deep-linking for post-payment routing.

## External Dependencies

- **Database**: PostgreSQL (hosted on Neon).
- **Authentication**: Clerk.
- **Payment Processing**: Square SDK.
- **Mapping & Geolocation**: Google Maps API, Photon (komoot.io).
- **Weather Data**: OpenWeatherMap API.