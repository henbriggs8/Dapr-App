# Schedule Ahead capacity manual test

The capacity routes use the existing admin session authentication and are only for Schedule Ahead. Arrive Now does not use published time slots.

Set `BASE_URL` to the running backend. Use a capacity window with at least one slot that starts 15–180 minutes from the current Phoenix time.

```bash
BASE_URL=http://localhost:5000

curl -sS -c /tmp/dapr-admin-cookie.txt \
  -H 'Content-Type: application/json' \
  -d '{"username":"YOUR_ADMIN_USERNAME","password":"YOUR_ADMIN_PASSWORD"}' \
  "$BASE_URL/api/login"

curl -sS -b /tmp/dapr-admin-cookie.txt \
  -H 'Content-Type: application/json' \
  -d '{
    "date":"2026-07-16",
    "startTime":"09:00",
    "endTime":"16:00",
    "slotDurationMinutes":60,
    "maxBookings":2
  }' \
  "$BASE_URL/api/admin/time-slots/publish-capacity"

curl -sS \
  -H "Authorization: Bearer $CUSTOMER_BEARER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"addressId\":$ADDRESS_ID,\"serviceId\":$SERVICE_ID,\"vehicleId\":$VEHICLE_ID,\"addOnIds\":[]}" \
  "$BASE_URL/api/availability/asap"
```

Expected ASAP response when a published slot is inside the configured window:

```json
{
  "available": true,
  "mode": "asap",
  "slot": {
    "timeSlotId": 123,
    "date": "2026-07-16",
    "startTime": "15:00",
    "endTime": "16:00"
  }
}
```

To stop offering the same window without changing reservations or booking counts:

```bash
curl -sS -b /tmp/dapr-admin-cookie.txt \
  -H 'Content-Type: application/json' \
  -d '{
    "date":"2026-07-16",
    "startTime":"09:00",
    "endTime":"16:00",
    "slotDurationMinutes":60
  }' \
  "$BASE_URL/api/admin/time-slots/unpublish-capacity"
```
