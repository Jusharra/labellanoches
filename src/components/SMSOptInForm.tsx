import React, { useState } from 'react';
import { Phone, Mail, MessageSquare, Check, Cake } from 'lucide-react';
import toast from 'react-hot-toast';

const SMSOptInForm = () => {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    email: '',
    birthday: '',
    preferredContactMethod: 'SMS + Email',
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
      const webhookUrl = import.meta.env.VITE_MAKE_OPTIN_WEBHOOK_URL;
      if (!webhookUrl || webhookUrl.includes('YOUR_')) {
        throw new Error('Opt-in webhook not configured. Please set VITE_MAKE_OPTIN_WEBHOOK_URL in .env');
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          whatsapp: formData.whatsapp || null,
          email: formData.email || null,
          birthday: formData.birthday || null,
          preferredContactMethod: formData.preferredContactMethod,
          optIn: true,
          source: 'website-vip-form',
          submittedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook error: ${response.status}`);
      }

      setSubmitted(true);
      toast.success("Welcome to La Bella Noches VIP Club! You'll receive 10% off your first order.");
    } catch (error: any) {
      console.error('Error submitting opt-in form:', error);
      if (error.message.includes('not configured')) {
        toast.error('Sign-up is temporarily unavailable. Please call us to join the VIP Club.');
      } else {
        toast.error('There was an error submitting the form. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
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

        <div>
          <label htmlFor="birthday" className="flex items-center text-sm font-medium text-accent dark:text-white mb-1 sm:mb-2">
            <Cake className="w-4 h-4 mr-2" />
            Birthday (optional)
          </label>
          <input
            type="date"
            id="birthday"
            name="birthday"
            disabled={loading}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors disabled:opacity-50 text-sm sm:text-base"
            value={formData.birthday}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="preferredContactMethod" className="flex items-center text-sm font-medium text-accent dark:text-white mb-1 sm:mb-2">
            <Phone className="w-4 h-4 mr-2" />
            Preferred Contact Method *
          </label>
          <select
            id="preferredContactMethod"
            name="preferredContactMethod"
            required
            disabled={loading}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors disabled:opacity-50 text-sm sm:text-base"
            value={formData.preferredContactMethod}
            onChange={handleChange}
          >
            <option value="SMS + Email">SMS + Email</option>
            <option value="Call">Call</option>
            <option value="Email">Email</option>
          </select>
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
