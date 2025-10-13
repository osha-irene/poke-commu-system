
// src/components/ui/Card.jsx
import { getCardClass } from '../../styles/theme';
export function Card({ 
  children, 
  variant = 'default',
  onClick,
  className = '',
  ...props 
}) {
  return (
    <div
      onClick={onClick}
      className={`${getCardClass(variant)} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// ===================================
