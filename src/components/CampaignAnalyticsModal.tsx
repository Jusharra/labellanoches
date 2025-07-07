import React from 'react';
import { X, TrendingUp, Users, Eye, MousePointer, Calendar, MessageSquare, Clock } from 'lucide-react';

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

interface CampaignAnalyticsModalProps {
  campaign: Campaign;
  onClose: () => void;
}

const CampaignAnalyticsModal: React.FC<CampaignAnalyticsModalProps> = ({ campaign, onClose }) => {
  // Generate some mock analytics data based on the campaign
  const generateAnalytics = (campaign: Campaign) => {
    const baseDeliveryRate = 95;
    const baseClickRate = 12;
    const baseUnsubscribeRate = 1.2;
    
    return {
      totalSent: campaign.sentCount,
      delivered: Math.floor(campaign.sentCount * (baseDeliveryRate / 100)),
      opened: Math.floor(campaign.sentCount * (parseFloat(campaign.openRate.replace('%', '')) / 100)),
      clicked: Math.floor(campaign.sentCount * (baseClickRate / 100)),
      unsubscribed: Math.floor(campaign.sentCount * (baseUnsubscribeRate / 100)),
      bounced: Math.floor(campaign.sentCount * ((100 - baseDeliveryRate) / 100)),
      deliveryRate: `${baseDeliveryRate}%`,
      clickRate: `${baseClickRate}%`,
      unsubscribeRate: `${baseUnsubscribeRate}%`,
      bounceRate: `${100 - baseDeliveryRate}%`
    };
  };

  const analytics = generateAnalytics(campaign);

  const metrics = [
    {
      label: 'Total Sent',
      value: analytics.totalSent.toLocaleString(),
      icon: MessageSquare,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      label: 'Delivered',
      value: analytics.delivered.toLocaleString(),
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      label: 'Opened',
      value: analytics.opened.toLocaleString(),
      icon: Eye,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      label: 'Clicked',
      value: analytics.clicked.toLocaleString(),
      icon: MousePointer,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ];

  const rates = [
    {
      label: 'Open Rate',
      value: campaign.openRate,
      description: 'Percentage of recipients who opened the message'
    },
    {
      label: 'Click Rate',
      value: analytics.clickRate,
      description: 'Percentage of recipients who clicked a link'
    },
    {
      label: 'Delivery Rate',
      value: analytics.deliveryRate,
      description: 'Percentage of messages successfully delivered'
    },
    {
      label: 'Unsubscribe Rate',
      value: analytics.unsubscribeRate,
      description: 'Percentage of recipients who unsubscribed'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Campaign Analytics
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {campaign.name}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white dark:bg-gray-800 px-6 py-4">
            {/* Campaign Info */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-1">
                  <Calendar className="h-4 w-4 mr-1" />
                  Created
                </div>
                <div className="font-medium text-gray-900 dark:text-white">{campaign.createdDate}</div>
              </div>
              <div>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-1">
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Channel
                </div>
                <div className="font-medium text-gray-900 dark:text-white capitalize">{campaign.channel}</div>
              </div>
              <div>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-1">
                  <Clock className="h-4 w-4 mr-1" />
                  Status
                </div>
                <div className="font-medium text-gray-900 dark:text-white capitalize">{campaign.status}</div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="mb-6">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Key Metrics
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {metrics.map((metric, index) => {
                  const Icon = metric.icon;
                  return (
                    <div key={index} className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 w-10 h-10 ${metric.bgColor} dark:bg-opacity-20 rounded-lg flex items-center justify-center`}>
                          <Icon className={`h-5 w-5 ${metric.color}`} />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            {metric.label}
                          </p>
                          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                            {metric.value}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Performance Rates */}
            <div className="mb-6">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Performance Rates
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rates.map((rate, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {rate.label}
                      </span>
                      <span className="text-lg font-semibold text-primary">
                        {rate.value}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {rate.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Campaign Details */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Campaign Details
              </h4>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Target Lists:</span>
                  <span className="ml-2 text-sm text-gray-900 dark:text-white">{campaign.listName}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Campaign Type:</span>
                  <span className="ml-2 text-sm text-gray-900 dark:text-white">{campaign.campaignType}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Template:</span>
                  <span className="ml-2 text-sm text-gray-900 dark:text-white">{campaign.templateName}</span>
                </div>
                {campaign.scheduledDate && (
                  <div>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Scheduled Date:</span>
                    <span className="ml-2 text-sm text-gray-900 dark:text-white">{campaign.scheduledDate}</span>
                  </div>
                )}
                {campaign.mediaUrl && (
                  <div>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Media:</span>
                    <span className="ml-2 text-sm text-blue-600 dark:text-blue-400">Media attached</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3">
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignAnalyticsModal;