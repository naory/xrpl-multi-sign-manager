import React from 'react';
import { cn } from '../../lib/design-system';

export interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

export interface HeaderProps {
  children: React.ReactNode;
  className?: string;
}

export interface SidebarProps {
  children: React.ReactNode;
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export interface MainProps {
  children: React.ReactNode;
  className?: string;
}

const Layout = React.forwardRef<HTMLDivElement, LayoutProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('min-h-screen bg-neutral-50', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

const Header = React.forwardRef<HTMLElement, HeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <header
        ref={ref}
        className={cn(
          'sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60',
          className
        )}
        {...props}
      >
        {children}
      </header>
    );
  }
);

const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(
  ({ className, children, isOpen = false, onClose, ...props }, ref) => {
    return (
      <>
        {/* Mobile overlay */}
        {isOpen && (
          <div
            className="fixed inset-0 z-40 bg-neutral-900/50 lg:hidden"
            onClick={onClose}
          />
        )}
        
        {/* Sidebar */}
        <aside
          ref={ref}
          className={cn(
            'fixed left-0 top-0 z-50 h-full w-64 transform border-r border-neutral-200 bg-white transition-transform duration-300 ease-in-out lg:translate-x-0 lg:border-r-0',
            isOpen ? 'translate-x-0' : '-translate-x-full',
            className
          )}
          {...props}
        >
          {children}
        </aside>
      </>
    );
  }
);

const Main = React.forwardRef<HTMLElement, MainProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <main
        ref={ref}
        className={cn('flex-1 lg:ml-64', className)}
        {...props}
      >
        {children}
      </main>
    );
  }
);

Layout.displayName = 'Layout';
Header.displayName = 'Header';
Sidebar.displayName = 'Sidebar';
Main.displayName = 'Main';

export { Layout, Header, Sidebar, Main }; 