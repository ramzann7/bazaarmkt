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
        
        {/* Marketplace Stall/Shop Structure */}
        <rect x="20" y="35" width="60" height="30" rx="2" fill="#F5F1EA" stroke="#8B4513" strokeWidth="1.5"/>
        <rect x="25" y="40" width="50" height="20" rx="1" fill="#E6B655" opacity="0.4"/>
        
        {/* Stall Roof */}
        <path d="M15 35 L50 15 L85 35 Z" fill="#8B4513"/>
        
        {/* Stall Posts */}
        <rect x="20" y="65" width="3" height="15" fill="#8B4513"/>
        <rect x="77" y="65" width="3" height="15" fill="#8B4513"/>
        
        {/* Handmade Products Display */}
        {/* Pottery/Bowl */}
        <ellipse cx="35" cy="50" rx="4" ry="3" fill="#F0D9B5" stroke="#8B4513" strokeWidth="0.5"/>
        <ellipse cx="35" cy="48" rx="3.5" ry="2.5" fill="#E6B655"/>
        
        {/* Handwoven Basket */}
        <path d="M55 45 L60 45 L58 55 L52 55 Z" fill="#8B4513"/>
        <path d="M53 47 L59 47 M53 49 L59 49 M53 51 L59 51" stroke="#F0D9B5" strokeWidth="0.5"/>
        
        {/* Handmade Jewelry/Pendant */}
        <circle cx="70" cy="50" r="2" fill="#E6B655" stroke="#8B4513" strokeWidth="0.5"/>
        <path d="M70 52 L70 54 M69 53 L71 53" stroke="#8B4513" strokeWidth="0.5"/>
        
        {/* Community Hands (sharing/exchange) */}
        <path d="M15 75 C18 72, 22 72, 25 75 C22 78, 18 78, 15 75 Z" fill="#F0D9B5" stroke="#8B4513" strokeWidth="0.5"/>
        <path d="M75 75 C78 72, 82 72, 85 75 C82 78, 78 78, 75 75 Z" fill="#F0D9B5" stroke="#8B4513" strokeWidth="0.5"/>
        
        {/* Exchange arrows between hands */}
        <path d="M25 75 L35 75" stroke="#8B4513" strokeWidth="1.5" markerEnd="url(#arrowhead)"/>
        <path d="M65 75 L75 75" stroke="#8B4513" strokeWidth="1.5" markerEnd="url(#arrowhead)"/>
        
        {/* Arrow marker definition */}
        <defs>
          <marker id="arrowhead" markerWidth="4" markerHeight="3" refX="3" refY="1.5" orient="auto">
            <polygon points="0 0, 4 1.5, 0 3" fill="#8B4513"/>
          </marker>
        </defs>
        
        {/* Local/Community indicator - small house */}
        <rect x="47" y="70" width="6" height="4" fill="#F0D9B5" stroke="#8B4513" strokeWidth="0.5"/>
        <path d="M46 70 L50 65 L54 70 Z" fill="#8B4513"/>
        <rect x="48.5" y="72" width="1" height="2" fill="#8B4513"/>
        
        {/* Decorative marketplace elements */}
        <circle cx="10" cy="20" r="1.5" fill="#E6B655" opacity="0.8"/>
        <circle cx="90" cy="20" r="1.5" fill="#E6B655" opacity="0.8"/>
        <circle cx="10" cy="80" r="1.5" fill="#E6B655" opacity="0.8"/>
        <circle cx="90" cy="80" r="1.5" fill="#E6B655" opacity="0.8"/>
      </svg>
      {showText && <span className={`text-lg sm:text-xl font-bold font-serif tracking-wide ${textColor}`}>bazaarMKT</span>}
    </div>
  );
};

export default Logo;