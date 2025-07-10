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
    const phone = import.meta.env.VITE_BUSINESS_PHONE_NUMBER || '+18445437419';
    
    if (orderType === 'sms') {
      window.open(`sms:${phone}?body=${message}`, '_blank');
    } else {
      window.open(`https://wa.me/${phone.replace('+', '')}?text=${message}`, '_blank');
    }
  };

  return (
    <div className="py-12 sm:py-16 lg:py-20 bg-neutral-cream dark:bg-gray-900 min-h-screen transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="font-playfair text-3xl sm:text-4xl md:text-5xl font-bold text-accent dark:text-white mb-3 sm:mb-4">
            Our Menu
          </h1>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Discover our carefully crafted dishes made with the finest local ingredients
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center mb-8 sm:mb-12 gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`px-4 sm:px-6 py-2 sm:py-3 rounded-full text-sm sm:text-base font-semibold transition-colors ${
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
          <div className="text-center py-8 sm:py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">Loading menu...</p>
          </div>
        ) : menuItems[activeCategory] && menuItems[activeCategory].length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {menuItems[activeCategory].map((item) => (
              <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-40 sm:h-48 object-cover"
                />
                <div className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2">
                    <h3 className="font-playfair text-lg sm:text-xl font-semibold text-accent dark:text-white mb-1 sm:mb-0">
                      {item.name}
                    </h3>
                    <span className="text-lg sm:text-xl font-bold text-primary">{item.price}</span>
                  </div>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-4">{item.description}</p>
                  
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <button
                      onClick={() => handleOrder(item.name, 'sms')}
                      className="flex-1 bg-primary text-white py-2 px-3 sm:px-4 rounded-lg text-sm sm:text-base font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Phone className="h-4 w-4" />
                      <span>SMS Order</span>
                    </button>
                    <button
                      onClick={() => handleOrder(item.name, 'whatsapp')}
                      className="flex-1 bg-green-600 text-white py-2 px-3 sm:px-4 rounded-lg text-sm sm:text-base font-semibold hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
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
          <div className="text-center py-8 sm:py-12">
            <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2">
              No menu items found
            </h3>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-4 sm:mb-6">
              {activeCategory === 'all' 
                ? 'No menu items are currently available.' 
                : `No items found in the ${categories.find(cat => cat.id === activeCategory)?.name} category.`
              }
            </p>
            <button
              onClick={fetchMenuItems}
              className="inline-flex items-center px-3 sm:px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm sm:text-base"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Menu
            </button>
          </div>
        )}

        {/* Order Information */}
        <div className="mt-8 sm:mt-12 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 sm:p-8 text-center transition-colors">
          <h2 className="font-playfair text-xl sm:text-2xl font-bold text-accent dark:text-white mb-3 sm:mb-4">
            How to Order
          </h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-3 sm:mb-4">
            Simply click the SMS or WhatsApp button on any menu item to place your order. 
            We'll confirm your order and provide pickup/delivery details.
          </p>
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 space-y-1">
            <p>SMS: +1 (844) 543-7419 | WhatsApp: +1 (844) 543-7419</p>
            <p>Average preparation time: 15-25 minutes</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Menu;