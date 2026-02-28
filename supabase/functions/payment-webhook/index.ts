// Moniepoint (and OPay/PalmPay) payment webhook handler
// Receives POST notifications when a payment is made to a shop's virtual account,
// writes to the payments table, and broadcasts a realtime event to the shop owner's app.
//
// Deploy: supabase functions deploy payment-webhook
// Set env: MONIEPOINT_WEBHOOK_SECRET (optional — enables HMAC-SHA256 verification)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-moniepoint-signature, x-opay-signature, x-palmpay-signature',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const rawBody = await req.text();
    const webhookSecret = Deno.env.get('MONIEPOINT_WEBHOOK_SECRET');

    // HMAC-SHA256 signature verification — only runs when secret is configured.
    // When MONIEPOINT_WEBHOOK_SECRET is not set, all POSTs are accepted.
    // This allows the feature to work during the credential-less build phase.
    if (webhookSecret) {
      const signature =
        req.headers.get('x-moniepoint-signature') ??
        req.headers.get('x-opay-signature') ??
        req.headers.get('x-palmpay-signature') ?? '';

      const expected = 'sha256=' + createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (signature !== expected) {
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const payload = JSON.parse(rawBody);

    // Normalise field names across providers:
    // Moniepoint: { reference, amount, account_number, provider?, status? }
    // OPay:       { orderNo, amount, accountNo, ... }  (mapped below)
    const reference: string =
      payload.reference ?? payload.orderNo ?? payload.transactionReference;
    const amount: number = parseFloat(
      payload.amount ?? payload.orderAmount ?? '0',
    );
    const accountNumber: string =
      payload.account_number ?? payload.accountNo ?? payload.virtualAccountNo;
    const provider: string =
      payload.provider ?? payload.channel ?? 'moniepoint';
    const status: string =
      payload.status === 'SUCCESS' || payload.status === 'confirmed' || !payload.status
        ? 'confirmed'
        : 'failed';

    if (!reference || !amount || !accountNumber) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: reference, amount, account_number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Find the shop that owns this virtual account number
    const { data: shop, error: shopError } = await adminClient
      .from('shops')
      .select('id, owner_id')
      .eq('virtual_account_number', accountNumber)
      .eq('virtual_account_is_active', true)
      .single();

    if (shopError || !shop) {
      return new Response(
        JSON.stringify({ error: 'No active shop found for this account number' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Idempotency: if this reference was already processed, return 200 so the
    // provider does not retry endlessly.
    const { data: existing } = await adminClient
      .from('payments')
      .select('id')
      .eq('reference', reference)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ success: true, already_processed: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Insert the payment record
    const { data: payment, error: insertError } = await adminClient
      .from('payments')
      .insert({
        shop_id: shop.id,
        provider,
        reference,
        amount,
        status,
        raw_payload: payload,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Broadcast realtime event — the app listens on channel `payments:{shop_id}`
    await adminClient
      .channel(`payments:${shop.id}`)
      .send({
        type: 'broadcast',
        event: 'payment_received',
        payload: {
          payment_id: payment.id,
          reference,
          amount,
          provider,
          status,
        },
      });

    return new Response(
      JSON.stringify({ success: true, payment_id: payment.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
