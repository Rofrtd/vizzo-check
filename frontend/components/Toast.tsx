'use client';

import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ 
  message, 
  type = 'success', 
  isVisible, 
  onClose,
  duration = 3000 
}: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500'
  }[type];

  const icon = {
    success: '✓',
    error: '✕',
    info: 'ℹ'
  }[type];

  // Portuguese messages mapping (if needed for common messages)
  const translatedMessage = message === 'Visit created successfully!' 
    ? 'Visita criada com sucesso!' 
    : message;

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className={`${bgColor} text-white px-6 py-4 rounded-lg shadow-xl flex items-center space-x-3 min-w-[300px] max-w-md border-l-4 ${type === 'success' ? 'border-green-600' : type === 'error' ? 'border-red-600' : 'border-blue-600'}`}>
        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-white bg-opacity-25 rounded-full">
          <span className="text-lg font-bold">{icon}</span>
        </div>
        <p className="flex-1 text-sm font-medium">{translatedMessage}</p>
        <button
          onClick={onClose}
          className="flex-shrink-0 text-white hover:text-gray-200 transition-colors p-1 rounded hover:bg-white hover:bg-opacity-20"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
