---
name: Project role — backend API only
description: Dapr Replit project is now a backend API layer only; native Swift iOS apps handle customer and provider UX
---

## Rule
This Replit project is the **backend and API layer only**. Two separate native Swift/SwiftUI iOS apps (Customer app, Provider app) are being developed in Xcode and consume this backend via HTTP.

Do NOT make frontend/UI changes for the customer or provider mobile app flows unless explicitly asked.

**Why:**
The user made a strategic decision to move to fully native iOS apps. The React frontend in this repo is legacy — it is not the production customer/provider experience. Making frontend changes risks wasting effort on code that won't ship to users.

**How to apply:**
- Default to backend-only changes (routes, schema, business logic, auth, payments).
- Before ANY change that touches an API endpoint's request shape, response shape, field names, or behavior: explicitly call out which endpoint is affected, what the current contract is, what will change, and what Swift-side updates would be required.
- Use explicit DTO/allowlist patterns in API responses — never `res.json(rawDbRow)`.
- Never expose: passwords, Clerk internals, Stripe secret identifiers, push tokens, or unrelated DB fields.
- Treat payment status, booking status, provider approval/assignment as server-side truth only.
- Maintain backward compatibility with native apps unless a breaking change is explicitly approved.
