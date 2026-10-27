-- Empty staging database only. Preserve SQL-only invariants absent from the Drizzle snapshot.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_quote_id_unique ON bookings (quote_id) WHERE quote_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS bookings_idempotency_key_unique ON bookings (booking_idempotency_key) WHERE booking_idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS referrals_related_booking_id_unique ON referrals (related_booking_id) WHERE related_booking_id IS NOT NULL;
ALTER TABLE bookings ADD CONSTRAINT bookings_fulfillment_mode_check CHECK (fulfillment_mode IN ('scheduled', 'asap'));
ALTER TABLE booking_quotes ADD CONSTRAINT booking_quotes_fulfillment_mode_check CHECK (fulfillment_mode IN ('scheduled', 'asap'));
CREATE TABLE session (sid varchar PRIMARY KEY, sess json NOT NULL, expire timestamp(6) NOT NULL);
CREATE INDEX session_expire_idx ON session (expire);
CREATE TABLE staging_schema_manifest (id integer PRIMARY KEY CHECK (id = 1), schema_sha256 text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
