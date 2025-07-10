import React from 'react';
import { Clock, MapPin, Award, Heart } from 'lucide-react';

const About = () => {
  const hours = [
    { day: 'Monday - Friday', time: '11:00 AM - 10:00 PM' },
    { day: 'Saturday', time: '10:00 AM - 11:00 PM' },
    { day: 'Sunday', time: '10:00 AM - 9:00 PM' },
  ];

  const values = [
    {
      icon: <Heart className="h-8 w-8 text-primary" />,
      title: 'Passion for Food',
      description: 'Every dish is crafted with love and attention to detail',
    },
    {
      icon: <Award className="h-8 w-8 text-primary" />,
      title: 'Quality Ingredients',
      description: 'We source only the finest local and organic ingredients',
    },
    {
      icon: <MapPin className="h-8 w-8 text-primary" />,
      title: 'Community First',
      description: 'Supporting local farmers and suppliers in our community',
    },
  ];

  return (
    <div className="py-12 sm:py-16 lg:py-20 bg-neutral-cream dark:bg-gray-900 min-h-screen transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <h1 className="font-playfair text-3xl sm:text-4xl md:text-5xl font-bold text-accent dark:text-white mb-3 sm:mb-4">
            About La Bella Noches
          </h1>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            A culinary journey that celebrates authentic flavors and local ingredients
          </p>
        </div>

        {/* Main Content Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center mb-12 sm:mb-16">
          {/* Image */}
          <div className="order-1 lg:order-1">
            <img
              src="https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800"
              alt="Restaurant interior"
              className="rounded-lg shadow-xl w-full h-64 sm:h-80 lg:h-96 object-cover"
            />
          </div>

          {/* Story Content */}
          <div className="order-2 lg:order-2">
            <h2 className="font-playfair text-2xl sm:text-3xl font-bold text-accent dark:text-white mb-4 sm:mb-6">
              Our Story
            </h2>
            <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-gray-600 dark:text-gray-300">
              <p>
                Founded in 2018 by Chef Maria Gonzalez, La Bella Noches began as a dream to bring 
                authentic Mediterranean flavors to the heart of our community. What started as 
                a small family restaurant has grown into a beloved local institution.
              </p>
              <p>
                Our mission is simple: to create exceptional dining experiences using the finest 
                local ingredients, traditional cooking methods, and innovative techniques. Every 
                dish tells a story of passion, tradition, and culinary excellence.
              </p>
              <p>
                We believe that great food brings people together. That's why we've created a 
                warm, welcoming atmosphere where families and friends can gather to share 
                memorable meals and create lasting memories.
              </p>
            </div>
          </div>
        </div>

        {/* Values Section */}
        <div className="mb-12 sm:mb-16">
          <h2 className="font-playfair text-2xl sm:text-3xl font-bold text-accent dark:text-white text-center mb-6 sm:mb-8">
            Our Values
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {values.map((value, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 text-center transition-colors">
                <div className="flex justify-center mb-3 sm:mb-4">
                  {value.icon}
                </div>
                <h3 className="font-playfair text-lg sm:text-xl font-semibold text-accent dark:text-white mb-2 sm:mb-3">
                  {value.title}
                </h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Hours and Location */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Hours */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 sm:p-8 transition-colors">
            <div className="flex items-center mb-4 sm:mb-6">
              <Clock className="h-6 w-6 text-primary mr-3" />
              <h2 className="font-playfair text-xl sm:text-2xl font-bold text-accent dark:text-white">Hours</h2>
            </div>
            <div className="space-y-2 sm:space-y-3">
              {hours.map((schedule, index) => (
                <div key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b border-gray-200 dark:border-gray-600 last:border-b-0 space-y-1 sm:space-y-0">
                  <span className="text-sm sm:text-base text-gray-600 dark:text-gray-300">{schedule.day}</span>
                  <span className="text-sm sm:text-base font-semibold text-accent dark:text-white">{schedule.time}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-neutral-cream dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <strong>Holiday Hours:</strong> Please call ahead during holidays as our hours may vary.
              </p>
            </div>
          </div>

          {/* Location */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 sm:p-8 transition-colors">
            <div className="flex items-center mb-4 sm:mb-6">
              <MapPin className="h-6 w-6 text-primary mr-3" />
              <h2 className="font-playfair text-xl sm:text-2xl font-bold text-accent dark:text-white">Location</h2>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-accent dark:text-white mb-1 sm:mb-2">Address</h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                  123 Gourmet Street<br />
                  Foodie District<br />
                  Culinary City, FC 12345
                </p>
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-accent dark:text-white mb-1 sm:mb-2">Contact</h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                  Phone: +1 (844) 543-7419<br />
                  Email: hello@bellavista.com
                </p>
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-accent dark:text-white mb-1 sm:mb-2">Parking</h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                  Free street parking available. Valet service on weekends.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Map Section */}
        <div className="mt-8 sm:mt-12 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 sm:p-8 transition-colors">
          <h2 className="font-playfair text-xl sm:text-2xl font-bold text-accent dark:text-white mb-4 sm:mb-6 text-center">
            Find Us
          </h2>
          <div className="w-full h-64 sm:h-80 lg:h-96 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3024.2219901290355!2d-74.00369368400567!3d40.71312937933185!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c25a316e10c7cb%3A0x1f6cf2e6a0c03a6c!2sNew%20York%2C%20NY%2C%20USA!5e0!3m2!1sen!2sus!4v1234567890"
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: '256px' }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-full"
              title="Restaurant Location"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;