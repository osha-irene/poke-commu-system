
// src/components/ui/Input.jsx
import { COMPONENT_STYLES } from '../../styles/theme';

export function Input({ 
  type = 'text',
  value,
  onChange,
  placeholder,
  error = false,
  className = '',
  ...props 
}) {
  const variant = error ? 'error' : 'default';
  const { base, variants } = COMPONENT_STYLES.input;
  
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

// ===================================
