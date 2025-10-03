import React from 'react';
import { useNavigate } from 'react-router-dom';

const AuthPopup = ({ isOpen, onClose, action = "perform this action" }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleLogin = () => {
    onClose();
    navigate('/login');
  };

  const handleRegister = () => {
    onClose();
    navigate('/register');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {/* Icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-accent/10 mb-4">
            <svg className="h-8 w-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          {/* Title */}
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Authentication Required
          </h3>

          {/* Message */}
          <p className="text-gray-600 mb-6">
            You need to be logged in to {action}. Please sign in to your account or create a new one.
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleLogin}
              className="flex-1 bg-accent text-white px-6 py-3 rounded-lg font-semibold hover:bg-accent/90 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={handleRegister}
              className="flex-1 bg-white text-accent border-2 border-accent px-6 py-3 rounded-lg font-semibold hover:bg-accent/5 transition-colors"
            >
              Create Account
            </button>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="mt-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPopup;
