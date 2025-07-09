import React, { createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useSupabase } from './SupabaseContext';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { supabase, user, session, isLoading, isAuthenticated } = useSupabase();

  const signIn = async (email: string, password: string) => {
    console.log('🔐 Attempting to sign in:', email);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('❌ Sign in error:', error);
    } else {
      console.log('✅ Sign in successful');
    }

    return { error };
  };

  const signUp = async (email: string, password: string) => {
    console.log('📝 Attempting to sign up:', email);
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error('❌ Sign up error:', error);
    } else {
      console.log('✅ Sign up successful');
    }

    return { error };
  };

  const signOut = async () => {
    console.log('👋 Attempting to sign out');
    
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('❌ Sign out error:', error);
    } else {
      console.log('✅ Sign out successful');
    }

    return { error };
  };

  const resetPassword = async (email: string) => {
    console.log('🔐 Attempting password reset for:', email);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      console.error('❌ Password reset error:', error);
    } else {
      console.log('✅ Password reset email sent');
    }

    return { error };
  };

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};