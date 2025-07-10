import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Users, RefreshCw } from 'lucide-react';
import { useSupabase } from '../../context/SupabaseContext';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

interface ContactList {
  id: string;
  name: string;
  description: string;
  contactCount: number;
  createdDate: string;
}

const ContactLists = () => {
  const navigate = useNavigate();
  const { supabase, isLoading: supabaseLoading, isAuthenticated } = useSupabase();
  const { user } = useAuth();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [editListData, setEditListData] = useState({
    id: '',
    name: '',
    description: '',
    contactCount: 0,
    createdDate: ''
  });

  const [contactLists, setContactLists] = useState<ContactList[]>([]);

  // Fetch contact lists directly from Supabase
  const fetchContactLists = async () => {
    if (!supabase || !isAuthenticated) {
      console.warn('⚠️ Supabase not initialized or user not authenticated');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch contact lists
      const { data: contactListsData, error: contactListsError } = await supabase
        .from('contact_lists')
        .select(`
          id,
          list_name,
          description,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (contactListsError) {
        console.error('❌ Error fetching contact lists:', contactListsError);
        throw new Error(`Failed to fetch contact lists: ${contactListsError.message}`);
      }

      // Fetch contact list members to count contacts per list
      const { data: contactListMembersData, error: contactListMembersError } = await supabase
        .from('contact_list_members')
        .select('contact_list_id');

      if (contactListMembersError) {
        console.error('❌ Error fetching contact list members:', contactListMembersError);
        // Don't throw error, just set empty members
        console.warn('Contact list members not available, contactCount will be 0');
      }

      const contactCounts = new Map<string, number>();
      if (contactListMembersData) {
        contactListMembersData.forEach(member => {
          contactCounts.set(member.contact_list_id, (contactCounts.get(member.contact_list_id) || 0) + 1);
        });
      }

      const formattedContactLists = contactListsData.map((list: any) => ({
        id: list.id,
        name: list.list_name,
        description: list.description || '',
        contactCount: contactCounts.get(list.id) || 0,
        createdDate: new Date(list.created_at).toLocaleDateString(),
      }));
      
      setContactLists(formattedContactLists);
    } catch (error) {
      console.error('Error fetching contact lists:', error);
      toast.error('Failed to load contact lists. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch contact lists on component mount
  useEffect(() => {
    if (supabase && isAuthenticated && !supabaseLoading) {
      fetchContactLists();
    } else {
      setLoading(false);
    }
  }, [supabase, isAuthenticated, supabaseLoading]);

  const handleCreateList = async () => {
    if (!newListName.trim()) {
      toast.error('Please enter a list name');
      return;
    }

    if (!supabase || !isAuthenticated || !user) {
      toast.error('Authentication required to create contact lists');
      return;
    }

    try {
      // Get user's business_id
      const { data: userProfile, error: userProfileError } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();
        
      if (userProfileError) {
        console.error('❌ Error fetching user profile:', userProfileError);
        throw new Error(`Failed to fetch user profile: ${userProfileError.message}`);
      }
      
      if (!userProfile.business_id) {
        throw new Error('User does not have an associated business');
      }

      const { data: newList, error: insertError } = await supabase
        .from('contact_lists')
        .insert({
          list_name: newListName,
          description: newListDescription || null,
          business_id: userProfile.business_id,
          created_by: user.id
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error creating contact list:', insertError);
        throw new Error(`Failed to create contact list: ${insertError.message}`);
      }

      console.log('✅ Created contact list:', newList);
      
      // Refresh the lists
      await fetchContactLists();
      
      setNewListName('');
      setNewListDescription('');
      setShowCreateModal(false);
      toast.success('Contact list created successfully!');
    } catch (error) {
      console.error('Error creating contact list:', error);
      toast.error(`Failed to create contact list: ${error.message}`);
    }
  };

  const handleManageList = (list: ContactList) => {
    // Navigate to contacts page with filter for this list
    navigate('/admin/contacts', { 
      state: { 
        selectedListId: list.id,
        selectedListName: list.name 
      } 
    });
  };

  const handleEditList = (list: ContactList) => {
    setEditListData({
      id: list.id,
      name: list.name,
      description: list.description,
      contactCount: list.contactCount,
      createdDate: list.createdDate
    });
    setShowEditModal(true);
  };

  const handleUpdateList = async () => {
    if (!editListData.name.trim()) {
      toast.error('Please enter a list name');
      return;
    }

    if (!supabase || !isAuthenticated) {
      toast.error('Authentication required to update contact lists');
      return;
    }

    try {
      const { data: updatedList, error: updateError } = await supabase
        .from('contact_lists')
        .update({
          list_name: editListData.name,
          description: editListData.description || null
        })
        .eq('id', editListData.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error updating contact list:', updateError);
        throw new Error(`Failed to update contact list: ${updateError.message}`);
      }

      console.log('✅ Updated contact list:', updatedList);
      
      // Refresh the lists
      await fetchContactLists();
      
      setShowEditModal(false);
      toast.success('Contact list updated successfully!');
    } catch (error) {
      console.error('Error updating contact list:', error);
      toast.error(`Failed to update contact list: ${error.message}`);
    }
  };

  const handleDeleteList = async (listId: string) => {
    const list = contactLists.find(l => l.id === listId);
    if (!list) return;

    if (!window.confirm(`Are you sure you want to delete "${list.name}"? This action cannot be undone and will remove ${list.contactCount} contacts from this list.`)) {
      return;
    }

    if (!supabase || !isAuthenticated) {
      toast.error('Authentication required to delete contact lists');
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('contact_lists')
        .delete()
        .eq('id', listId);

      if (deleteError) {
        console.error('❌ Error deleting contact list:', deleteError);
        throw new Error(`Failed to delete contact list: ${deleteError.message}`);
      }

      console.log('✅ Deleted contact list:', listId);
      
      // Refresh the lists
      await fetchContactLists();
      toast.success('Contact list deleted successfully!');
    } catch (error) {
      console.error('Error deleting contact list:', error);
      toast.error(`Failed to delete contact list: ${error.message}`);
    }
  };

  const handleEditListChange = (field: string, value: string) => {
    setEditListData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (supabaseLoading || !supabase) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Contact Lists</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Initializing authentication...
            </p>
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Contact Lists</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Please sign in to manage contact lists
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Authentication Required
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Please sign in to access contact list management.
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Contact Lists</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Loading contact lists...
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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Contact Lists</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-300">
            Organize your contacts into targeted lists for campaigns
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={fetchContactLists}
            className="flex items-center px-2 sm:px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            title="Refresh lists"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-3 sm:px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm sm:text-base"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Create List</span>
            <span className="sm:hidden">Create</span>
          </button>
        </div>
      </div>

      {/* Lists Grid */}
      {contactLists.length === 0 ? (
        <div className="text-center py-8 sm:py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2">
            No contact lists found
          </h3>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-4 sm:mb-6">
            Create your first contact list to organize your contacts for targeted campaigns.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-3 sm:px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm sm:text-base"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create First List
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {contactLists.map((list) => (
            <div key={list.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="flex items-center min-w-0 flex-1">
                  <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="ml-3 min-w-0">
                    <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white truncate">{list.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{list.contactCount} contacts</p>
                  </div>
                </div>
                <div className="flex space-x-1 ml-2">
                  <button 
                    onClick={() => handleEditList(list)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    title="Edit list"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteList(list.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete list"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-3 sm:mb-4 line-clamp-2">{list.description}</p>
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 dark:text-gray-400 space-y-1 sm:space-y-0">
                <span>Created: {list.createdDate}</span>
                <button 
                  onClick={() => handleManageList(list)}
                  className="text-primary hover:text-primary/80 font-medium transition-colors text-left sm:text-right"
                >
                  Manage List
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create List Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4">
          <div className="flex items-center justify-center min-h-screen">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block w-full max-w-lg bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all align-middle">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Create New Contact List
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="listName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                      List Name *
                    </label>
                    <input
                      type="text"
                      id="listName"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm sm:text-base"
                      placeholder="e.g., Holiday Specials"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="listDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                      Description (Optional)
                    </label>
                    <textarea
                      id="listDescription"
                      value={newListDescription}
                      onChange={(e) => setNewListDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm sm:text-base"
                      placeholder="Describe this contact list..."
                    />
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 flex flex-col sm:flex-row-reverse space-y-2 sm:space-y-0 sm:space-x-3 sm:space-x-reverse">
                <button
                  onClick={handleCreateList}
                  className="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-sm sm:text-base font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Create List
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

      {/* Edit List Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4">
          <div className="flex items-center justify-center min-h-screen">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block w-full max-w-lg bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all align-middle">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Edit Contact List
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="editListName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                      List Name *
                    </label>
                    <input
                      type="text"
                      id="editListName"
                      value={editListData.name}
                      onChange={(e) => handleEditListChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm sm:text-base"
                      placeholder="e.g., Holiday Specials"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="editListDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                      Description (Optional)
                    </label>
                    <textarea
                      id="editListDescription"
                      value={editListData.description}
                      onChange={(e) => handleEditListChange('description', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm sm:text-base"
                      placeholder="Describe this contact list..."
                    />
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <div className="flex flex-col sm:flex-row sm:justify-between text-sm space-y-1 sm:space-y-0">
                      <span className="text-gray-600 dark:text-gray-400">Contacts in list:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{editListData.contactCount}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between text-sm space-y-1 sm:space-y-0">
                      <span className="text-gray-600 dark:text-gray-400">Created:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{editListData.createdDate}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 flex flex-col sm:flex-row-reverse space-y-2 sm:space-y-0 sm:space-x-3 sm:space-x-reverse">
                <button
                  onClick={handleUpdateList}
                  className="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-sm sm:text-base font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Update List
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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

export default ContactLists;