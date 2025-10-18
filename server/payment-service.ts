import { randomBytes } from 'crypto';
import { Service, Booking } from '@shared/schema';

// Square is imported directly rather than through dynamic imports to avoid TypeScript errors
const square = require('square');
const { Client, Environment } = square;

// Initialize the Square client
const isSandbox = process.env.SQUARE_ACCESS_TOKEN?.startsWith('sandbox');
const squareClient = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN || '',
  environment: isSandbox ? Environment.Sandbox : Environment.Production
});

// Function to generate a unique idempotency key
function generateIdempotencyKey(): string {
  return randomBytes(16).toString('hex');
}

// Create a payment link for a booking
export async function createPaymentLink(
  booking: Booking,
  service: Service
): Promise<{ url: string; orderId: string }> {
  try {
    // Format amount in cents for Square
    const amount = service.price;
    const amountInCents = Math.round(amount * 100);
    
    // Create an order with Square
    const orderResponse = await squareClient.ordersApi.createOrder({
      order: {
        locationId: process.env.SQUARE_LOCATION_ID!,
        lineItems: [
          {
            name: service.name,
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
    
    if (!orderResponse.result.order?.id) {
      throw new Error('Failed to create order in Square');
    }
    
    const orderId = orderResponse.result.order.id;
    
    // Create a checkout link for the order
    const checkoutResponse = await squareClient.checkoutApi.createPaymentLink({
      idempotencyKey: generateIdempotencyKey(),
      quickPay: {
        name: `Dapper - ${service.name}`,
        locationId: process.env.SQUARE_LOCATION_ID!,
        priceMoney: {
          amount: BigInt(amountInCents),
          currency: "USD"
        }
      },
      order: {
        orderId: orderId
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
      orderId: orderId
    };
  } catch (error: any) {
    console.error('Payment link creation error:', error);
    throw new Error(error?.message || 'Failed to create payment link');
  }
}

// Process a payment directly (for in-app payments)
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
    
    if (response.result.payment?.id) {
      return {
        success: true,
        paymentId: response.result.payment.id
      };
    } else {
      return {
        success: false,
        error: 'Payment was not completed'
      };
    }
  } catch (error: any) {
    console.error('Payment processing error:', error);
    
    // Check for Square API errors
    if (error.result && error.result.errors) {
      return {
        success: false,
        error: `Payment failed: ${error.result.errors[0]?.detail || 'Unknown error'}`
      };
    }
    
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

// Create or get a Square Customer
export async function createSquareCustomer(
  email?: string,
  phone?: string,
  name?: string
): Promise<string> {
  try {
    const customerRequest: any = {
      idempotencyKey: generateIdempotencyKey()
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

    const response = await squareClient.customersApi.createCustomer(customerRequest);
    
    if (!response.result.customer?.id) {
      throw new Error('Failed to create Square customer');
    }
    
    return response.result.customer.id;
  } catch (error: any) {
    console.error('Square customer creation error:', error);
    throw new Error(error?.message || 'Failed to create Square customer');
  }
}