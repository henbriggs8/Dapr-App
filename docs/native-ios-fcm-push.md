# Native iOS FCM push foundation

The backend now stores every native FCM registration as an enabled or disabled
device, rather than keeping one token on the user record. It does not yet send
booking or other lifecycle notifications.

The legacy `users.push_token` column is retained temporarily for a safe client
transition. Migration `0008_push_devices.sql` backfills valid non-empty legacy
tokens into `push_devices`; it does not remove the legacy column. A separate
cleanup migration can remove that column after native clients have re-registered.

## Server configuration

Set the server-only `FIREBASE_SERVICE_ACCOUNT_JSON` secret to the complete JSON
value downloaded for the Firebase service account. Do not commit the service
account file or put this value in a native app.

Firebase Admin is initialized lazily: the API continues to start and unrelated
routes continue working if this secret is missing or malformed. Only a push
send returns `503 PUSH_UNAVAILABLE` in that situation.

## Development-only schema application

After reviewing the migration, apply it to the development database with:

```sh
npm run db:push
```

Do not run this command against production as part of this handoff.

## Native registration contract

Register an FCM token only after the app has an authenticated Clerk session:

```http
POST /api/push-devices/register
Authorization: Bearer <Clerk session token>
Content-Type: application/json

{
  "fcmToken": "<Firebase FCM registration token>",
  "appType": "customer",
  "platform": "ios",
  "environment": "development"
}
```

`appType` is `customer` or `provider`; `environment` is `development` or
`production`. Customer registration is valid for any authenticated account.
`provider` registration is accepted only for an authenticated provider account;
provider accounts may still register their customer app. The success DTO is
always `{ "success": true }` and never returns a token. Repeating registration
is safe: it refreshes activity, re-enables a previously disabled device, and
reassigns the device to the authenticated local user if required.

To stop receiving pushes on a device:

```http
DELETE /api/push-devices/current
Authorization: Bearer <Clerk session token>
Content-Type: application/json

{ "fcmToken": "<Firebase FCM registration token>" }
```

This operation is idempotent and only affects a token owned by the caller.
Before the schema migration is applied, push-device storage routes return
`503 PUSH_UNAVAILABLE` with `Push device storage is not configured.` rather
than exposing database details.

## Existing native clients

`POST /api/user/push-token` remains as a temporary compatibility adapter for
existing Capacitor/native clients. It writes only to the new multi-device store.
Existing Swift clients should still make a coordinated switch to
`POST /api/push-devices/register` so they explicitly supply app type and
environment; remove the compatibility route only after that switch.