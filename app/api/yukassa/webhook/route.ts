import { NextRequest, NextResponse } from 'next/server';
import { handleYooKassaWebhook } from '@/lib/payments/yukassa';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const event = JSON.parse(body);

    // Verify webhook signature (optional but recommended)
    // You can implement signature verification here if needed
    
    await handleYooKassaWebhook(event);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing YooKassa webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 400 }
    );
  }
}