import React from 'react';
import { cn } from '../../lib/design-system';
import { InputVariant, InputSize } from '../../lib/design-system';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: InputVariant;
  size?: InputSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
  success?: string;
  label?: string;
  helperText?: string;
  fullWidth?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      leftIcon,
      rightIcon,
      error,
      success,
      label,
      helperText,
      fullWidth = true,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    
    const baseClasses = 'block w-full rounded-lg border bg-white px-3 py-2 text-sm placeholder-neutral-400 focus:outline-none focus:ring-1 disabled:bg-neutral-50 disabled:text-neutral-500 transition-colors duration-200';
    
    const sizeClasses = {
      sm: 'h-8 px-2 text-sm',
      md: 'h-10 px-3 text-sm',
      lg: 'h-12 px-4 text-base',
    };
    
    const variantClasses = {
      default: 'border-neutral-300 focus:border-primary-500 focus:ring-primary-500',
      error: 'border-error-300 focus:border-error-500 focus:ring-error-500',
      success: 'border-success-300 focus:border-success-500 focus:ring-success-500',
    };

    const getVariantClass = () => {
      if (error) return variantClasses.error;
      if (success) return variantClasses.success;
      return variantClasses[variant];
    };

    return (
      <div className={cn('space-y-1', fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-neutral-700"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            className={cn(
              baseClasses,
              sizeClasses[size],
              getVariantClass(),
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            ref={ref}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
              {rightIcon}
            </div>
          )}
        </div>
        {(error || success || helperText) && (
          <p
            className={cn(
              'text-sm',
              error && 'text-error-600',
              success && 'text-success-600',
              !error && !success && 'text-neutral-500'
            )}
          >
            {error || success || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input; 