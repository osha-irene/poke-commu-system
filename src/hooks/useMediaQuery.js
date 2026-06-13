// src/hooks/useMediaQuery.js
import { useState, useEffect } from 'react';

export default function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const media = window.matchMedia(query);
    const listener = () => setMatches(media.matches);
    media.addListener(listener);
    return () => media.removeListener(listener);
  }, [query]);

  return matches;
}

// 사용 예시:
// const isMobile = useMediaQuery('(max-width: 768px)');