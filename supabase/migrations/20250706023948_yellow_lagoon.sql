/*
  # Fix Menu Items with Proper Business Association

  1. Tables Modified
    - Clear and repopulate `menu_items` table with proper restaurant items
    - Ensure all items are associated with the Bella Vista business

  2. Changes Made
    - Clear existing menu items
    - Insert proper restaurant menu items with correct categories
    - Associate all items with the Bella Vista business

  3. Categories Added
    - starters: Bruschetta Trio, Calamari Fritti, Antipasto Platter
    - mains: Signature Salmon, Ribeye Steak, Pasta Carbonara, Mediterranean Chicken
    - desserts: Tiramisu, Chocolate Lava Cake, Panna Cotta  
    - drinks: House Wine, Craft Cocktails, Italian Sodas, Espresso & Coffee
*/

-- First, ensure we have a business to associate menu items with
DO $$
DECLARE
    bella_vista_id uuid;
BEGIN
    -- Check if Bella Vista business exists
    SELECT id INTO bella_vista_id 
    FROM businesses 
    WHERE name = 'Bella Vista' 
    LIMIT 1;
    
    -- If no business exists, create the Bella Vista business
    IF bella_vista_id IS NULL THEN
        INSERT INTO businesses (name, industry, phone_number, active, timezone)
        VALUES ('Bella Vista', 'Restaurant', '+1 (555) 123-4567', true, 'America/New_York')
        RETURNING id INTO bella_vista_id;
    END IF;
    
    -- Clear existing menu items to start fresh
    TRUNCATE menu_items RESTART IDENTITY CASCADE;
    
    -- Insert proper restaurant menu items with correct categories and business association
    INSERT INTO menu_items (business_id, name, description, price, category, image_url, is_active) VALUES
    -- Starters
    (bella_vista_id, 'Bruschetta Trio', 'Three varieties of our signature bruschetta with fresh tomatoes, basil, and mozzarella', 12.00, 'starters', 'https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg?auto=compress&cs=tinysrgb&w=600', true),
    (bella_vista_id, 'Calamari Fritti', 'Crispy fried squid rings served with marinara sauce and lemon wedges', 14.00, 'starters', 'https://images.pexels.com/photos/1640775/pexels-photo-1640775.jpeg?auto=compress&cs=tinysrgb&w=600', true),
    (bella_vista_id, 'Antipasto Platter', 'Selection of cured meats, cheeses, olives, and marinated vegetables', 18.00, 'starters', 'https://images.pexels.com/photos/1640776/pexels-photo-1640776.jpeg?auto=compress&cs=tinysrgb&w=600', true),

    -- Main Courses
    (bella_vista_id, 'Signature Salmon', 'Pan-seared salmon with roasted vegetables and herb butter sauce', 28.00, 'mains', 'https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg?auto=compress&cs=tinysrgb&w=600', true),
    (bella_vista_id, 'Ribeye Steak', 'Grilled 12oz ribeye with garlic mashed potatoes and seasonal vegetables', 35.00, 'mains', 'https://images.pexels.com/photos/1640773/pexels-photo-1640773.jpeg?auto=compress&cs=tinysrgb&w=600', true),
    (bella_vista_id, 'Pasta Carbonara', 'House-made pasta with pancetta, eggs, parmesan, and black pepper', 22.00, 'mains', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', true),
    (bella_vista_id, 'Mediterranean Chicken', 'Herb-crusted chicken breast with Mediterranean vegetables and quinoa', 24.00, 'mains', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', true),

    -- Desserts  
    (bella_vista_id, 'Tiramisu', 'Classic Italian dessert with coffee-soaked ladyfingers and mascarpone', 8.00, 'desserts', 'https://images.pexels.com/photos/1640778/pexels-photo-1640778.jpeg?auto=compress&cs=tinysrgb&w=600', true),
    (bella_vista_id, 'Chocolate Lava Cake', 'Warm chocolate cake with molten center, served with vanilla ice cream', 10.00, 'desserts', 'https://images.pexels.com/photos/1640779/pexels-photo-1640779.jpeg?auto=compress&cs=tinysrgb&w=600', true),
    (bella_vista_id, 'Panna Cotta', 'Silky vanilla panna cotta with seasonal berry compote', 9.00, 'desserts', 'https://images.pexels.com/photos/1126359/pexels-photo-1126359.jpeg?auto=compress&cs=tinysrgb&w=600', true),

    -- Drinks
    (bella_vista_id, 'House Wine Selection', 'Red, white, or rosé from our carefully curated wine list', 12.00, 'drinks', 'https://images.pexels.com/photos/1640780/pexels-photo-1640780.jpeg?auto=compress&cs=tinysrgb&w=600', true),
    (bella_vista_id, 'Craft Cocktails', 'Handcrafted cocktails made with premium spirits and fresh ingredients', 14.00, 'drinks', 'https://images.pexels.com/photos/1640781/pexels-photo-1640781.jpeg?auto=compress&cs=tinysrgb&w=600', true),
    (bella_vista_id, 'Italian Sodas', 'Refreshing sodas with authentic Italian syrups and sparkling water', 6.00, 'drinks', 'https://images.pexels.com/photos/1487511/pexels-photo-1487511.jpeg?auto=compress&cs=tinysrgb&w=600', true),
    (bella_vista_id, 'Espresso & Coffee', 'Fresh roasted coffee beans prepared the traditional Italian way', 5.00, 'drinks', 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=600', true);
END $$;