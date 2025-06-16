// Import Square SDK
import { Client, Environment } from 'squareconnect';
import { randomBytes } from 'crypto';
import { BookingFormData } from '@shared/schema';

// Define ApiError type for error handling
type ApiError = {
  result: {
    errors?: Array<{
      detail?: string;
    }>;
  };
};

// Initialize the Square client
const { accessToken, environment } = getSquareCredentials();
export const squareClient = new Client({
  accessToken,
  environment
});

function getSquareCredentials() {
  // Check if we're using sandbox or production credentials
  const isSandbox = process.env.SQUARE_ACCESS_TOKEN?.startsWith('sandbox');
  
  return {
    accessToken: process.env.SQUARE_ACCESS_TOKEN || '',
    environment: isSandbox ? Environment.Sandbox : Environment.Production
  };
}

// Function to generate a unique idempotency key
function generateIdempotencyKey(): string {
  return randomBytes(16).toString('hex');
}

// Create a payment link for a booking
export async function createPaymentLink(booking: {
  id: number;
  userId: number;
  serviceId: number;
  price: number;
  serviceName: string;
}): Promise<{ url: string; orderId: string }> {
  try {
    // Format amount in cents for Square
    const amountInCents = Math.round(booking.price * 100);
    
    // Create an order with Square
    const { result } = await squareClient.ordersApi.createOrder({
      order: {
        locationId: process.env.SQUARE_LOCATION_ID!,
        lineItems: [
          {
            name: booking.serviceName,
            quantity: "1",
            basePriceMoney: {
              amount: BigInt(amountInCents),
              currency: "USD"
            }
          }
        ],
        state: "OPEN",
        referenceId: `booking-${booking.id}`
      },
      idempotencyKey: generateIdempotencyKey()
    });
    
    if (!result.order?.id) {
      throw new Error('Failed to create order in Square');
    }
    
    // Create a checkout link for the order
    const checkoutResponse = await squareClient.checkoutApi.createPaymentLink({
      idempotencyKey: generateIdempotencyKey(),
      quickPay: {
        name: `Dapper - ${booking.serviceName}`,
        locationId: process.env.SQUARE_LOCATION_ID!,
        priceMoney: {
          amount: BigInt(amountInCents),
          currency: "USD"
        }
      },
      order: {
        orderId: result.order.id
      },
      checkoutOptions: {
        redirectUrl: `${process.env.SITE_URL || 'http://localhost:5000'}/payment-success?booking=${booking.id}`
      }
    });
    
    if (!checkoutResponse.result.paymentLink?.url) {
      throw new Error('Failed to create payment link in Square');
    }
    
    return {
      url: checkoutResponse.result.paymentLink.url,
      orderId: result.order.id
    };
  } catch (error: any) {
    if (error instanceof ApiError) {
      console.error('Square API Error:', error.result);
      throw new Error(`Square API Error: ${JSON.stringify(error.result)}`);
    }
    console.error('Payment link creation error:', error);
    throw new Error(error?.message || 'Unknown payment error');
  }
}

// Process a payment for a booking
export async function processPayment(
  bookingId: number, 
  nonce: string, 
  amount: number
): Promise<{ success: boolean; paymentId?: string; error?: string }> {
  try {
    const amountInCents = Math.round(amount * 100);
    
    const response = await squareClient.paymentsApi.createPayment({
      sourceId: nonce,
      amountMoney: {
        amount: BigInt(amountInCents),
        currency: 'USD'
      },
      idempotencyKey: generateIdempotencyKey(),
      locationId: process.env.SQUARE_LOCATION_ID!,
      referenceId: `booking-${bookingId}`
    });
    
    return {
      success: true,
      paymentId: response.result.payment?.id
    };
  } catch (error: any) {
    if (error && typeof error === 'object' && 'result' in error) {
      console.error('Square API Error:', error.result);
      return {
        success: false,
        error: `Payment failed: ${error.result?.errors?.[0]?.detail || 'Unknown error'}`
      };
    }
    
    console.error('Payment processing error:', error);
    return {
      success: false,
      error: error?.message || 'Payment processing failed. Please try again.'
    };
  }
}

// Verify a payment status
export async function verifyPaymentStatus(paymentId: string): Promise<boolean> {
  try {
    const response = await squareClient.paymentsApi.getPayment(paymentId);
    return response.result.payment?.status === 'COMPLETED';
  } catch (error) {
    console.error('Payment verification error:', error);
    return false;
  }
}