import { redirect } from 'next/navigation';
import { Team } from '@/lib/db/schema';
import { getUser, updateTeamSubscription } from '@/lib/db/queries';

const YOOKASSA_API_URL = 'https://api.yookassa.ru/v3';
const YOOKASSA_SHOP_ID = process.env.YOOKASSA_SHOP_ID || '';
const YOOKASSA_SECRET_KEY = process.env.YOOKASSA_SECRET_KEY || '';

interface YooKassaPayment {
  id: string;
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled';
  amount: { value: string; currency: string };
  description?: string;
  metadata?: Record<string, string>;
  confirmation?: { type: string; confirmation_url: string };
}

function getAuthHeader(): string {
  return `Basic ${Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString('base64')}`;
}

function generateIdempotenceKey(): string {
  return crypto.randomUUID();
}

export async function createYooKassaCheckoutSession({
  team,
  priceId,
  amount,
}: {
  team: Team | null;
  priceId: string;
  amount: number;
}) {
  const user = await getUser();

  if (!team || !user) {
    redirect(`/sign-up?redirect=checkout&priceId=${priceId}`);
  }

  if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY) {
    console.error('YooKassa credentials are not configured');
    redirect('/pricing?error=payment_not_configured');
  }

  const response = await fetch(`${YOOKASSA_API_URL}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': getAuthHeader(),
      'Idempotence-Key': generateIdempotenceKey(),
    },
    body: JSON.stringify({
      amount: {
        value: (amount / 100).toFixed(2),
        currency: 'RUB',
      },
      capture: true,
      confirmation: {
        type: 'redirect',
        return_url: `${process.env.BASE_URL || 'http://localhost:3000'}/api/yukassa/callback?team_id=${team.id}`,
      },
      description: `Подписка на план ${priceId} для команды ${team.name || team.id}`,
      metadata: {
        team_id: team.id.toString(),
        user_id: user.id.toString(),
        price_id: priceId,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('YooKassa payment creation failed:', error);
    redirect('/pricing?error=payment_failed');
  }

  const payment = await response.json();
  redirect(payment.confirmation.confirmation_url);
}

export const yukassaClient = {
  async getPayment(paymentId: string): Promise<YooKassaPayment> {
    return getYooKassaPayment(paymentId);
  },

  async createPayment(params: {
    amount: number;
    currency?: string;
    description?: string;
    returnUrl: string;
    metadata?: Record<string, string>;
  }): Promise<YooKassaPayment> {
    const response = await fetch(`${YOOKASSA_API_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader(),
        'Idempotence-Key': generateIdempotenceKey(),
      },
      body: JSON.stringify({
        amount: {
          value: (params.amount / 100).toFixed(2),
          currency: params.currency || 'RUB',
        },
        capture: true,
        confirmation: {
          type: 'redirect',
          return_url: params.returnUrl,
        },
        description: params.description,
        metadata: params.metadata,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`YooKassa payment creation failed: ${error}`);
    }

    return response.json();
  },
};

export async function handleYooKassaWebhook(event: {
  type: string;
  event: string;
  object: YooKassaPayment;
}) {
  const payment = event.object;

  if (!payment?.metadata?.team_id) {
    console.error('No team_id in payment metadata');
    return;
  }

  const teamId = parseInt(payment.metadata.team_id, 10);

  if (payment.status === 'succeeded') {
    await updateTeamSubscription(teamId, {
      stripeSubscriptionId: `yk_${payment.id}`,
      stripeProductId: payment.metadata.price_id || null,
      planName: payment.metadata.price_id === 'plus' ? 'Plus' : 'Base',
      subscriptionStatus: 'active',
    });
  } else if (payment.status === 'canceled') {
    await updateTeamSubscription(teamId, {
      stripeSubscriptionId: null,
      stripeProductId: null,
      planName: null,
      subscriptionStatus: 'canceled',
    });
  }
}

export async function getYooKassaPayment(paymentId: string): Promise<YooKassaPayment> {
  const response = await fetch(`${YOOKASSA_API_URL}/payments/${paymentId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': getAuthHeader(),
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get payment: ${response.statusText}`);
  }

  return response.json();
}

export async function captureYooKassaPayment(paymentId: string, amount: number) {
  const response = await fetch(`${YOOKASSA_API_URL}/payments/${paymentId}/capture`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': getAuthHeader(),
      'Idempotence-Key': generateIdempotenceKey(),
    },
    body: JSON.stringify({
      amount: {
        value: (amount / 100).toFixed(2),
        currency: 'RUB',
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to capture payment: ${response.statusText}`);
  }

  return response.json();
}
