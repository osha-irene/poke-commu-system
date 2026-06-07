// src/components/common/Badge.jsx
// 공통 배지 컴포넌트

import React from 'react';
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

export default Badge;
