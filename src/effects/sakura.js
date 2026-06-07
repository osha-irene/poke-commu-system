import { useMemo } from 'react';
import './sakura.css';

const PETAL_COUNT = 26;

function createPetalStyle(index) {
  const left = -28 + ((index * 29) % 82);
  const size = 13 + (index % 6) * 2.05;
  const fallDuration = 9 + (index % 8) * 0.85;
  const blowDuration = fallDuration;
  const swayDuration = 2.5 + (index % 5) * 0.34;
  const delay = -((index * 0.72) % 12);
  const drift = 760 + (index % 7) * 95;
  const opacity = 0.46 + (index % 5) * 0.055;
  const rotate = (index * 31) % 120;

  return {
    left: `${left}%`,
    width: `${size}px`,
    height: `${size * 0.72}px`,
    opacity,
    animationDelay: `${delay}s, ${delay}s, ${delay}s`,
    animationDuration: `${fallDuration}s, ${blowDuration}s, ${swayDuration}s`,
    '--sakura-drift': `${drift}px`,
    '--sakura-rotate': `${rotate}deg`,
  };
}

export default function SakuraEffect() {
  const petals = useMemo(
    () => Array.from({ length: PETAL_COUNT }, (_, index) => createPetalStyle(index)),
    []
  );

  return (
    <div className="sakura-layer" aria-hidden="true">
      {petals.map((style, index) => (
        <span key={index} className={`sakura sakura--tone-${index % 3}`} style={style} />
      ))}
    </div>
  );
}