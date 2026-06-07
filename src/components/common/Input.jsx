// src/components/common/Input.jsx
// 공통 입력 컴포넌트

import React from 'react';
import { getInputClass } from '../../styles/theme';

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
  
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`${getInputClass(variant)} ${className}`}
      {...props}
    />
  );
}

export default Input;
