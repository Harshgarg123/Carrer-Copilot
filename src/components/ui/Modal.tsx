import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  children,
}: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    full: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={clsx(
          'relative w-full bg-white dark:bg-secondary-800 rounded-xl shadow-xl animate-scale-in',
          sizes[size],
          'max-h-[90vh] overflow-y-auto mx-4'
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between p-6 border-b border-secondary-200 dark:border-secondary-700">
            <div>
              {title && (
                <h2 className="text-xl font-semibold text-secondary-900 dark:text-secondary-100">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
