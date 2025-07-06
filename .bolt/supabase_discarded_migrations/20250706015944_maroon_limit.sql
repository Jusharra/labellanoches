/*
# Add sample menu items

1. Sample Data
   - Add starter, main, dessert, and drink items
   - Each item has proper category, pricing, and images
   - All items are active by default

2. Data Structure
   - Uses proper field names (image_url, is_active)
   - Includes realistic pricing and descriptions
   - Covers all menu categories
*/

-- Insert sample menu items if the table is empty
INSERT INTO public.menu_items (name, description, price, category, image_url, is_active, created_at, updated_at)
SELECT * FROM (VALUES
  -- Starters
  ('Bruschetta Trio', 'Three varieties of our signature bruschetta with fresh tomatoes, basil, and mozzarella', 12.00, 'starters', 'https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg?auto=compress&cs=tinysrgb&w=600', true, now(), now()),
  ('Calamari Fritti', 'Crispy fried squid rings served with marinara sauce and lemon wedges', 14.00, 'starters', 'https://images.pexels.com/photos/1640775/pexels-photo-1640775.jpeg?auto=compress&cs=tinysrgb&w=600', true, now(), now()),
  ('Antipasto Platter', 'Selection of cured meats, cheeses, olives, and marinated vegetables', 18.00, 'starters', 'https://images.pexels.com/photos/1640776/pexels-photo-1640776.jpeg?auto=compress&cs=tinysrgb&w=600', true, now(), now()),
  
  -- Main Courses
  ('Signature Salmon', 'Pan-seared salmon with roasted vegetables and herb butter sauce', 28.00, 'mains', 'https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg?auto=compress&cs=tinysrgb&w=600', true, now(), now()),
  ('Ribeye Steak', 'Grilled 12oz ribeye with garlic mashed potatoes and seasonal vegetables', 35.00, 'mains', 'https://images.pexels.com/photos/1640773/pexels-photo-1640773.jpeg?auto=compress&cs=tinysrgb&w=600', true, now(), now()),
  ('Pasta Carbonara', 'House-made pasta with pancetta, eggs, parmesan, and black pepper', 22.00, 'mains', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', true, now(), now()),
  ('Mediterranean Chicken', 'Herb-crusted chicken breast with roasted vegetables and tzatziki', 24.00, 'mains', 'https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?auto=compress&cs=tinysrgb&w=600', true, now(), now()),
  
  -- Desserts
  ('Tiramisu', 'Classic Italian dessert with coffee-soaked ladyfingers and mascarpone', 8.00, 'desserts', 'https://images.pexels.com/photos/1640778/pexels-photo-1640778.jpeg?auto=compress&cs=tinysrgb&w=600', true, now(), now()),
  ('Chocolate Lava Cake', 'Warm chocolate cake with molten center, served with vanilla ice cream', 10.00, 'desserts', 'https://images.pexels.com/photos/1640779/pexels-photo-1640779.jpeg?auto=compress&cs=tinysrgb&w=600', true, now(), now()),
  ('Panna Cotta', 'Silky vanilla custard with fresh berry compote', 9.00, 'desserts', 'https://images.pexels.com/photos/3026804/pexels-photo-3026804.jpeg?auto=compress&cs=tinysrgb&w=600', true, now(), now()),
  
  -- Drinks
  ('House Wine Selection', 'Red, white, or rosé from our carefully curated wine list', 12.00, 'drinks', 'https://images.pexels.com/photos/1640780/pexels-photo-1640780.jpeg?auto=compress&cs=tinysrgb&w=600', true, now(), now()),
  ('Craft Cocktails', 'Handcrafted cocktails made with premium spirits and fresh ingredients', 14.00, 'drinks', 'https://images.pexels.com/photos/1640781/pexels-photo-1640781.jpeg?auto=compress&cs=tinysrgb&w=600', true, now(), now()),
  ('Italian Sodas', 'Refreshing sparkling beverages with natural fruit flavors', 6.00, 'drinks', 'https://images.pexels.com/photos/1546052/pexels-photo-1546052.jpeg?auto=compress&cs=tinysrgb&w=600', true, now(), now()),
  ('Espresso & Coffee', 'Premium Italian espresso, cappuccino, and specialty coffee drinks', 5.00, 'drinks', 'https://images.pexels.com/photos/1755385/pexels-photo-1755385.jpeg?auto=compress&cs=tinysrgb&w=600', true, now(), now())
) AS sample_items(name, description, price, category, image_url, is_active, created_at, updated_at)
WHERE NOT EXISTS (SELECT 1 FROM public.menu_items LIMIT 1);