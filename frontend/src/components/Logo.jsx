import React from 'react';

const Logo = ({ className = 'w-8 h-8', showText = true, textColor = 'text-white' }) => {
  return (
    <div className={`flex items-center ${showText ? 'space-x-2' : ''}`}>
      <svg
        className={className}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background Circle with warm marketplace colors */}
        <circle cx="50" cy="50" r="48" fill="#D77A61" stroke="#8B4513" strokeWidth="2"/>
        
        {/* Store Building Structure */}
        <rect x="25" y="40" width="50" height="35" rx="3" fill="#F5F1EA" stroke="#8B4513" strokeWidth="2"/>
        
        {/* Store Roof */}
        <path d="M20 40 L50 20 L80 40 Z" fill="#8B4513"/>
        
        {/* Store Door */}
        <rect x="40" y="55" width="20" height="20" rx="2" fill="#8B4513"/>
        <circle cx="55" cy="65" r="1.5" fill="#F5F1EA"/>
        
        {/* Store Windows */}
        <rect x="30" y="48" width="8" height="8" rx="1" fill="#E6B655" stroke="#8B4513" strokeWidth="1"/>
        <rect x="62" y="48" width="8" height="8" rx="1" fill="#E6B655" stroke="#8B4513" strokeWidth="1"/>
        
        {/* Window Crosses */}
        <line x1="34" y1="48" x2="34" y2="56" stroke="#8B4513" strokeWidth="0.5"/>
        <line x1="30" y1="52" x2="38" y2="52" stroke="#8B4513" strokeWidth="0.5"/>
        <line x1="66" y1="48" x2="66" y2="56" stroke="#8B4513" strokeWidth="0.5"/>
        <line x1="62" y1="52" x2="70" y2="52" stroke="#8B4513" strokeWidth="0.5"/>
        
        {/* Large "B" Letter on the store */}
        <text x="50" y="70" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#8B4513" fontFamily="serif">
          B
        </text>
        
        {/* Store Sign/Banner */}
        <rect x="35" y="32" width="30" height="8" rx="1" fill="#E6B655" stroke="#8B4513" strokeWidth="1"/>
        <text x="50" y="38" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#8B4513" fontFamily="serif">
          BAZAAR
        </text>
        
        {/* Store Foundation */}
        <rect x="25" y="75" width="50" height="5" fill="#8B4513"/>
        
        {/* Decorative Elements - Market Flags */}
        <path d="M15 30 L15 25 L20 27.5 Z" fill="#E6B655"/>
        <path d="M85 30 L85 25 L80 27.5 Z" fill="#E6B655"/>
        
        {/* Small decorative dots around the store */}
        <circle cx="15" cy="60" r="1.5" fill="#E6B655" opacity="0.8"/>
        <circle cx="85" cy="60" r="1.5" fill="#E6B655" opacity="0.8"/>
        <circle cx="15" cy="80" r="1.5" fill="#E6B655" opacity="0.8"/>
        <circle cx="85" cy="80" r="1.5" fill="#E6B655" opacity="0.8"/>
      </svg>
      {showText && <span className={`text-lg sm:text-xl font-bold font-serif tracking-wide ${textColor}`}>bazaarMKT</span>}
    </div>
  );
};

export default Logo;