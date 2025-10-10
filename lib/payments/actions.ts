'use server';

import { redirect } from 'next/navigation';
import { createCheckoutSession, createCustomerPortalSession } from './stripe';
import { createYooKassaCheckoutSession } from './yukassa';
import { withTeam } from '@/lib/auth/middleware';

export const checkoutAction = withTeam(async (formData, team) => {
  const priceId = formData.get('priceId') as string;
  const paymentMethod = formData.get('paymentMethod') as string;

  if (paymentMethod === 'yukassa') {
    // For YooKassa, we need to determine the price based on priceId
    // This is a simplified example - you might want to store prices in your database
    const priceMap: Record<string, number> = {
      'base': 80000, // 800 rubles in kopecks
      'plus': 120000, // 1200 rubles in kopecks
    };
    
    const amount = priceMap[priceId] || 80000;
    await createYooKassaCheckoutSession({ team, priceId, amount });
  } else {
    // Default to Stripe
    await createCheckoutSession({ team: team, priceId });
  }
});

export const customerPortalAction = withTeam(async (_, team) => {
  const portalSession = await createCustomerPortalSession(team);
  redirect(portalSession.url);
});
