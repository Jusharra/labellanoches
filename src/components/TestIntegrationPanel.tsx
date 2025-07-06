import React, { useState, useEffect } from 'react';
import { MessageSquare, Phone, Send, TestTube, AlertCircle, CheckCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

// Initialize Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const TestIntegrationPanel = () => {
  const [selectedChannel, setSelectedChannel] = useState<'SMS' | 'WhatsApp'>('SMS');
  const [messagePreview, setMessagePreview] = useState('');
  const [customerResponse, setCustomerResponse] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [responseStatus, setResponseStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

  useEffect(() => {
    // Simulate fetching message preview from API
    fetchMessagePreview();
  }, [selectedChannel]);

  const fetchMessagePreview = async () => {
    // Simulate API call to GET /api/test-integration/preview?channel=SMS|WhatsApp
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const previews = {
      SMS: `Welcome to Bella Vista! 📱

Our Menu:
1. Bruschetta Trio - $12
2. Signature Salmon - $28
3. Ribeye Steak - $35
4. Tiramisu - $8

Reply with item numbers to order (e.g., "1,3")
Or call us at (555) 123-4567

Reply STOP to opt out.`,
      WhatsApp: `🍽️ Welcome to Bella Vista! 🍽️

🥗 Today's Specials:
1️⃣ Bruschetta Trio - $12
2️⃣ Signature Salmon - $28  
3️⃣ Ribeye Steak - $35
4️⃣ Tiramisu - $8

Simply reply with the numbers of items you'd like to order! 
Example: "1,3" for Bruschetta and Steak

📞 Questions? Call (555) 123-4567
🚫 Reply STOP to unsubscribe`
    };
    
    setMessagePreview(previews[selectedChannel]);
  };

  const handleTestSend = async (channel: 'SMS' | 'WhatsApp') => {
    setTestStatus('sending');
    
    try {
      // Simulate API call to POST /api/test-integration/send?channel=SMS|WhatsApp
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log(`Testing ${channel} integration...`);
      setTestStatus('success');
      
      // Reset status after 3 seconds
      setTimeout(() => setTestStatus('idle'), 3000);
      
    } catch (error) {
      console.error(`Error testing ${channel} integration:`, error);
      setTestStatus('error');
      setTimeout(() => setTestStatus('idle'), 3000);
    }
  };

  const handleProcessResponse = async () => {
    if (!customerResponse.trim()) {
      toast.error('Please enter a customer response to test.');
      return;
    }
    
    setResponseStatus('processing');
    
    try {
      // Call the real Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('process-order-request', {
        body: {
          customerResponse: customerResponse.trim(),
          customerPhone: '+1234567890', // Test phone number
          customerName: 'Test Customer',
          channel: selectedChannel
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to process order');
      }

      if (data?.success) {
        setResponseStatus('success');
        const orderDetails = data.details;
        const itemList = orderDetails.items.map((item: any) => `${item.name} ($${item.price.toFixed(2)})`).join(', ');
        
        toast.success(`Order processed successfully! Items: ${itemList}, Total: $${orderDetails.total.toFixed(2)}`);
      } else {
        setResponseStatus('error');
        toast.error(data?.error || 'Order processing failed');
      }
      
    } catch (error) {
      console.error('Error processing response:', error);
      setResponseStatus('error');
      toast.error(`Error: ${error.message || 'Failed to process order'}`);
    } finally {
      // Reset status after 3 seconds
      setTimeout(() => setResponseStatus('idle'), 3000);
    }
  };

  const getChannelIcon = (channel: 'SMS' | 'WhatsApp') => {
    return channel === 'SMS' ? (
      <Phone className="h-4 w-4" />
    ) : (
      <MessageSquare className="h-4 w-4" />
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <TestTube className="h-4 w-4" />;
    }
  };

  const getButtonClass = (status: string, baseClass: string) => {
    switch (status) {
      case 'sending':
      case 'processing':
        return `${baseClass} opacity-75 cursor-not-allowed`;
      case 'success':
        return `${baseClass} bg-green-600 hover:bg-green-700`;
      case 'error':
        return `${baseClass} bg-red-600 hover:bg-red-700`;
      default:
        return baseClass;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Test Menu Ordering Integration */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center space-x-2 mb-6">
          <TestTube className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Test Menu Ordering Integration
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="channel" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Channel
            </label>
            <select
              id="channel"
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value as 'SMS' | 'WhatsApp')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="SMS">SMS</option>
              <option value="WhatsApp">WhatsApp</option>
            </select>
          </div>

          <div>
            <label htmlFor="messagePreview" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Message Preview
            </label>
            <textarea
              id="messagePreview"
              value={messagePreview}
              readOnly
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleTestSend('SMS')}
              disabled={testStatus === 'sending'}
              className={getButtonClass(
                testStatus,
                "flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              )}
            >
              {getStatusIcon(testStatus)}
              <span>
                {testStatus === 'sending' ? 'Testing SMS...' : 'Test SMS Order'}
              </span>
            </button>

            <button
              onClick={() => handleTestSend('WhatsApp')}
              disabled={testStatus === 'sending'}
              className={getButtonClass(
                testStatus,
                "flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              )}
            >
              {getStatusIcon(testStatus)}
              <span>
                {testStatus === 'sending' ? 'Testing WhatsApp...' : 'Test WhatsApp Order'}
              </span>
            </button>
          </div>

          {testStatus === 'success' && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-sm text-green-800 dark:text-green-200">
                  Test message sent successfully! Check your phone for the test order menu.
                </span>
              </div>
            </div>
          )}

          {testStatus === 'error' && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="text-sm text-red-800 dark:text-red-200">
                  Test failed. Please check your integration settings and try again.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Test Order Response Processing */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Send className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Test Order Response Processing
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="customerResponse" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Customer Response
            </label>
            <input
              type="text"
              id="customerResponse"
              value={customerResponse}
              onChange={(e) => setCustomerResponse(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder='e.g., "1,3" or "2"'
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Simulate a customer ordering by item numbers
            </p>
          </div>

          <button
            onClick={handleProcessResponse}
            disabled={responseStatus === 'processing' || !customerResponse.trim()}
            className={getButtonClass(
              responseStatus,
              "w-full flex items-center justify-center space-x-2 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {getStatusIcon(responseStatus)}
            <span>
              {responseStatus === 'processing' ? 'Processing Response...' : 'Process Order Response'}
            </span>
          </button>

          {responseStatus === 'success' && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-sm text-green-800 dark:text-green-200">
                  Order response processed successfully! Customer will receive confirmation.
                </span>
              </div>
            </div>
          )}

          {responseStatus === 'error' && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="text-sm text-red-800 dark:text-red-200">
                  Invalid response format. Please check the input and try again.
                </span>
              </div>
            </div>
          )}

          {/* Example Responses */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              Example Customer Responses:
            </h4>
            <div className="space-y-1 text-xs text-blue-800 dark:text-blue-200">
              <div className="flex justify-between">
                <code>"1,3"</code>
                <span>Orders Bruschetta Trio + Ribeye Steak</span>
              </div>
              <div className="flex justify-between">
                <code>"2"</code>
                <span>Orders Signature Salmon</span>
              </div>
              <div className="flex justify-between">
                <code>"1,2,4"</code>
                <span>Orders Bruschetta + Salmon + Tiramisu</span>
              </div>
              <div className="flex justify-between">
                <code>"invalid"</code>
                <span>Error response (no item numbers)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestIntegrationPanel;