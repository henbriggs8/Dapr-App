import { randomBytes } from 'crypto';
import { SquareClient, SquareEnvironment, SquareError } from 'square';
import { Service, Booking } from '@shared/schema';

const isSandbox = !process.env.SQUARE_ACCESS_TOKEN ||
  process.env.SQUARE_ACCESS_TOKEN.startsWith('sandbox');

const squareClient = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN || '',
  environment: isSandbox ? SquareEnvironment.Sandbox : SquareEnvironment.Production,
});

function generateIdempotencyKey(): string {
  return randomBytes(16).toString('hex');
}

export async function createPaymentLink(
  booking: Booking,
  service: Service,
  siteUrl?: string,
  discountPercent?: number
): Promise<{ url: string; orderId: string }> {
  try {
    // Use booking.totalPrice (includes vehicle size & add-on markup) when available,
    // otherwise fall back to the base service price.
    const baseAmount = (booking.totalPrice && booking.totalPrice > 0)
      ? booking.totalPrice
      : service.price;
    const discount = discountPercent ? Math.min(Math.max(discountPercent, 0), 100) : 0;
    const chargeAmount = Math.max(baseAmount * (1 - discount / 100), 0.50);
    const amountInCents = Math.round(chargeAmount * 100);

    // Determine the base URL: explicit param > env var > autodapper.com (never localhost)
    const baseUrl = siteUrl ||
      process.env.SITE_URL ||
      'https://autodapper.com';

    const response = await squareClient.checkout.paymentLinks.create({
      idempotencyKey: generateIdempotencyKey(),
      quickPay: {
        name: `Dapr - ${service.name}${(booking.totalPrice && booking.totalPrice > service.price) ? ' (size adjusted)' : ''}`,
        locationId: process.env.SQUARE_LOCATION_ID!,
        priceMoney: {
          amount: BigInt(amountInCents),
          currency: 'USD',
        },
      },
      checkoutOptions: {
        redirectUrl: `${baseUrl}/payment-success?booking=${booking.id}`,
      },
    });

    if (!response.paymentLink?.url) {
      throw new Error('Failed to create payment link in Square');
    }

    // Prefer longUrl (direct checkout page) over url (square.link short
    // redirector) — the short redirector causes a blank screen in iOS
    // SFSafariViewController during the 302 redirect chain.
    const checkoutUrl = (response.paymentLink as any).longUrl || response.paymentLink.url;

    return {
      url: checkoutUrl,
      orderId: response.paymentLink.orderId || '',
    };
  } catch (error: any) {
    if (error instanceof SquareError) {
      console.error('Square API Error:', error.message);
      throw new Error(`Square API Error: ${error.message}`);
    }
    console.error('Payment link creation error:', error);
    throw new Error(error?.message || 'Failed to create payment link');
  }
}

export async function createTipPaymentLink(
  bookingId: number,
  tipAmountCents: number,
  siteUrl?: string
): Promise<{ url: string; orderId: string }> {
  try {
    const baseUrl = siteUrl || process.env.SITE_URL || 'https://autodapper.com';

    const response = await squareClient.checkout.paymentLinks.create({
      idempotencyKey: generateIdempotencyKey(),
      quickPay: {
        name: `Dapr - Tip`,
        locationId: process.env.SQUARE_LOCATION_ID!,
        priceMoney: {
          amount: BigInt(tipAmountCents),
          currency: 'USD',
        },
      },
      checkoutOptions: {
        redirectUrl: `${baseUrl}/review/${bookingId}?tip_paid=1&tip_cents=${tipAmountCents}`,
      },
    });

    if (!response.paymentLink?.url) {
      throw new Error('Failed to create tip payment link in Square');
    }

    // Tip links open in a standard browser (window.location.href), so the
    // iOS SFSafariViewController redirect issue does not apply — use url directly.
    const checkoutUrl = response.paymentLink.url;

    return {
      url: checkoutUrl,
      orderId: response.paymentLink.orderId || '',
    };
  } catch (error: any) {
    if (error instanceof SquareError) {
      console.error('Square API Error (tip):', error.message);
      throw new Error(`Square API Error: ${error.message}`);
    }
    console.error('Tip payment link creation error:', error);
    throw new Error(error?.message || 'Failed to create tip payment link');
  }
}

/**
 * Verify a Square order is COMPLETED and the total matches the expected amount.
 * Used to confirm tip payments before persisting tipAmount.
 */
export async function verifyTipOrderPaid(
  orderId: string,
  expectedCents: number
): Promise<boolean> {
  try {
    const response = await squareClient.orders.get({ orderId });
    const order = response.order;
    if (!order) return false;
    if (order.state !== 'COMPLETED') return false;
    const paidCents = Number(order.totalMoney?.amount ?? 0);
    return paidCents === expectedCents;
  } catch (error) {
    console.error('Square order verification error:', error);
    return false;
  }
}

export async function processPayment(
  bookingId: number,
  nonce: string,
  amount: number
): Promise<{ success: boolean; paymentId?: string; error?: string }> {
  try {
    const amountInCents = Math.round(amount * 100);

    const response = await squareClient.payments.create({
      sourceId: nonce,
      amountMoney: {
        amount: BigInt(amountInCents),
        currency: 'USD',
      },
      idempotencyKey: generateIdempotencyKey(),
      locationId: process.env.SQUARE_LOCATION_ID!,
      referenceId: `booking-${bookingId}`,
    });

    return {
      success: true,
      paymentId: response.payment?.id,
    };
  } catch (error: any) {
    if (error instanceof SquareError) {
      console.error('Square API Error:', error.message);
      return { success: false, error: `Payment failed: ${error.message}` };
    }
    console.error('Payment processing error:', error);
    return {
      success: false,
      error: error?.message || 'Payment processing failed. Please try again.',
    };
  }
}

export async function verifyPaymentStatus(paymentId: string): Promise<boolean> {
  try {
    const response = await squareClient.payments.get({ paymentId });
    return response.payment?.status === 'COMPLETED';
  } catch (error) {
    console.error('Payment verification error:', error);
    return false;
  }
}

export async function createSquareCustomer(
  email?: string,
  phone?: string,
  name?: string
): Promise<string> {
  try {
    const customerRequest: Record<string, any> = {
      idempotencyKey: generateIdempotencyKey(),
    };

    if (email) customerRequest.emailAddress = email;
    if (phone) customerRequest.phoneNumber = phone;
    if (name) {
      const nameParts = name.split(' ');
      customerRequest.givenName = nameParts[0];
      if (nameParts.length > 1) {
        customerRequest.familyName = nameParts.slice(1).join(' ');
      }
    }

    const response = await squareClient.customers.create(customerRequest);

    if (!response.customer?.id) {
      throw new Error('Failed to create Square customer');
    }

    return response.customer.id;
  } catch (error: any) {
    if (error instanceof SquareError) {
      console.error('Square customer creation error:', error.message);
      throw new Error(`Square API Error: ${error.message}`);
    }
    console.error('Square customer creation error:', error);
    throw new Error(error?.message || 'Failed to create Square customer');
  }
}
