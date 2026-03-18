import React, { useState } from 'react';
import { Users, Download, Send, ExternalLink, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const OwnerDashboard = () => {
  const [msgData, setMsgData] = useState({ phone: '', message: '' });
  const [msgLoading, setMsgLoading] = useState(false);
  const [msgSent, setMsgSent] = useState(false);

  const airtableInterfaceUrl = import.meta.env.VITE_AIRTABLE_INTERFACE_URL || '';
  const airtableCsvUrl = import.meta.env.VITE_AIRTABLE_CSV_URL || '';
  const isInterfaceConfigured = airtableInterfaceUrl && !airtableInterfaceUrl.includes('YOUR_');
  const isCsvConfigured = airtableCsvUrl && !airtableCsvUrl.includes('YOUR_');

  const handleMsgChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setMsgData(prev => ({ ...prev, [name]: value }));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsgLoading(true);

    try {
      const webhookUrl = import.meta.env.VITE_MAKE_MANUAL_MSG_WEBHOOK_URL;
      if (!webhookUrl || webhookUrl.includes('YOUR_')) {
        throw new Error('not configured');
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: msgData.phone,
          message: msgData.message,
          sentAt: new Date().toISOString(),
          sentFrom: 'owner-dashboard',
        }),
      });

      if (!response.ok) throw new Error(`Webhook error: ${response.status}`);

      setMsgSent(true);
      setMsgData({ phone: '', message: '' });
      toast.success('Message sent successfully!');
      setTimeout(() => setMsgSent(false), 4000);
    } catch (error: any) {
      console.error('Send message error:', error);
      if (error.message === 'not configured') {
        toast.error('Manual messaging webhook not configured. Set VITE_MAKE_MANUAL_MSG_WEBHOOK_URL in .env');
      } else {
        toast.error('Failed to send message. Please try again.');
      }
    } finally {
      setMsgLoading(false);
    }
  };

  return (
    <div className="py-10 sm:py-14 lg:py-16 bg-neutral-cream dark:bg-gray-900 min-h-screen transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">

        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
          <h1 className="font-playfair text-3xl sm:text-4xl font-bold text-accent dark:text-white">
            Owner Dashboard
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400 text-sm sm:text-base">
            La Bella Noches — internal management panel
          </p>
        </div>

        {/* Section 1: Customer List */}
        <section>
          <div className="flex items-center mb-4">
            <Users className="h-6 w-6 text-primary mr-2" />
            <h2 className="font-playfair text-xl sm:text-2xl font-bold text-accent dark:text-white">
              Customer List
            </h2>
          </div>

          {isInterfaceConfigured ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
              <iframe
                src={airtableInterfaceUrl}
                title="Airtable Customer Interface"
                className="w-full"
                style={{ height: '600px', border: 'none' }}
                allowFullScreen
              />
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
              <AlertCircle className="h-10 w-10 text-yellow-500 mx-auto mb-3" />
              <h3 className="font-semibold text-accent dark:text-white mb-2">Airtable Interface Not Configured</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Set <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">VITE_AIRTABLE_INTERFACE_URL</code> in your <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">.env</code> file to embed your Airtable interface here.
              </p>
              <ol className="text-left text-sm text-gray-600 dark:text-gray-300 space-y-1 max-w-md mx-auto list-decimal list-inside">
                <li>Open your Airtable base</li>
                <li>Go to <strong>Interfaces</strong> → select your interface</li>
                <li>Click <strong>Share</strong> → enable public sharing</li>
                <li>Copy the link and paste it into <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">VITE_AIRTABLE_INTERFACE_URL</code></li>
              </ol>
            </div>
          )}
        </section>

        {/* Section 2: Download Contacts */}
        <section>
          <div className="flex items-center mb-4">
            <Download className="h-6 w-6 text-primary mr-2" />
            <h2 className="font-playfair text-xl sm:text-2xl font-bold text-accent dark:text-white">
              Download Contacts
            </h2>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 sm:p-8">
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-6">
              Download your full contact list as a CSV file for backup or use in other tools.
            </p>

            {isCsvConfigured ? (
              <a
                href={airtableCsvUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 bg-primary text-white py-2 sm:py-3 px-5 sm:px-6 rounded-lg font-semibold hover:bg-primary/90 transition-colors shadow-lg hover:shadow-xl text-sm sm:text-base"
              >
                <Download className="h-4 w-4" />
                <span>Download Contacts CSV</span>
                <ExternalLink className="h-3 w-3 opacity-70" />
              </a>
            ) : (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">CSV URL not configured</p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-400">
                      Set <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">VITE_AIRTABLE_CSV_URL</code> in <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">.env</code>.
                      In Airtable: open your grid view → <strong>...</strong> → <strong>Download CSV</strong>, or share a view and use its CSV link.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Section 3: Send Manual Message */}
        <section>
          <div className="flex items-center mb-4">
            <Send className="h-6 w-6 text-primary mr-2" />
            <h2 className="font-playfair text-xl sm:text-2xl font-bold text-accent dark:text-white">
              Send Manual Message
            </h2>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 sm:p-8">
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-6">
              Send a one-time SMS to a specific customer. This goes through your Make.com manual message scenario.
            </p>

            {msgSent ? (
              <div className="text-center py-6">
                <div className="rounded-full bg-primary/10 p-3 mx-auto w-14 h-14 flex items-center justify-center mb-3">
                  <Send className="w-6 h-6 text-primary" />
                </div>
                <p className="font-semibold text-accent dark:text-white">Message dispatched!</p>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="space-y-4 max-w-lg">
                <div>
                  <label htmlFor="msg-phone" className="block text-sm font-medium text-accent dark:text-white mb-1">
                    Recipient Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="msg-phone"
                    name="phone"
                    required
                    placeholder="+1234567890"
                    disabled={msgLoading}
                    className="w-full px-4 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors disabled:opacity-50 text-sm sm:text-base"
                    value={msgData.phone}
                    onChange={handleMsgChange}
                  />
                </div>

                <div>
                  <label htmlFor="msg-message" className="block text-sm font-medium text-accent dark:text-white mb-1">
                    Message *
                  </label>
                  <textarea
                    id="msg-message"
                    name="message"
                    rows={4}
                    required
                    maxLength={160}
                    disabled={msgLoading}
                    placeholder="Type your message here... (160 characters max for a single SMS)"
                    className="w-full px-4 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors resize-none disabled:opacity-50 text-sm sm:text-base"
                    value={msgData.message}
                    onChange={handleMsgChange}
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">{msgData.message.length}/160</p>
                </div>

                <button
                  type="submit"
                  disabled={msgLoading}
                  className="flex items-center space-x-2 bg-primary text-white py-2 sm:py-3 px-5 sm:px-6 rounded-lg font-semibold hover:bg-primary/90 transition-colors shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {msgLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Send Message</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </section>

      </div>
    </div>
  );
};

export default OwnerDashboard;
