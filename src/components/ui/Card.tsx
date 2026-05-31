import React from 'react';
import { clsx } from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'hover' | 'bordered';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  className,
  ...props
}: CardProps) {
  const baseStyles = 'bg-white dark:bg-secondary-800 rounded-xl overflow-hidden';

  const variants = {
    default: 'shadow-sm border border-secondary-200 dark:border-secondary-700',
    hover: 'shadow-sm border border-secondary-200 dark:border-secondary-700 hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-300 cursor-pointer',
    bordered: 'border-2 border-secondary-200 dark:border-secondary-700',
  };

  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div className={clsx(baseStyles, variants[variant], paddings[padding], className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('pb-4 border-b border-secondary-200 dark:border-secondary-700', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={clsx('text-lg font-semibold text-secondary-900 dark:text-secondary-100', className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={clsx('text-sm text-secondary-500 dark:text-secondary-400 mt-1', className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('pt-4', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('pt-4 border-t border-secondary-200 dark:border-secondary-700', className)} {...props}>
      {children}
    </div>
  );
}
