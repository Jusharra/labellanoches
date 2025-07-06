import React, { useState } from 'react';
import { MessageSquare, Phone, RefreshCw } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

// Initialize Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const Menu = () => {
  const [activeCategory, setActiveCategory] = useState('starters');

  const categories = [
    { id: 'starters', name: 'Starters' },
    { id: 'mains', name: 'Main Courses' },
    { id: 'desserts', name: 'Desserts' },
    { id: 'drinks', name: 'Drinks' },
  ];

  const [menuItems, setMenuItems] = useState<{[key: string]: any[]}>({
    starters: [],
    mains: [],
    desserts: [],
    drinks: []
  });
  const [loading, setLoading] = useState(true);

  // Fetch menu items from Supabase on component mount
  React.useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      console.log('Fetching menu items from:', `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/menu-operations/items?active=true`);
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/menu-operations/items?active=true`, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', response.status, response.statusText, errorText);
        throw new Error(`Failed to fetch menu items: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Menu items response:', data);
      
      if (data?.success) {
        // Group items by category
        const groupedItems = data.data.reduce((acc: any, item: any) => {
          if (!acc[item.category]) {
            acc[item.category] = [];
          }
          acc[item.category].push({
            id: item.id,
            name: item.name,
            description: item.description,
            price: `$${parseFloat(item.price).toFixed(2)}`,
            image: item.image_url
          });
          return acc;
        }, {});
        
        setMenuItems(groupedItems);
        console.log('Grouped menu items:', groupedItems);
      } else {
        throw new Error(data.error || 'Failed to fetch menu items');
      }
    } catch (error) {
      console.error('Error fetching menu items:', error);
      // Show user-friendly error message
      toast.error('Unable to load menu items. Please refresh the page or try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleOrder = (itemName: string, orderType: 'sms' | 'whatsapp') => {
    const message = encodeURIComponent(`I'd like to order ${itemName}`);
    const phone = '+1234567890'; // Replace with your actual phone number
    
    if (orderType === 'sms') {
      window.open(`sms:${phone}?body=${message}`, '_blank');
    } else {
      window.open(`https://wa.me/${phone.replace('+', '')}?text=${message}`, '_blank');
    }
  };

  return (
    <div className="py-16 bg-neutral-cream dark:bg-gray-900 min-h-screen transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="font-playfair text-4xl md:text-5xl font-bold text-accent dark:text-white mb-4">
            Our Menu
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Discover our carefully crafted dishes made with the finest local ingredients
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center mb-12">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`px-6 py-3 m-2 rounded-full font-semibold transition-colors ${
                activeCategory === category.id
                  ? 'bg-primary text-white shadow-lg'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Menu Items Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">Loading menu...</p>
          </div>
        ) : menuItems[activeCategory] && menuItems[activeCategory].length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {menuItems[activeCategory].map((item) => (
              <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-48 object-cover"
                />
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-playfair text-xl font-semibold text-accent dark:text-white">
                      {item.name}
                    </h3>
                    <span className="text-xl font-bold text-primary">{item.price}</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">{item.description}</p>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleOrder(item.name, 'sms')}
                      className="flex-1 bg-primary text-white py-2 px-4 rounded-lg font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Phone className="h-4 w-4" />
                      <span>SMS Order</span>
                    </button>
                    <button
                      onClick={() => handleOrder(item.name, 'whatsapp')}
                      className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>WhatsApp</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No menu items found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {activeCategory === 'all' 
                ? 'No menu items are currently available.' 
                : `No items found in the ${categories.find(cat => cat.id === activeCategory)?.name} category.`
              }
            </p>
            <button
              onClick={fetchMenuItems}
              className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Menu
            </button>
          </div>
        )}

        {/* Order Information */}
        <div className="mt-12 bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="font-playfair text-2xl font-bold text-accent dark:text-white mb-4">
            How to Order
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Simply click the SMS or WhatsApp button on any menu item to place your order. 
            We'll confirm your order and provide pickup/delivery details.
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <p>SMS: +1 (555) 123-4567 | WhatsApp: +1 (555) 123-4567</p>
            <p>Average preparation time: 15-25 minutes</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Menu;