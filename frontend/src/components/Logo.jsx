import React from 'react';

const Logo = ({ className = 'w-8 h-8', showText = true, textColor = 'text-white' }) => {
  return (
    <div className={`flex items-center ${showText ? 'space-x-2' : ''}`}>
      <svg
        className={className}
        viewBox="0 0 300 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background */}
        <rect width="300" height="300" rx="36" fill="#FFF7EE"/>
        
        {/* Tent */}
        <path d="M50 120 L150 40 L250 120 Z" fill="#F28C28"/>
        <path d="M68 120 L150 56 L232 120 Z" fill="#FFB36A" opacity="0.95"/>
        
        {/* Basket */}
        <rect x="95" y="130" width="110" height="70" rx="10" fill="#7A5A2B"/>
        <path d="M95 140 C120 110 180 110 205 140" stroke="#FFFFFF" strokeWidth="2" strokeOpacity="0.12" fill="none"/>
        <circle cx="130" cy="160" r="8" fill="#FFD37A"/>
        <circle cx="165" cy="155" r="6" fill="#FFD37A"/>
        
        {/* Wordmark */}
        <text x="150" y="245" textAnchor="middle" fontFamily="Inter, Arial, sans-serif" fontSize="26" fill="#3A3A3A" fontWeight="700">BazaarMKT</text>
      </svg>
      {showText && <span className={`text-lg sm:text-xl font-bold tracking-wide ${textColor}`}>BazaarMKT</span>}
    </div>
  );
};

export default Logo;