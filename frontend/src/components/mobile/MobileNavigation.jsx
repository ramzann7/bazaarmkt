import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  MagnifyingGlassIcon, 
  ShoppingBagIcon, 
  UserIcon,
  Bars3Icon 
} from '@heroicons/react/24/outline';
import { 
  MagnifyingGlassIcon as SearchIconSolid,
  ShoppingBagIcon as CartIconSolid,
  UserIcon as UserIconSolid,
  Bars3Icon as MenuIconSolid
} from '@heroicons/react/24/solid';
import Logo from '../Logo';

const MobileNavigation = ({ 
  cartCount = 0, 
  onMenuClick,
  className = '' 
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { 
      path: '/', 
      label: 'Home', 
      isLogo: true // Special flag to render logo instead of icon
    },
    { 
      path: '/search', 
      label: 'Search', 
      icon: MagnifyingGlassIcon, 
      activeIcon: SearchIconSolid 
    },
    { 
      path: '/cart', 
      label: 'Cart', 
      icon: ShoppingBagIcon, 
      activeIcon: CartIconSolid,
      badge: cartCount 
    },
    { 
      path: '/profile', 
      label: 'Profile', 
      icon: UserIcon, 
      activeIcon: UserIconSolid 
    },
    { 
      path: null, 
      label: 'More', 
      icon: Bars3Icon, 
      activeIcon: MenuIconSolid,
      onClick: onMenuClick 
    }
  ];

  const isActive = (path) => {
    if (!path) return false;
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleNavClick = (item) => {
    if (item.onClick) {
      item.onClick();
    } else if (item.path) {
      navigate(item.path);
    }
  };

  return (
    <nav 
      className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 lg:hidden z-50 safe-area-bottom ${className}`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item, index) => {
          const active = isActive(item.path);
          const Icon = active ? item.activeIcon : item.icon;
          
          return (
            <button
              key={index}
              onClick={() => handleNavClick(item)}
              className={`
                relative flex flex-col items-center justify-center
                min-h-[44px] transition-colors duration-200
                ${active 
                  ? 'text-[#D77A61]' 
                  : 'text-gray-600 hover:text-gray-900'
                }
                active:bg-gray-50
              `}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              <div className="relative">
                {item.isLogo ? (
                  <Logo 
                    showText={false} 
                    className={`w-7 h-7 transition-opacity ${active ? 'opacity-100' : 'opacity-60'}`}
                  />
                ) : (
                  <Icon className="w-6 h-6" />
                )}
                {item.badge > 0 && (
                  <span 
                    className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center
                               bg-[#D77A61] text-white text-xs font-semibold rounded-full px-1"
                    aria-label={`${item.badge} items in cart`}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-xs mt-1 font-medium ${active ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNavigation;

