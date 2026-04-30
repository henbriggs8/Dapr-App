import { SquareClient, SquareEnvironment, SquareError } from 'square';
import { randomBytes } from 'crypto';

function generateIdempotencyKey(): string {
  return randomBytes(16).toString('hex');
}

const isSandbox = !process.env.SQUARE_ACCESS_TOKEN ||
  process.env.SQUARE_ACCESS_TOKEN.startsWith('sandbox');

export const squareClient = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN || '',
  environment: isSandbox ? SquareEnvironment.Sandbox : SquareEnvironment.Production,
});

export async function createPaymentLink(booking: {
  id: number;
  userId: number;
  serviceId: number;
  price: number;
  serviceName: string;
}): Promise<{ url: string; orderId: string }> {
  try {
    const amountInCents = Math.round(booking.price * 100);

    const response = await squareClient.checkout.paymentLinks.create({
      idempotencyKey: generateIdempotencyKey(),
      quickPay: {
        name: `Dapr - ${booking.serviceName}`,
        locationId: process.env.SQUARE_LOCATION_ID!,
        priceMoney: {
          amount: BigInt(amountInCents),
          currency: 'USD',
        },
      },
      checkoutOptions: {
        redirectUrl: `${process.env.SITE_URL || 'http://localhost:5000'}/payment-success?booking=${booking.id}`,
      },
    });

    if (!response.paymentLink?.url) {
      throw new Error('Failed to create payment link in Square');
    }

    return {
      url: response.paymentLink.url,
      orderId: response.paymentLink.orderId || '',
    };
  } catch (error: any) {
    if (error instanceof SquareError) {
      console.error('Square API Error:', error.message);
      throw new Error(`Square API Error: ${error.message}`);
    }
    console.error('Payment link creation error:', error);
    throw new Error(error?.message || 'Unknown payment error');
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
