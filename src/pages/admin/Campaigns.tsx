import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, BarChart3, Send, Calendar, MessageSquare, Users, Eye, RefreshCw, Image, Clock } from 'lucide-react';
import { useTemplates } from '../../components/AdminLayout';
import CampaignAnalyticsModal from '../../components/CampaignAnalyticsModal';
import toast from 'react-hot-toast';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

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

interface ContactList {
  id: string;
  name: string;
  description: string;
  contactCount: number;
  createdDate: string;
}

const Campaigns = () => {
  const { templates } = useTemplates();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contactLists, setContactLists] = useState<ContactList[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLists, setLoadingLists] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [selectedCampaignForAnalytics, setSelectedCampaignForAnalytics] = useState<Campaign | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  const [newCampaign, setNewCampaign] = useState({
    name: '',
    selectedLists: [] as string[],
    templateId: 'custom',
    selectedTemplateId: '',
    channel: 'sms',
    scheduledDate: '',
    scheduleTime: '',
    campaignType: 'Regular Campaign',
    messageContent: '',
    mediaUrl: ''
  });

  const [currentCampaign, setCurrentCampaign] = useState({
    id: '',
    name: '',
    status: '',
    selectedLists: [] as string[],
    templateId: 'custom',
    channel: 'sms',
    scheduledDate: '',
    scheduleTime: '',
    campaignType: 'Regular Campaign',
    messageContent: '',
    mediaUrl: ''
  });

  // Fetch campaigns on component mount
  useEffect(() => {
    fetchCampaigns();
    fetchContactLists();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/campaign-operations/campaigns`, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data?.success) {
        setCampaigns(data.data);
      } else {
        throw new Error(data?.error || 'Failed to fetch campaigns');
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to load campaigns. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchContactLists = async () => {
    try {
      setLoadingLists(true);
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/contact-list-operations/lists`, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data?.success) {
        setContactLists(data.data);
      } else {
        throw new Error(data?.error || 'Failed to fetch contact lists');
      }
    } catch (error) {
      console.error('Error fetching contact lists:', error);
      toast.error('Failed to load contact lists.');
    } finally {
      setLoadingLists(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (newCampaign.name.trim() && newCampaign.messageContent.trim()) {
      try {
        const payload = {
          name: newCampaign.name,
          messageContent: newCampaign.messageContent,
          channel: newCampaign.channel,
          mediaUrl: newCampaign.mediaUrl,
          campaignType: newCampaign.campaignType,
          selectedLists: newCampaign.selectedLists,
          scheduledDate: newCampaign.scheduledDate || null,
          scheduleTime: newCampaign.scheduleTime || null,
          templateName: newCampaign.selectedTemplateId ? 
            templates.find(t => t.id.toString() === newCampaign.selectedTemplateId)?.name : 
            'Custom Message'
        };

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/campaign-operations/campaigns`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data?.success) {
          setCampaigns(prev => [data.data, ...prev]);
          console.log('Created campaign:', data.data);

          // Reset state
          setNewCampaign({
            name: '',
            selectedLists: [],
            templateId: 'custom',
            selectedTemplateId: '',
            channel: 'sms',
            scheduledDate: '',
            scheduleTime: '',
            campaignType: 'Regular Campaign',
            messageContent: '',
            mediaUrl: ''
          });

          setShowCreateModal(false);
          toast.success('Campaign created successfully!');
        } else {
          throw new Error(data?.error || 'Failed to create campaign');
        }
      } catch (error) {
        console.error('Error creating campaign:', error);
        toast.error('Failed to create campaign. Please try again.');
      }
    } else {
      toast.error('Please fill in campaign name and message content.');
    }
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setCurrentCampaign({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      selectedLists: campaign.selectedLists,
      templateId: campaign.templateId,
      channel: campaign.channel,
      scheduledDate: campaign.scheduledDate,
      scheduleTime: campaign.scheduleTime,
      campaignType: campaign.campaignType,
      messageContent: campaign.messageContent,
      mediaUrl: campaign.mediaUrl
    });
    setShowEditModal(true);
  };

  const handleUpdateCampaign = async () => {
    try {
      const payload = {
        title: currentCampaign.name,
        message: currentCampaign.messageContent,
        channel: currentCampaign.channel,
        media_url: currentCampaign.mediaUrl,
        target_contact_lists: currentCampaign.selectedLists,
        scheduledDate: currentCampaign.scheduledDate,
        scheduleTime: currentCampaign.scheduleTime
      };

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/campaign-operations/campaigns/${currentCampaign.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data?.success) {
        setCampaigns(prev => prev.map(campaign => 
          campaign.id === currentCampaign.id ? data.data : campaign
        ));
        setShowEditModal(false);
        toast.success('Campaign updated successfully!');
      } else {
        throw new Error(data?.error || 'Failed to update campaign');
      }
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast.error('Failed to update campaign. Please try again.');
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (campaign && window.confirm(`Are you sure you want to delete "${campaign.name}"? This action cannot be undone.`)) {
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/campaign-operations/campaigns/${campaignId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data?.success) {
          setCampaigns(prev => prev.filter(c => c.id !== campaignId));
          toast.success('Campaign deleted successfully!');
        } else {
          throw new Error(data?.error || 'Failed to delete campaign');
        }
      } catch (error) {
        console.error('Error deleting campaign:', error);
        toast.error('Failed to delete campaign. Please try again.');
      }
    }
  };

  const handleSendCampaign = async (campaignId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (campaign && window.confirm(`Are you sure you want to send "${campaign.name}" immediately?`)) {
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/campaign-operations/campaigns/${campaignId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'sending' })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data?.success) {
          setCampaigns(prev => prev.map(c => 
            c.id === campaignId ? { ...c, status: 'sending' } : c
          ));
          toast.success('Campaign is being sent!');
        } else {
          throw new Error(data?.error || 'Failed to send campaign');
        }
      } catch (error) {
        console.error('Error sending campaign:', error);
        toast.error('Failed to send campaign. Please try again.');
      }
    }
  };

  const handleViewAnalytics = (campaign: Campaign) => {
    setSelectedCampaignForAnalytics(campaign);
    setShowAnalyticsModal(true);
  };

  const handleListToggle = (listId: string, isNewCampaign = true) => {
    if (isNewCampaign) {
      setNewCampaign(prev => ({
        ...prev,
        selectedLists: prev.selectedLists.includes(listId)
          ? prev.selectedLists.filter(id => id !== listId)
          : [...prev.selectedLists, listId]
      }));
    } else {
      setCurrentCampaign(prev => ({
        ...prev,
        selectedLists: prev.selectedLists.includes(listId)
          ? prev.selectedLists.filter(id => id !== listId)
          : [...prev.selectedLists, listId]
      }));
    }
  };

  const handleUseTemplate = (templateId: number, isNewCampaign = true) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      if (isNewCampaign) {
        setNewCampaign(prev => ({
          ...prev,
          messageContent: template.content,
          selectedTemplateId: templateId.toString()
        }));
      } else {
        setCurrentCampaign(prev => ({
          ...prev,
          messageContent: template.content
        }));
      }
      setShowTemplateSelector(false);
      toast.success(`Template "${template.name}" applied!`);
    }
  };

  const getStatusBadgeClass = (status: string) => {
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Campaigns</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Loading campaigns...
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Campaigns</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Create and manage your SMS and WhatsApp marketing campaigns
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={fetchCampaigns}
            className="flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            title="Refresh campaigns"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Campaign
          </button>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Campaign
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Recipients
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Sent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Open Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <MessageSquare className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        No campaigns created yet
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-6">
                        Create your first campaign to start reaching your customers.
                      </p>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Campaign
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <MessageSquare className="h-5 w-5 text-primary" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {campaign.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {campaign.listName} • {campaign.channel.toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(campaign.status)}`}>
                        {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {campaign.sentCount.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {campaign.sentCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {campaign.openRate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleViewAnalytics(campaign)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="View analytics"
                        >
                          <BarChart3 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleEditCampaign(campaign)}
                          className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
                          title="Edit campaign"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        {campaign.status === 'draft' && (
                          <button 
                            onClick={() => handleSendCampaign(campaign.id)}
                            className="text-green-600 hover:text-green-900 transition-colors"
                            title="Send campaign"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeleteCampaign(campaign.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Delete campaign"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
                  Create New Campaign
                </h3>
                
                <div className="space-y-6">
                  {/* Campaign Name */}
                  <div>
                    <label htmlFor="campaignName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Campaign Name *
                    </label>
                    <input
                      type="text"
                      id="campaignName"
                      value={newCampaign.name}
                      onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="e.g., Weekend Special Offer"
                    />
                  </div>

                  {/* Channel and Campaign Type */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="channel" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Channel *
                      </label>
                      <select
                        id="channel"
                        value={newCampaign.channel}
                        onChange={(e) => setNewCampaign({ ...newCampaign, channel: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="sms">SMS</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="both">Both</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="campaignType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Campaign Type
                      </label>
                      <select
                        id="campaignType"
                        value={newCampaign.campaignType}
                        onChange={(e) => setNewCampaign({ ...newCampaign, campaignType: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="Regular Campaign">Regular Campaign</option>
                        <option value="Promotional">Promotional</option>
                        <option value="Newsletter">Newsletter</option>
                        <option value="Announcement">Announcement</option>
                      </select>
                    </div>
                  </div>

                  {/* Contact Lists */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Contact Lists
                    </label>
                    <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 max-h-40 overflow-y-auto">
                      {loadingLists ? (
                        <div className="text-center text-gray-500 dark:text-gray-400">Loading lists...</div>
                      ) : contactLists.length === 0 ? (
                        <div className="text-center text-gray-500 dark:text-gray-400">No contact lists available</div>
                      ) : (
                        <div className="space-y-2">
                          {contactLists.map((list) => (
                            <label key={list.id} className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={newCampaign.selectedLists.includes(list.id)}
                                onChange={() => handleListToggle(list.id, true)}
                                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {list.name} ({list.contactCount} contacts)
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Message Content */}
                  <div>
                    <label htmlFor="messageContent" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Message Content *
                    </label>
                    <div className="flex space-x-2 mb-2">
                      <button
                        type="button"
                        onClick={() => setShowTemplateSelector(!showTemplateSelector)}
                        className="flex items-center px-3 py-1 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Use Template
                      </button>
                      <button
                        type="button"
                        onClick={() => toast.info('Media upload functionality would be implemented here')}
                        className="flex items-center px-3 py-1 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                      >
                        <Image className="h-4 w-4 mr-1" />
                        Add Media
                      </button>
                    </div>

                    {/* Template Selector */}
                    {showTemplateSelector && (
                      <div className="mb-4 border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Template</h4>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {templates.map((template) => (
                            <button
                              key={template.id}
                              onClick={() => handleUseTemplate(template.id, true)}
                              className="w-full text-left px-3 py-2 text-sm bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors"
                            >
                              <div className="font-medium text-gray-900 dark:text-white">{template.name}</div>
                              <div className="text-gray-500 dark:text-gray-400 truncate">{template.content.substring(0, 50)}...</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <textarea
                      id="messageContent"
                      value={newCampaign.messageContent}
                      onChange={(e) => setNewCampaign({ ...newCampaign, messageContent: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter your campaign message..."
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Character count: {newCampaign.messageContent.length} / 160 (SMS limit)
                    </p>
                  </div>

                  {/* Media URL */}
                  <div>
                    <label htmlFor="mediaUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Media URL (Optional)
                    </label>
                    <input
                      type="url"
                      id="mediaUrl"
                      value={newCampaign.mediaUrl}
                      onChange={(e) => setNewCampaign({ ...newCampaign, mediaUrl: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>

                  {/* Media Preview */}
                  {newCampaign.mediaUrl && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Media Preview
                      </label>
                      <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                        <img
                          src={newCampaign.mediaUrl}
                          alt="Media preview"
                          className="max-w-full h-32 object-cover rounded"
                          onError={() => toast.error('Failed to load media preview')}
                        />
                      </div>
                    </div>
                  )}

                  {/* Scheduling */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Scheduled Date (Optional)
                      </label>
                      <input
                        type="date"
                        id="scheduledDate"
                        value={newCampaign.scheduledDate}
                        onChange={(e) => setNewCampaign({ ...newCampaign, scheduledDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label htmlFor="scheduleTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Scheduled Time (Optional)
                      </label>
                      <input
                        type="time"
                        id="scheduleTime"
                        value={newCampaign.scheduleTime}
                        onChange={(e) => setNewCampaign({ ...newCampaign, scheduleTime: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleCreateCampaign}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Create Campaign
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Modal */}
      {showAnalyticsModal && selectedCampaignForAnalytics && (
        <CampaignAnalyticsModal
          campaign={selectedCampaignForAnalytics}
          onClose={() => {
            setShowAnalyticsModal(false);
            setSelectedCampaignForAnalytics(null);
          }}
        />
      )}
    </div>
  );
};

export default Campaigns;