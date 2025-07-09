import React, { createContext, useContext, useEffect, useState } from 'react';
import { SupabaseClient, User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

interface SupabaseContextType {
  supabase: SupabaseClient;
  user: User | null;
  session: Session | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('🔐 Initializing Supabase auth...');
    
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Error getting initial session:', error);
        } else {
          console.log('✅ Initial session loaded:', session ? 'authenticated' : 'not authenticated');
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('❌ Error in getInitialSession:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, session ? 'authenticated' : 'not authenticated');
        
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);

        // Handle specific auth events
        switch (event) {
          case 'SIGNED_IN':
            console.log('✅ User signed in:', session?.user?.email);
            break;
          case 'SIGNED_OUT':
            console.log('👋 User signed out');
            break;
          case 'TOKEN_REFRESHED':
            console.log('🔄 Token refreshed');
            break;
          case 'USER_UPDATED':
            console.log('👤 User updated');
            break;
          case 'PASSWORD_RECOVERY':
            console.log('🔐 Password recovery initiated');
            break;
        }
      }
    );

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value: SupabaseContextType = {
    supabase,
    user,
    session,
    isLoading,
    isAuthenticated: !!user && !!session
  };

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
};