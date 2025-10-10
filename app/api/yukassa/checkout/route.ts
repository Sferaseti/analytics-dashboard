import { NextRequest, NextResponse } from 'next/server';
import { yukassaClient } from '@/lib/payments/yukassa';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.redirect(new URL('/pricing?error=no_session', request.url));
    }

    // Get payment details from YooKassa
    const payment = await yukassaClient.getPayment(sessionId);

    if (payment.status === 'succeeded') {
      // Payment successful - redirect to success page
      return NextResponse.redirect(new URL('/pricing?success=true', request.url));
    } else if (payment.status === 'canceled') {
      // Payment canceled - redirect to pricing with error
      return NextResponse.redirect(new URL('/pricing?error=canceled', request.url));
    } else {
      // Payment pending or other status - redirect to pricing
      return NextResponse.redirect(new URL('/pricing?error=pending', request.url));
    }
  } catch (error) {
    console.error('Error processing YooKassa checkout return:', error);
    return NextResponse.redirect(new URL('/pricing?error=processing', request.url));
  }
}