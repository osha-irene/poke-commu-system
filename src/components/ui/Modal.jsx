
// src/components/ui/Modal.jsx
import { X } from 'lucide-react';
import { Button } from './Button';

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children,
  size = 'md' 
}) {
  if (!isOpen) return null;
  
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100000]"
      onClick={onClose}
    >
      <div 
        className={`bg-white rounded-lg p-6 ${sizeClasses[size]} w-full m-4 max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* 내용 */}
        <div>
          {children}
        </div>
      </div>
    </div>
  );
}

// ===================================
