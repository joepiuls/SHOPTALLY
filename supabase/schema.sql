-- =============================================
-- ShopTally Supabase Schema & RLS Policies
-- Run this in the Supabase SQL editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- TABLES
-- =============================================

-- shops table
CREATE TABLE IF NOT EXISTS shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  bio TEXT DEFAULT '',
  logo_url TEXT,
  banner_url TEXT,
  accent_color TEXT DEFAULT '#C2410C',
  slug TEXT,
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  delivery_radius INTEGER DEFAULT 5,
  opening_hours JSONB DEFAULT '[]'::jsonb,
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'ha')),
  owner_id UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'owner'
    CHECK (role IN ('owner', 'cashier', 'stock_manager', 'delivery')),
  shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- staff_permissions table
CREATE TABLE IF NOT EXISTS staff_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE NOT NULL,
  can_access_dashboard BOOLEAN DEFAULT true,
  can_access_products BOOLEAN DEFAULT false,
  can_access_marketplace BOOLEAN DEFAULT false,
  can_access_orders BOOLEAN DEFAULT false,
  can_access_sales BOOLEAN DEFAULT false,
  can_access_reports BOOLEAN DEFAULT false,
  can_access_staff BOOLEAN DEFAULT false,
  can_access_settings BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (staff_id, shop_id)
);

-- staff_invitations table
CREATE TABLE IF NOT EXISTS staff_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE NOT NULL,
  invitee_email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'cashier'
    CHECK (role IN ('cashier', 'stock_manager', 'delivery')),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_by UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- products table (for Supabase sync)
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  image_uri TEXT,
  category TEXT DEFAULT '',
  is_marketplace BOOLEAN DEFAULT false,
  marketplace_listing JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- sales table (for Supabase sync)
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  change NUMERIC NOT NULL DEFAULT 0,
  is_credit BOOLEAN DEFAULT false,
  customer_name TEXT,
  staff_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- orders table (for Supabase sync)
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total NUMERIC NOT NULL DEFAULT 0,
  customer_name TEXT NOT NULL DEFAULT '',
  customer_phone TEXT DEFAULT '',
  delivery_address TEXT DEFAULT '',
  status TEXT DEFAULT 'new'
    CHECK (status IN ('new', 'accepted', 'preparing', 'ready', 'delivered')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TRIGGERS
-- =============================================

-- Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    'owner'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shops_updated_at
  BEFORE UPDATE ON shops
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER staff_permissions_updated_at
  BEFORE UPDATE ON staff_permissions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- SHOPS policies
CREATE POLICY "owners_manage_shop" ON shops
  FOR ALL USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "staff_read_shop" ON shops
  FOR SELECT USING (
    id IN (
      SELECT shop_id FROM profiles
      WHERE id = auth.uid() AND shop_id IS NOT NULL
    )
  );

-- PROFILES policies
CREATE POLICY "users_own_profile" ON profiles
  FOR ALL USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "owners_read_staff_profiles" ON profiles
  FOR SELECT USING (
    shop_id IN (
      SELECT id FROM shops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "owners_update_staff_profiles" ON profiles
  FOR UPDATE USING (
    shop_id IN (
      SELECT id FROM shops WHERE owner_id = auth.uid()
    )
  );

-- STAFF_PERMISSIONS policies
CREATE POLICY "owners_manage_permissions" ON staff_permissions
  FOR ALL USING (
    shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
  );

CREATE POLICY "staff_read_own_permissions" ON staff_permissions
  FOR SELECT USING (staff_id = auth.uid());

-- STAFF_INVITATIONS policies
CREATE POLICY "owners_manage_invitations" ON staff_invitations
  FOR ALL USING (
    shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
  );

-- PRODUCTS policies
CREATE POLICY "shop_members_access_products" ON products
  FOR ALL USING (
    shop_id IN (
      SELECT shop_id FROM profiles
      WHERE id = auth.uid() AND shop_id IS NOT NULL
    ) OR
    shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    shop_id IN (
      SELECT shop_id FROM profiles
      WHERE id = auth.uid() AND shop_id IS NOT NULL
    ) OR
    shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
  );

-- SALES policies
CREATE POLICY "shop_members_access_sales" ON sales
  FOR ALL USING (
    shop_id IN (
      SELECT shop_id FROM profiles
      WHERE id = auth.uid() AND shop_id IS NOT NULL
    ) OR
    shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    shop_id IN (
      SELECT shop_id FROM profiles
      WHERE id = auth.uid() AND shop_id IS NOT NULL
    ) OR
    shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
  );

-- ORDERS policies
CREATE POLICY "shop_members_access_orders" ON orders
  FOR ALL USING (
    shop_id IN (
      SELECT shop_id FROM profiles
      WHERE id = auth.uid() AND shop_id IS NOT NULL
    ) OR
    shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    shop_id IN (
      SELECT shop_id FROM profiles
      WHERE id = auth.uid() AND shop_id IS NOT NULL
    ) OR
    shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
  );
