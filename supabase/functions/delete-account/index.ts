import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify the caller is authenticated
    const { data: { user }, error: authError } = await adminClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the user's profile to find their shop
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role, shop_id')
      .eq('id', user.id)
      .single();

    // If user is an owner, delete shop-related data
    if (profile?.role === 'owner' && profile?.shop_id) {
      const shopId = profile.shop_id;

      // Delete in order to respect FK constraints
      await adminClient.from('staff_permissions').delete().eq('shop_id', shopId);
      await adminClient.from('staff_invitations').delete().eq('shop_id', shopId);

      // Deactivate staff profiles but don't delete them (they may have their own data)
      await adminClient
        .from('profiles')
        .update({ shop_id: null, is_active: false })
        .eq('shop_id', shopId)
        .neq('id', user.id);

      // Delete shop data tables
      await adminClient.from('products').delete().eq('shop_id', shopId);
      await adminClient.from('sales').delete().eq('shop_id', shopId);
      await adminClient.from('orders').delete().eq('shop_id', shopId);

      // Delete the shop itself
      await adminClient.from('shops').delete().eq('id', shopId);
    }

    // Delete the user's profile
    await adminClient.from('profiles').delete().eq('id', user.id);

    // Delete the auth user (this must be last)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteError) {
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
