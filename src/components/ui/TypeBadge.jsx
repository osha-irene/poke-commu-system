
// src/components/ui/TypeBadge.jsx
import { getTypeColor } from '../../styles/theme';

export function TypeBadge({ type, size = 'sm' }) {
  const colors = getTypeColor(type);
  
  const sizeClasses = {
    xs: 'text-xs px-1.5 py-0.5',
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1'
  };
  
  return (
    <span 
      className={`${sizeClasses[size]} rounded font-bold inline-block text-center`}
      style={{ 
        backgroundColor: colors.bg,
        color: colors.text
      }}
    >
      {type}
    </span>
  );
}
