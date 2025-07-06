/*
  # Create menu items table

  1. New Tables
    - `menu_items`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `description` (text, not null)
      - `price` (decimal, not null)
      - `category` (text, not null)
      - `image_url` (text)
      - `is_active` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `menu_items` table
    - Add policies for public read access to active items
    - Add policies for authenticated admin users to manage items
*/

CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  price decimal(10,2) NOT NULL,
  category text NOT NULL,
  image_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active menu items
CREATE POLICY "Public can read active menu items"
  ON menu_items
  FOR SELECT
  TO public
  USING (is_active = true);

-- Allow authenticated admin users to manage menu items
CREATE POLICY "Admins can manage menu items"
  ON menu_items
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS menu_items_category_idx ON menu_items(category);
CREATE INDEX IF NOT EXISTS menu_items_active_idx ON menu_items(is_active);

-- Insert sample menu items
INSERT INTO menu_items (name, description, price, category, image_url) VALUES
  ('Bruschetta Trio', 'Three varieties of our signature bruschetta with fresh tomatoes, basil, and mozzarella', 12.00, 'starters', 'https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg?auto=compress&cs=tinysrgb&w=600'),
  ('Calamari Fritti', 'Crispy fried squid rings served with marinara sauce and lemon wedges', 14.00, 'starters', 'https://images.pexels.com/photos/1640775/pexels-photo-1640775.jpeg?auto=compress&cs=tinysrgb&w=600'),
  ('Antipasto Platter', 'Selection of cured meats, cheeses, olives, and marinated vegetables', 18.00, 'starters', 'https://images.pexels.com/photos/1640776/pexels-photo-1640776.jpeg?auto=compress&cs=tinysrgb&w=600'),
  ('Signature Salmon', 'Pan-seared salmon with roasted vegetables and herb butter sauce', 28.00, 'mains', 'https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg?auto=compress&cs=tinysrgb&w=600'),
  ('Ribeye Steak', 'Grilled 12oz ribeye with garlic mashed potatoes and seasonal vegetables', 35.00, 'mains', 'https://images.pexels.com/photos/1640773/pexels-photo-1640773.jpeg?auto=compress&cs=tinysrgb&w=600'),
  ('Pasta Carbonara', 'House-made pasta with pancetta, eggs, parmesan, and black pepper', 22.00, 'mains', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600'),
  ('Tiramisu', 'Classic Italian dessert with coffee-soaked ladyfingers and mascarpone', 8.00, 'desserts', 'https://images.pexels.com/photos/1640778/pexels-photo-1640778.jpeg?auto=compress&cs=tinysrgb&w=600'),
  ('Chocolate Lava Cake', 'Warm chocolate cake with molten center, served with vanilla ice cream', 10.00, 'desserts', 'https://images.pexels.com/photos/1640779/pexels-photo-1640779.jpeg?auto=compress&cs=tinysrgb&w=600'),
  ('House Wine Selection', 'Red, white, or rosé from our carefully curated wine list', 12.00, 'drinks', 'https://images.pexels.com/photos/1640780/pexels-photo-1640780.jpeg?auto=compress&cs=tinysrgb&w=600'),
  ('Craft Cocktails', 'Handcrafted cocktails made with premium spirits and fresh ingredients', 14.00, 'drinks', 'https://images.pexels.com/photos/1640781/pexels-photo-1640781.jpeg?auto=compress&cs=tinysrgb&w=600');