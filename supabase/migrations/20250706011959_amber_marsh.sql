/*
  # Create Menu Orders System

  1. New Tables
    - `menu_orders`
      - `id` (uuid, primary key)
      - `customer_name` (text)
      - `customer_phone` (text, not null)
      - `items_ordered` (jsonb, not null)
      - `total_price` (numeric(10,2), not null)
      - `channel` (text, default 'SMS')
      - `status` (text, default 'pending')
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Table Modifications
    - Add `category` column to `menu_items`
    - Rename `media_url` to `image_url` in `menu_items`
    - Rename `active` to `is_active` in `menu_items`

  3. Security
    - Enable RLS on `menu_orders` table
    - Add policies for public order creation and authenticated management
    - Update policies for modified `menu_items` columns

  4. Performance
    - Add indexes for better query performance
    - Create trigger for auto-updating `updated_at` column
*/

-- 1. Modify menu_items table
-- Add category column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'menu_items' AND column_name = 'category'
  ) THEN
    ALTER TABLE public.menu_items ADD COLUMN category text;
  END IF;
END $$;

-- Rename media_url to image_url if media_url exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'menu_items' AND column_name = 'media_url'
  ) THEN
    ALTER TABLE public.menu_items RENAME COLUMN media_url TO image_url;
  END IF;
END $$;

-- Rename active to is_active if active exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'menu_items' AND column_name = 'active'
  ) THEN
    ALTER TABLE public.menu_items RENAME COLUMN active TO is_active;
  END IF;
END $$;

-- 2. Create menu_orders table for SMS/WhatsApp orders
CREATE TABLE IF NOT EXISTS public.menu_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text,
  customer_phone text NOT NULL,
  items_ordered jsonb NOT NULL,
  total_price numeric(10,2) NOT NULL,
  channel text DEFAULT 'SMS' CHECK (channel IN ('SMS', 'WhatsApp')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Enable Row Level Security for menu_orders
ALTER TABLE public.menu_orders ENABLE ROW LEVEL SECURITY;

-- 4. Create policies for menu_orders
-- Public can create orders (for anonymous SMS/WhatsApp orders)
CREATE POLICY "Public can create menu orders"
  ON public.menu_orders
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Authenticated users can read all menu orders
CREATE POLICY "Authenticated can read all menu orders"
  ON public.menu_orders
  FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can update menu orders
CREATE POLICY "Authenticated can update menu orders"
  ON public.menu_orders
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Authenticated users can delete menu orders (for cleanup)
CREATE POLICY "Authenticated can delete menu orders"
  ON public.menu_orders
  FOR DELETE
  TO authenticated
  USING (true);

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS menu_orders_status_idx ON public.menu_orders(status);
CREATE INDEX IF NOT EXISTS menu_orders_created_at_idx ON public.menu_orders(created_at);
CREATE INDEX IF NOT EXISTS menu_orders_phone_idx ON public.menu_orders(customer_phone);
CREATE INDEX IF NOT EXISTS menu_orders_channel_idx ON public.menu_orders(channel);

-- 6. Create or update function to handle updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. Create trigger for menu_orders updated_at
CREATE TRIGGER update_menu_orders_updated_at
  BEFORE UPDATE ON public.menu_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Ensure menu_items has proper indexes on new/renamed columns
CREATE INDEX IF NOT EXISTS menu_items_category_idx ON public.menu_items(category);
CREATE INDEX IF NOT EXISTS menu_items_is_active_idx ON public.menu_items(is_active);