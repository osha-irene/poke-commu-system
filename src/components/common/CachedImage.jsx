import React, { forwardRef, useEffect, useState } from 'react';
import { getCachedSrc, isImageCached, preloadImage, toReliableSpriteUrl } from '../../utils/imageCache';

const CachedImage = forwardRef(function CachedImage(
  { src: rawSrc, style, className = '', onLoad, onError, ...props },
  ref
) {
  // DB에 예전 raw.githubusercontent.com URL이 남아있어도 여기서 한 번에 걸러서
  // 항상 rate-limit 없는 jsdelivr 미러로 로드한다.
  const originalSrc = toReliableSpriteUrl(rawSrc);
  const [src, setSrc] = useState(() => getCachedSrc(originalSrc));
  const [ready, setReady] = useState(() => isImageCached(originalSrc));

  useEffect(() => {
    if (!originalSrc) return;
    let active = true;

    const cached = getCachedSrc(originalSrc);
    if (cached !== originalSrc) {
      setSrc(cached);
      setReady(true);
      return;
    }

    setSrc(originalSrc);
    setReady(false);

    preloadImage(originalSrc).then(resolvedSrc => {
      if (!active) return;
      setSrc(resolvedSrc);
      setReady(true);
    });

    return () => { active = false; };
  }, [originalSrc]);

  return (
    <img
      {...props}
      ref={ref}
      src={src}
      className={className}
      onLoad={event => {
        setReady(true);
        onLoad?.(event);
      }}
      onError={onError}
      style={{
        ...style,
        opacity: ready ? (style?.opacity ?? 1) : 0,
        transition: style?.transition
          ? `${style.transition}, opacity 0.18s ease`
          : 'opacity 0.18s ease',
      }}
    />
  );
});

export default CachedImage;
