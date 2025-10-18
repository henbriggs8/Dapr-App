# Dapper Car Wash - Mobile Car Wash Service Platform

## Overview

Dapper is a comprehensive mobile car wash and detailing service platform built with modern web technologies. It provides a complete ecosystem for customers to book car wash services, service providers to manage their operations, and administrators to oversee the business. The application features a mobile-first design with real-time updates, geolocation services, integrated payment processing, and intelligent rebooking capabilities that learn from customer behavior patterns.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety
- **Build Tool**: Vite for fast development and optimized builds
- **UI Framework**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Animations**: Framer Motion for smooth transitions and micro-interactions
- **Forms**: React Hook Form with Zod validation for type-safe form handling

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Session Management**: Express sessions with in-memory store
- **Authentication**: Clerk for modern auth (SMS OTP, email magic links) with legacy Passport.js support
- **Real-time Communication**: WebSocket server for live updates
- **File Structure**: Modular routing with separated concerns

### Mobile-First Design
- **Responsive**: Optimized for mobile devices with desktop compatibility
- **PWA Ready**: Configured for progressive web app capabilities
- **Touch Optimized**: Gesture-friendly interface with proper touch targets
- **iOS Safari**: Special handling for iOS-specific behaviors and safe areas

## Key Components

### User Management System
- **Multi-role Authentication**: Support for customers, service providers, and administrators
- **Onboarding Flow**: Guided setup for new users including address and vehicle information
- **Profile Management**: Comprehensive user profiles with ratings and service history

### Booking & Scheduling System
- **Service Tiers**: Three-tier pricing (Basic, Standard, Premium) with different feature sets
- **Time Slot Management**: Dynamic scheduling with availability tracking
- **Real-time Updates**: Live booking status updates via WebSocket connections
- **Vehicle Integration**: Support for vehicle size detection and pricing adjustments
- **One-Click Rebooking**: Intelligent rebooking suggestions based on customer history and service patterns
- **Smart Defaults**: Automatic prefilling of booking details from previous appointments

### Real-time GPS Tracking System
- **Live Location Updates**: Real-time provider location tracking via WebSocket connections
- **ETA Calculations**: Dynamic estimated arrival times based on distance and traffic patterns
- **Customer Interface**: Interactive tracking map with provider location, route visualization, and status updates
- **Provider Location Broadcasting**: Automatic location updates sent to customers during active bookings
- **Distance Monitoring**: Real-time distance calculations between provider and customer locations

### Dynamic Weather-Based Service Suggestions
- **Weather API Integration**: Real-time weather data from OpenWeatherMap API
- **Smart Recommendations**: AI-powered service suggestions based on current and forecasted weather conditions
- **Condition-Specific Alerts**: High-priority recommendations for rain forecasts, extreme temperatures, and seasonal conditions
- **5-Day Forecast Display**: Extended weather visibility for optimal service timing
- **Automatic Service Matching**: Direct integration with booking system for one-click weather-based scheduling

### Provider Network
- **Geolocation**: Real-time provider location tracking and assignment
- **Status Management**: Online/offline status with last location updates
- **Assignment Algorithm**: Automated booking assignment to nearby available providers
- **Performance Metrics**: Earnings tracking, service metrics, and rating systems

### Payment Integration
- **Square Integration**: Complete payment processing with Square SDK
- **Payment Links**: Dynamic payment link generation for secure transactions
- **Order Management**: Full order lifecycle from creation to completion
- **Revenue Tracking**: Comprehensive financial reporting and analytics

### Admin Dashboard
- **User Management**: Full CRUD operations for all user types
- **Pricing Control**: Dynamic pricing configuration management
- **Analytics**: Revenue tracking, geographic data, and provider performance
- **Real-time Monitoring**: Live system status and provider activity

## Data Flow

