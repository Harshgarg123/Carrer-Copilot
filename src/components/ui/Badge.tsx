import React from 'react';
import { clsx } from 'clsx';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'accent';
  size?: 'sm' | 'md';
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className,
  ...props
}: BadgeProps) {
  const baseStyles = 'inline-flex items-center font-medium rounded-full';

  const variants = {
    default: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-800 dark:text-secondary-300',
    primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
    secondary: 'bg-secondary-200 text-secondary-800 dark:bg-secondary-700 dark:text-secondary-200',
    success: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300',
    warning: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300',
    error: 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-300',
    accent: 'bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span className={clsx(baseStyles, variants[variant], sizes[size], className)} {...props}>
      {children}
    </span>
  );
}
