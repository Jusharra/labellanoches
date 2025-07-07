/*
  # Create orders table for order processing

  1. New Tables
    - `orders`
      - `id` (uuid, primary key)
      - `customer_name` (text, optional)
      - `customer_phone` (text, required)
      - `items_ordered` (jsonb, contains array of {id, name, price, quantity})
      - `total_price` (decimal, calculated total)
      - `channel` (text, SMS or WhatsApp)
      - `status` (text, pending/completed/cancelled)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `orders` table
    - Add policy for public to create orders
    - Add policies for authenticated users to read and update orders

  3. Indexes
    - Add indexes for status, created_at, and customer_phone for better performance

  4. Triggers
    - Add trigger to automatically update updated_at timestamp
*/

-- Create orders table
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

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can create orders"
  ON orders
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read all orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at);
CREATE INDEX IF NOT EXISTS orders_phone_idx ON orders(customer_phone);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at for orders table only
CREATE TRIGGER update_orders_updated_at_trigger
  BEFORE UPDATE ON orders 
  FOR EACH ROW EXECUTE FUNCTION update_orders_updated_at();