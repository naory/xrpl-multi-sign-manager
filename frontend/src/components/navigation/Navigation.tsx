import React from 'react';
import { cn } from '../../lib/design-system';
import { Button } from '../ui';

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon?: React.ReactNode;
  badge?: string;
  isActive?: boolean;
  isExternal?: boolean;
}

export interface NavigationProps {
  items: NavigationItem[];
  logo?: React.ReactNode;
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  onLogout?: () => void;
  className?: string;
}

export interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  items: NavigationItem[];
  user?: NavigationProps['user'];
  onLogout?: () => void;
}

const Navigation = React.forwardRef<HTMLElement, NavigationProps>(
  ({ items, logo, user, onLogout, className, ...props }, ref) => {
    return (
      <nav
        ref={ref}
        className={cn('flex h-16 items-center justify-between px-4 lg:px-6', className)}
        {...props}
      >
        {/* Logo */}
        <div className="flex items-center">
          {logo && (
            <div className="flex items-center space-x-2">
              {logo}
            </div>
          )}
        </div>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex lg:items-center lg:space-x-8">
          {items.map((item) => (
            <a
              key={item.id}
              href={item.href}
              className={cn(
                'flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                item.isActive
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'
              )}
            >
              {item.icon && <span className="h-4 w-4">{item.icon}</span>}
              <span>{item.label}</span>
              {item.badge && (
                <span className="ml-2 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
                  {item.badge}
                </span>
              )}
            </a>
          ))}
        </div>

        {/* User Menu */}
        <div className="flex items-center space-x-4">
          {user && (
            <div className="hidden lg:flex lg:items-center lg:space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-neutral-900">{user.name}</p>
                <p className="text-xs text-neutral-500">{user.email}</p>
              </div>
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-700">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              {onLogout && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLogout}
                >
                  Logout
                </Button>
              )}
            </div>
          )}
        </div>
      </nav>
    );
  }
);

const MobileMenu = React.forwardRef<HTMLDivElement, MobileMenuProps>(
  ({ isOpen, onClose, items, user, onLogout, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'fixed inset-0 z-50 lg:hidden',
          isOpen ? 'block' : 'hidden'
        )}
        {...props}
      >
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-neutral-900/50"
          onClick={onClose}
        />
        
        {/* Menu */}
        <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl">
          <div className="flex h-16 items-center justify-between px-6">
            <h2 className="text-lg font-semibold text-neutral-900">Menu</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          
          <div className="px-6 py-4">
            {/* Navigation Items */}
            <nav className="space-y-2">
              {items.map((item) => (
                <a
                  key={item.id}
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    item.isActive
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'
                  )}
                  onClick={onClose}
                >
                  {item.icon && <span className="h-5 w-5">{item.icon}</span>}
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
                      {item.badge}
                    </span>
                  )}
                </a>
              ))}
            </nav>
            
            {/* User Section */}
            {user && (
              <div className="mt-8 border-t border-neutral-200 pt-6">
                <div className="flex items-center space-x-3">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="h-10 w-10 rounded-full"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-700">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{user.name}</p>
                    <p className="text-xs text-neutral-500">{user.email}</p>
                  </div>
                </div>
                {onLogout && (
                  <Button
                    variant="ghost"
                    size="sm"
                    fullWidth
                    className="mt-4"
                    onClick={() => {
                      onLogout();
                      onClose();
                    }}
                  >
                    Logout
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

Navigation.displayName = 'Navigation';
MobileMenu.displayName = 'MobileMenu';

export { Navigation, MobileMenu }; 