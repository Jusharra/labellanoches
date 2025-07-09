import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import { SupabaseProvider } from './context/SupabaseContext';
import { AuthProvider } from './context/AuthContext';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SupabaseProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </SupabaseProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--toast-bg, #ffffff)',
            color: 'var(--toast-text, #1f2937)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid var(--toast-border, #e5e7eb)',
            borderRadius: '12px',
            padding: '16px 20px',
            fontSize: '15px',
            fontWeight: '500',
            backdropFilter: 'blur(16px)',
            maxWidth: '400px',
            minHeight: '60px',
          },
          success: {
            iconTheme: {
              primary: '#D35400',
              secondary: '#fff',
            },
            style: {
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: '1px solid #10b981',
              boxShadow: '0 20px 25px -5px rgba(16, 185, 129, 0.3), 0 10px 10px -5px rgba(16, 185, 129, 0.1)',
              fontWeight: '600',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
            style: {
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: '#ffffff',
              border: '1px solid #ef4444',
              boxShadow: '0 20px 25px -5px rgba(239, 68, 68, 0.3), 0 10px 10px -5px rgba(239, 68, 68, 0.1)',
              fontWeight: '600',
            },
          },
          loading: {
            iconTheme: {
              primary: '#D35400',
              secondary: '#fff',
            },
            style: {
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: '#ffffff',
              border: '1px solid #3b82f6',
              boxShadow: '0 20px 25px -5px rgba(59, 130, 246, 0.3), 0 10px 10px -5px rgba(59, 130, 246, 0.1)',
              fontWeight: '600',
            },
          },
        }}
      />
  </StrictMode>
);
