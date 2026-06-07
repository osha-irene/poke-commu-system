// src/components/common/Card.jsx
// 공통 카드 컴포넌트

import React from 'react';
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

export default Card;
