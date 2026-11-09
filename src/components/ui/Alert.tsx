import React from 'react';
import { AlertCircle, CheckCircle2, Info, XCircle, X } from 'lucide-react';
import { clsx } from 'clsx';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  onClose?: () => void;
}

export function Alert({
  variant = 'info',
  title,
  children,
  onClose,
  className,
  ...props
}: AlertProps) {
  const variants = {
    info: {
      container: 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800',
      icon: 'text-primary-600 dark:text-primary-400',
      title: 'text-primary-900 dark:text-primary-100',
      content: 'text-primary-700 dark:text-primary-300',
      Icon: Info,
    },
    success: {
      container: 'bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800',
      icon: 'text-success-600 dark:text-success-400',
      title: 'text-success-900 dark:text-success-100',
      content: 'text-success-700 dark:text-success-300',
      Icon: CheckCircle2,
    },
    warning: {
      container: 'bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800',
      icon: 'text-warning-600 dark:text-warning-400',
      title: 'text-warning-900 dark:text-warning-100',
      content: 'text-warning-700 dark:text-warning-300',
      Icon: AlertCircle,
    },
    error: {
      container: 'bg-error-50 dark:bg-error-900/20 border-error-200 dark:border-error-800',
      icon: 'text-error-600 dark:text-error-400',
      title: 'text-error-900 dark:text-error-100',
      content: 'text-error-700 dark:text-error-300',
      Icon: XCircle,
    },
  };

  const { Icon } = variants[variant];

  return (
    <div
      className={clsx(
        'flex gap-3 p-4 rounded-lg border',
        variants[variant].container,
        className
      )}
      role="alert"
      {...props}
    >
      <Icon className={clsx('w-5 h-5 flex-shrink-0 mt-0.5', variants[variant].icon)} />
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className={clsx('text-sm font-medium', variants[variant].title)}>
            {title}
          </h4>
        )}
        <div className={clsx('text-sm', title && 'mt-1', variants[variant].content)}>
          {children}
        </div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className={clsx('flex-shrink-0 p-1 rounded-lg transition-colors', variants[variant].icon, 'hover:opacity-70')}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
