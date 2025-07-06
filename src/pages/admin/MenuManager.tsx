import React, { useState } from 'react';
import { Plus, Edit, Trash2, Upload, Image } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import toast from 'react-hot-toast';
import StatsCards from '../../components/StatsCards';
import OrderQueuePanel from '../../components/OrderQueuePanel';
import TestIntegrationPanel from '../../components/TestIntegrationPanel';

// Initialize Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  is_active: boolean;
}

const MenuManager = () => {
  const [activeTab, setActiveTab] = useState<'menu-management' | 'order-queue' | 'test-integration'>('menu-management');
  const [activeCategory, setActiveCategory] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newMenuItem, setNewMenuItem] = useState({
    name: '',
    description: '',
    price: '',
    category: 'starters',
    image: ''
  });
  const [currentMenuItem, setCurrentMenuItem] = useState({
    id: '',
    name: '',
    description: '',
    price: 0,
    category: 'starters',
    image: '',
    active: true
  });

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch menu items from Supabase on component mount
  React.useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/menu-operations/items`, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data?.success) {
        setMenuItems(data.data);
      } else {
        throw new Error(data?.error || 'Failed to fetch menu items');
      }
    } catch (error) {
      console.error('Error fetching menu items:', error);
      toast.error('Failed to load menu items. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: 'all', name: 'All Items' },
    { id: 'starters', name: 'Starters' },
    { id: 'mains', name: 'Main Courses' },
    { id: 'desserts', name: 'Desserts' },
    { id: 'drinks', name: 'Drinks' },
  ];

  const tabs = [
    { id: 'menu-management', name: 'Menu Management' },
    { id: 'order-queue', name: 'Order Queue' },
    { id: 'test-integration', name: 'Test Integration' },
  ];

  // Filter menu items based on active category
  const filteredMenuItems = activeCategory === 'all' 
    ? menuItems 
    : menuItems.filter(item => item.category === activeCategory);

  const handleCreateMenuItem = async () => {
    if (newMenuItem.name.trim() && newMenuItem.description.trim() && newMenuItem.price) {
      const newItem = {
        name: newMenuItem.name,
        description: newMenuItem.description,
        price: parseFloat(newMenuItem.price),
        category: newMenuItem.category,
        image_url: newMenuItem.image || 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600',
        is_active: true
      };
      
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/menu-operations/items`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newItem)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data?.success) {
          setMenuItems(prev => [...prev, data.data]);
          console.log('Created menu item:', data.data);
          
          setNewMenuItem({
            name: '',
            description: '',
            price: '',
            category: 'starters',
            image: ''
          });
          setShowCreateModal(false);
        } else {
          throw new Error(data?.error || 'Failed to create menu item');
        }
      } catch (error) {
        console.error('Error creating menu item:', error);
        toast.error('Failed to create menu item. Please try again.');
      }
    }
  };

  const handleEditMenuItem = (item: MenuItem) => {
    setCurrentMenuItem({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      image: item.image_url,
      active: item.is_active
    });
    setShowEditModal(true);
  };

  const handleUpdateMenuItem = async () => {
    if (currentMenuItem.name.trim() && currentMenuItem.description.trim() && currentMenuItem.price > 0) {
      const updateData = {
        name: currentMenuItem.name,
        description: currentMenuItem.description,
        price: currentMenuItem.price,
        category: currentMenuItem.category,
        image_url: currentMenuItem.image,
        is_active: currentMenuItem.active
      };
      
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/menu-operations/items/${currentMenuItem.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data?.success) {
          setMenuItems(prev => prev.map(item => 
            item.id === currentMenuItem.id ? data.data : item
          ));
          console.log('Updated menu item:', data.data);
          setShowEditModal(false);
          toast.success('Menu item updated successfully!');
        } else {
          throw new Error(data?.error || 'Failed to update menu item');
        }
      } catch (error) {
        console.error('Error updating menu item:', error);
        toast.error('Failed to update menu item. Please try again.');
      }
    }
  };

  const handleDeleteMenuItem = async (itemId: string) => {
    const item = menuItems.find(i => i.id === itemId);
    if (item && window.confirm(`Are you sure you want to delete "${item.name}"? This action cannot be undone.`)) {
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/menu-operations/items/${itemId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data?.success) {
          setMenuItems(prev => prev.filter(i => i.id !== itemId));
          console.log('Deleted menu item:', itemId);
          toast.success('Menu item deleted successfully!');
        } else {
          throw new Error(data?.error || 'Failed to delete menu item');
        }
      } catch (error) {
        console.error('Error deleting menu item:', error);
        toast.error('Failed to delete menu item. Please try again.');
      }
    }
  };

  const handleToggleActive = async (itemId: string) => {
    const item = menuItems.find(i => i.id === itemId);
    if (item) {
      const updateData = { is_active: !item.is_active };
      
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/menu-operations/items/${itemId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data?.success) {
          setMenuItems(prev => prev.map(item => 
            item.id === itemId ? data.data : item
          ));
          toast.success(`Menu item ${data.data.is_active ? 'activated' : 'deactivated'} successfully!`);
        } else {
          throw new Error(data?.error || 'Failed to toggle menu item');
        }
      } catch (error) {
        console.error('Error toggling menu item:', error);
        toast.error('Failed to toggle menu item status. Please try again.');
      }
    }
  };

  const handleImageUpload = () => {
    // In real app, integrate with image upload service (Cloudinary, etc.)
    toast.info('Image upload functionality would be implemented here');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Menu Manager</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Loading menu items...
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Menu Manager</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Manage your restaurant menu items and categories
          </p>
        </div>
        {activeTab === 'menu-management' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Menu Item
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <StatsCards />

      {/* Tab Switcher */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'menu-management' && (
        <div className="space-y-6">
          {/* Category Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    activeCategory === category.id
                      ? 'bg-primary text-white shadow-lg'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {category.name}
                  <span className="ml-2 text-xs opacity-75">
                    ({category.id === 'all' ? menuItems.length : menuItems.filter(item => item.category === category.id).length})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Menu Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMenuItems.map((item) => (
              <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={() => handleToggleActive(item.id)}
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full transition-colors ${
                        item.is_active ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      {item.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">{item.name}</h3>
                    <span className="text-lg font-bold text-primary">${item.price}</span>
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">{item.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {categories.find(cat => cat.id === item.category)?.name}
                    </span>
                    
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleEditMenuItem(item)}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        title="Edit menu item"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteMenuItem(item.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete menu item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty state when no items match filter */}
          {filteredMenuItems.length === 0 && (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                <Image className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No menu items found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                {activeCategory === 'all' 
                  ? 'No menu items have been created yet.' 
                  : `No items found in the ${categories.find(cat => cat.id === activeCategory)?.name} category.`
                }
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Menu Item
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'order-queue' && <OrderQueuePanel />}

      {activeTab === 'test-integration' && <TestIntegrationPanel />}

      {/* Create Menu Item Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Add New Menu Item
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="itemName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Item Name *
                    </label>
                    <input
                      type="text"
                      id="itemName"
                      value={newMenuItem.name}
                      onChange={(e) => setNewMenuItem({ ...newMenuItem, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="e.g., Grilled Salmon"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="itemDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description *
                    </label>
                    <textarea
                      id="itemDescription"
                      value={newMenuItem.description}
                      onChange={(e) => setNewMenuItem({ ...newMenuItem, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Describe the dish..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="itemPrice" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Price ($) *
                      </label>
                      <input
                        type="number"
                        id="itemPrice"
                        value={newMenuItem.price}
                        onChange={(e) => setNewMenuItem({ ...newMenuItem, price: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="itemCategory" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Category *
                      </label>
                      <select
                        id="itemCategory"
                        value={newMenuItem.category}
                        onChange={(e) => setNewMenuItem({ ...newMenuItem, category: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        {categories.filter(cat => cat.id !== 'all').map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Image URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={newMenuItem.image}
                      onChange={(e) => setNewMenuItem({ ...newMenuItem, image: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="https://example.com/image.jpg"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Leave empty to use default image
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleCreateMenuItem}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Add Menu Item
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Menu Item Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Edit Menu Item
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="editItemName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Item Name *
                    </label>
                    <input
                      type="text"
                      id="editItemName"
                      value={currentMenuItem.name}
                      onChange={(e) => setCurrentMenuItem({ ...currentMenuItem, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="e.g., Grilled Salmon"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="editItemDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description *
                    </label>
                    <textarea
                      id="editItemDescription"
                      value={currentMenuItem.description}
                      onChange={(e) => setCurrentMenuItem({ ...currentMenuItem, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Describe the dish..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="editItemPrice" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Price ($) *
                      </label>
                      <input
                        type="number"
                        id="editItemPrice"
                        value={currentMenuItem.price}
                        onChange={(e) => setCurrentMenuItem({ ...currentMenuItem, price: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="editItemCategory" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Category *
                      </label>
                      <select
                        id="editItemCategory"
                        value={currentMenuItem.category}
                        onChange={(e) => setCurrentMenuItem({ ...currentMenuItem, category: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        {categories.filter(cat => cat.id !== 'all').map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Image URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={currentMenuItem.image}
                      onChange={(e) => setCurrentMenuItem({ ...currentMenuItem, image: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="editItemActive"
                      checked={currentMenuItem.active}
                      onChange={(e) => setCurrentMenuItem({ ...currentMenuItem, active: e.target.checked })}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label htmlFor="editItemActive" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Active (visible to customers)
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleUpdateMenuItem}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Update Menu Item
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuManager;