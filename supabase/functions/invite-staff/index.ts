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
    const { email, role, shop_id } = await req.json();

    if (!email || !role || !shop_id) {
      return new Response(
        JSON.stringify({ error: 'email, role, and shop_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate role
    const validRoles = ['cashier', 'stock_manager', 'delivery'];
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role. Must be cashier, stock_manager, or delivery.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Admin client for privileged operations
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

    // Verify the caller owns the shop
    const { data: shop, error: shopError } = await adminClient
      .from('shops')
      .select('id, name')
      .eq('id', shop_id)
      .eq('owner_id', user.id)
      .single();

    if (shopError || !shop) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: you do not own this shop' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if this email is already a staff member of this shop
    const { data: existingUser } = await adminClient.auth.admin.listUsers();
    const alreadyUser = existingUser?.users.find(u => u.email === email);
    if (alreadyUser) {
      const { data: existingProfile } = await adminClient
        .from('profiles')
        .select('shop_id')
        .eq('id', alreadyUser.id)
        .single();

      if (existingProfile?.shop_id === shop_id) {
        return new Response(
          JSON.stringify({ error: 'This person is already a staff member of this shop.' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Send invite email via Supabase Auth
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        data: { role, shop_id, shop_name: shop.name },
        redirectTo: 'shoptally://auth/accept-invite',
      }
    );

    if (inviteError) {
      return new Response(
        JSON.stringify({ error: inviteError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a staff_invitations record to track the invite
    await adminClient.from('staff_invitations').insert({
      shop_id,
      invitee_email: email,
      role,
      created_by: user.id,
    });

    // Pre-create the profile with the role and shop_id so when they accept the invite,
    // they are immediately associated with the shop
    if (inviteData?.user) {
      await adminClient.from('profiles').upsert({
        id: inviteData.user.id,
        name: email.split('@')[0], // Placeholder name until they set it
        role,
        shop_id,
        is_active: true,
      }, { onConflict: 'id' });

      // Create default staff permissions
      await adminClient.from('staff_permissions').insert({
        staff_id: inviteData.user.id,
        shop_id,
        can_access_dashboard: true,
        can_access_products: role === 'stock_manager',
        can_access_marketplace: false,
        can_access_orders: role === 'delivery' || role === 'cashier',
        can_access_sales: role === 'cashier',
        can_access_reports: false,
        can_access_staff: false,
        can_access_settings: false,
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: `Invite sent to ${email}` }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
