import React, { useState, useEffect } from 'react';
import { Plus, Edit, Send, Trash2, BarChart3, Calendar, MessageSquare, RefreshCw, Upload, Image } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { useTemplates } from '../../components/AdminLayout';
import toast from 'react-hot-toast';

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
}

const Campaigns = () => {
  const { getToken } = useAuth();
  const { templates } = useTemplates();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [contactLists, setContactLists] = useState<any[]>([]);
  const [sendingCampaignId, setSendingCampaignId] = useState<string | null>(null);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [mediaAssets, setMediaAssets] = useState<any[]>([]);

  const [newCampaign, setNewCampaign] = useState({
    name: '',
    selectedLists: [] as string[],
    templateId: 'custom',
    channel: 'sms',
    scheduledDate: '',
    scheduleTime: '',
    campaignType: 'Regular Campaign',
    messageContent: '',
    mediaUrl: ''
  });

  const [editCampaign, setEditCampaign] = useState({
    id: '',
    name: '',
    selectedLists: [] as string[],
    templateId: 'custom',
    channel: 'sms',
    scheduledDate: '',
    scheduleTime: '',
    campaignType: 'Regular Campaign',
    messageContent: '',
    mediaUrl: ''
  });

  // Fetch campaigns and contact lists
  useEffect(() => {
    fetchCampaigns();
    fetchContactLists();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/campaign-operations/campaigns`, {
        headers: {
          'Authorization': `Bearer ${token}`,
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
      const token = await getToken();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/contact-list-operations/lists`, {
        headers: {
          'Authorization': `Bearer ${token}`,
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
    }
  };

  const handleCreateCampaign = async () => {
    if (newCampaign.name.trim() && newCampaign.messageContent.trim()) {
      try {
        const token = await getToken();
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/campaign-operations/campaigns`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newCampaign)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data?.success) {
          setCampaigns(prev => [data.data, ...prev]);
          console.log('Created campaign:', data.data);
          
          setNewCampaign({
            name: '',
            selectedLists: [],
            templateId: 'custom',
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
      toast.error('Please fill in all required fields.');
    }
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setEditCampaign({
      id: campaign.id,
      name: campaign.name,
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
    if (editCampaign.name.trim() && editCampaign.messageContent.trim()) {
      try {
        const token = await getToken();
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/campaign-operations/campaigns/${editCampaign.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: editCampaign.name,
            message: editCampaign.messageContent,
            channel: editCampaign.channel,
            media_url: editCampaign.mediaUrl,
            target_contact_lists: editCampaign.selectedLists,
            scheduledDate: editCampaign.scheduledDate,
            scheduleTime: editCampaign.scheduleTime
          })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data?.success) {
          setCampaigns(prev => prev.map(campaign => 
            campaign.id === editCampaign.id ? data.data : campaign
          ));
          console.log('Updated campaign:', data.data);
          setShowEditModal(false);
          toast.success('Campaign updated successfully!');
        } else {
          throw new Error(data?.error || 'Failed to update campaign');
        }
      } catch (error) {
        console.error('Error updating campaign:', error);
        toast.error('Failed to update campaign. Please try again.');
      }
    } else {
      toast.error('Please fill in all required fields.');
    }
  };

  const handleSendCampaign = async (campaignId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return;

    if (!window.confirm(`Are you sure you want to send "${campaign.name}" now? This action cannot be undone.`)) {
      return;
    }

    try {
      setSendingCampaignId(campaignId);
      
      const token = await getToken();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/campaign-operations/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'sending'
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data?.success) {
        setCampaigns(prev => prev.map(c => 
          c.id === campaignId ? { ...c, status: 'sending' } : c
        ));
        console.log('Campaign sent:', data.data);
        toast.success('Campaign is being sent!');
      } else {
        throw new Error(data?.error || 'Failed to send campaign');
      }
    } catch (error) {
      console.error('Error sending campaign:', error);
      toast.error('Failed to send campaign. Please try again.');
    } finally {
      setSendingCampaignId(null);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (campaign && window.confirm(`Are you sure you want to delete "${campaign.name}"? This action cannot be undone.`)) {
      try {
        const token = await getToken();
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/campaign-operations/campaigns/${campaignId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data?.success) {
          setCampaigns(prev => prev.filter(c => c.id !== campaignId));
          console.log('Deleted campaign:', campaignId);
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

  const fetchMediaAssets = async () => {
    try {
      // Placeholder for media library - in real implementation, this would fetch from media_library table
      const sampleAssets = [
        {
          id: '1',
          title: 'Weekend Special',
          access_link: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600',
          media_type: 'image'
        },
        {
          id: '2',
          title: 'Pasta Night',
          access_link: 'https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg?auto=compress&cs=tinysrgb&w=600',
          media_type: 'image'
        },
        {
          id: '3',
          title: 'Fresh Ingredients',
          access_link: 'https://images.pexels.com/photos/1435904/pexels-photo-1435904.jpeg?auto=compress&cs=tinysrgb&w=600',
          media_type: 'image'
        }
      ];
      setMediaAssets(sampleAssets);
    } catch (error) {
      console.error('Error fetching media assets:', error);
    }
  };

  const handleSelectTemplate = (templateContent: string, isEditMode = false) => {
    if (isEditMode) {
      setEditCampaign({ ...editCampaign, messageContent: templateContent });
    } else {
      setNewCampaign({ ...newCampaign, messageContent: templateContent });
    }
  };

  const handleSelectMediaAsset = (assetUrl: string, isEditMode = false) => {
    if (isEditMode) {
      setEditCampaign({ ...editCampaign, mediaUrl: assetUrl });
    } else {
      setNewCampaign({ ...newCampaign, mediaUrl: assetUrl });
    }
    setShowMediaLibrary(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, isEditMode = false) => {
    const file = event.target.files?.[0];
    if (file) {
      // In a real implementation, this would upload to Supabase Storage
      // For now, we'll simulate the upload process
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (isEditMode) {
          setEditCampaign({ ...editCampaign, mediaUrl: dataUrl });
        } else {
          setNewCampaign({ ...newCampaign, mediaUrl: dataUrl });
        }
        toast.success('Image uploaded successfully!');
      };
      reader.readAsDataURL(file);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800';
      case 'sending':
        return 'bg-blue-100 text-blue-800';
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'create message content':
        return 'bg-purple-100 text-purple-800';
      case 'create_message_content':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canSendCampaign = (status: string) => {
    const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
    return normalizedStatus === 'create_message_content' || 
           normalizedStatus === 'message_content_ready' ||
           normalizedStatus === 'scheduled' || 
           normalizedStatus === 'draft';
  };

  const canEditCampaign = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    return normalizedStatus !== 'sending' && normalizedStatus !== 'sent';
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
        {campaigns.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No campaigns found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Create your first campaign to get started with SMS marketing.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Campaign
            </button>
          </div>
        ) : (
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
                    List
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Template
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Scheduled
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
                {campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {campaign.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Created: {campaign.createdDate}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(campaign.status)}`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {campaign.listName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {campaign.templateName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {campaign.scheduledDate || 'Not scheduled'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {campaign.sentCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {campaign.openRate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {/* Edit Icon */}
                        {canEditCampaign(campaign.status) && (
                          <button
                            onClick={() => handleEditCampaign(campaign)}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                            title="Edit campaign"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                        
                        {/* Send Icon */}
                        {canSendCampaign(campaign.status) && (
                          <button
                            onClick={() => handleSendCampaign(campaign.id)}
                            disabled={sendingCampaignId === campaign.id}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50 transition-colors"
                            title="Send campaign now"
                          >
                            {sendingCampaignId === campaign.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        
                        {/* Analytics Icon */}
                        <button
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                          title="View analytics"
                        >
                          <BarChart3 className="h-4 w-4" />
                        </button>
                        
                        {/* Delete Icon */}
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
        )}
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Create New Campaign
                </h3>
                
                <div className="space-y-4">
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
                      placeholder="e.g., Weekend Special Promotion"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
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
                        <option value="Announcement">Announcement</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="contactLists" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Contact Lists
                    </label>
                    <div className="max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2">
                      {contactLists.map((list) => (
                        <label key={list.id} className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                          <input
                            type="checkbox"
                            checked={newCampaign.selectedLists.includes(list.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewCampaign({
                                  ...newCampaign,
                                  selectedLists: [...newCampaign.selectedLists, list.id]
                                });
                              } else {
                                setNewCampaign({
                                  ...newCampaign,
                                  selectedLists: newCampaign.selectedLists.filter(id => id !== list.id)
                                });
                              }
                            }}
                            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mr-3"
                          />
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{list.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{list.contactCount} contacts</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Template Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select Template (Optional)
                    </label>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {templates?.slice(0, 6).map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => handleSelectTemplate(template.content)}
                          className="p-3 text-left border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                            {template.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                            {template.content.substring(0, 60)}...
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="messageContent" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Message Content *
                    </label>
                    <textarea
                      id="messageContent"
                      value={newCampaign.messageContent}
                      onChange={(e) => setNewCampaign({ ...newCampaign, messageContent: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter your message content..."
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Character count: {newCampaign.messageContent?.length || 0} / 160 (SMS limit)
                    </p>
                  </div>

                  <div>
                    <label htmlFor="mediaUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Media URL (Optional)
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="url"
                        id="mediaUrl"
                        value={newCampaign.mediaUrl}
                        onChange={(e) => setNewCampaign({ ...newCampaign, mediaUrl: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="https://example.com/image.jpg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          fetchMediaAssets();
                          setShowMediaLibrary(true);
                        }}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center space-x-1"
                      >
                        <Image className="h-4 w-4" />
                        <span>Select</span>
                      </button>
                      <label className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center space-x-1 cursor-pointer">
                        <Upload className="h-4 w-4" />
                        <span>Upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, false)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Schedule Date (Optional)
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
                        Schedule Time (Optional)
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

      {/* Edit Campaign Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Edit Campaign
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="editCampaignName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Campaign Name *
                    </label>
                    <input
                      type="text"
                      id="editCampaignName"
                      value={editCampaign.name}
                      onChange={(e) => setEditCampaign({ ...editCampaign, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="e.g., Weekend Special Promotion"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="editChannel" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Channel *
                      </label>
                      <select
                        id="editChannel"
                        value={editCampaign.channel}
                        onChange={(e) => setEditCampaign({ ...editCampaign, channel: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="sms">SMS</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="both">Both</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="editCampaignType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Campaign Type
                      </label>
                      <select
                        id="editCampaignType"
                        value={editCampaign.campaignType}
                        onChange={(e) => setEditCampaign({ ...editCampaign, campaignType: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="Regular Campaign">Regular Campaign</option>
                        <option value="Promotional">Promotional</option>
                        <option value="Announcement">Announcement</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="editContactLists" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Contact Lists
                    </label>
                    <div className="max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2">
                      {contactLists.map((list) => (
                        <label key={list.id} className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                          <input
                            type="checkbox"
                            checked={editCampaign.selectedLists.includes(list.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditCampaign({
                                  ...editCampaign,
                                  selectedLists: [...editCampaign.selectedLists, list.id]
                                });
                              } else {
                                setEditCampaign({
                                  ...editCampaign,
                                  selectedLists: editCampaign.selectedLists.filter(id => id !== list.id)
                                });
                              }
                            }}
                            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mr-3"
                          />
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{list.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{list.contactCount} contacts</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Template Selection for Edit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select Template (Optional)
                    </label>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {templates?.slice(0, 6).map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => handleSelectTemplate(template.content, true)}
                          className="p-3 text-left border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                            {template.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                            {template.content.substring(0, 60)}...
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="editMessageContent" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Message Content *
                    </label>
                    <textarea
                      id="editMessageContent"
                      value={editCampaign.messageContent}
                      onChange={(e) => setEditCampaign({ ...editCampaign, messageContent: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter your message content..."
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Character count: {editCampaign.messageContent?.length || 0} / 160 (SMS limit)
                    </p>
                  </div>

                  <div>
                    <label htmlFor="editMediaUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Media URL (Optional)
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="url"
                        id="editMediaUrl"
                        value={editCampaign.mediaUrl}
                        onChange={(e) => setEditCampaign({ ...editCampaign, mediaUrl: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="https://example.com/image.jpg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          fetchMediaAssets();
                          setShowMediaLibrary(true);
                        }}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center space-x-1"
                      >
                        <Image className="h-4 w-4" />
                        <span>Select</span>
                      </button>
                      <label className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center space-x-1 cursor-pointer">
                        <Upload className="h-4 w-4" />
                        <span>Upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, true)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="editScheduledDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Schedule Date (Optional)
                      </label>
                      <input
                        type="date"
                        id="editScheduledDate"
                        value={editCampaign.scheduledDate}
                        onChange={(e) => setEditCampaign({ ...editCampaign, scheduledDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label htmlFor="editScheduleTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Schedule Time (Optional)
                      </label>
                      <input
                        type="time"
                        id="editScheduleTime"
                        value={editCampaign.scheduleTime}
                        onChange={(e) => setEditCampaign({ ...editCampaign, scheduleTime: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleUpdateCampaign}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Update Campaign
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Media Library Modal */}
      {showMediaLibrary && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Select Media Asset
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {mediaAssets.map((asset) => (
                    <div
                      key={asset.id}
                      onClick={() => handleSelectMediaAsset(asset.access_link, showEditModal)}
                      className="cursor-pointer border-2 border-transparent hover:border-primary rounded-lg overflow-hidden transition-colors"
                    >
                      <img
                        src={asset.access_link}
                        alt={asset.title}
                        className="w-full h-32 object-cover"
                      />
                      <div className="p-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {asset.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {asset.media_type}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {mediaAssets.length === 0 && (
                  <div className="text-center py-8">
                    <Image className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No media assets found</h3>
                    <p className="text-gray-500 dark:text-gray-400">Upload some images to get started.</p>
                  </div>
                )}
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={() => setShowMediaLibrary(false)}
                  className="w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Campaigns;