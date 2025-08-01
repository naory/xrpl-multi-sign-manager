import React from 'react';
import { cn } from '../../lib/design-system';

export interface LoadingProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'spinner' | 'dots' | 'pulse' | 'bars';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'white' | 'neutral';
  text?: string;
}

const Loading = React.forwardRef<HTMLDivElement, LoadingProps>(
  ({ className, variant = 'spinner', size = 'md', color = 'primary', text, ...props }, ref) => {
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
      xl: 'h-12 w-12',
    };

    const colorClasses = {
      primary: 'text-primary-600',
      secondary: 'text-secondary-600',
      white: 'text-white',
      neutral: 'text-neutral-600',
    };

    const renderSpinner = () => (
      <svg
        className={cn('animate-spin', sizeClasses[size], colorClasses[color])}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    );

    const renderDots = () => (
      <div className={cn('flex space-x-1', sizeClasses[size])}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              'rounded-full bg-current animate-pulse',
              colorClasses[color],
              size === 'sm' && 'h-1 w-1',
              size === 'md' && 'h-1.5 w-1.5',
              size === 'lg' && 'h-2 w-2',
              size === 'xl' && 'h-3 w-3'
            )}
            style={{
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    );

    const renderPulse = () => (
      <div
        className={cn(
          'rounded-full bg-current animate-pulse',
          sizeClasses[size],
          colorClasses[color]
        )}
      />
    );

    const renderBars = () => (
      <div className={cn('flex space-x-1', sizeClasses[size])}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              'bg-current animate-pulse rounded-sm',
              colorClasses[color],
              size === 'sm' && 'h-3 w-1',
              size === 'md' && 'h-4 w-1',
              size === 'lg' && 'h-6 w-1.5',
              size === 'xl' && 'h-8 w-2'
            )}
            style={{
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>
    );

    const renderVariant = () => {
      switch (variant) {
        case 'dots':
          return renderDots();
        case 'pulse':
          return renderPulse();
        case 'bars':
          return renderBars();
        default:
          return renderSpinner();
      }
    };

    return (
      <div
        ref={ref}
        className={cn('flex items-center justify-center', className)}
        {...props}
      >
        <div className="flex flex-col items-center space-y-2">
          {renderVariant()}
          {text && (
            <p className={cn('text-sm font-medium', colorClasses[color])}>
              {text}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Loading.displayName = 'Loading';

export default Loading; 