import React, { useState, useEffect } from 'react';
import { Clock, Phone, MessageSquare, Check, X, RefreshCw } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

// Initialize Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface Order {
  id: number;
  customerName: string;
  items: string;
  total: string;
  channel: 'SMS' | 'WhatsApp';
  time: string;
  status: 'Pending' | 'Completed' | 'Cancelled';
  phone: string;
}

const OrderQueuePanel = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingOrderId, setProcessingOrderId] = useState<number | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    
    try {
      // Call Supabase Edge Function to get pending orders
      const { data, error } = await supabase.functions.invoke('order-operations/pending', {
        body: { limit: 50 }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to fetch orders');
      }
      
      if (data?.success) {
        // Transform the data to match our Order interface
        const transformedOrders: Order[] = data.data.map((order: any) => ({
          id: order.id,
          customerName: order.customerName,
          items: order.items,
          total: order.total,
          channel: order.channel as 'SMS' | 'WhatsApp',
          time: order.time,
          status: order.status as 'Pending' | 'Completed' | 'Cancelled',
          phone: order.phone
        }));
        
        setOrders(transformedOrders);
      } else {
        throw new Error('Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      // Fallback to empty array if there's an error
      setOrders([]);
    }
    
    setLoading(false);
  };

  const handleCompleteOrder = async (orderId: number) => {
    setProcessingOrderId(orderId);
    
    try {
      // Call Supabase Edge Function to complete the order
      const { data, error } = await supabase.functions.invoke(`order-operations/${orderId}/complete`, {
        method: 'POST'
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to complete order');
      }
      
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to complete order');
      }
      
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, status: 'Completed' as const }
          : order
      ));
      
      const order = orders.find(o => o.id === orderId);
      if (order) {
        toast.success(`Order for ${order.customerName} marked as complete!`);
      }
      
      // Remove completed orders after a delay
      setTimeout(() => {
        setOrders(prev => prev.filter(order => order.id !== orderId));
      }, 2000);
      
    } catch (error) {
      console.error('Error completing order:', error);
      toast.error('Error completing order. Please try again.');
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    if (!window.confirm(`Are you sure you want to cancel the order from ${order.customerName}?`)) {
      return;
    }
    
    setProcessingOrderId(orderId);
    
    try {
      // Call Supabase Edge Function to cancel the order
      const { data, error } = await supabase.functions.invoke(`order-operations/${orderId}/cancel`, {
        method: 'POST'
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to cancel order');
      }
      
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to cancel order');
      }
      
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, status: 'Cancelled' as const }
          : order
      ));
      
      toast.success(`Order for ${order.customerName} has been cancelled.`);
      
      // Remove cancelled orders after a delay
      setTimeout(() => {
        setOrders(prev => prev.filter(order => order.id !== orderId));
      }, 2000);
      
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Error cancelling order. Please try again.');
    } finally {
      setProcessingOrderId(null);
    }
  };

  const getChannelIcon = (channel: 'SMS' | 'WhatsApp') => {
    return channel === 'SMS' ? (
      <Phone className="h-4 w-4 text-blue-600" />
    ) : (
      <MessageSquare className="h-4 w-4 text-green-600" />
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'Cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="h-5 w-5 animate-spin text-primary" />
            <span className="text-gray-600 dark:text-gray-300">Loading orders...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Clock className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Order Queue</h2>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            {orders.filter(o => o.status === 'Pending').length} pending
          </span>
        </div>
        <button
          onClick={fetchOrders}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          title="Refresh orders"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
      
      {orders.length === 0 ? (
        <div className="p-8 text-center">
          <Clock className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No pending orders</h3>
          <p className="text-gray-500 dark:text-gray-400">Orders will appear here when customers place them via SMS or WhatsApp.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Channel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {orders.map((order) => (
                <tr key={order.id} className={order.status !== 'Pending' ? 'opacity-60' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {order.customerName}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {order.phone}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white max-w-xs">
                      {order.items}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {order.total}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-1">
                      {getChannelIcon(order.channel)}
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {order.channel}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {order.time}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {order.status === 'Pending' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleCompleteOrder(order.id)}
                          disabled={processingOrderId === order.id}
                          className="text-green-600 hover:text-green-900 disabled:opacity-50 transition-colors"
                          title="Mark as complete"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          disabled={processingOrderId === order.id}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50 transition-colors"
                          title="Cancel order"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default OrderQueuePanel;