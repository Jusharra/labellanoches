import React, { useState, useEffect } from 'react';
import { X, Image, Upload, RefreshCw, Trash2, Check, AlertCircle } from 'lucide-react';
import { useSupabase } from '../context/SupabaseContext';
import toast from 'react-hot-toast';

interface MediaItem {
  id: string;
  title: string;
  link: string;
  createdAt: string;
}

interface MediaLibraryModalProps {
  onClose: () => void;
  onSelect: (url: string) => void;
  mode: 'select' | 'upload';
}

const MediaLibraryModal: React.FC<MediaLibraryModalProps> = ({ onClose, onSelect, mode }) => {
  const { supabase, user } = useSupabase();
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [businessId, setBusinessId] = useState<string | null>(null);

  // Fetch user's business_id when component mounts
  useEffect(() => {
    const fetchBusinessId = async () => {
      if (supabase && user) {
        try {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('business_id')
            .eq('id', user.id)
            .single();
            
          if (error) {
            console.error('Error fetching business ID:', error);
            return;
          }
          
          if (data?.business_id) {
            setBusinessId(data.business_id);
          }
        } catch (error) {
          console.error('Error fetching business ID:', error);
        }
      }
    };
    
    fetchBusinessId();
  }, [supabase, user]);

  // Fetch media items when business_id is available
  useEffect(() => {
    if (supabase && businessId && mode === 'select') {
      fetchMediaItems();
    } else if (mode === 'upload') {
      setLoading(false);
    }
  }, [supabase, businessId, mode]);

  const fetchMediaItems = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('media_library')
        .select('id, title, link, created_at')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (data) {
        const formattedItems = data.map(item => ({
          id: item.id,
          title: item.title,
          link: item.link,
          createdAt: new Date(item.created_at).toLocaleDateString()
        }));
        setMediaItems(formattedItems);
      }
    } catch (error) {
      console.error('Error fetching media:', error);
      toast.error('Failed to load media items');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      // Validate file type
      if (!selectedFile.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      
      setFile(selectedFile);
      
      // Auto-generate title from filename if empty
      if (!title) {
        const fileName = selectedFile.name.split('.')[0];
        setTitle(fileName.charAt(0).toUpperCase() + fileName.slice(1));
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }
    
    if (!title.trim()) {
      toast.error('Please enter a title for the media');
      return;
    }
    
    if (!supabase || !businessId) {
      toast.error('Unable to upload. Please try again later.');
      return;
    }
    
    setUploading(true);
    
    try {
      // Generate a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;
      const filePath = `${businessId}/${fileName}`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('campaign-media')
        .upload(filePath, file, {
          onUploadProgress: (progress) => {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            setUploadProgress(percent);
          }
        });
      
      if (uploadError) {
        throw uploadError;
      }
      
      // Get public URL
      const { data: urlData } = await supabase.storage
        .from('campaign-media')
        .getPublicUrl(filePath);
        
      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL');
      }
      
      // Store in media_library table
      const { data: mediaData, error: mediaError } = await supabase
        .from('media_library')
        .insert({
          business_id: businessId,
          title: title,
          link: urlData.publicUrl,
          access_type: 'Free', // Default to free
          created_by: user?.id
        })
        .select()
        .single();
      
      if (mediaError) {
        throw mediaError;
      }
      
      toast.success('Media uploaded successfully!');
      
      // Return the public URL to the parent component
      onSelect(urlData.publicUrl);
      onClose();
      
    } catch (error) {
      console.error('Error uploading file:', error);
      if (error.message.includes('storage/unauthorized')) {
        toast.error('Permission denied: You do not have access to upload files');
      } else if (error.message.includes('storage/object_too_large')) {
        toast.error('File is too large. Maximum size is 5MB');
      } else {
        toast.error('Failed to upload file. Please try again.');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSelectMedia = (url: string) => {
    onSelect(url);
    onClose();
  };

  const handleDeleteMedia = async (id: string) => {
    if (!supabase) return;
    
    if (!window.confirm('Are you sure you want to delete this media item?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('media_library')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      // Update the UI
      setMediaItems(mediaItems.filter(item => item.id !== id));
      toast.success('Media deleted successfully');
      
    } catch (error) {
      console.error('Error deleting media:', error);
      toast.error('Failed to delete media');
    }
  };

  const filteredMedia = mediaItems.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" 
             onClick={onClose} aria-hidden="true"></div>
             
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {mode === 'select' ? 'Select Media' : 'Upload Media'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          {/* Content */}
          <div className="px-4 sm:px-6 py-4">
            {mode === 'select' && (
              <>
                {/* Search Bar */}
                <div className="mb-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search media items..."
                      className="w-full px-3 py-2 pl-3 pr-10 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                    />
                    <button
                      onClick={() => setSearchQuery('')}
                      className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${searchQuery ? 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300' : 'hidden'}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                {/* Media Grid */}
                {loading ? (
                  <div className="py-8 text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-300">Loading media library...</p>
                  </div>
                ) : filteredMedia.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[calc(100vh-20rem)] overflow-y-auto p-2">
                    {filteredMedia.map((item) => (
                      <div 
                        key={item.id} 
                        className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-white dark:bg-gray-700 group"
                      >
                        <div className="relative h-32 bg-gray-100 dark:bg-gray-600">
                          <img 
                            src={item.link} 
                            alt={item.title}
                            className="w-full h-full object-contain" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Error';
                            }}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <button
                              onClick={() => handleSelectMedia(item.link)}
                              className="bg-primary text-white rounded-full p-2 m-1 hover:bg-primary/90"
                              title="Select this media"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteMedia(item.id)}
                              className="bg-red-600 text-white rounded-full p-2 m-1 hover:bg-red-700"
                              title="Delete this media"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div className="p-2">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.title}</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{item.createdAt}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <div className="mx-auto w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                      <Image className="h-8 w-8 text-gray-400" />
                    </div>
                    <h4 className="text-gray-900 dark:text-white font-medium mb-2">No media items found</h4>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                      {searchQuery
                        ? `No results for "${searchQuery}"`
                        : "Your media library is empty"}
                    </p>
                    <button
                      onClick={() => {
                        if (searchQuery) {
                          setSearchQuery('');
                        } else {
                          onClose();
                          // Assuming we have a way to switch to upload mode from parent
                        }
                      }}
                      className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      {searchQuery ? 'Clear Search' : 'Upload Media'}
                    </button>
                  </div>
                )}
                
                {/* Refresh Button */}
                <div className="flex justify-center mt-4">
                  <button
                    onClick={fetchMediaItems}
                    className="flex items-center text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Refresh Media
                  </button>
                </div>
              </>
            )}
            
            {mode === 'upload' && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="media-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Media Title *
                  </label>
                  <input
                    type="text"
                    id="media-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter a title for this media"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="media-file" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Media File *
                  </label>
                  {file ? (
                    <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setFile(null)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                      
                      {file.type.startsWith('image/') && (
                        <div className="mt-2 relative h-32 bg-gray-100 dark:bg-gray-600 rounded overflow-hidden">
                          <img
                            src={URL.createObjectURL(file)}
                            alt="Preview"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                      <div className="flex flex-col items-center">
                        <Upload className="h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                          Drag and drop a file here, or click to browse
                        </p>
                        <p className="text-xs text-gray-500">
                          PNG, JPG, GIF up to 5MB
                        </p>
                      </div>
                      <input
                        type="file"
                        id="media-file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  )}
                </div>
                
                {uploading && (
                  <div className="mt-4">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 text-center">
                      Uploading: {uploadProgress}%
                    </p>
                  </div>
                )}
                
                <div className="flex items-center justify-between mt-2">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    <AlertCircle className="h-4 w-4 inline-block mr-1" />
                    Media will be visible to all customers
                  </div>
                </div>
                
                <button
                  onClick={handleUpload}
                  disabled={uploading || !file || !title.trim()}
                  className="w-full flex items-center justify-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Media
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="px-4 sm:px-6 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-700 flex justify-between">
            <button
              onClick={onClose}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            
            {mode === 'select' && (
              <button
                onClick={() => {
                  onClose();
                  // Tell parent component to show upload modal instead
                }}
                className="px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Upload New Media
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaLibraryModal;