import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // In a real application, you would send this data to your backend
    // For now, we'll just simulate a successful submission
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsSubmitted(true);
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('There was an error submitting the form. Please try again.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const contactInfo = [
    {
      icon: <Phone className="h-6 w-6 text-primary" />,
      title: 'Phone',
      details: '+1 (844) 543-7419',
      action: 'tel:+18445437419',
    },
    {
      icon: <Mail className="h-6 w-6 text-primary" />,
      title: 'Email',
      details: 'hello@labellanochesco.com',
      action: 'mailto:hello@bellavista.com',
    },
    {
      icon: <MapPin className="h-6 w-6 text-primary" />,
      title: 'Address',
      details: '123 Gourmet Street, Foodie District',
      action: 'https://maps.google.com/?q=123+Gourmet+Street',
    },
  ];

  return (
    <div className="py-16 bg-neutral-cream dark:bg-gray-900 min-h-screen transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="font-playfair text-4xl md:text-5xl font-bold text-accent dark:text-white mb-4">
            Contact Us
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Information */}
          <div>
            <h2 className="font-playfair text-2xl font-bold text-accent dark:text-white mb-8">
              Get in Touch
            </h2>
            
            <div className="space-y-6 mb-8">
              {contactInfo.map((info, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary/10 dark:bg-primary/20 rounded-lg flex items-center justify-center">
                    {info.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-accent dark:text-white mb-1">{info.title}</h3>
                    <a
                      href={info.action}
                      className="text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                    >
                      {info.details}
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Hours */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 transition-colors">
              <h3 className="font-playfair text-xl font-semibold text-accent dark:text-white mb-4">
                Business Hours
              </h3>
              <div className="space-y-2 text-gray-600 dark:text-gray-300">
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

          {/* Contact Form */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 transition-colors">
            {!isSubmitted ? (
              <>
                <h2 className="font-playfair text-2xl font-bold text-accent dark:text-white mb-6">
                  Send us a Message
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-accent dark:text-white mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                      value={formData.name}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-accent dark:text-white mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-accent dark:text-white mb-2">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={5}
                      required
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors resize-none"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Tell us about your inquiry, special requests, or feedback..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-primary text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary/90 transition-colors duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                  >
                    <Send className="h-4 w-4" />
                    <span>Send Message</span>
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center">
                <div className="rounded-full bg-primary/10 p-3 mx-auto w-16 h-16 flex items-center justify-center mb-4">
                  <Check className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-playfair text-2xl font-bold text-accent dark:text-white mb-2">
                  Message Sent!
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Thank you for reaching out. We'll get back to you within 24 hours.
                </p>
                <button
                  onClick={() => {
                    setIsSubmitted(false);
                    setFormData({ name: '', email: '', message: '' });
                  }}
                  className="bg-primary text-white py-2 px-6 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                >
                  Send Another Message
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Additional Information */}
        <div className="mt-12 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 transition-colors">
          <h2 className="font-playfair text-2xl font-bold text-accent dark:text-white mb-6 text-center">
            Additional Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-accent dark:text-white mb-3">Reservations</h3>
              <p className="text-gray-600 dark:text-gray-300">
                We accept reservations for parties of 6 or more. Please call us at least 24 hours in advance.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-accent dark:text-white mb-3">Private Events</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Interested in hosting a private event? Contact us to discuss catering options and private dining.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-accent dark:text-white mb-3">Dietary Restrictions</h3>
              <p className="text-gray-600 dark:text-gray-300">
                We accommodate various dietary restrictions. Please inform us when making your reservation.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-accent dark:text-white mb-3">Takeout & Delivery</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Order via SMS or WhatsApp for quick pickup. Delivery available within 3 miles.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;