import React from 'react';
import { SignIn } from '@clerk/clerk-react';

const SignInPage = () => {
  return (
    <div className="min-h-screen bg-neutral-cream dark:bg-gray-900 flex items-center justify-center px-4 transition-colors">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-playfair text-3xl font-bold text-accent dark:text-white mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Sign in to access your account
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 transition-colors">
          <SignIn 
            path="/sign-in"
            routing="path"
            signUpUrl="/sign-up"
            forgotPasswordUrl="/forgot-password"
            afterSignInUrl="/admin"
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
            Don't have an account?{' '}
            <a href="/sign-up" className="text-primary hover:text-primary/80 font-semibold">
              Sign up here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;