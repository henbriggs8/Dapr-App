# Arrive Now live provider supply

Arrive Now and Schedule Ahead use separate supply models:

- Arrive Now is available when at least one user with `isProvider = true` has `currentStatus = online`.
- Providers with active or queued work remain eligible. MVP does not impose a maximum queue size.
- Schedule Ahead uses explicitly published time slots and atomic `currentBookings` capacity reservation.
- ASAP quotes and bookings do not have a time slot and never reserve or release scheduled capacity.

## MVP service-area fallback

Native saved addresses do not currently store reliable coordinates, and idle providers do not continuously broadcast GPS. Until those inputs are reliable, authenticated native service addresses are treated as part of the Gilbert/Phoenix operating area. Provider-to-customer distance is not used to reject Arrive Now availability during this MVP phase.

This fallback must be replaced with stored customer coordinates, fresh idle-provider coordinates, and a defined service-area boundary before expanding beyond the Gilbert/Phoenix launch market.
