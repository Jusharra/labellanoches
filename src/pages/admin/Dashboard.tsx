import React, { useState, useEffect } from 'react';
import { Users, MessageSquare, Send, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSupabase } from '../../context/SupabaseContext';

const Dashboard = () => {
  const { supabase, isLoading: supabaseLoading, isAuthenticated } = useSupabase();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch campaigns from Supabase Edge Function
  useEffect(() => {
    const fetchCampaigns = async () => {
      if (!supabase || !isAuthenticated) {
        console.warn('⚠️ Dashboard: Supabase not initialized or user not authenticated');
        setLoading(false);
        return;
      }

      console.log('⏳ Dashboard: Starting campaign fetch...');
      try {
        setLoading(true);
        console.log('📡 Dashboard: Invoking campaign-operations function...');
        
        // Use supabase.functions.invoke with better error handling
        const { data, error } = await supabase.functions.invoke('campaign-operations', {
          body: { action: 'get_campaigns' },
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log('📦 Dashboard: Function response:', { data, error });
        
        if (error) {
          console.error('❌ Dashboard: Supabase function error:', error);
          // Check if this is a connection error
          if (error.message.includes('Failed to send a request to the Edge Function')) {
            throw new Error('Unable to connect to Edge Function. Please ensure the function is properly configured and running.');
          }
          throw new Error(`Function error: ${error.message}`);
        }
        
        if (data?.success) {
          console.log('✅ Dashboard: Successfully loaded campaigns:', data.data);
          setCampaigns(data.data || []);
        } else {
          console.error('❌ Dashboard: API error:', data?.error, data?.details);
          const errorMessage = data?.error || 'Failed to fetch campaigns';
          const details = data?.details ? ` Details: ${JSON.stringify(data.details)}` : '';
          throw new Error(`${errorMessage}${details}`);
        }
      } catch (error) {
        console.error('❌ Dashboard: Error fetching campaigns:', error);
        const errorMessage = error.message.includes('Edge Function') 
          ? 'Database connection issue. Please check your configuration.' 
          : `Failed to load campaigns: ${error.message}`;
        toast.error(errorMessage);
        setCampaigns([]);
      } finally {
        console.log('🏁 Dashboard: Campaign fetch completed');
        setLoading(false);
      }
    };

    if (supabase && isAuthenticated && !supabaseLoading) {
      fetchCampaigns();
    } else {
      setLoading(false);
    }
  }, [supabase, isAuthenticated, supabaseLoading]);
  
  const stats = [
    {
      name: 'Total Contacts',
      value: '2,847',
      change: '+12%',
      changeType: 'increase',
      icon: Users,
    },
    {
      name: 'Active Campaigns',
      value: campaigns.filter(c => c.status === 'scheduled' || c.status === 'draft').length.toString(),
      change: '+3',
      changeType: 'increase',
      icon: Send,
    },
    {
      name: 'Messages Sent',
      value: campaigns.reduce((total, campaign) => total + campaign.sentCount, 0).toLocaleString(),
      change: '+8%',
      changeType: 'increase',
      icon: MessageSquare,
    },
    {
      name: 'Engagement Rate',
      value: '73%',
      change: '+5%',
      changeType: 'increase',
      icon: TrendingUp,
    },
  ];

  // Get the most recent campaigns (limit to 5)
  const recentCampaigns = campaigns
    .sort((a, b) => new Date(b.createdDate || '').getTime() - new Date(a.createdDate || '').getTime())
    .slice(0, 5)
    .map(campaign => ({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      recipients: campaign.sentCount || 0,
      date: campaign.scheduledDate || campaign.createdDate || ''
    }));

  if (supabaseLoading || !supabase) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Initializing authentication...
          </p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Please sign in to access the dashboard.
          </p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Authentication Required
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Please sign in to access the admin dashboard.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-300">
          Welcome to your admin dashboard. Here's an overview of your SMS marketing performance.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Icon className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                </div>
                <div className="ml-3 sm:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      {stat.name}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white">
                        {stat.value}
                      </div>
                      <div className={`ml-1 sm:ml-2 flex items-baseline text-xs sm:text-sm font-semibold ${
                        stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stat.change}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Campaigns */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">Recent Campaigns</h2>
        </div>
        {loading ? (
          <div className="p-4 sm:p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Loading campaigns...</p>
          </div>
        ) : recentCampaigns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Recipients
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {recentCampaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                      {campaign.name}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        campaign.status === 'sent' 
                          ? 'bg-green-100 text-green-800' 
                          : campaign.status === 'scheduled'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                      {campaign.recipients.toLocaleString()}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                      {campaign.date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 sm:p-6 text-center text-gray-500 dark:text-gray-400">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-sm sm:text-base">No campaigns created yet. Create your first campaign to get started!</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-3 sm:mb-4">Quick Actions</h3>
          <div className="space-y-2 sm:space-y-3">
            <button className="w-full text-left px-3 sm:px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm sm:text-base">
              Create New Campaign
            </button>
            <button className="w-full text-left px-3 sm:px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm sm:text-base">
              Add Menu Item
            </button>
            <button className="w-full text-left px-3 sm:px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm sm:text-base">
              Upload Contacts
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-3 sm:mb-4">System Status</h3>
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-sm text-gray-600 dark:text-gray-300">SMS Service</span>
              <span className="text-green-600 text-sm font-medium">Operational</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-sm text-gray-600 dark:text-gray-300">WhatsApp API</span>
              <span className="text-green-600 text-sm font-medium">Operational</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-sm text-gray-600 dark:text-gray-300">Database</span>
              <span className="text-green-600 text-sm font-medium">Operational</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-3 sm:mb-4">Tips</h3>
          <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
            <p>• Schedule campaigns during peak hours (11 AM - 2 PM, 5 PM - 8 PM)</p>
            <p>• Use personalized templates for better engagement</p>
            <p>• Review analytics to optimize your messaging</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;