### Customer Journey
1. **Registration/Login**: User authentication with phone/email options
2. **Onboarding**: Address setup and vehicle profile creation
3. **Service Selection**: Choose from available service tiers with pricing
4. **Booking Creation**: Select time slots and submit booking requests
5. **Payment Processing**: Secure payment via Square integration
6. **Service Tracking**: Real-time updates on service progress
7. **Completion**: Rating and feedback collection

### Provider Workflow
1. **Authentication**: Provider-specific login with additional verification
2. **Onboarding**: ID verification, vehicle setup, and bank information
3. **Availability Management**: Online/offline status and location updates
4. **Booking Assignment**: Automatic or manual booking acceptance
5. **Service Execution**: Step-by-step service progress tracking
6. **Completion**: Payment processing and customer rating

### Admin Operations
1. **System Monitoring**: Real-time dashboard with key metrics
2. **User Management**: Customer and provider administration
3. **Pricing Management**: Dynamic service pricing configuration
4. **Analytics**: Revenue, geographic, and performance reporting
5. **Provider Support**: Tools for managing provider network

## External Dependencies

### Core Technologies
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Passport.js with session-based authentication
- **Payment Processing**: Square SDK for secure payment handling
- **Real-time Features**: WebSocket for live updates and notifications

### Third-party Services
- **Google Maps API**: Geolocation services and mapping functionality
- **Square Payments**: Complete payment processing infrastructure
- **Neon Database**: PostgreSQL hosting with serverless capabilities

### Development Tools
- **TypeScript**: End-to-end type safety across the full stack
- **ESBuild**: Fast production bundling for server-side code
- **Drizzle Kit**: Database migration and schema management
- **TanStack Query**: Intelligent data fetching and caching

## Deployment Strategy

### Environment Configuration
- **Development**: Local development with hot module replacement
- **Production**: Optimized builds with environment-specific configurations
- **Database**: Environment-based connection string management

### Build Process
- **Frontend**: Vite production build with asset optimization
- **Backend**: ESBuild bundling with external package handling
- **Database**: Automated migration system with Drizzle Kit

### Platform Support
- **Cloud Run**: Configured for Google Cloud Run deployment
- **Replit**: Native support for Replit hosting platform
- **PostgreSQL**: Compatible with various PostgreSQL hosting providers

### Monitoring & Performance
- **Request Logging**: Comprehensive API request and response logging
- **Error Handling**: Centralized error management with user-friendly messages
- **Performance Optimization**: Lazy loading, code splitting, and caching strategies

## Changelog

- June 14, 2025. Initial setup
- June 14, 2025. Implemented One-Click Service Rebooking with Intelligent Defaults feature
- June 15, 2025. Fixed provider onboarding flow localStorage key consistency for proper user-specific tracking
- June 15, 2025. Fixed provider location update endpoint to return complete user object, resolving redirect issue
- June 15, 2025. Created comprehensive Admin Dashboard with user management, booking oversight, earnings tracking, and analytics
- June 16, 2025. Added username authentication tab and fixed admin login with proper password hashing system
- June 17, 2025. Migrated from in-memory storage to PostgreSQL database with Drizzle ORM and proper database relations
- June 17, 2025. Fixed price display formatting (converted cents to dollars) and resolved phone verification registration errors
- June 17, 2025. Implemented real-time GPS tracking system with WebSocket live updates, provider location monitoring, ETA calculations, and customer tracking interface
- June 17, 2025. Fixed navigation tab overlap issues by increasing bottom padding across all pages to prevent content being covered
- June 17, 2025. Extended booking system to allow advance reservations up to 30 days with dynamic time slot generation
- June 17, 2025. Implemented dynamic weather-based service suggestions with OpenWeatherMap integration, smart recommendations based on weather conditions, and 5-day forecast display
- October 18, 2025. Integrated Clerk authentication with SMS OTP and email magic link support, including automatic user synchronization with local database, Clerk-Square customer mapping for payment processing, and backward-compatible integration with existing authentication system

## User Preferences

Preferred communication style: Simple, everyday language.