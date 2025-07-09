import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock, Check } from 'lucide-react';

const ResetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);
  const [isResetComplete, setIsResetComplete] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have a valid session for password reset
    const checkResetSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error checking session:', error);
          toast.error('Invalid or expired reset link');
          navigate('/sign-in');
          return;
        }

        if (session) {
          setIsTokenValid(true);
        } else {
          // Try to handle URL fragments manually
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const type = hashParams.get('type');
          
          if (accessToken && type === 'recovery') {
            // Set the session using the access token
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: hashParams.get('refresh_token') || '',
            });
            
            if (error) {
              console.error('Error setting session:', error);
              toast.error('Invalid or expired reset link');
              navigate('/sign-in');
              return;
            }
            
            if (data.session) {
              setIsTokenValid(true);
            }
          } else {
            toast.error('Invalid reset link');
            navigate('/sign-in');
            return;
          }
        }
      } catch (error) {
        console.error('Error in reset session check:', error);
        toast.error('Something went wrong. Please try again.');
        navigate('/sign-in');
      } finally {
        setCheckingToken(false);
      }
    };

    checkResetSession();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      if (error) {
        if (error.message.includes('session_not_found')) {
          toast.error('Reset link has expired. Please request a new one.');
          navigate('/forgot-password');
        } else {
          toast.error(error.message || 'Failed to update password');
        }
      } else {
        toast.success('Password updated successfully!');
        setIsResetComplete(true);
        
        // Sign out the user so they can sign in with new password
        await supabase.auth.signOut();
        
        // Redirect to sign in after a short delay
        setTimeout(() => {
          navigate('/sign-in');
        }, 2000);
      }
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    if (password.length < 6) return { strength: 'weak', color: 'text-red-500' };
    if (password.length < 8) return { strength: 'fair', color: 'text-orange-500' };
    if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
      return { strength: 'strong', color: 'text-green-500' };
    }
    return { strength: 'good', color: 'text-blue-500' };
  };

  const passwordStrength = getPasswordStrength(password);

  if (checkingToken) {
    return (
      <div className="min-h-screen bg-neutral-cream dark:bg-gray-900 flex items-center justify-center px-4 transition-colors">
        <div className="w-full max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h1 className="font-playfair text-2xl font-bold text-accent dark:text-white mb-2">
            Verifying Reset Link
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Please wait while we verify your password reset link...
          </p>
        </div>
      </div>
    );
  }

  if (!isTokenValid) {
    return (
      <div className="min-h-screen bg-neutral-cream dark:bg-gray-900 flex items-center justify-center px-4 transition-colors">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="font-playfair text-2xl font-bold text-accent dark:text-white mb-2">
            Invalid Reset Link
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            This password reset link is invalid or has expired.
          </p>
          <Link
            to="/forgot-password"
            className="inline-block bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            Request New Reset Link
          </Link>
        </div>
      </div>
    );
  }

  if (isResetComplete) {
    return (
      <div className="min-h-screen bg-neutral-cream dark:bg-gray-900 flex items-center justify-center px-4 transition-colors">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="font-playfair text-2xl font-bold text-accent dark:text-white mb-2">
            Password Reset Complete
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Your password has been successfully updated. You can now sign in with your new password.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Redirecting you to sign in...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-cream dark:bg-gray-900 flex items-center justify-center px-4 transition-colors">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-playfair text-3xl font-bold text-accent dark:text-white mb-2">
            Reset Your Password
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Enter your new password below
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 transition-colors">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                  placeholder="Enter your new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {password && (
                <div className="mt-2 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Password strength: </span>
                  <span className={`font-medium ${passwordStrength.color}`}>
                    {passwordStrength.strength}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                  placeholder="Confirm your new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  Passwords do not match
                </p>
              )}
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                Password Requirements:
              </h3>
              <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                <li className="flex items-center">
                  <Check className={`h-3 w-3 mr-2 ${password.length >= 6 ? 'text-green-600' : 'text-gray-400'}`} />
                  At least 6 characters
                </li>
                <li className="flex items-center">
                  <Check className={`h-3 w-3 mr-2 ${password.length >= 8 ? 'text-green-600' : 'text-gray-400'}`} />
                  8+ characters (recommended)
                </li>
                <li className="flex items-center">
                  <Check className={`h-3 w-3 mr-2 ${/[A-Z]/.test(password) ? 'text-green-600' : 'text-gray-400'}`} />
                  Contains uppercase letter
                </li>
                <li className="flex items-center">
                  <Check className={`h-3 w-3 mr-2 ${/[0-9]/.test(password) ? 'text-green-600' : 'text-gray-400'}`} />
                  Contains number
                </li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={isLoading || !password || !confirmPassword || password !== confirmPassword}
              className="w-full bg-primary text-white py-3 px-4 rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Remember your password?{' '}
            <Link to="/sign-in" className="text-primary hover:text-primary/80 font-semibold transition-colors">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;