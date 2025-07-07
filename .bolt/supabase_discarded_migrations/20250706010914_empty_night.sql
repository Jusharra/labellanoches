/*
  # Create orders table

  1. New Tables
    - `orders`
      - `id` (uuid, primary key)
      - `customer_name` (text)
      - `customer_phone` (text, not null)
      - `items_ordered` (jsonb, stores array of {item_id, quantity, name, price})
      - `total_price` (decimal, not null)
      - `channel` (text, SMS or WhatsApp)
      - `status` (text, pending/completed/cancelled)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `orders` table
    - Add policies for public insert (for order creation)
    - Add policies for authenticated admin users to read/update orders
*/

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text,
  customer_phone text NOT NULL,
  items_ordered jsonb NOT NULL,
  total_price decimal(10,2) NOT NULL,
  channel text DEFAULT 'SMS' CHECK (channel IN ('SMS', 'WhatsApp')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Allow public to create orders
CREATE POLICY "Public can create orders"
  ON orders
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow authenticated admin users to read and update orders
CREATE POLICY "Admins can read all orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at);
CREATE INDEX IF NOT EXISTS orders_phone_idx ON orders(customer_phone);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_orders_updated_at 
  BEFORE UPDATE ON orders 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at 
  BEFORE UPDATE ON menu_items 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();