import React, { useState } from 'react';
import { Save, MapPin, Clock, Globe, Webhook } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSupabase } from '../../context/SupabaseContext';
import { useAuth } from '../../context/AuthContext';

const Settings = () => {
  const { supabase, isAuthenticated } = useSupabase();
  const { user } = useAuth();
  
  const [settings, setSettings] = useState({
    businessName: 'La Bella Noches',
    address: '123 Gourmet Street, Foodie District',
    phone: '+1 (555) 123-4567',
    email: 'hello@bellavista.com',
    website: 'https://bellavista.com',
    webhookUrl: '',
    twilioNumber: '',
    hours: {
      monday: { open: '11:00', close: '22:00', closed: false },
      tuesday: { open: '11:00', close: '22:00', closed: false },
      wednesday: { open: '11:00', close: '22:00', closed: false },
      thursday: { open: '11:00', close: '22:00', closed: false },
      friday: { open: '11:00', close: '22:00', closed: false },
      saturday: { open: '10:00', close: '23:00', closed: false },
      sunday: { open: '10:00', close: '21:00', closed: false },
    }
  });

  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load business settings on component mount
  React.useEffect(() => {
    if (supabase && isAuthenticated) {
      loadBusinessSettings();
    }
  }, [supabase, isAuthenticated]);

  const loadBusinessSettings = async () => {
    if (!user) {
      console.log('No user found, cannot load business settings');
      return;
    }

    try {
      console.log('Loading business settings for user:', user.id);
      
      // First, get the user's profile to find their business_id
      const { data: userProfile, error: userProfileError } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();
      
      if (userProfileError) {
        console.error('Error fetching user profile:', userProfileError);
        // If user profile doesn't exist, we'll use default settings
        console.log('User profile not found, using default settings');
        return;
      }
      
      // If user has no business_id, use default settings
      if (!userProfile.business_id) {
        console.log('User has no associated business_id, using default settings');
        return;
      }
      
      // Query the businesses table using the user's business_id
      const { data: business, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', userProfile.business_id)
        .maybeSingle();
      
      if (error && !(error.code === 'PGRST116' && !business)) {
        console.error('Error fetching business settings:', error);
        toast.error('Failed to load business settings');
        return;
      }
      
      if (business) {
        console.log('Business settings loaded for business:', business.id);
        
        // Map database fields to settings state
        setSettings(prev => ({
          ...prev,
          businessName: business.name || prev.businessName,
          address: business.address || prev.address,
          phone: business.phone_number || prev.phone,
          email: business.admin_email || prev.email,
          website: business.website || prev.website,
          webhookUrl: business.webhook_url || '',
          twilioNumber: business.twilio_number || ''
        }));
      } else {
        console.log('No business record found for business_id:', userProfile.business_id);
      }
    } catch (error) {
      console.error('Error loading business settings:', error);
      toast.error('Failed to load business settings');
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('Authentication required to save settings');
      return;
    }

    setLoading(true);
    
    try {
      console.log('Saving business settings...');
      
      // First, get the user's current profile to check for existing business_id
      const { data: userProfile, error: userProfileError } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();
      
      if (userProfileError && userProfileError.code !== 'PGRST116') {
        console.error('Error fetching user profile:', userProfileError);
        throw new Error(`Failed to fetch user profile: ${userProfileError.message}`);
      }
      
      // Map settings state to database columns
      const updatePayload = {
        name: settings.businessName,
        address: settings.address,
        phone_number: settings.phone,
        admin_email: settings.email,
        website: settings.website,
        webhook_url: settings.webhookUrl && settings.webhookUrl.trim() !== '' ? settings.webhookUrl : null,
        twilio_number: settings.twilioNumber && settings.twilioNumber.trim() !== '' ? settings.twilioNumber : null
      };

      let businessId = userProfile?.business_id;
      
      if (businessId) {
        // Update existing business record
        console.log('Updating existing business:', businessId);
        const { data: updatedBusiness, error: updateError } = await supabase
          .from('businesses')
          .update(updatePayload)
          .eq('id', businessId)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating business:', updateError);
          throw new Error(`Failed to update business settings: ${updateError.message}`);
        }

        console.log('Business record updated:', updatedBusiness);
      } else {
        // Create new business record
        console.log('Creating new business record...');
        
        const insertPayload = {
          ...updatePayload,
          industry: 'Restaurant',
          active: true,
          timezone: 'UTC',
          settings: {},
          twilio_config: {},
          created_by: user.id
        };

        const { data: newBusiness, error: insertError } = await supabase
          .from('businesses')
          .insert(insertPayload)
          .select()
          .single();

        if (insertError) {
          console.error('Error creating business:', insertError);
          throw new Error(`Failed to create business record: ${insertError.message}`);
        }

        businessId = newBusiness.id;
        console.log('New business record created:', newBusiness);
      }
      
      // Ensure user_profiles table has the correct business_id
      if (businessId && (!userProfile?.business_id || userProfile.business_id !== businessId)) {
        console.log('Updating user profile with business_id:', businessId);
        const { error: profileUpdateError } = await supabase
          .from('user_profiles')
          .upsert({
            id: user.id,
            business_id: businessId,
            email: user.email,
            // Keep existing role if any
            role: userProfile?.role || 'admin'
          }, {
            onConflict: 'id'
          });
        
        if (profileUpdateError) {
          console.error('Error updating user profile:', profileUpdateError);
          // Don't throw here as business was saved successfully
          toast.error('Business saved but failed to link to your profile. Please contact support.');
          return;
        }
        
        console.log('User profile updated with business_id');
      }

      setSaved(true);
      toast.success('Settings saved successfully!');
      
      // Reset saved state after 3 seconds
      setTimeout(() => setSaved(false), 3000);
      
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleHoursChange = (day: string, field: string, value: string | boolean) => {
    setSettings({
      ...settings,
      hours: {
        ...settings.hours,
        [day]: {
          ...settings.hours[day as keyof typeof settings.hours],
          [field]: value
        }
      }
    });
  };

  const dayNames = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday'
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Manage your business information and system configuration
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className={`flex items-center px-4 py-2 rounded-lg font-semibold transition-all ${
            saved 
              ? 'bg-green-600 text-white' 
              : loading
              ? 'bg-gray-400 text-white cursor-not-allowed'
              : 'bg-primary text-white hover:bg-primary/90'
          }`}
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Business Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <MapPin className="h-6 w-6 text-primary mr-3" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Business Information</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Business Name
              </label>
              <input
                type="text"
                id="businessName"
                value={settings.businessName}
                onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Address
              </label>
              <input
                type="text"
                id="address"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            
            <div>
              <label htmlFor="website" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Website
              </label>
              <input
                type="url"
                id="website"
                value={settings.website}
                onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* System Configuration */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Webhook className="h-6 w-6 text-primary mr-3" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">System Configuration</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="webhookUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Make.com Webhook URL *
              </label>
              <input
                type="url"
                id="webhookUrl"
                value={settings.webhookUrl}
                onChange={(e) => setSettings({ ...settings, webhookUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="https://hook.integromat.com/..."
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                This webhook will be automatically added to all new campaigns and triggered when they are sent
              </p>
            </div>
            
            <div>
              <label htmlFor="twilioNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Twilio Number *
              </label>
              <input
                type="tel"
                id="twilioNumber"
                value={settings.twilioNumber}
                onChange={(e) => setSettings({ ...settings, twilioNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="+1234567890"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                This Twilio phone number will be used for sending SMS messages to customers
              </p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">API Status</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Database Connection</span>
                  <span className="text-green-600 text-sm font-medium">Connected</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">SMS Service</span>
                  <span className="text-green-600 text-sm font-medium">Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">WhatsApp API</span>
                  <span className="text-green-600 text-sm font-medium">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Business Hours */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center mb-6">
          <Clock className="h-6 w-6 text-primary mr-3" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Business Hours</h2>
        </div>
        
        <div className="space-y-4">
          {Object.entries(settings.hours).map(([day, hours]) => (
            <div key={day} className="flex items-center space-x-4">
              <div className="w-24">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {dayNames[day as keyof typeof dayNames]}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={!hours.closed}
                  onChange={(e) => handleHoursChange(day, 'closed', !e.target.checked)}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <span className="text-sm text-gray-600 dark:text-gray-300">Open</span>
              </div>
              
              {!hours.closed && (
                <>
                  <input
                    type="time"
                    value={hours.open}
                    onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <span className="text-gray-500 dark:text-gray-400">to</span>
                  <input
                    type="time"
                    value={hours.close}
                    onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </>
              )}
              
              {hours.closed && (
                <span className="text-gray-500 dark:text-gray-400 italic">Closed</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Settings;