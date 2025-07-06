/*
  # Create menu orders table for SMS/WhatsApp ordering

  1. New Tables
    - `menu_orders`
      - `id` (uuid, primary key)
      - `customer_name` (text, optional)
      - `customer_phone` (text, required)
      - `items_ordered` (jsonb, required - stores array of ordered items)
      - `total_price` (decimal, required)
      - `channel` (text, SMS or WhatsApp)
      - `status` (text, pending/completed/cancelled)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `menu_orders` table
    - Add policy for public to create orders (for SMS/WhatsApp integration)
    - Add policies for authenticated users to read and update orders

  3. Performance
    - Add indexes on commonly queried columns (status, created_at, phone)
    - Add trigger to auto-update updated_at timestamp
*/

-- Create menu_orders table specifically for SMS/WhatsApp orders
CREATE TABLE IF NOT EXISTS menu_orders (
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

-- Enable RLS
ALTER TABLE menu_orders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can create menu orders"
  ON menu_orders
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read all menu orders"
  ON menu_orders
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update menu orders"
  ON menu_orders
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS menu_orders_status_idx ON menu_orders(status);
CREATE INDEX IF NOT EXISTS menu_orders_created_at_idx ON menu_orders(created_at);
CREATE INDEX IF NOT EXISTS menu_orders_phone_idx ON menu_orders(customer_phone);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_menu_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at for menu_orders table
CREATE TRIGGER update_menu_orders_updated_at_trigger
  BEFORE UPDATE ON menu_orders 
  FOR EACH ROW EXECUTE FUNCTION update_menu_orders_updated_at();