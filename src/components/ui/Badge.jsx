
// src/components/ui/Badge.jsx
import { getBadgeClass } from '../../styles/theme';
export function Badge({ 
  children, 
  variant = 'default',
  className = '',
  ...props 
}) {
  return (
    <span
      className={`${getBadgeClass(variant)} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

// ===================================
