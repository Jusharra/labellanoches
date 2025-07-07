import React from 'react';
import { SignIn } from '@clerk/clerk-react';

const ForgotPasswordPage = () => {
  return (
    <div className="min-h-screen bg-neutral-cream dark:bg-gray-900 flex items-center justify-center px-4 transition-colors">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-playfair text-3xl font-bold text-accent dark:text-white mb-2">
            Reset Password
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Enter your email to reset your password
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 transition-colors">
          <SignIn 
            path="/forgot-password"
            routing="path"
            afterSignInUrl="/"
            initialValues={{
              emailAddress: '',
            }}
            appearance={{
              elements: {
                formButtonPrimary: 'bg-primary hover:bg-primary/90',
                formFieldInput: 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                footerActionLink: 'text-primary hover:text-primary/80',
              },
            }}
          />
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Remember your password?{' '}
            <a href="/sign-in" className="text-primary hover:text-primary/80 font-semibold">
              Sign in here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;