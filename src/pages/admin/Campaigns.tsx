import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Send, Calendar, Eye, RefreshCw, MessageSquare, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTemplates } from '../../components/AdminLayout';
import CampaignAnalyticsModal from '../../components/CampaignAnalyticsModal';
import { useSupabase } from '../../context/SupabaseContext';
import { useAuth } from '../../context/AuthContext';
import MediaLibraryModal from '../../components/MediaLibraryModal';

interface Campaign {
  id: string;
  name: string;
  status: string;
  listName: string;
  templateName: string;
  scheduledDate: string;
  sentCount: number;
  openRate: string;
  createdDate: string;
  campaignType: string;
  business: string;
  selectedLists: string[];
  templateId: string;
  channel: string;
  scheduleTime: string;
  mediaUrl: string;
  messageContent: string;
  webhookUrl?: string;
}

const Campaigns = () => {
  const { templates } = useTemplates();
  const { supabase, isLoading: supabaseLoading, isAuthenticated } = useSupabase();
  const { user } = useAuth();
  
  // State management
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contactLists, setContactLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactListsLoading, setContactListsLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaModalMode, setMediaModalMode] = useState<'select' | 'upload'>('select');
  
  // Form state for campaign creation/editing
  const [formData, setFormData] = useState({
    name: 'New Campaign',
    selectedLists: [] as string[],
    selectedTemplate: 'Welcome Message',
    templateName: 'Welcome Message',
    messageContent: 'Hi {{Name}}! Welcome to Bella Vista. Enjoy 10% off your first order with code WELCOME10. Reply STOP to opt out.',
    channel: 'sms',
    scheduledDate: '',
    scheduleTime: '',
    mediaUrl: '',
    campaignType: 'Regular Campaign'
  });

  // Fetch campaigns from Supabase Edge Function
  const fetchCampaigns = async () => {
    if (!supabase || !isAuthenticated) {
      console.warn('⚠️ Supabase not initialized or user not authenticated');
      return;
    }

    console.log('⏳ Starting campaign fetch...');
    try {
      setLoading(true);
      console.log('📡 Invoking campaign-operations function...');
      
      // Use supabase.functions.invoke instead of manual fetch
      const { data, error } = await supabase.functions.invoke('campaign-operations', {
        body: { action: 'get_campaigns' }
      });
      
      console.log('📦 Function response:', { data, error });
      
      if (error) {
        console.error('❌ Supabase function error:', error);
        throw new Error(`Function error: ${error.message}`);
      }
      
      if (data?.success) {
        console.log('✅ Successfully loaded campaigns:', data.data);
        setCampaigns(data.data || []);
      } else {
        console.error('❌ API error:', data?.error);
        throw new Error(data?.error || 'Failed to fetch campaigns');
      }
    } catch (error) {
      console.error('❌ Error fetching campaigns:', error);
      toast.error(`Failed to load campaigns: ${error.message}`);
      setCampaigns([]);
    } finally {
      console.log('🏁 Campaign fetch completed');
      setLoading(false);
    }
  };

  // Fetch contact lists
  const fetchContactLists = async () => {
    if (!supabase || !isAuthenticated) {
      console.warn('⚠️ Supabase not initialized or user not authenticated');
      return;
    }

    console.log('⏳ Starting contact lists fetch...');
    try {
      setContactListsLoading(true);
      console.log('📡 Invoking contact-list-operations function...');
      
      // Use supabase.functions.invoke instead of manual fetch
      const { data, error } = await supabase.functions.invoke('contact-list-operations', {
        body: { action: 'get_lists' }
      });
      
      console.log('📦 Contact lists response:', { data, error });
      
      if (error) {
        console.error('❌ Supabase function error:', error);
        throw new Error(`Function error: ${error.message}`);
      }
      
      if (data?.success) {
        console.log('✅ Successfully loaded contact lists:', data.data);
        // Clean up any double-quoted UUIDs before setting state
        const cleanedLists = (data.data || []).map(list => ({
          ...list,
          id: typeof list.id === 'string' ? list.id.replace(/"/g, '') : list.id
        }));
        setContactLists(cleanedLists);
      } else {
        console.error('❌ API error:', data?.error);
        throw new Error(data?.error || 'Failed to fetch contact lists');
      }
    } catch (error) {
      console.error('❌ Error fetching contact lists:', error);
      toast.error(`Failed to load contact lists: ${error.message}`);
      setContactLists([]);
    } finally {
      console.log('🏁 Contact lists fetch completed');
      setContactListsLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    if (supabase && isAuthenticated && !supabaseLoading) {
      fetchCampaigns();
      fetchContactLists();
    }
  }, [supabase, isAuthenticated, supabaseLoading]);

  // Handle template selection
  const handleTemplateSelect = (template: any) => {
    setFormData({
      ...formData,
      selectedTemplate: template.name,
      templateName: template.name,
      messageContent: template.content
    });
  };
  
  // Handle media selection from MediaLibraryModal
  const handleMediaSelect = (url: string) => {
    setFormData({
      ...formData,
      mediaUrl: url
    });
  };

  // Open media selection modal
  const handleOpenMediaSelect = () => {
    setMediaModalMode('select');
    setShowMediaModal(true);
  };

  // Open media upload modal
  const handleOpenMediaUpload = () => {
    setMediaModalMode('upload');
    setShowMediaModal(true);
  };

  // Handle contact list selection
  const handleContactListToggle = (listId: string) => {
    setFormData({
      ...formData,
      selectedLists: formData.selectedLists.includes(listId)
        ? formData.selectedLists.filter(id => id !== listId)
        : [...formData.selectedLists, listId]
    });
  };

  // Handle campaign creation
  const handleCreateCampaign = async () => {
    if (!supabase || !isAuthenticated) {
      toast.error('Authentication required to create campaigns');
      return;
    }

    if (!formData.name.trim() || !formData.messageContent.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    console.log('⏳ Creating campaign...');
    try {
      const { data, error } = await supabase.functions.invoke('campaign-operations', {
        body: {
          action: 'create_campaign',
          user_id: user?.id, // Pass the user ID to the Edge Function
          name: formData.name,
          selectedLists: formData.selectedLists,
          selectedTemplate: formData.selectedTemplate,
          templateName: formData.templateName,
          messageContent: formData.messageContent,
          channel: formData.channel,
          scheduledDate: formData.scheduledDate,
          scheduleTime: formData.scheduleTime,
          mediaUrl: formData.mediaUrl,
          campaignType: formData.campaignType
        }
      });

      console.log('📦 Create campaign response:', { data, error });

      if (error) {
        console.error('❌ Campaign creation error:', error);
        throw new Error(`Function error: ${error.message}`);
      }
      
      if (data?.success) {
        console.log('✅ Campaign created successfully:', data.data);
        toast.success('Campaign created successfully!');
        setShowCreateModal(false);
        setFormData({
          name: 'New Campaign',
          selectedLists: [],
          selectedTemplate: 'Welcome Message',
          templateName: 'Welcome Message',
          messageContent: 'Hi {{Name}}! Welcome to Bella Vista. Enjoy 10% off your first order with code WELCOME10. Reply STOP to opt out.',
          channel: 'sms',
          scheduledDate: '',
          scheduleTime: '',
          mediaUrl: '',
          campaignType: 'Regular Campaign'
        });
        fetchCampaigns(); // Refresh campaigns
      } else {
        console.error('❌ API error:', data?.error);
        throw new Error(data?.error || 'Failed to create campaign');
      }
    } catch (error) {
      console.error('❌ Error creating campaign:', error);
      toast.error(`Failed to create campaign: ${error.message}`);
    }
  };

  // Handle campaign deletion
  const handleDeleteCampaign = async (campaignId: string) => {
    if (!supabase || !isAuthenticated) {
      toast.error('Authentication required to delete campaigns');
      return;
    }

    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return;

    if (!window.confirm(`Are you sure you want to delete "${campaign.name}"? This action cannot be undone.`)) {
      return;
    }

    console.log('⏳ Deleting campaign:', campaignId);
    try {
      const { data, error } = await supabase.functions.invoke('campaign-operations', {
        body: {
          action: 'delete_campaign',
          campaign_id: campaignId
        }
      });

      console.log('📦 Delete campaign response:', { data, error });

      if (error) {
        console.error('❌ Campaign deletion error:', error);
        throw new Error(`Function error: ${error.message}`);
      }
      
      if (data?.success) {
        console.log('✅ Campaign deleted successfully');
        toast.success('Campaign deleted successfully!');
        fetchCampaigns(); // Refresh campaigns
      } else {
        console.error('❌ API error:', data?.error);
        throw new Error(data?.error || 'Failed to delete campaign');
      }
    } catch (error) {
      console.error('❌ Error deleting campaign:', error);
      toast.error(`Failed to delete campaign: ${error.message}`);
    }
  };

  // Handle campaign sending
  const handleSendCampaign = async (campaignId: string) => {
    if (!supabase || !isAuthenticated) {
      toast.error('Authentication required to send campaigns');
      return;
    }

    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return;

    if (!window.confirm(`Are you sure you want to send "${campaign.name}" now?`)) {
      return;
    }

    console.log('⏳ Sending campaign:', campaignId);
    try {
      const { data, error } = await supabase.functions.invoke('campaign-operations', {
        body: {
          action: 'update_campaign',
          campaign_id: campaignId,
          status: 'sending'
        }
      });

      console.log('📦 Send campaign response:', { data, error });

      if (error) {
        console.error('❌ Campaign sending error:', error);
        throw new Error(`Function error: ${error.message}`);
      }
      
      if (data?.success) {
        console.log('✅ Campaign sent successfully');
        toast.success('Campaign is being sent!');
        fetchCampaigns(); // Refresh campaigns
      } else {
        console.error('❌ API error:', data?.error);
        throw new Error(data?.error || 'Failed to send campaign');
      }
    } catch (error) {
      console.error('❌ Error sending campaign:', error);
      toast.error(`Failed to send campaign: ${error.message}`);
    }
  };

  // Handle analytics view
  const handleViewAnalytics = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setShowAnalyticsModal(true);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'sending':
        return 'bg-yellow-100 text-yellow-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get channel icon
  const getChannelIcon = (channel: string) => {
    return channel === 'sms' ? (
      <Phone className="h-4 w-4 text-blue-600" />
    ) : (
      <MessageSquare className="h-4 w-4 text-green-600" />
    );
  };

  if (supabaseLoading || !supabase) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Campaigns</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">Initializing authentication...</p>
          </div>
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Campaigns</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">Please sign in to manage campaigns</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Authentication Required
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Please sign in to access campaign management.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Campaigns</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">Loading campaigns...</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Campaigns</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-300">
            Create and manage your SMS and WhatsApp marketing campaigns
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={fetchCampaigns}
            className="flex items-center px-2 sm:px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            title="Refresh campaigns"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-3 sm:px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm sm:text-base"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Create Campaign</span>
            <span className="sm:hidden">Create</span>
          </button>
        </div>
      </div>

      {/* Campaigns Table */}
      {campaigns.length === 0 ? (
        <div className="text-center py-8 sm:py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <Send className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2">
            No campaigns found
          </h3>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-4 sm:mb-6">
            Create your first campaign to start reaching your customers via SMS and WhatsApp.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-3 sm:px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm sm:text-base"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create First Campaign
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
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
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden sm:table-cell">
                    Target Lists
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Channel
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden lg:table-cell">
                    Scheduled
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">
                    Sent
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="flex items-center">
                        <div>
                          <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                            {campaign.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {campaign.templateName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(campaign.status)}`}>
                        {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 dark:text-white hidden sm:table-cell">
                      {campaign.listName}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        {getChannelIcon(campaign.channel)}
                        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 capitalize">
                          {campaign.channel}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden lg:table-cell">
                      {campaign.scheduledDate ? (
                        <div>
                          <div>{campaign.scheduledDate}</div>
                          {campaign.scheduleTime && (
                            <div className="text-xs">{campaign.scheduleTime}</div>
                          )}
                        </div>
                      ) : (
                        'Not scheduled'
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-white hidden md:table-cell">
                      {campaign.sentCount.toLocaleString()}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewAnalytics(campaign)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                          title="View analytics"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {campaign.status === 'draft' && (
                          <button
                            onClick={() => handleSendCampaign(campaign.id)}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                            title="Send now"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteCampaign(campaign.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                          title="Delete campaign"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4">
          <div className="flex items-center justify-center min-h-screen">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block w-full max-w-4xl bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all align-middle">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Create New Campaign
                </h3>
                
                <div className="space-y-4 sm:space-y-6 max-h-96 sm:max-h-none overflow-y-auto">
                  {/* Campaign Name */}
                  <div>
                    <label htmlFor="campaignName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                      Campaign Name *
                    </label>
                    <input
                      type="text"
                      id="campaignName"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm sm:text-base"
                      placeholder="e.g., Weekend Special Offer"
                    />
                  </div>

                  {/* Channel and Campaign Type */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label htmlFor="channel" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                        Channel *
                      </label>
                      <select
                        id="channel"
                        value={formData.channel}
                        onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm sm:text-base"
                      >
                        <option value="sms">SMS</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="both">Both</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="campaignType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                        Campaign Type
                      </label>
                      <select
                        id="campaignType"
                        value={formData.campaignType}
                        onChange={(e) => setFormData({ ...formData, campaignType: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm sm:text-base"
                      >
                        <option value="Regular Campaign">Regular Campaign</option>
                        <option value="Special Offer">Special Offer</option>
                        <option value="Announcement">Announcement</option>
                      </select>
                    </div>
                  </div>

                  {/* Contact Lists */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                      Contact Lists
                    </label>
                    <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 sm:p-3 bg-white dark:bg-gray-700 max-h-24 sm:max-h-32 overflow-y-auto">
                      {contactListsLoading ? (
                        <div className="text-center py-2">
                          <div className="text-sm text-gray-500 dark:text-gray-400">Loading lists...</div>
                        </div>
                      ) : contactLists.length === 0 ? (
                        <div className="text-center py-2">
                          <div className="text-sm text-gray-500 dark:text-gray-400">No contact lists found</div>
                        </div>
                      ) : (
                        <div className="space-y-1 sm:space-y-2">
                          {contactLists.map((list) => (
                            <label key={list.id} className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={formData.selectedLists.includes(list.id)}
                                onChange={() => handleContactListToggle(list.id)}
                                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                              />
                              <span className="text-xs sm:text-sm text-gray-900 dark:text-white">{list.name}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {list.contactCount} contacts
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Select Template */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                      Select Template (Optional)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 max-h-32 sm:max-h-48 overflow-y-auto">
                      {templates.map((template) => (
                        <div
                          key={template.id}
                          onClick={() => handleTemplateSelect(template)}
                          className={`p-2 sm:p-3 border rounded-lg cursor-pointer transition-colors ${
                            formData.selectedTemplate === template.name
                              ? 'border-primary bg-primary/10 dark:bg-primary/20'
                              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                          }`}
                        >
                          <div className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white mb-1">
                            {template.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {template.content.substring(0, 50)}...
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Message Content */}
                  <div>
                    <label htmlFor="messageContent" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                      Message Content *
                    </label>
                    <textarea
                      id="messageContent"
                      value={formData.messageContent}
                      onChange={(e) => setFormData({ ...formData, messageContent: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm sm:text-base"
                      placeholder="Enter your message content..."
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Character count: {formData.messageContent.length} / 160 (SMS limit)
                    </p>
                  </div>

                  {/* Media URL */}
                  <div>
                    <label htmlFor="mediaUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                      Media URL (Optional)
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="url"
                        id="mediaUrl"
                        value={formData.mediaUrl}
                        onChange={(e) => setFormData({ ...formData, mediaUrl: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm sm:text-base"
                        placeholder="https://images.pexels.com/photos/1640772/pexels-"
                      />
                      <button
                        onClick={handleOpenMediaSelect}
                        type="button"
                        className="hidden sm:block px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                      >
                        📎 Select
                      </button>
                      <button
                        onClick={handleOpenMediaUpload}
                        type="button"
                        className="hidden sm:block px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                      >
                        📤 Upload
                      </button>
                    </div>
                  </div>

                  {/* Schedule Date and Time */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                        Schedule Date (Optional)
                      </label>
                      <input
                        type="date"
                        id="scheduledDate"
                        value={formData.scheduledDate}
                        onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm sm:text-base"
                        placeholder="mm/dd/yyyy"
                      />
                    </div>

                    <div>
                      <label htmlFor="scheduleTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                        Schedule Time (Optional)
                      </label>
                      <input
                        type="time"
                        id="scheduleTime"
                        value={formData.scheduleTime}
                        onChange={(e) => setFormData({ ...formData, scheduleTime: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm sm:text-base"
                        placeholder="--:-- --"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 flex flex-col sm:flex-row-reverse space-y-2 sm:space-y-0 sm:space-x-3 sm:space-x-reverse">
                <button
                  onClick={handleCreateCampaign}
                  className="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-sm sm:text-base font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Create Campaign
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Modal */}
      {showAnalyticsModal && selectedCampaign && (
        <CampaignAnalyticsModal
          campaign={selectedCampaign}
          onClose={() => {
            setShowAnalyticsModal(false);
            setSelectedCampaign(null);
          }}
        />
      )}
      
      {/* Media Library Modal */}
      {showMediaModal && (
        <MediaLibraryModal
          onClose={() => setShowMediaModal(false)}
          onSelect={handleMediaSelect}
          mode={mediaModalMode}
        />
      )}
    </div>
  );
};

export default Campaigns;