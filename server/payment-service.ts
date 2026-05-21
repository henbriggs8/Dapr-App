import Stripe from 'stripe';
import { Service, Booking } from '@shared/schema';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-04-22.dahlia',
});

/**
 * Create a PaymentIntent for in-app embedded payment.
 * Returns clientSecret for use with Stripe's Payment Element.
 */
export async function createPaymentLink(
  booking: Booking,
  service: Service,
  _siteUrl?: string,
  discountPercent?: number,
  stripeCustomerId?: string,
  saveCard?: boolean
): Promise<{ url: string | null; clientSecret: string | null; sessionId: string; amountInCents: number }> {
  const baseAmount = (booking.totalPrice && booking.totalPrice > 0)
    ? booking.totalPrice
    : service.price;
  const discount = discountPercent ? Math.min(Math.max(discountPercent, 0), 100) : 0;
  const chargeAmount = Math.max(baseAmount * (1 - discount / 100), 0.50);
  const amountInCents = Math.round(chargeAmount * 100);

  // PayPal is not activated on this Stripe account — use card only.
  const paymentMethodTypes = ['card'];

  const intent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: 'usd',
    payment_method_types: paymentMethodTypes,
    metadata: { bookingId: String(booking.id) },
    ...(stripeCustomerId ? { customer: stripeCustomerId } : {}),
    ...(saveCard && stripeCustomerId ? { setup_future_usage: 'on_session' } : {}),
  });

  if (!intent.client_secret) throw new Error('Failed to create Stripe PaymentIntent');

  return { url: null, clientSecret: intent.client_secret, sessionId: intent.id, amountInCents };
}

export async function listSavedPaymentMethods(stripeCustomerId: string): Promise<Array<{
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}>> {
  const methods = await stripe.paymentMethods.list({ customer: stripeCustomerId, type: 'card' });
  return methods.data.map((pm) => ({
    id: pm.id,
    brand: pm.card?.brand ?? 'card',
    last4: pm.card?.last4 ?? '****',
    expMonth: pm.card?.exp_month ?? 0,
    expYear: pm.card?.exp_year ?? 0,
  }));
}

export async function detachPaymentMethod(paymentMethodId: string): Promise<void> {
  await stripe.paymentMethods.detach(paymentMethodId);
}

/**
 * Creates a Stripe Checkout Session for iOS native payments.
 * Opens in Safari View Controller which natively supports Apple Pay / Google Pay.
 */
export async function createIOSCheckoutSession(
  booking: Booking,
  service: Service,
  discountPercent: number = 0,
  stripeCustomerId?: string
): Promise<{ url: string; sessionId: string; amountInCents: number }> {
  const baseAmount = (booking.totalPrice && booking.totalPrice > 0)
    ? booking.totalPrice
    : service.price;
  const discount = Math.min(Math.max(discountPercent, 0), 100);
  const chargeAmount = Math.max(baseAmount * (1 - discount / 100), 0.50);
  const amountInCents = Math.round(chargeAmount * 100);

  const successUrl = `com.autodapper.app://payment-success?bookingId=${booking.id}`;
  const cancelUrl  = `com.autodapper.app://payment-cancel`;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: amountInCents,
        product_data: { name: `Dapr Car Wash – ${service.name}` },
      },
    }],
    success_url: successUrl,
    cancel_url:  cancelUrl,
    metadata: { bookingId: String(booking.id) },
    ...(stripeCustomerId ? { customer: stripeCustomerId } : {}),
  });

  if (!session.url) throw new Error('Stripe did not return a Checkout URL');
  return { url: session.url, sessionId: session.id, amountInCents };
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
 * Verify a Stripe Checkout Session or PaymentIntent is paid.
 * Handles both checkout session IDs (cs_…) and PaymentIntent IDs (pi_…).
 * PaymentIntent IDs are stored when using the embedded payment form (card or PayPal).
 */
