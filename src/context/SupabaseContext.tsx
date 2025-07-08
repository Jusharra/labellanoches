import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useAuth } from '@clerk/clerk-react';

interface SupabaseContextType {
  supabase: SupabaseClient | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};

interface SupabaseProviderProps {
  children: React.ReactNode;
}

export const SupabaseProvider: React.FC<SupabaseProviderProps> = ({ children }) => {
  const { getToken, isLoaded, userId } = useAuth();
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeSupabase = async () => {
      try {
        setIsLoading(true);
        
        // Wait for Clerk to load
        if (!isLoaded) {
          return;
        }

        // Initialize Supabase client
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
          console.error('Missing Supabase environment variables');
          return;
        }

        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

        // If user is authenticated in Clerk, get the session token
        if (userId) {
          try {
            console.log('🔐 User authenticated in Clerk, getting session token...');
            let token;
            try {
              // Try to get token with supabase template first
              token = await getToken({ template: 'supabase' });
            } catch (templateError) {
              // If template doesn't exist, fall back to default token
              console.log('ℹ️ Supabase template not found, using default token');
              token = await getToken();
            }
            
            if (token) {
              console.log('✅ Got Clerk session token, setting in Supabase client');
              
              // Set the session token in the Supabase client
              await supabaseClient.auth.setSession({
                access_token: token,
                refresh_token: '', // Not needed for Clerk integration
              });
              
              console.log('✅ Supabase client authenticated with Clerk token');
            } else {
              console.warn('⚠️ No session token available from Clerk');
            }
          } catch (error) {
            console.error('❌ Error getting Clerk session token:', error);
          }
        } else {
          console.log('👤 No user authenticated in Clerk');
        }

        setSupabase(supabaseClient);
      } catch (error) {
        console.error('❌ Error initializing Supabase:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSupabase();
  }, [isLoaded, userId, getToken]);

  // Update the token when it changes
  useEffect(() => {
    if (!supabase || !userId || !isLoaded) return;

    const updateToken = async () => {
      try {
        let token;
        try {
          // Try to get token with supabase template first
          token = await getToken({ template: 'supabase' });
        } catch (templateError) {
          // If template doesn't exist, fall back to default token
          token = await getToken();
        }
        
        if (token) {
          await supabase.auth.setSession({
            access_token: token,
            refresh_token: '',
          });
        }
      } catch (error) {
        console.error('❌ Error updating Supabase token:', error);
      }
    };

    // Update token every 30 seconds to keep it fresh
    const interval = setInterval(updateToken, 30000);
    return () => clearInterval(interval);
  }, [supabase, userId, isLoaded, getToken]);

  const value: SupabaseContextType = {
    supabase,
    isLoading,
    isAuthenticated: !!userId && !!supabase
  };

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
};