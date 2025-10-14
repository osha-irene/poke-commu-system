// src/components/ui/Button.jsx
import { getButtonClass } from '../../styles/theme';
import useClickSound from '../../hooks/useClickSound';

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  onClick,
  disabled = false,
  className = '',
  type = 'button',
  noSound = false, // 소리를 끄고 싶은 경우 사용
  ...props 
}) {
  const playClick = useClickSound();

  const handleClick = (e) => {
    // 비활성화 상태가 아니고, noSound가 false일 때만 소리 재생
    if (!disabled && !noSound) {
      playClick();
    }
    
    // 원래 onClick 핸들러 실행
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled}
      className={`${getButtonClass(variant, size)} ${className} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      {...props}
    >
      {children}
    </button>
  );
}