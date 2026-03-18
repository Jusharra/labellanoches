import React, { useState } from 'react';
import { MessageSquare, Phone, Check, CalendarDays } from 'lucide-react';
import toast from 'react-hot-toast';

const menuItems: { [key: string]: { id: number; name: string; description: string; price: string; image: string }[] } = {
  starters: [
    {
      id: 1,
      name: 'Bruschetta al Pomodoro',
      description: 'Toasted sourdough topped with fresh vine tomatoes, basil, and a drizzle of extra-virgin olive oil.',
      price: '$9',
      image: 'https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg?auto=compress&cs=tinysrgb&w=800',
    },
    {
      id: 2,
      name: 'Crispy Calamari',
      description: 'Lightly breaded and fried calamari rings served with house marinara and lemon aioli.',
      price: '$13',
      image: 'https://images.pexels.com/photos/566566/pexels-photo-566566.jpeg?auto=compress&cs=tinysrgb&w=800',
    },
    {
      id: 3,
      name: 'Soup of the Day',
      description: 'Ask your server for today\'s housemade soup, crafted from seasonal, locally sourced produce.',
      price: '$8',
      image: 'https://images.pexels.com/photos/1731535/pexels-photo-1731535.jpeg?auto=compress&cs=tinysrgb&w=800',
    },
  ],
  mains: [
    {
      id: 4,
      name: 'Pan-Seared Salmon',
      description: 'Signature dish — herb-crusted salmon fillet with roasted vegetables and lemon butter sauce.',
      price: '$28',
      image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800',
    },
    {
      id: 5,
      name: 'Grilled Chicken Milanese',
      description: 'Tender chicken breast pounded thin, grilled golden, topped with arugula, cherry tomatoes, and shaved Parmesan.',
      price: '$22',
      image: 'https://images.pexels.com/photos/2116094/pexels-photo-2116094.jpeg?auto=compress&cs=tinysrgb&w=800',
    },
    {
      id: 6,
      name: 'Rigatoni alla Norma',
      description: 'Rigatoni tossed in a rich San Marzano tomato sauce with roasted eggplant, basil, and ricotta salata.',
      price: '$18',
      image: 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=800',
    },
  ],
  desserts: [
    {
      id: 7,
      name: 'Classic Tiramisu',
      description: 'Layers of espresso-soaked ladyfingers and mascarpone cream dusted with fine cocoa.',
      price: '$9',
      image: 'https://images.pexels.com/photos/6880219/pexels-photo-6880219.jpeg?auto=compress&cs=tinysrgb&w=800',
    },
    {
      id: 8,
      name: 'Panna Cotta',
      description: 'Silky vanilla panna cotta served with a fresh berry coulis and mint.',
      price: '$8',
      image: 'https://images.pexels.com/photos/1126359/pexels-photo-1126359.jpeg?auto=compress&cs=tinysrgb&w=800',
    },
  ],
  drinks: [
    {
      id: 9,
      name: 'House Sangria',
      description: 'Red or white wine sangria with fresh fruit and a hint of brandy.',
      price: '$10',
      image: 'https://images.pexels.com/photos/1536962/pexels-photo-1536962.jpeg?auto=compress&cs=tinysrgb&w=800',
    },
    {
      id: 10,
      name: 'Sparkling Limonata',
      description: 'House-made lemon syrup topped with sparkling water and a sprig of mint. Non-alcoholic.',
      price: '$5',
      image: 'https://images.pexels.com/photos/1616470/pexels-photo-1616470.jpeg?auto=compress&cs=tinysrgb&w=800',
    },
    {
      id: 11,
      name: 'Espresso Martini',
      description: 'Freshly pulled espresso, vodka, and coffee liqueur shaken until frothy.',
      price: '$13',
      image: 'https://images.pexels.com/photos/3407777/pexels-photo-3407777.jpeg?auto=compress&cs=tinysrgb&w=800',
    },
  ],
};

const categories = [
  { id: 'starters', name: 'Starters' },
  { id: 'mains', name: 'Main Courses' },
  { id: 'desserts', name: 'Desserts' },
  { id: 'drinks', name: 'Drinks' },
];

