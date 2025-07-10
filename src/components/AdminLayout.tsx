import React, { useState, createContext, useContext } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  List, 
  MessageSquare, 
  Send, 
  UtensilsCrossed, 
  Settings,
  Menu,
  X,
  ChefHat,
  User,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Template context for sharing templates between admin components
interface Template {
  id: number;
  name: string;
  content: string;
  type: string;
  createdDate: string;
  lastUsed: string;
}

interface TemplateContextType {
  templates: Template[];
  addTemplate: (template: Omit<Template, 'id' | 'createdDate' | 'lastUsed'>) => void;
  updateTemplate: (id: number, updates: Partial<Template>) => void;
  deleteTemplate: (id: number) => void;
  copyTemplate: (template: Template) => void;
}


const TemplateContext = createContext<TemplateContextType | undefined>(undefined);

export const useTemplates = () => {
  const context = useContext(TemplateContext);
  if (context === undefined) {
    throw new Error('useTemplates must be used within a TemplateProvider');
  }
  return context;
};


const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, userRole, signOut } = useAuth();
  
  // Shared template state
  const [templates, setTemplates] = useState<Template[]>([
    {
      id: 1,
      name: 'Welcome Message',
      content: 'Hi {{Name}}! Welcome to Bella Vista. Enjoy 10% off your first order with code WELCOME10. Reply STOP to opt out.',
      type: 'sms',
      createdDate: '2024-01-01',
      lastUsed: '2024-01-15'
    },
    {
      id: 2,
      name: 'Weekend Special',
      content: 'Hey {{Name}}! 🍽️ Weekend Special: 2-for-1 pasta dishes this Saturday & Sunday. Book your table now!',
      type: 'whatsapp',
      createdDate: '2024-01-05',
      lastUsed: '2024-01-14'
    },
    {
      id: 3,
      name: 'Birthday Offer',
      content: 'Happy Birthday {{Name}}! 🎉 Celebrate with us - get a FREE dessert with any main course this month.',
      type: 'sms',
      createdDate: '2024-01-10',
      lastUsed: '2024-01-12'
    },
    {
      id: 4,
      name: 'Promotion',
      content: 'Special offer just for you! Get 20% off this weekend only.',
      type: 'sms',
      createdDate: '2024-01-08',
      lastUsed: '2024-01-13'
    },
    {
      id: 5,
      name: 'Appointment reminder',
      content: 'Reminder: Your reservation at Bella Vista is tomorrow at 7 PM.',
      type: 'sms',
      createdDate: '2024-01-09',
      lastUsed: '2024-01-16'
    },
    {
      id: 6,
      name: 'Follow up',
      content: 'Thank you for dining with us! We hope you enjoyed your experience.',
      type: 'sms',
      createdDate: '2024-01-07',
      lastUsed: '2024-01-11'
    },
    {
      id: 7,
      name: 'Reactivation',
      content: 'We miss you! Come back and enjoy 15% off your next meal.',
      type: 'sms',
      createdDate: '2024-01-06',
      lastUsed: '2024-01-10'
    },
    {
      id: 8,
      name: 'Menu sms',
      content: 'Check out our new seasonal menu items! Available now.',
      type: 'sms',
      createdDate: '2024-01-04',
      lastUsed: '2024-01-09'
    },
    {
      id: 9,
      name: 'Menu whatsapp',
      content: '🍽️ New dishes just arrived! See our latest menu additions.',
      type: 'whatsapp',
      createdDate: '2024-01-03',
      lastUsed: '2024-01-08'
    },
    {
      id: 10,
      name: 'Order confirmation',
      content: 'Order confirmed! Your food will be ready in 20 minutes.',
      type: 'sms',
      createdDate: '2024-01-02',
      lastUsed: '2024-01-07'
    },
    {
      id: 11,
      name: 'Order status',
      content: 'Your order is ready for pickup! See you soon.',
      type: 'sms',
      createdDate: '2024-01-01',
      lastUsed: '2024-01-06'
    },
    {
      id: 12,
      name: 'Custom',
      content: '',
      type: 'sms',
      createdDate: '2024-01-01',
      lastUsed: 'Never'
    }
  ]);


  // Template management functions
  const addTemplate = (templateData: Omit<Template, 'id' | 'createdDate' | 'lastUsed'>) => {
    const newTemplate: Template = {
      ...templateData,
      id: Date.now(),
      createdDate: new Date().toISOString().split('T')[0],
      lastUsed: 'Never'
    };
    setTemplates(prev => [...prev, newTemplate]);
    console.log('Creating template:', newTemplate);
  };

  const updateTemplate = (id: number, updates: Partial<Template>) => {
    setTemplates(prev => prev.map(template => 
      template.id === id ? { ...template, ...updates } : template
    ));
    console.log('Updating template:', id, updates);
  };

  const deleteTemplate = (id: number) => {
    setTemplates(prev => prev.filter(template => template.id !== id));
    console.log('Deleting template:', id);
  };

  const copyTemplate = (template: Template) => {
    const copiedTemplate: Template = {
      ...template,
      id: Date.now(),
      name: `${template.name} (Copy)`,
      createdDate: new Date().toISOString().split('T')[0],
      lastUsed: 'Never'
    };
    setTemplates(prev => [...prev, copiedTemplate]);
    console.log('Copying template:', copiedTemplate);
  };

  const templateContextValue: TemplateContextType = {
    templates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    copyTemplate
  };


  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Contacts', href: '/admin/contacts', icon: Users },
    { name: 'Contact Lists', href: '/admin/contact-lists', icon: List },
    { name: 'Templates', href: '/admin/templates', icon: MessageSquare },
    { name: 'Campaigns', href: '/admin/campaigns', icon: Send },
    { name: 'Menu Manager', href: '/admin/menu-manager', icon: UtensilsCrossed },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
    { name: 'Profile Settings', href: '/admin/profile-settings', icon: User },
  ];

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden bg-black bg-opacity-50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
          <Link to="/" className="flex items-center space-x-2">
            <ChefHat className="h-8 w-8 text-primary" />
            <span className="font-playfair text-xl font-semibold text-accent dark:text-white">
              La Bella Noches
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="mt-8 px-4 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive(item.href)
                    ? 'bg-primary text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <span className="text-sm text-gray-600 dark:text-gray-300">Admin Panel</span>
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {user?.email || 'Admin'} {userRole ? `(${userRole})` : ''}
              </span>
              <button
                onClick={signOut}
                className="p-1 text-gray-600 dark:text-gray-300 hover:text-red-600 transition-colors"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 lg:ml-0">
        {/* Top bar */}
        <div className="lg:hidden flex items-center justify-between h-16 px-4 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            <button
              onClick={signOut}
              className="p-1 text-gray-600 dark:text-gray-300 hover:text-red-600 transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Page content */}
        <TemplateContext.Provider value={templateContextValue}>
            <main className="p-6">
              <Outlet />
            </main>
        </TemplateContext.Provider>
      </div>
    </div>
  );
};

export default AdminLayout;