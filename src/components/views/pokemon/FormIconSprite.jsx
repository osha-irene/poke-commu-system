import React, { useMemo, useState } from 'react';
import { getPokemonLocalIconUrl } from '../../../utils/pokemonIconUtils';

export default function FormIconSprite({
  form,
  size = 36,
  fallbackUrl = '',
  className = '',
}) {
  const localUrl = useMemo(() => getPokemonLocalIconUrl(form), [form]);
  const [useFallback, setUseFallback] = useState(false);
  const label = form?.name || form?.nameEn || '';

  if (!localUrl || useFallback) {
    return (
      <img
        src={fallbackUrl}
        alt={label}
        className={className}
        style={{ width: size, height: size, objectFit: 'contain', imageRendering: 'pixelated' }}
      />
    );
  }

  return (
    <span
      className={`pokemon-bg-sprite shrink-0 ${className}`}
      aria-label={label}
      role="img"
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        overflow: 'hidden',
      }}
    >
      <img
        src={localUrl}
        alt=""
        aria-hidden="true"
        onError={() => setUseFallback(true)}
        style={{
          display: 'block',
          width: size * 2,
          height: size,
          maxWidth: 'none',
          objectFit: 'fill',
          imageRendering: 'pixelated',
        }}
      />
    </span>
  );
}
