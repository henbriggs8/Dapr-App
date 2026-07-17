-- One-time recovery for a Stripe Customer ID that belongs to another
-- Stripe test/live environment. Replace the value below before running.
-- The transaction clears only rows that reference the exact stale Customer ID.

BEGIN;

SELECT id, username, email, stripe_customer_id
FROM users
WHERE stripe_customer_id = 'cus_REPLACE_WITH_STALE_CUSTOMER_ID'
FOR UPDATE;

DELETE FROM clerk_stripe_mapping
WHERE stripe_customer_id = 'cus_REPLACE_WITH_STALE_CUSTOMER_ID';

UPDATE users
SET stripe_customer_id = NULL
WHERE stripe_customer_id = 'cus_REPLACE_WITH_STALE_CUSTOMER_ID'
RETURNING id, username, email, stripe_customer_id;

COMMIT;
