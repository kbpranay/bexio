import React from 'react';
import { loginWithGoogle } from '../firebase';
import { LogIn } from 'lucide-react';
import { motion } from 'motion/react';

export function Auth() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-900 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-8 shadow-xl"
      >
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-900/20">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Bexio Dashboard</h1>
          <p className="text-gray-500">Sign in to access your team's revenue metrics</p>
        </div>

        <button
          onClick={loginWithGoogle}
          className="w-full flex items-center justify-center gap-3 bg-gray-900 text-white font-semibold py-3 px-4 rounded-xl hover:bg-gray-800 transition-colors"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Continue with Google
        </button>

        <p className="mt-8 text-center text-xs text-gray-500 uppercase tracking-widest">
          Authorized Team Members Only
        </p>
      </motion.div>
    </div>
  );
}
