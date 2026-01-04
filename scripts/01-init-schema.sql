-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Delivery Zones Table
CREATE TABLE IF NOT EXISTS delivery_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  delivery_window TEXT NOT NULL, -- e.g., '2-4 hours', 'Scheduled'
  delivery_fee DECIMAL(10, 2) DEFAULT 0.00,
  allows_cake BOOLEAN DEFAULT true,
  allows_pizza BOOLEAN DEFAULT true,
  scheduled_only BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_type TEXT NOT NULL CHECK (order_type IN ('cake', 'pizza')),
  fulfilment TEXT NOT NULL CHECK (fulfilment IN ('pickup', 'delivery')),
  status TEXT NOT NULL DEFAULT 'order_received' CHECK (status IN ('order_received', 'in_kitchen', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'cancelled')),
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  delivery_zone_id UUID REFERENCES delivery_zones(id),
  delivery_window TEXT,
  delivery_fee DECIMAL(10, 2) DEFAULT 0.00,
  total_amount DECIMAL(10, 2) DEFAULT 0.00,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'expired')),
  preferred_date DATE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Admin Notes Table
CREATE TABLE IF NOT EXISTS admin_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security (RLS)
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;

-- Policies for public (customers)
CREATE POLICY "Public read access for delivery zones" ON delivery_zones FOR SELECT USING (true);
CREATE POLICY "Public insert access for orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read access for own orders" ON orders FOR SELECT USING (true); -- Filtered by ID/Phone in app
CREATE POLICY "Public insert access for order items" ON order_items FOR INSERT WITH CHECK (true);

-- Admin access (for authenticated users)
CREATE POLICY "Admin full access for delivery_zones" ON delivery_zones USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full access for orders" ON orders USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full access for order_items" ON order_items USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full access for admin_notes" ON admin_notes USING (auth.role() = 'authenticated');
