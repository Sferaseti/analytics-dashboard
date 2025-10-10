'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useFormStatus } from 'react-dom';

export function SubmitButton({ variant }: { variant?: 'stripe' | 'yukassa' }) {
  const { pending } = useFormStatus();

  const getButtonText = () => {
    if (pending) return 'Loading...';
    if (variant === 'yukassa') return 'Pay with YooKassa';
    return 'Pay with Stripe';
  };

  const getButtonStyle = () => {
    if (variant === 'yukassa') {
      return 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600';
    }
    return 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600';
  };

  return (
    <Button
      type="submit"
      disabled={pending}
      className={`w-full rounded-full ${getButtonStyle()}`}
    >
      {pending ? (
        <>
          <Loader2 className="animate-spin mr-2 h-4 w-4" />
          Loading...
        </>
      ) : (
        <>
          {getButtonText()}
          <ArrowRight className="ml-2 h-4 w-4" />
        </>
      )}
    </Button>
  );
}
