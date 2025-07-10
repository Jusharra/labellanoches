import React, { createContext, useContext, useEffect, useState } from 'react';
import { SupabaseClient, User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

interface SupabaseContextType {
  supabase: SupabaseClient;
  user: User | null;
  session: Session | null;
  userRole: string | null;
  isLoading: boolean;
  isLoadingRole: boolean;
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
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRole, setIsLoadingRole] = useState(false);

  // Function to fetch user role from user_profiles table
  const fetchUserRole = async (userId: string) => {
    setIsLoadingRole(true);
    try {
      console.log('🔍 Fetching user role for:', userId);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('👤 User profile not found, user may not have a role assigned');
          setUserRole(null);
        } else {
          console.error('❌ Error fetching user role:', error);
          setUserRole(null);
        }
      } else {
        console.log('✅ User role fetched:', data.role);
        setUserRole(data.role);
      }
    } catch (error) {
      console.error('❌ Unexpected error fetching user role:', error);
      setUserRole(null);
    } finally {
      setIsLoadingRole(false);
    }
  };

  useEffect(() => {
    console.log('🔐 Initializing Supabase auth...');
    
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Error getting initial session:', error);
          
          // Handle invalid refresh token by signing out
          if (error.message && error.message.includes('Invalid Refresh Token')) {
            console.log('🔄 Invalid refresh token detected, signing out...');
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setUserRole(null);
            setIsLoading(false);
            return;
          }
        } else {
          console.log('✅ Initial session loaded:', session ? 'authenticated' : 'not authenticated');
          setSession(session);
          setUser(session?.user ?? null);
          
          // Fetch user role if user is authenticated
          if (session?.user) {
            fetchUserRole(session.user.id);
          } else {
            setUserRole(null);
          }
        }
      } catch (error) {
        console.error('❌ Error in getInitialSession:', error);
        
        // Handle invalid refresh token in catch block as well
        if (error instanceof Error && error.message && error.message.includes('Invalid Refresh Token')) {
          console.log('🔄 Invalid refresh token detected in catch, signing out...');
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setUserRole(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, session ? 'authenticated' : 'not authenticated');
        
        // Handle sign out event or invalid session
        if (event === 'SIGNED_OUT' || !session) {
          setSession(null);
          setUser(null);
          setUserRole(null);
          setIsLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch user role when user state changes
        if (session?.user) {
          fetchUserRole(session.user.id);
        } else {
          setUserRole(null);
        }
        
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
    userRole,
    isLoading,
    isLoadingRole,
    isAuthenticated: !!user && !!session
  };

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
};