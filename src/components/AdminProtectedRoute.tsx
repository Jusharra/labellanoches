import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
  const { user, userRole, isLoading, isLoadingRole, isAuthenticated } = useAuth();

  // Show loading while auth is initializing or role is being fetched
  if (isLoading || isLoadingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" replace />;
  }

  // Check if user has admin role
  if (userRole !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            You don't have permission to access the admin dashboard. {userRole ? `Your role: ${userRole}` : 'No role assigned.'}
          </p>
          <Navigate to="/" replace />
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminProtectedRoute;