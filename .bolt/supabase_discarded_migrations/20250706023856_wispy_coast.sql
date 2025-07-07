/*
  # Fix Menu Categories and Add Proper Restaurant Items

  1. Clear existing menu items that don't match restaurant categories
  2. Add proper restaurant menu items with correct categories
  3. Ensure categories align between admin and public views
*/

-- Clear existing menu items to start fresh
TRUNCATE public.menu_items RESTART IDENTITY CASCADE;

-- Insert proper restaurant menu items with correct categories
INSERT INTO public.menu_items (name, description, price, category, image_url, is_active) VALUES
-- Starters
('Bruschetta Trio', 'Three varieties of our signature bruschetta with fresh tomatoes, basil, and mozzarella', 12.00, 'starters', 'https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg?auto=compress&cs=tinysrgb&w=600', true),
('Calamari Fritti', 'Crispy fried squid rings served with marinara sauce and lemon wedges', 14.00, 'starters', 'https://images.pexels.com/photos/1640775/pexels-photo-1640775.jpeg?auto=compress&cs=tinysrgb&w=600', true),
('Antipasto Platter', 'Selection of cured meats, cheeses, olives, and marinated vegetables', 18.00, 'starters', 'https://images.pexels.com/photos/1640776/pexels-photo-1640776.jpeg?auto=compress&cs=tinysrgb&w=600', true),

-- Main Courses
('Signature Salmon', 'Pan-seared salmon with roasted vegetables and herb butter sauce', 28.00, 'mains', 'https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg?auto=compress&cs=tinysrgb&w=600', true),
('Ribeye Steak', 'Grilled 12oz ribeye with garlic mashed potatoes and seasonal vegetables', 35.00, 'mains', 'https://images.pexels.com/photos/1640773/pexels-photo-1640773.jpeg?auto=compress&cs=tinysrgb&w=600', true),
('Pasta Carbonara', 'House-made pasta with pancetta, eggs, parmesan, and black pepper', 22.00, 'mains', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', true),
('Mediterranean Chicken', 'Herb-crusted chicken breast with Mediterranean vegetables and quinoa', 24.00, 'mains', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', true),

-- Desserts  
('Tiramisu', 'Classic Italian dessert with coffee-soaked ladyfingers and mascarpone', 8.00, 'desserts', 'https://images.pexels.com/photos/1640778/pexels-photo-1640778.jpeg?auto=compress&cs=tinysrgb&w=600', true),
('Chocolate Lava Cake', 'Warm chocolate cake with molten center, served with vanilla ice cream', 10.00, 'desserts', 'https://images.pexels.com/photos/1640779/pexels-photo-1640779.jpeg?auto=compress&cs=tinysrgb&w=600', true),
('Panna Cotta', 'Silky vanilla panna cotta with seasonal berry compote', 9.00, 'desserts', 'https://images.pexels.com/photos/1126359/pexels-photo-1126359.jpeg?auto=compress&cs=tinysrgb&w=600', true),

-- Drinks
('House Wine Selection', 'Red, white, or rosé from our carefully curated wine list', 12.00, 'drinks', 'https://images.pexels.com/photos/1640780/pexels-photo-1640780.jpeg?auto=compress&cs=tinysrgb&w=600', true),
('Craft Cocktails', 'Handcrafted cocktails made with premium spirits and fresh ingredients', 14.00, 'drinks', 'https://images.pexels.com/photos/1640781/pexels-photo-1640781.jpeg?auto=compress&cs=tinysrgb&w=600', true),
('Italian Sodas', 'Refreshing sodas with authentic Italian syrups and sparkling water', 6.00, 'drinks', 'https://images.pexels.com/photos/1487511/pexels-photo-1487511.jpeg?auto=compress&cs=tinysrgb&w=600', true),
('Espresso & Coffee', 'Fresh roasted coffee beans prepared the traditional Italian way', 5.00, 'drinks', 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=600', true);