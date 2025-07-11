import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Upload, Download, Plus, Edit, Trash2, Users, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSupabase } from '../../context/SupabaseContext';

interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  source: string;
  date: string;
  lists: string[];
  opted_in?: boolean;
  tags?: string[];
  language?: string;
  last_contact?: string;
}

const Contacts: React.FC = () => {
  const { supabase, isLoading: supabaseLoading, isAuthenticated, businessId } = useSupabase();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showAddToListModal, setShowAddToListModal] = useState(false);
  const [showModifyListMembershipModal, setShowModifyListMembershipModal] = useState(false);
  const [showEditContactModal, setShowEditContactModal] = useState(false);
  const [selectedListsForAssignment, setSelectedListsForAssignment] = useState<string[]>([]);
  const [currentManagedListName, setCurrentManagedListName] = useState<string>('');
  const [listMembershipData, setListMembershipData] = useState<{[contactId: string]: boolean}>({});
  const [editContactData, setEditContactData] = useState({
    id: '',
    name: '',
    phoneNumber: '',
    whatsappNumber: '',
    email: '',
    whatsappOptIn: false,
    smsOptIn: false,
    optInSource: 'Website',
    preferredLanguage: 'English'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [newContactData, setNewContactData] = useState({
    name: '',
    phoneNumber: '',
    whatsappNumber: '',
    email: '',
    whatsappOptIn: false,
    smsOptIn: false,
    optInSource: 'Website',
    preferredLanguage: 'English'
  });

  // State for Supabase data
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableContactLists, setAvailableContactLists] = useState<any[]>([]);

  // Check if we're managing a specific list
  useEffect(() => {
    if (location.state?.selectedListName) {
      setCurrentManagedListName(location.state.selectedListName);
    }
  }, [location.state]);

  // Fetch contacts and contact lists on component mount
  useEffect(() => {
    if (supabase && isAuthenticated && !supabaseLoading && businessId) {
      fetchContacts();
      fetchContactLists();
    }
  }, [supabase, isAuthenticated, supabaseLoading, businessId, currentManagedListName]);

  const fetchContacts = async () => {
    if (!supabase || !isAuthenticated) {
      console.warn('⚠️ Supabase not initialized or user not authenticated');
      return;
    }

    try {
      setLoading(true);
      // Build the URL with query parameters if a list is selected
      let url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/contacts-operations/contacts`;
      if (currentManagedListName) {
        url += `?listName=${encodeURIComponent(currentManagedListName)}`;
      }
      
      const response = await fetch(url, {
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
        setContacts(data.data);
      } else {
        throw new Error(data?.error || 'Failed to fetch contacts');
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      alert('Failed to load contacts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchContactLists = async () => {
    if (!supabase || !isAuthenticated) {
      console.warn('⚠️ Supabase not initialized or user not authenticated');
      return;
    }

    if (!businessId) {
      console.warn('⚠️ Business ID not available');
      return;
    }
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/contacts-operations/lists?businessId=${businessId}`, {
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
        setAvailableContactLists(data.data.map((list: any) => ({
          id: list.id,
          name: list.name
        })));
      } else {
        console.error('Failed to fetch contact lists:', data?.error);
      }
    } catch (error) {
      console.error('Error fetching contact lists:', error);
    }
  };

  const filteredContacts = contacts.filter(contact => {
    // Filter by search term
    const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.phone.includes(searchTerm) ||
      contact.email.toLowerCase().includes(searchTerm.toLowerCase());

    // Filter by managed list if applicable
    const matchesList = currentManagedListName ? 
      contact.lists.includes(currentManagedListName) : 
      true;

    return matchesSearch && matchesList;
  });

  const handleSelectAll = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(filteredContacts.map(contact => contact.id));
    }
  };

  const handleSelectContact = (contactId: string) => {
    if (selectedContacts.includes(contactId)) {
      setSelectedContacts(selectedContacts.filter(id => id !== contactId));
    } else {
      setSelectedContacts([...selectedContacts, contactId]);
    }
  };

  const handleBulkUpload = () => {
    // Trigger the hidden file input
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      setUploadStatus('Please select a CSV file.');
      return;
    }

    setIsUploading(true);
    setUploadStatus('Processing CSV file...');

    try {
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      // Validate required headers
      const requiredHeaders = ['name', 'phone'];
      const missingHeaders = requiredHeaders.filter(header => 
        !headers.some(h => h.includes(header))
      );

      if (missingHeaders.length > 0) {
        setUploadStatus(`Missing required columns: ${missingHeaders.join(', ')}`);
        setIsUploading(false);
        return;
      }

      // Parse CSV data
      const newContacts = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const contact: any = {};

        headers.forEach((header, index) => {
          if (header.includes('name')) contact.name = values[index] || '';
          if (header.includes('phone')) contact.phone = values[index] || '';
          if (header.includes('email')) contact.email = values[index] || '';
          if (header.includes('source')) contact.source = values[index] || 'CSV Upload';
        });

        if (contact.name && contact.phone) {
          newContacts.push(contact);
        }
      }

      if (newContacts.length === 0) {
        setUploadStatus('No valid contacts found in CSV file.');
      } else {
        // Send to Supabase
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/contacts-operations/contacts/bulk-insert`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ contacts: newContacts })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data?.success) {
          setUploadStatus(`Successfully imported ${data.data.count} contacts.`);
          // Refresh contacts list
          await fetchContacts();
        } else {
          throw new Error(data?.error || 'Failed to import contacts');
        }
      }
    } catch (error) {
      console.error('Error processing CSV:', error);
      setUploadStatus('Error processing CSV file. Please check the format and try again.');
    }

    setIsUploading(false);
    // Reset file input
    if (event.target) {
      event.target.value = '';
    }

    // Clear status after delay
    setTimeout(() => setUploadStatus(''), 5000);
  };

  const handleExport = () => {
    try {
      // Create CSV content
      const headers = ['Name', 'Phone', 'Email', 'Source', 'Lists', 'Date Added'];
      const csvContent = [
        headers.join(','),
        ...filteredContacts.map(contact => [
          `"${contact.name}"`,
          `"${contact.phone}"`,
          `"${contact.email}"`,
          `"${contact.source}"`,
          `"${contact.lists.join('; ')}"`,
          `"${contact.date}"`
        ].join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `contacts_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Error exporting contacts. Please try again.');
    }
  };

  const handleAddContact = () => {
    setShowAddContactModal(true);
  };

  const handleAddNewContact = async () => {
    if (!supabase || !isAuthenticated) {
      toast.error('Authentication required to create contacts');
      return;
    }

    if (newContactData.name.trim() && newContactData.phoneNumber.trim()) {
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/contacts-operations/contacts`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newContactData)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data?.success) {
          setContacts(prev => [...prev, data.data]);
          console.log('Created new contact:', data.data);
          
          // Reset form and close modal
          setNewContactData({
            name: '',
            phoneNumber: '',
            whatsappNumber: '',
            email: '',
            whatsappOptIn: false,
            smsOptIn: false,
            optInSource: 'Website',
            preferredLanguage: 'English'
          });
          setShowAddContactModal(false);
        } else {
          throw new Error(data?.error || 'Failed to create contact');
        }
      } catch (error) {
        console.error('Error creating contact:', error);
        alert('Failed to create contact. Please try again.');
      }
    }
  };

  const handleNewContactChange = (field: string, value: string | boolean) => {
    setNewContactData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEditContact = (contact: Contact) => {
    setEditContactData({
      id: contact.id,
      name: contact.name,
      phoneNumber: contact.phone,
      whatsappNumber: contact.phone, // Assuming same as phone for now
      email: contact.email,
      whatsappOptIn: false, // These would come from backend in real app
      smsOptIn: contact.opted_in || false,
      optInSource: contact.source,
      preferredLanguage: contact.language || 'English'
    });
    setShowEditContactModal(true);
  };

  const handleUpdateContact = async () => {
    if (!supabase || !isAuthenticated) {
      toast.error('Authentication required to update contacts');
      return;
    }

    if (editContactData.name.trim() && editContactData.phoneNumber.trim()) {
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/contacts-operations/contacts/${editContactData.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(editContactData)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data?.success) {
          setContacts(prev => prev.map(contact => 
            contact.id === editContactData.id ? data.data : contact
          ));
          console.log('Updated contact:', data.data);
          setShowEditContactModal(false);
        } else {
          throw new Error(data?.error || 'Failed to update contact');
        }
      } catch (error) {
        console.error('Error updating contact:', error);
        alert('Failed to update contact. Please try again.');
      }
    }
  };

  const handleEditContactChange = (field: string, value: string | boolean) => {
    setEditContactData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!supabase || !isAuthenticated) {
      toast.error('Authentication required to delete contacts');
      return;
    }

    const contact = contacts.find(c => c.id === contactId);
    if (contact && window.confirm(`Are you sure you want to delete ${contact.name}? This action cannot be undone.`)) {
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/contacts-operations/contacts/${contactId}`, {
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
          setContacts(prev => prev.filter(c => c.id !== contactId));
          console.log('Deleted contact:', contactId);
        } else {
          throw new Error(data?.error || 'Failed to delete contact');
        }
      } catch (error) {
        console.error('Error deleting contact:', error);
        alert('Failed to delete contact. Please try again.');
      }
    }
  };

  const handleBulkDelete = async () => {
    if (!supabase || !isAuthenticated) {
      toast.error('Authentication required to delete contacts');
      return;
    }

    if (selectedContacts.length === 0) return;
    
    const selectedContactNames = contacts
      .filter(c => selectedContacts.includes(c.id))
      .map(c => c.name)
      .join(', ');
    
    if (window.confirm(`Are you sure you want to delete ${selectedContacts.length} contact(s)? (${selectedContactNames})\n\nThis action cannot be undone.`)) {
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/contacts-operations/contacts/bulk-delete`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ contactIds: selectedContacts })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data?.success) {
          setContacts(prev => prev.filter(c => !selectedContacts.includes(c.id)));
          
          // Show success message
          setUploadStatus(`Successfully deleted ${selectedContacts.length} contact(s).`);
          setTimeout(() => setUploadStatus(''), 3000);
          
          setSelectedContacts([]);
          console.log('Deleted contacts:', selectedContacts);
        } else {
          throw new Error(data?.error || 'Failed to delete contacts');
        }
      } catch (error) {
        console.error('Error bulk deleting contacts:', error);
        alert('Failed to delete contacts. Please try again.');
      }
    } else {
      // Show cancellation message
      setUploadStatus('Deletion cancelled.');
      setTimeout(() => setUploadStatus(''), 2000);
    }
  };

  const handleAddToList = () => {
    setSelectedListsForAssignment([]);
    setShowAddToListModal(true);
  };

  const handleListSelectionForAssignment = (listName: string) => {
    setSelectedListsForAssignment(prev => 
      prev.includes(listName)
        ? prev.filter(name => name !== listName)
        : [...prev, listName]
    );
  };

  const handleAssignToLists = () => {
    if (selectedListsForAssignment.length === 0) {
      alert('Please select at least one list.');
      return;
    }

    // TODO: Implement contact list assignment in Supabase
    // This would involve inserting records into contact_list_members table

    // For now, just update the UI locally
    setContacts(prev => prev.map(contact => {
      if (selectedContacts.includes(contact.id)) {
        // Add new lists to existing lists, avoiding duplicates
        const updatedLists = [...new Set([...contact.lists, ...selectedListsForAssignment])];
        return { ...contact, lists: updatedLists };
      }
      return contact;
    }));

    console.log('Assigning contacts to lists:', {
      contactIds: selectedContacts,
      lists: selectedListsForAssignment
    });

    // Reset and close modal
    setSelectedListsForAssignment([]);
    setSelectedContacts([]);
    setShowAddToListModal(false);
  };

  const handleExportSelected = () => {
    if (selectedContacts.length === 0) return;
    
    const selectedContactsData = contacts.filter(c => selectedContacts.includes(c.id));
    
    try {
      // Create CSV content for selected contacts
      const headers = ['Name', 'Phone', 'Email', 'Source', 'Lists', 'Date Added'];
      const csvContent = [
        headers.join(','),
        ...selectedContactsData.map(contact => [
          `"${contact.name}"`,
          `"${contact.phone}"`,
          `"${contact.email}"`,
          `"${contact.source}"`,
          `"${contact.lists.join('; ')}"`,
          `"${contact.date}"`
        ].join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `selected_contacts_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      URL.revokeObjectURL(url);
      
      // Show success message
      setUploadStatus(`Successfully exported ${selectedContactsData.length} contact(s) to CSV file.`);
      setTimeout(() => setUploadStatus(''), 3000);
      
    } catch (error) {
      console.error('Error exporting selected contacts:', error);
      setUploadStatus('Error exporting selected contacts. Please try again.');
      setTimeout(() => setUploadStatus(''), 5000);
    }
  };

  // Placeholder functions for list membership management
  const handleOpenModifyListMembershipModal = () => {
    // TODO: Implement list membership modification
    alert('List membership modification will be implemented with contact list integration.');
  };

  const handleRemoveFromList = () => {
    if (selectedContacts.length === 0 || !currentManagedListName) return;
    
    const selectedContactNames = contacts
      .filter(c => selectedContacts.includes(c.id))
      .map(c => c.name)
      .join(', ');
    
    if (window.confirm(`Remove ${selectedContacts.length} contact(s) from "${currentManagedListName}"?\n\n${selectedContactNames}\n\nThis will not delete the contacts, only remove them from this list.`)) {
      // TODO: Implement list membership removal in Supabase
      
      // For now, just update the UI locally
      setContacts(prev => prev.map(contact => {
        if (selectedContacts.includes(contact.id)) {
          return {
            ...contact,
            lists: contact.lists.filter(list => list !== currentManagedListName)
          };
        }
        return contact;
      }));

      console.log('Removing contacts from list:', {
        contactIds: selectedContacts,
        listName: currentManagedListName
      });

      // Show success message
      setUploadStatus(`Successfully removed ${selectedContacts.length} contact(s) from "${currentManagedListName}".`);
      setTimeout(() => setUploadStatus(''), 3000);
      
      setSelectedContacts([]);
    }
  };

  if (supabaseLoading || !supabase) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Contacts</h1>
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Contacts</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">Please sign in to manage contacts</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Authentication Required
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Please sign in to access contact management.
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Contacts</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">Loading contacts...</p>
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {currentManagedListName ? `"${currentManagedListName}" List Contacts` : 'Contacts'}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            {currentManagedListName 
              ? `Manage contacts in the "${currentManagedListName}" list` 
              : 'Manage your customer contacts and opt-ins'
            }
          </p>
        </div>
        <div className="flex space-x-4">
          {currentManagedListName && (
            <button
              onClick={handleOpenModifyListMembershipModal}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Settings className="h-4 w-4 mr-2" />
              Modify "{currentManagedListName}" Membership
            </button>
          )}
          <button
            onClick={handleBulkUpload}
            className={`flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
              isUploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={isUploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? 'Processing...' : 'Bulk Upload CSV'}
          </button>
          <button
            onClick={handleExport}
            className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts..."
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-4">
            <select className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
              <option value="">All Sources</option>
              <option value="website">Website</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="referral">Referral</option>
            </select>
            <button 
              onClick={handleAddContact}
              className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </button>
          </div>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      {/* Upload Status */}
      {uploadStatus && (
        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 ${
          uploadStatus.includes('Error') || uploadStatus.includes('Missing') 
            ? 'border-l-4 border-red-500' 
            : 'border-l-4 border-green-500'
        }`}>
          <div className="flex items-center">
            <div className={`flex-shrink-0 ${
              uploadStatus.includes('Error') || uploadStatus.includes('Missing') 
                ? 'text-red-600' 
                : 'text-green-600'
            }`}>
              <Upload className="h-5 w-5" />
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${
                uploadStatus.includes('Error') || uploadStatus.includes('Missing') 
                  ? 'text-red-800 dark:text-red-200' 
                  : 'text-green-800 dark:text-green-200'
              }`}>
                {uploadStatus}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Contacts Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Lists
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date Added
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredContacts.map((contact) => (
                <tr key={contact.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedContacts.includes(contact.id)}
                      onChange={() => handleSelectContact(contact.id)}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {contact.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {contact.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {contact.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {contact.source}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    <div className="flex flex-wrap gap-1">
                      {contact.lists.map((list, index) => (
                        <span key={index} className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          {list}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {contact.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleEditContact(contact)}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                        title="Edit contact"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteContact(contact.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                        title="Delete contact"
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

      {/* Bulk Actions */}
      {selectedContacts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {selectedContacts.length} contact(s) selected
            </span>
            <div className="flex space-x-2">
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Selected
              </button>
              {currentManagedListName ? (
                <button
                  onClick={handleRemoveFromList}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Remove from "{currentManagedListName}"
                </button>
              ) : (
                <button
                  onClick={handleAddToList}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add to List
                </button>
              )}
              <button
                onClick={handleExportSelected}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Export Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddContactModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Add New Contact
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="md:col-span-2">
                    <label htmlFor="contactName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      id="contactName"
                      value={newContactData.name}
                      onChange={(e) => handleNewContactChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter full name"
                    />
                  </div>
                  
                  {/* Phone Number */}
                  <div>
                    <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      id="phoneNumber"
                      value={newContactData.phoneNumber}
                      onChange={(e) => handleNewContactChange('phoneNumber', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="+1234567890"
                    />
                  </div>
                  
                  {/* WhatsApp Number */}
                  <div>
                    <label htmlFor="whatsappNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      WhatsApp Number
                    </label>
                    <input
                      type="tel"
                      id="whatsappNumber"
                      value={newContactData.whatsappNumber}
                      onChange={(e) => handleNewContactChange('whatsappNumber', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="+1234567890"
                    />
                  </div>
                  
                  {/* Email */}
                  <div className="md:col-span-2">
                    <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      id="contactEmail"
                      value={newContactData.email}
                      onChange={(e) => handleNewContactChange('email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="email@example.com"
                    />
                  </div>
                  
                  {/* Opt-in Options */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Opt-in Preferences
                    </label>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="smsOptIn"
                          checked={newContactData.smsOptIn}
                          onChange={(e) => handleNewContactChange('smsOptIn', e.target.checked)}
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                        <label htmlFor="smsOptIn" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          SMS Opt-In
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="whatsappOptIn"
                          checked={newContactData.whatsappOptIn}
                          onChange={(e) => handleNewContactChange('whatsappOptIn', e.target.checked)}
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                        <label htmlFor="whatsappOptIn" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          WhatsApp Opt-In
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  {/* Opt-in Source */}
                  <div>
                    <label htmlFor="optInSource" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Opt-In Source
                    </label>
                    <select
                      id="optInSource"
                      value={newContactData.optInSource}
                      onChange={(e) => handleNewContactChange('optInSource', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="Website">Website</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Referral">Referral</option>
                      <option value="Manual">Manual</option>
                      <option value="In-Store">In-Store</option>
                      <option value="Social Media">Social Media</option>
                    </select>
                  </div>
                  
                  {/* Preferred Language */}
                  <div className="md:col-span-2">
                    <label htmlFor="preferredLanguage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Preferred Language
                    </label>
                    <select
                      id="preferredLanguage"
                      value={newContactData.preferredLanguage}
                      onChange={(e) => handleNewContactChange('preferredLanguage', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="English">English</option>
                      <option value="Spanish">Spanish</option>
                      <option value="French">French</option>
                      <option value="Italian">Italian</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleAddNewContact}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Add Contact
                </button>
                <button
                  onClick={() => setShowAddContactModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Contact Modal */}
      {showEditContactModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Edit Contact
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="md:col-span-2">
                    <label htmlFor="editContactName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      id="editContactName"
                      value={editContactData.name}
                      onChange={(e) => handleEditContactChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter full name"
                    />
                  </div>
                  
                  {/* Phone Number */}
                  <div>
                    <label htmlFor="editPhoneNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      id="editPhoneNumber"
                      value={editContactData.phoneNumber}
                      onChange={(e) => handleEditContactChange('phoneNumber', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="+1234567890"
                    />
                  </div>
                  
                  {/* WhatsApp Number */}
                  <div>
                    <label htmlFor="editWhatsappNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      WhatsApp Number
                    </label>
                    <input
                      type="tel"
                      id="editWhatsappNumber"
                      value={editContactData.whatsappNumber}
                      onChange={(e) => handleEditContactChange('whatsappNumber', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="+1234567890"
                    />
                  </div>
                  
                  {/* Email */}
                  <div className="md:col-span-2">
                    <label htmlFor="editContactEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      id="editContactEmail"
                      value={editContactData.email}
                      onChange={(e) => handleEditContactChange('email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="email@example.com"
                    />
                  </div>
                  
                  {/* Opt-in Options */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Opt-in Preferences
                    </label>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="editSmsOptIn"
                          checked={editContactData.smsOptIn}
                          onChange={(e) => handleEditContactChange('smsOptIn', e.target.checked)}
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                        <label htmlFor="editSmsOptIn" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          SMS Opt-In
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="editWhatsappOptIn"
                          checked={editContactData.whatsappOptIn}
                          onChange={(e) => handleEditContactChange('whatsappOptIn', e.target.checked)}
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                        <label htmlFor="editWhatsappOptIn" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          WhatsApp Opt-In
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  {/* Opt-in Source */}
                  <div>
                    <label htmlFor="editOptInSource" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Opt-In Source
                    </label>
                    <select
                      id="editOptInSource"
                      value={editContactData.optInSource}
                      onChange={(e) => handleEditContactChange('optInSource', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="Website">Website</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Referral">Referral</option>
                      <option value="Manual">Manual</option>
                      <option value="In-Store">In-Store</option>
                      <option value="Social Media">Social Media</option>
                    </select>
                  </div>
                  
                  {/* Preferred Language */}
                  <div className="md:col-span-2">
                    <label htmlFor="editPreferredLanguage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Preferred Language
                    </label>
                    <select
                      id="editPreferredLanguage"
                      value={editContactData.preferredLanguage}
                      onChange={(e) => handleEditContactChange('preferredLanguage', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="English">English</option>
                      <option value="Spanish">Spanish</option>
                      <option value="French">French</option>
                      <option value="Italian">Italian</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleUpdateContact}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Update Contact
                </button>
                <button
                  onClick={() => setShowEditContactModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add to List Modal */}
      {showAddToListModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Add {selectedContacts.length} Contact(s) to Lists
                </h3>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                    Select one or more lists to add the selected contacts to:
                  </p>
                  
                  <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
                    {availableContactLists.map((list) => (
                      <div key={list.id} className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600 last:border-b-0">
                        <input
                          type="checkbox"
                          id={`list-${list.id}`}
                          checked={selectedListsForAssignment.includes(list.name)}
                          onChange={() => handleListSelectionForAssignment(list.name)}
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                        <label htmlFor={`list-${list.id}`} className="ml-3 flex-1 cursor-pointer">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{list.name}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                {selectedListsForAssignment.length > 0 && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-4">
                    <p className="text-sm text-green-800 dark:text-green-200">
                      <strong>Selected lists:</strong> {selectedListsForAssignment.join(', ')}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleAssignToLists}
                  disabled={selectedListsForAssignment.length === 0}
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:ml-3 sm:w-auto sm:text-sm ${
                    selectedListsForAssignment.length === 0
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-primary hover:bg-primary/90'
                  }`}
                >
                  Add to {selectedListsForAssignment.length} List(s)
                </button>
                <button
                  onClick={() => setShowAddToListModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSV Upload Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-3">
          CSV Upload Instructions
        </h3>
        <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
          <p><strong>Required columns:</strong> name, phone</p>
          <p><strong>Optional columns:</strong> email, source</p>
          <p><strong>Example CSV format:</strong></p>
          <div className="bg-white dark:bg-gray-800 rounded p-3 mt-2 font-mono text-xs">
            name,phone,email,source<br />
            John Doe,+1234567890,john@example.com,Website<br />
            Jane Smith,+1987654321,jane@example.com,Referral
          </div>
          <p className="mt-2">
            <strong>Note:</strong> All uploaded contacts will be automatically associated with your business 
            and stored securely in your Supabase database.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Contacts;