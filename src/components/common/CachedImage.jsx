import React, { forwardRef, useEffect, useState } from 'react';
import { isImageDecoded, preloadDecodedImage } from '../../utils/imageCache';

const CachedImage = forwardRef(function CachedImage(
  { src, style, className = '', onLoad, onError, ...props },
  ref
) {
  const [ready, setReady] = useState(() => isImageDecoded(src));

  useEffect(() => {
    let active = true;
    setReady(isImageDecoded(src));
    preloadDecodedImage(src).then(image => {
      if (active && image) setReady(true);
    });
    return () => {
      active = false;
    };
  }, [src]);

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
