import React, { useState } from 'react';
import { Plus, Edit, Trash2, MessageSquare, Copy } from 'lucide-react';
import { useTemplates } from '../../components/AdminLayout';

const Templates = () => {
  const { templates, addTemplate, updateTemplate, deleteTemplate, copyTemplate } = useTemplates();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    content: '',
    type: 'sms'
  });
  const [currentTemplate, setCurrentTemplate] = useState({
    id: 0,
    name: '',
    content: '',
    type: 'sms'
  });

  const handleCreateTemplate = () => {
    if (newTemplate.name.trim() && newTemplate.content.trim()) {
      addTemplate({
        name: newTemplate.name,
        content: newTemplate.content,
        type: newTemplate.type
      });
      
      setNewTemplate({ name: '', content: '', type: 'sms' });
      setShowCreateModal(false);
    }
  };

  const handleEditTemplate = (template: typeof templates[0]) => {
    setCurrentTemplate({
      id: template.id,
      name: template.name,
      content: template.content,
      type: template.type
    });
    setShowEditModal(true);
  };

  const handleUpdateTemplate = () => {
    if (currentTemplate.name.trim() && currentTemplate.content.trim()) {
      updateTemplate(currentTemplate.id, {
        name: currentTemplate.name,
        content: currentTemplate.content,
        type: currentTemplate.type
      });
      
      setShowEditModal(false);
    }
  };

  const handleDeleteTemplate = (templateId: number) => {
    const template = templates.find(t => t.id === templateId);
    if (template && window.confirm(`Are you sure you want to delete "${template.name}"? This action cannot be undone.`)) {
      deleteTemplate(templateId);
    }
  };

  const handleCopyTemplate = (template: typeof templates[0]) => {
    copyTemplate(template);
  };

  const insertVariable = (variable: string, isEdit = false) => {
    const textareaId = isEdit ? 'editTemplateContent' : 'templateContent';
    const textarea = document.getElementById(textareaId) as HTMLTextAreaElement;
    
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);
      const newContent = before + variable + after;
      
      if (isEdit) {
        setCurrentTemplate({ ...currentTemplate, content: newContent });
      } else {
        setNewTemplate({ ...newTemplate, content: newContent });
      }
      
      // Set cursor position after the inserted variable
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + variable.length;
        textarea.focus();
      }, 10);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Message Templates</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Create and manage reusable SMS and WhatsApp message templates
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {templates.map((template) => (
          <div key={template.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">{template.name}</h3>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    template.type === 'sms' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {template.type.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="flex space-x-1">
                <button 
                  onClick={() => handleCopyTemplate(template)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  title="Copy template"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => handleEditTemplate(template)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  title="Edit template"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => handleDeleteTemplate(template.id)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete template"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                {template.content}
              </p>
            </div>
            
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Created: {template.createdDate}</span>
              <span>Last used: {template.lastUsed}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Create New Template
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="templateName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Template Name
                    </label>
                    <input
                      type="text"
                      id="templateName"
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="e.g., Welcome Message"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="templateType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Message Type
                    </label>
                    <select
                      id="templateType"
                      value={newTemplate.type}
                      onChange={(e) => setNewTemplate({ ...newTemplate, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="sms">SMS</option>
                      <option value="whatsapp">WhatsApp</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="templateContent" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Message Content
                    </label>
                    <textarea
                      id="templateContent"
                      value={newTemplate.content}
                      onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter your message template..."
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Character count: {newTemplate.content.length} / 160 (SMS limit)
                    </p>
                  </div>
                  
                  {/* Variable Insertion Buttons */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Insert Variables
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => insertVariable('{{Name}}')}
                        className="px-3 py-1 bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-500"
                      >
                        {'{{Name}}'}
                      </button>
                      <button
                        onClick={() => insertVariable('{{Phone}}')}
                        className="px-3 py-1 bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-500"
                      >
                        {'{{Phone}}'}
                      </button>
                      <button
                        onClick={() => insertVariable('{{Email}}')}
                        className="px-3 py-1 bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-500"
                      >
                        {'{{Email}}'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleCreateTemplate}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Create Template
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

      {/* Edit Template Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Edit Template
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="editTemplateName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Template Name
                    </label>
                    <input
                      type="text"
                      id="editTemplateName"
                      value={currentTemplate.name}
                      onChange={(e) => setCurrentTemplate({ ...currentTemplate, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="e.g., Welcome Message"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="editTemplateType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Message Type
                    </label>
                    <select
                      id="editTemplateType"
                      value={currentTemplate.type}
                      onChange={(e) => setCurrentTemplate({ ...currentTemplate, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="sms">SMS</option>
                      <option value="whatsapp">WhatsApp</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="editTemplateContent" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Message Content
                    </label>
                    <textarea
                      id="editTemplateContent"
                      value={currentTemplate.content}
                      onChange={(e) => setCurrentTemplate({ ...currentTemplate, content: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter your message template..."
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Character count: {currentTemplate.content.length} / 160 (SMS limit)
                    </p>
                  </div>
                  
                  {/* Variable Insertion Buttons */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Insert Variables
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => insertVariable('{{Name}}', true)}
                        className="px-3 py-1 bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-500"
                      >
                        {'{{Name}}'}
                      </button>
                      <button
                        onClick={() => insertVariable('{{Phone}}', true)}
                        className="px-3 py-1 bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-500"
                      >
                        {'{{Phone}}'}
                      </button>
                      <button
                        onClick={() => insertVariable('{{Email}}', true)}
                        className="px-3 py-1 bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-500"
                      >
                        {'{{Email}}'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleUpdateTemplate}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Update Template
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
    </div>
  );
};

export default Templates;