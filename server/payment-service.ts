import Stripe from 'stripe';
import { Service, Booking } from '@shared/schema';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-04-22.dahlia' as any,
});

/** Stable idempotency key for a booking+discount combo. */
function bookingIdempotencyKey(bookingId: number, discountPercent: number): string {
  return `booking-${bookingId}-discount-${discountPercent}`;
}

export async function createPaymentLink(
  booking: Booking,
  service: Service,
  siteUrl?: string,
  discountPercent?: number
): Promise<{ url: string; sessionId: string }> {
  const baseAmount = (booking.totalPrice && booking.totalPrice > 0)
    ? booking.totalPrice
    : service.price;
  const discount = discountPercent ? Math.min(Math.max(discountPercent, 0), 100) : 0;
  const chargeAmount = Math.max(baseAmount * (1 - discount / 100), 0.50);
  const amountInCents = Math.round(chargeAmount * 100);

  const baseUrl = siteUrl || process.env.SITE_URL || 'https://autodapper.com';

  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: amountInCents,
            product_data: {
              name: `Dapr – ${service.name}${(booking.totalPrice && booking.totalPrice > service.price) ? ' (size adjusted)' : ''}`,
            },
          },
        },
      ],
      success_url: `${baseUrl}/payment-success?booking=${booking.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/`,
      metadata: {
        bookingId: String(booking.id),
      },
    },
    {
      idempotencyKey: bookingIdempotencyKey(booking.id, discount),
    }
  );

  if (!session.url) throw new Error('Failed to create Stripe checkout session');

  return { url: session.url, sessionId: session.id };
}

export async function createTipPaymentLink(
  bookingId: number,
  tipAmountCents: number,
  siteUrl?: string
): Promise<{ url: string; sessionId: string }> {
  const baseUrl = siteUrl || process.env.SITE_URL || 'https://autodapper.com';

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: tipAmountCents,
          product_data: { name: 'Dapr – Tip' },
        },
      },
    ],
    success_url: `${baseUrl}/review/${bookingId}?tip_paid=1&tip_cents=${tipAmountCents}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/review/${bookingId}`,
    metadata: {
      bookingId: String(bookingId),
      isTip: 'true',
    },
  });

  if (!session.url) throw new Error('Failed to create Stripe tip checkout session');

  return { url: session.url, sessionId: session.id };
}

/**
 * Verify a Stripe Checkout Session is paid.
 * Used to confirm tip payments before persisting tipAmount.
 */
export async function verifySessionPaid(
  sessionId: string,
): Promise<boolean> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return session.payment_status === 'paid';
  } catch (error) {
    console.error('Stripe session verification error:', error);
    return false;
  }
}

/** Legacy alias used by verify-payment route */
export async function verifyPaymentStatus(sessionId: string): Promise<boolean> {
  return verifySessionPaid(sessionId);
}

export async function createStripeCustomer(
  email?: string,
  phone?: string,
  name?: string
): Promise<string> {
  const customer = await stripe.customers.create({
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    ...(name ? { name } : {}),
  });
  return customer.id;
}

/** Construct and verify a Stripe webhook event from raw body + signature. */
export function constructWebhookEvent(
  rawBody: Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}
