import React, { useState } from 'react';
import { Phone, Mail, Building2, MessageSquare, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const SMSOptInForm = () => {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    email: '',
    permission: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.permission) {
      toast.error('Please agree to receive text messages to continue.');
      return;
    }

    setLoading(true);
    
    try {
      // Call the Supabase Edge Function to create a new contact
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/contacts-operations/contacts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          phoneNumber: formData.phone,
          email: formData.email || null,
          smsOptIn: formData.permission,
          preferredLanguage: 'English',
          tags: ['VIP Club', 'SMS Opt-in']
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        console.log('Contact created successfully:', data.data);
        setSubmitted(true);
        toast.success('Welcome to La Bella Noches VIP Club! You\'ll receive 10% off your first order.');
      } else {
        throw new Error(data.error || 'Failed to save contact information');
      }
      
    } catch (error) {
      console.error('Error submitting form:', error);
      
      // Check if it's a duplicate phone number error
      if (error.message.includes('duplicate') || error.message.includes('already exists')) {
        toast.error('This phone number is already registered. Thank you for being a VIP member!');
      } else {
        toast.error('There was an error submitting the form. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  if (submitted) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 sm:p-8 text-center border border-neutral-gray dark:border-gray-600 transition-colors">
        <div className="rounded-full bg-primary/10 p-3 mx-auto w-12 sm:w-16 h-12 sm:h-16 flex items-center justify-center mb-3 sm:mb-4">
          <Check className="w-8 h-8 text-primary" />
        </div>
        <h3 className="font-playfair text-xl sm:text-2xl font-bold text-accent dark:text-white mb-2">Welcome to Our VIP Club!</h3>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-3 sm:mb-4">
          You'll receive 10% off your first order! Check your phone for exclusive deals and updates.
        </p>
        <div className="bg-neutral-cream dark:bg-gray-700 rounded-lg p-3 sm:p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Your exclusive discount code will arrive within 24 hours via SMS.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 sm:p-8 border border-neutral-gray dark:border-gray-600 transition-colors">
      <div className="text-center mb-6 sm:mb-8">
        <h3 className="font-playfair text-xl sm:text-2xl font-bold text-accent dark:text-white mb-2 sm:mb-3">
          Join Our VIP SMS Club
        </h3>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
          Get exclusive deals, flash menu alerts, and easy ordering straight to your phone!
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div>
          <label htmlFor="name" className="flex items-center text-sm font-medium text-accent dark:text-white mb-1 sm:mb-2">
            <Check className="w-4 h-4 mr-2" />
            Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            disabled={loading}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors disabled:opacity-50 text-sm sm:text-base"
            value={formData.name}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="phone" className="flex items-center text-sm font-medium text-accent dark:text-white mb-1 sm:mb-2">
            <Phone className="w-4 h-4 mr-2" />
            Phone Number (include country code) *
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            pattern="^\+[1-9]\d{1,14}$"
            placeholder="+1234567890"
            required
            disabled={loading}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors disabled:opacity-50 text-sm sm:text-base"
            value={formData.phone}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="whatsapp" className="flex items-center text-sm font-medium text-accent dark:text-white mb-1 sm:mb-2">
            <MessageSquare className="w-4 h-4 mr-2" />
            WhatsApp Number (optional)
          </label>
          <input
            type="tel"
            id="whatsapp"
            name="whatsapp"
            pattern="^\+[1-9]\d{1,14}$"
            placeholder="+1234567890"
            disabled={loading}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors disabled:opacity-50 text-sm sm:text-base"
            value={formData.whatsapp}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="email" className="flex items-center text-sm font-medium text-accent dark:text-white mb-1 sm:mb-2">
            <Mail className="w-4 h-4 mr-2" />
            Email Address (optional)
          </label>
          <input
            type="email"
            id="email"
            name="email"
            disabled={loading}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors disabled:opacity-50 text-sm sm:text-base"
            value={formData.email}
            onChange={handleChange}
          />
        </div>

        <div className="flex items-start">
          <input
            type="checkbox"
            id="permission"
            name="permission"
            required
            disabled={loading}
            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-1 disabled:opacity-50"
            checked={formData.permission}
            onChange={handleChange}
          />
          <label htmlFor="permission" className="ml-3 text-sm text-gray-600 dark:text-gray-300">
            I agree to receive recurring automated text messages at the phone number provided. Msg & data rates may apply. Msg frequency varies. Reply HELP for help and STOP to end. View our{' '}
            <a href="/terms" className="text-primary hover:text-primary/80 underline">Terms of Service</a>{' '}
            and{' '}
            <a href="/privacy" className="text-primary hover:text-primary/80 underline">Privacy Policy</a>.
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || !formData.permission}
          className="w-full bg-primary text-white py-2 sm:py-3 px-4 sm:px-6 rounded-lg text-sm sm:text-base font-semibold hover:bg-primary/90 transition-colors duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Joining VIP Club...
            </>
          ) : (
            'Join VIP Club - Get 10% Off!'
          )}
        </button>
      </form>
    </div>
  );
};

export default SMSOptInForm;