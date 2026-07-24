# Dapr - Backend API & Platform

## Overview
Dapr is a mobile car wash and detailing platform. The native customer and provider experiences are built as separate Swift/SwiftUI iOS apps developed in Xcode. **This Replit project is the backend API and business logic layer only.**

## Project Role — Backend Only
The two native iOS apps consume this backend via HTTP:

```
Native Swift Customer App  →  Dapr Backend API (Replit)  →  PostgreSQL / Stripe / Clerk
Native Swift Provider App  →  Dapr Backend API (Replit)  →  PostgreSQL / Stripe / Clerk
```

**Do NOT make frontend/UI changes for the customer or provider mobile apps unless explicitly asked.** The React frontend in this repo is a legacy web layer and admin/marketing surface — it is NOT the native app.

## User Preferences
Preferred communication style: Simple, everyday language.

## Backend Responsibilities
- API endpoints consumed by the native iOS apps
- Database schema and data models (Drizzle ORM + PostgreSQL)
- Booking logic and state machine
- Customer/provider relationships and authorization
- Provider availability and job assignment
- Stripe payment logic and payment verification
- Clerk authentication / JWT token verification
- Push notification backend infrastructure
- Admin/internal operations endpoints
- Business logic and security/authorization rules

## API Contract Rules (Critical)
When making any backend change:
- **Preserve existing API contracts** — do not rename response fields, change response shapes, remove fields, or change endpoint behavior without explicitly warning that native Swift apps may need updates.
- **Use explicit DTOs/allowlists** for API responses — never return raw database objects.
- **Never expose** passwords, Clerk internals, Stripe identifiers, push tokens, provider private contact info, or unrelated database fields.
- **Keep authorization server-side** — customer/provider permissions are always enforced in the API, never trusted from the client.
- **Treat the backend as source of truth** for payment status, booking status, provider approval, assignment, and permissions.
- **Strongly-typed responses** — keep shapes predictable so they map cleanly to Swift `Codable` models.
- **Backward compatibility** — no breaking changes without explicit approval.

Before making any change that could affect a native app's API contract, clearly state:
1. The affected endpoint(s)
2. The current request/response shape
3. The proposed change
4. What Swift-side updates would be required

## Technical Stack
- **Backend**: Node.js, Express.js, TypeScript, Drizzle ORM
- **Database**: PostgreSQL (Neon)
- **Authentication**: Clerk (JWT verification), Passport.js (legacy)
- **Payments**: Stripe (checkout, webhooks, verification)
- **Real-time**: WebSocket server for provider location and booking updates
- **Push Notifications**: APNs via backend token registration
- **Deployment**: Replit (primary), Google Cloud Run (configured)

## External Dependencies
- **Database**: PostgreSQL via Neon, Drizzle ORM
- **Authentication**: Clerk, Passport.js
- **Payment Processing**: Stripe (card, Apple Pay, Google Pay)
- **Geolocation**: Google Maps API, Photon (komoot.io)
- **Weather Data**: OpenWeatherMap API
- **Real-time**: WebSocket

## Data Model Highlights
- `users` — customers and providers, with `isProvider`, `isAdmin`, `referralCode`, `freeWashCredits`, `pushToken`
- `bookings` — full booking lifecycle with status, stage, payment, assignment
- `vehicles` — customer vehicles linked to bookings
- `services` — three-tier pricing (basic, premium, full detail)
- `referrals` — referral relationship tracking
