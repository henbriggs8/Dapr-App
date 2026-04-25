# Dapper Car Wash - Mobile Car Wash Service Platform

## Overview

Dapper is a comprehensive mobile car wash and detailing service platform designed to connect customers with service providers. It offers a complete ecosystem for booking services, managing operations, and overseeing the business. The platform emphasizes a mobile-first approach, real-time updates, geolocation, integrated payment processing, and intelligent rebooking based on customer behavior.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **UI**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Animations**: Framer Motion
- **Forms**: React Hook Form with Zod

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Clerk (SMS OTP, email magic links)
- **Real-time**: WebSocket server

### Core Features
- **User Management**: Multi-role authentication (customer, provider, admin), onboarding, profile management.
- **Booking & Scheduling**: Three service tiers, dynamic time slot management, real-time updates, intelligent one-click rebooking, smart defaults.
- **Real-time GPS Tracking**: Live provider location, ETA calculations, interactive customer tracking map.
- **Dynamic Weather-Based Suggestions**: AI-powered service recommendations based on OpenWeatherMap data, 5-day forecast, automatic service matching.
- **Provider Network**: Geolocation-based assignment, status management, performance metrics.
- **Payment Integration**: Square SDK for processing, payment links, order and revenue tracking.
- **Admin Dashboard**: User management, pricing control, analytics, real-time monitoring.
- **Mobile-First Design**: Responsive for mobile, PWA ready, touch optimized, iOS specific handling.
- **Deployment**: Supports Google Cloud Run and Replit, with automated database migrations.
- **Desktop Enhancements**: Separate desktop views for home (`/`) and corporate (`/corporate`) pages, featuring rich UI, pricing estimators, and address autocomplete.
- **Services Page**: Dedicated public marketing page (`/services`) with detailed service descriptions, comparison tables, and add-ons, deep-linking to booking with pre-selected tiers.
- **Booking Flow**: `/services` marketing page deep-links to `/booking?service=<slug>`, which pre-selects the corresponding service tier within the booking screen.

## External Dependencies

- **Database**: PostgreSQL (hosted on Neon)
- **Authentication**: Clerk
- **Payment Processing**: Square SDK
- **Geolocation/Mapping**: Google Maps API
- **Weather Data**: OpenWeatherMap API
- **Address Autocomplete**: Photon (komoot.io, OSM-backed)