export async function verifySessionPaid(
  sessionId: string,
): Promise<boolean> {
  try {
    if (sessionId.startsWith('pi_')) {
      const intent = await stripe.paymentIntents.retrieve(sessionId);
      return intent.status === 'succeeded';
    }
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

/**
 * Retrieve the wallet type used for a payment.
 * Accepts either a PaymentIntent ID (pi_*) or a Checkout Session ID (cs_*).
 * Returns 'apple_pay', 'google_pay', or 'card'.
 * Returns null if the type cannot be determined (caller should preserve existing value).
 */
export async function getPaymentMethodType(stripeId: string): Promise<string | null> {
  try {
    let paymentMethodObj: Stripe.PaymentMethod | null = null;

    if (stripeId.startsWith('pi_')) {
      const intent = await stripe.paymentIntents.retrieve(stripeId, {
        expand: ['payment_method'],
      });
      const pm = intent.payment_method;
      if (pm && typeof pm === 'object') {
        paymentMethodObj = pm as Stripe.PaymentMethod;
      }
    } else if (stripeId.startsWith('cs_')) {
      const session = await stripe.checkout.sessions.retrieve(stripeId, {
        expand: ['payment_intent.payment_method'],
      });
      const pi = session.payment_intent;
      if (pi && typeof pi === 'object') {
        const pm = (pi as Stripe.PaymentIntent).payment_method;
        if (pm && typeof pm === 'object') {
          paymentMethodObj = pm as Stripe.PaymentMethod;
        }
      }
    } else {
      console.warn(`getPaymentMethodType: unrecognised Stripe ID prefix for "${stripeId}" — skipping`);
      return null;
    }

    if (paymentMethodObj) {
      const walletType = paymentMethodObj.card?.wallet?.type;
      if (walletType === 'apple_pay') return 'apple_pay';
      if (walletType === 'google_pay') return 'google_pay';
    }
    return 'card';
  } catch (error) {
    console.error('Error retrieving payment method type for', stripeId, ':', error);
    return null;
  }
}

/**
 * Derive a human-readable payment method label from a Stripe PaymentIntent's
 * payment_method_types array and optional expanded PaymentMethod object.
 */
function resolvePaymentMethodFromIntent(intent: import('stripe').Stripe.PaymentIntent): string | null {
  // PayPal intents have payment_method_types: ['paypal']
  if (intent.payment_method_types?.includes('paypal')) return 'paypal';
  if (!intent.payment_method) return null;
  const pm = intent.payment_method as import('stripe').Stripe.PaymentMethod;
  if (pm.type === 'paypal') return 'paypal';
  if (pm.type === 'card') {
    const wallet = pm.card?.wallet?.type;
    if (wallet === 'apple_pay') return 'apple_pay';
    if (wallet === 'google_pay') return 'google_pay';
    return 'card';
  }
  return pm.type ?? null;
}

/**
 * Retrieve a Stripe object (PaymentIntent OR Checkout Session — detected by prefix)
 * and return both paid status and the human-readable payment method type.
 * Falls back gracefully if the object cannot be found.
 */
export async function getPaymentDetails(stripeId: string): Promise<{
  isPaid: boolean;
  paymentMethod: string | null;
}> {
  try {
    // Checkout Session IDs start with "cs_"
    if (stripeId.startsWith('cs_')) {
      const session = await stripe.checkout.sessions.retrieve(stripeId, {
        expand: ['payment_intent.payment_method'],
      });
      const isPaid = session.payment_status === 'paid';
      // Derive the ACTUAL method used from the linked PaymentIntent, not from the
      // allowed-methods list (payment_method_types is just the allowlist on sessions)
      let paymentMethod: string | null = null;
      if (isPaid && session.payment_intent) {
        const intent = session.payment_intent as import('stripe').Stripe.PaymentIntent;
        paymentMethod = resolvePaymentMethodFromIntent(intent);
      }
      return { isPaid, paymentMethod };
    }

    // Default: PaymentIntent (pi_ prefix) — the common embedded-payment path
    const intent = await stripe.paymentIntents.retrieve(stripeId, {
      expand: ['payment_method'],
    });
    const isPaid = intent.status === 'succeeded';
    return { isPaid, paymentMethod: isPaid ? resolvePaymentMethodFromIntent(intent) : null };
  } catch (error) {
    console.error('getPaymentDetails error:', error);
    return { isPaid: false, paymentMethod: null };
  }
}

/** Legacy alias used by verify-payment route — kept for backward compat */
export { getPaymentDetails as getPaymentIntentDetails };

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
