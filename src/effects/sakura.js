import { useMemo } from 'react';
import './sakura.css';

const PETAL_COUNT = 26;

function createPetalStyle(index) {
  const left = -28 + ((index * 29) % 82);
  const size = 13 + (index % 6) * 2.05;
  const fallDuration = 9 + (index % 8) * 0.85;
  const swayDuration = 2.5 + (index % 5) * 0.34;
  const delay = -((index * 0.72) % 12);
  const drift = 760 + (index % 7) * 95;
  const opacity = 0.46 + (index % 5) * 0.055;
  const rotate = (index * 31) % 120;

  return {
    // 낙하 + 좌우 흔들림(drift): position(top/margin-left) 대신 transform으로 이동시켜
    // 매 프레임 레이아웃 재계산 없이 컴포지터에서만 처리되게 한다 (다른 화면 작업에 영향받지 않음).
    outer: {
      left: `${left}%`,
      animationDelay: `${delay}s`,
      animationDuration: `${fallDuration}s`,
      '--sakura-drift': `${drift}px`,
    },
    inner: {
      width: `${size}px`,
      height: `${size * 0.72}px`,
      opacity,
      animationDelay: `${delay}s`,
      animationDuration: `${swayDuration}s`,
      '--sakura-rotate': `${rotate}deg`,
    },
  };
}

export default function SakuraEffect() {
  const petals = useMemo(
    () => Array.from({ length: PETAL_COUNT }, (_, index) => createPetalStyle(index)),
    []
  );

  return (
    <div className="sakura-layer" aria-hidden="true">
      {petals.map(({ outer, inner }, index) => (
        <span key={index} className="sakura-petal" style={outer}>
          <span className={`sakura sakura--tone-${index % 3}`} style={inner} />
        </span>
      ))}
    </div>
  );
}