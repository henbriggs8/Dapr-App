---
name: Testing admin API routes with Clerk production instance
description: How to obtain a real admin bearer token for curl-testing Clerk-protected routes in Development
---

The project's Clerk instance is a **production** instance (clerk.autodapper.com), so `POST /v1/sessions` on the backend API fails with `request_invalid_for_environment` — sessions cannot be minted directly.

**Working flow** to get a real session JWT for an admin user (e.g. to curl an admin-only route on the dev server):
1. `POST https://api.clerk.com/v1/sign_in_tokens` with the Clerk secret and `{"user_id": "...", "expires_in_seconds": 300}` → ticket token (allowed in production).
2. `POST https://clerk.autodapper.com/v1/client/sign_ins?_is_native=1` with form fields `strategy=ticket&ticket=<token>`. Native mode returns the **client token in the `Authorization` response header** (not cookies — a cookie jar won't work) and `response.created_session_id` in the body.
3. `POST https://clerk.autodapper.com/v1/client/sessions/<sid>/tokens?_is_native=1` with `Authorization: <client token>` → short-lived session `jwt`.
4. Use `Authorization: Bearer <jwt>` against the local server; `resolveUserFromBearer` maps it to the user via username `clerk_<sub>`.

**Why:** Needed for end-to-end validation of admin routes without a browser session; the cookie-jar approach silently yields an empty-session client.
**How to apply:** Any time a Clerk-authenticated route must be exercised from the shell. Never print the ticket/JWT values in reports.
