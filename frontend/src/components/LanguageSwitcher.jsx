import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { profileService } from '../services/profileService';
import toast from 'react-hot-toast';

export default function LanguageSwitcher({ className = '' }) {
  const { i18n } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const languages = [
    { code: 'en', label: 'EN', name: 'English' },
    { code: 'fr-CA', label: 'FR', name: 'Français (Canada)' }
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = async (langCode) => {
    try {
      // Change language in i18n
      i18n.changeLanguage(langCode);
      setIsOpen(false);
      
      // If user is authenticated, save preference to profile
      if (isAuthenticated && user) {
        await profileService.updateBasicProfile({ languagePreference: langCode });
      }
    } catch (error) {
      console.error('Failed to save language preference:', error);
      // Don't show error to user as language was already changed locally
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-2 py-1 text-xs font-semibold text-stone-600 hover:text-amber-600 transition-colors"
        aria-label="Select Language"
      >
        {currentLanguage.label}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-stone-200 py-1 z-50">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className={`w-full text-left px-3 py-2 hover:bg-stone-50 transition-colors flex items-center justify-between text-sm ${
                i18n.language === language.code ? 'bg-amber-50 text-amber-600' : 'text-stone-700'
              }`}
            >
              <span className="flex items-center space-x-2">
                <span className={`font-semibold ${i18n.language === language.code ? 'text-amber-600' : 'text-stone-600'}`}>
                  {language.label}
                </span>
                <span className="text-xs text-stone-500">{language.name}</span>
              </span>
              {i18n.language === language.code && (
                <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

