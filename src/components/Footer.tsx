import React from 'react';
import { MapPin, Phone, Mail, Facebook, Instagram, Twitter } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-accent dark:bg-gray-800 text-white transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Restaurant Info */}
          <div>
            <h3 className="font-playfair text-xl font-semibold mb-4">La Bella Noches</h3>
            <p className="text-gray-300 dark:text-gray-400 mb-4">
              Authentic flavors. Local ingredients. Experience the finest evening dining in the heart of the city.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-300 dark:text-gray-400 hover:text-white transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-300 dark:text-gray-400 hover:text-white transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-300 dark:text-gray-400 hover:text-white transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-playfair text-xl font-semibold mb-4">Contact Us</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-gray-300 dark:text-gray-400">123 Gourmet Street, Foodie District</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-primary" />
                <span className="text-gray-300 dark:text-gray-400">+1 (844) 543-7419</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-primary" />
                <span className="text-gray-300 dark:text-gray-400">hello@bellavista.com</span>
              </div>
            </div>
          </div>

          {/* Hours */}
          <div>
            <h3 className="font-playfair text-xl font-semibold mb-4">Hours</h3>
            <div className="space-y-2 text-gray-300 dark:text-gray-400">
              <div className="flex justify-between">
                <span>Monday - Friday</span>
                <span>11:00 AM - 10:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span>Saturday</span>
                <span>10:00 AM - 11:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span>Sunday</span>
                <span>10:00 AM - 9:00 PM</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-700 dark:border-gray-600 text-center text-gray-300 dark:text-gray-400">
          <p>&copy; 2024 La Bella Noches. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;