const Menu = () => {
  const [activeCategory, setActiveCategory] = useState('starters');
  const [bookingData, setBookingData] = useState({
    bookingType: 'Reservation',
    name: '',
    phone: '',
    email: '',
    date: '',
    time: '',
    partySize: '2',
    requests: '',
  });
  const [bookingSubmitted, setBookingSubmitted] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  const handleOrder = (itemName: string, orderType: 'sms' | 'whatsapp') => {
    const message = encodeURIComponent(`I'd like to order ${itemName}`);
    const phone = import.meta.env.VITE_BUSINESS_PHONE_NUMBER || '+18445437419';

    if (orderType === 'sms') {
      window.open(`sms:${phone}?body=${message}`, '_blank');
    } else {
      window.open(`https://wa.me/${phone.replace('+', '')}?text=${message}`, '_blank');
    }
  };

  const handleBookingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBookingData(prev => ({ ...prev, [name]: value }));
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingLoading(true);

    try {
      const webhookUrl = import.meta.env.VITE_MAKE_BOOKING_WEBHOOK_URL;
      if (!webhookUrl || webhookUrl.includes('YOUR_')) {
        throw new Error('not configured');
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            bookingType: bookingData.bookingType,
            customerName: bookingData.name,
            phoneNumber: bookingData.phone,
            email: bookingData.email || null,
            requestedDate: bookingData.date,
            preferredTime: bookingData.time,
            partySize: bookingData.bookingType === 'Reservation' ? bookingData.partySize : null,
            specialRequests: bookingData.requests || null,
            bookingStatus: 'New',
            source: 'Website',
            createdAt: new Date().toISOString(),
          }),
      });

      if (!response.ok) throw new Error(`Webhook error: ${response.status}`);

      setBookingSubmitted(true);
      toast.success(`${bookingData.bookingType} request received! We'll confirm shortly via SMS.`);
    } catch (error: any) {
      console.error('Booking error:', error);
      if (error.message === 'not configured') {
        toast.error('Online booking is temporarily unavailable. Please call us to reserve.');
      } else {
        toast.error('There was an error. Please try again or call us directly.');
      }
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="py-12 sm:py-16 lg:py-20 bg-neutral-cream dark:bg-gray-900 min-h-screen transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
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

        {/* How to Order */}
        <div className="mt-8 sm:mt-12 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 sm:p-8 text-center transition-colors">
          <h2 className="font-playfair text-xl sm:text-2xl font-bold text-accent dark:text-white mb-3 sm:mb-4">
            How to Order
          </h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-3 sm:mb-4">
            Click the SMS or WhatsApp button on any item to place your order. We'll confirm and provide pickup/delivery details.
          </p>
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 space-y-1">
            <p>SMS: +1 (844) 543-7419 &nbsp;|&nbsp; WhatsApp: +1 (844) 543-7419</p>
            <p>Average preparation time: 15–25 minutes</p>
          </div>
        </div>

        {/* Reservation Section */}
        <section id="reservation" className="mt-12 sm:mt-16 scroll-mt-20">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 sm:p-8 transition-colors">
            <div className="flex items-center mb-6">
              <CalendarDays className="h-7 w-7 text-primary mr-3" />
              <h2 className="font-playfair text-2xl sm:text-3xl font-bold text-accent dark:text-white">
                Make a Reservation
              </h2>
            </div>

            {bookingSubmitted ? (
              <div className="text-center py-8">
                <div className="rounded-full bg-primary/10 p-3 mx-auto w-16 h-16 flex items-center justify-center mb-4">
                  <Check className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-playfair text-xl font-bold text-accent dark:text-white mb-2">
                  Reservation Requested!
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  We'll confirm your table via SMS within a few minutes.
                </p>
                <button
                  onClick={() => { setBookingSubmitted(false); setBookingData({ bookingType: 'Reservation', name: '', phone: '', email: '', date: '', time: '', partySize: '2', requests: '' }); }}
                  className="bg-primary text-white py-2 px-6 rounded-lg font-semibold hover:bg-primary/90 transition-colors text-sm"
                >
                  Make Another Reservation
                </button>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">

                {/* Booking Type — full width */}
                <div className="sm:col-span-2">
                  <label htmlFor="res-type" className="block text-sm font-medium text-accent dark:text-white mb-1">
                    Booking Type *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Reservation', 'Service', 'Pickup'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        disabled={bookingLoading}
                        onClick={() => setBookingData(prev => ({ ...prev, bookingType: type }))}
                        className={`py-2 sm:py-3 rounded-lg text-sm font-semibold border-2 transition-colors disabled:opacity-50 ${
                          bookingData.bookingType === type
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-primary hover:text-primary'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Customer Name */}
                <div>
                  <label htmlFor="res-name" className="block text-sm font-medium text-accent dark:text-white mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    id="res-name"
                    name="name"
                    required
                    disabled={bookingLoading}
                    className="w-full px-4 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors disabled:opacity-50 text-sm sm:text-base"
                    value={bookingData.name}
                    onChange={handleBookingChange}
                  />
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="res-phone" className="block text-sm font-medium text-accent dark:text-white mb-1">
                    Phone (for SMS confirmation) *
                  </label>
                  <input
                    type="tel"
                    id="res-phone"
                    name="phone"
                    required
                    placeholder="+1234567890"
                    disabled={bookingLoading}
                    className="w-full px-4 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors disabled:opacity-50 text-sm sm:text-base"
                    value={bookingData.phone}
                    onChange={handleBookingChange}
                  />
                </div>

                {/* Email */}
                <div className="sm:col-span-2">
                  <label htmlFor="res-email" className="block text-sm font-medium text-accent dark:text-white mb-1">
                    Email (optional)
                  </label>
                  <input
                    type="email"
                    id="res-email"
                    name="email"
                    disabled={bookingLoading}
                    placeholder="you@example.com"
                    className="w-full px-4 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors disabled:opacity-50 text-sm sm:text-base"
                    value={bookingData.email}
                    onChange={handleBookingChange}
                  />
                </div>

                {/* Date */}
                <div>
                  <label htmlFor="res-date" className="block text-sm font-medium text-accent dark:text-white mb-1">
                    Requested Date *
                  </label>
                  <input
                    type="date"
                    id="res-date"
                    name="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    disabled={bookingLoading}
                    className="w-full px-4 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors disabled:opacity-50 text-sm sm:text-base"
                    value={bookingData.date}
                    onChange={handleBookingChange}
                  />
                </div>

                {/* Time */}
                <div>
                  <label htmlFor="res-time" className="block text-sm font-medium text-accent dark:text-white mb-1">
                    Preferred Time *
                  </label>
                  <input
                    type="time"
                    id="res-time"
                    name="time"
                    required
                    disabled={bookingLoading}
                    className="w-full px-4 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors disabled:opacity-50 text-sm sm:text-base"
                    value={bookingData.time}
                    onChange={handleBookingChange}
                  />
                </div>

                {/* Party Size — only for Reservation */}
                {bookingData.bookingType === 'Reservation' && (
                  <div className="sm:col-span-2">
                    <label htmlFor="res-party" className="block text-sm font-medium text-accent dark:text-white mb-1">
                      Party Size *
                    </label>
                    <select
                      id="res-party"
                      name="partySize"
                      required
                      disabled={bookingLoading}
                      className="w-full px-4 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors disabled:opacity-50 text-sm sm:text-base"
                      value={bookingData.partySize}
                      onChange={handleBookingChange}
                    >
                      {[1,2,3,4,5,6,7,8,9,10].map(n => (
                        <option key={n} value={String(n)}>{n} {n === 1 ? 'guest' : 'guests'}</option>
                      ))}
                      <option value="10+">10+ guests (please call us)</option>
                    </select>
                  </div>
                )}

                {/* Special Requests */}
                <div className="sm:col-span-2">
                  <label htmlFor="res-requests" className="block text-sm font-medium text-accent dark:text-white mb-1">
                    Special Requests (optional)
                  </label>
                  <textarea
                    id="res-requests"
                    name="requests"
                    rows={2}
                    disabled={bookingLoading}
                    placeholder="Allergies, celebrations, accessibility needs..."
                    className="w-full px-4 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors resize-none disabled:opacity-50 text-sm sm:text-base"
                    value={bookingData.requests}
                    onChange={handleBookingChange}
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={bookingLoading}
                    className="w-full bg-primary text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary/90 transition-colors duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {bookingLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Sending Request...</span>
                      </>
                    ) : (
                      <>
                        <CalendarDays className="h-4 w-4" />
                        <span>Request Reservation</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Menu;
