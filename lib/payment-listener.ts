import { supabase } from './supabase';

export interface IncomingPayment {
  payment_id: string;
  reference: string;
  amount: number;
  provider: string;
  status: string;
}

/**
 * Subscribe to Supabase Realtime broadcasts for incoming payments.
 * The webhook Edge Function broadcasts on channel `payments:{shopId}`.
 *
 * @returns unsubscribe function — call on cleanup
 */
export function startPaymentListener(
  shopId: string,
  onPayment: (payment: IncomingPayment) => void,
): () => void {
  const channel = supabase
    .channel(`payments:${shopId}`)
    .on('broadcast', { event: 'payment_received' }, ({ payload }) => {
      onPayment(payload as IncomingPayment);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
