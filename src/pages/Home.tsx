import React from 'react';
import { Gift, Bell, Smartphone } from 'lucide-react';
import SMSOptInForm from '../components/SMSOptInForm';

const Home = () => {
  const benefits = [
    {
      icon: <Gift className="h-8 w-8 text-primary" />,
      title: 'Exclusive Deals',
      description: 'Get access to member-only discounts and special promotions delivered straight to your phone.',
    },
    {
      icon: <Bell className="h-8 w-8 text-primary" />,
      title: 'Flash Menu Alerts',
      description: 'Be the first to know about new dishes, seasonal specials, and limited-time offers.',
    },
    {
      icon: <Smartphone className="h-8 w-8 text-primary" />,
      title: 'Easy Ordering',
      description: 'Skip the wait! Order your favorites directly via SMS or WhatsApp for quick pickup.',
    },
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center px-4">
        <div
          className="absolute inset-0 bg-cover bg-center z-0"
          style={{
            backgroundImage: 'url(https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2)',
          }}
        />
        <div className="absolute inset-0 bg-black/50 z-10" />
        
        <div className="relative z-20 text-center text-white max-w-4xl">
          <h1 className="font-playfair text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 sm:mb-6">
            Welcome to La Bella Noches
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl mb-6 sm:mb-8 font-light">
            Authentic flavors. Local ingredients.
          </p>
          <button
            onClick={() => document.getElementById('opt-in-form')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-primary text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-base sm:text-lg font-semibold hover:bg-primary/90 transition-colors duration-200 shadow-lg hover:shadow-xl"
          >
            Join Our VIP SMS Club
          </button>
        </div>
      </section>

      {/* SMS Opt-In Section */}
      <section id="opt-in-form" className="py-12 sm:py-16 lg:py-20 bg-neutral-cream dark:bg-gray-800 transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="font-playfair text-2xl sm:text-3xl md:text-4xl font-bold text-accent dark:text-white mb-3 sm:mb-4">
              Ready for Exclusive Perks?
            </h2>
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Join thousands of food lovers who get the inside scoop on our latest creations, 
              special events, and unbeatable deals delivered right to their phones.
            </p>
          </div>
          
          <div className="max-w-lg mx-auto">
            <SMSOptInForm />
          </div>
        </div>
      </section>

      {/* Why Join Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-white dark:bg-gray-900 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="font-playfair text-2xl sm:text-3xl md:text-4xl font-bold text-accent dark:text-white mb-3 sm:mb-4">
              Why Join Our VIP Club?
            </h2>
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Experience dining like never before with exclusive member benefits
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center p-4 sm:p-6 rounded-lg border border-neutral-gray dark:border-gray-600 bg-white dark:bg-gray-800 hover:shadow-lg transition-all">
                <div className="flex justify-center mb-3 sm:mb-4">
                  {benefit.icon}
                </div>
                <h3 className="font-playfair text-lg sm:text-xl font-semibold text-accent dark:text-white mb-2 sm:mb-3">
                  {benefit.title}
                </h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Dish Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-neutral-cream dark:bg-gray-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <h2 className="font-playfair text-2xl sm:text-3xl md:text-4xl font-bold text-accent dark:text-white mb-4 sm:mb-6">
                Signature Dish of the Month
              </h2>
              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 mb-4 sm:mb-6">
                Our chef's masterpiece: Pan-seared salmon with roasted vegetables and herb butter sauce. 
                Made with locally sourced ingredients and served with our signature blend of spices.
              </p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                <span className="text-xl sm:text-2xl font-bold text-primary">$28</span>
                <a
                  href={`sms:${import.meta.env.VITE_BUSINESS_PHONE_NUMBER || '+18445437419'}?body=I'd%20like%20to%20order%20the%20Signature%20Salmon%20dish%20from%20La%20Bella%20Noches`}
                  className="bg-primary text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors text-sm sm:text-base"
                >
                  Order via SMS
                </a>
              </div>
            </div>
            <div className="order-first lg:order-last rounded-lg overflow-hidden shadow-xl">
              <img
                src="https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="Signature salmon dish"
                className="w-full h-48 sm:h-64 lg:h-80 object-cover"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;