const CACHE_NAME = 'poke-img-v1';

// 세션 내 메모리 캐시 (objectURL 재사용)
const memCache = new Map();

const openCache = () => caches.open(CACHE_NAME);

export const preloadImage = async (url) => {
  if (!url) return url;

  // 1) 이미 이번 세션에 object URL 만들어놨으면 즉시 반환
  const mem = memCache.get(url);
  if (mem?.objectUrl) return mem.objectUrl;
  // 진행 중인 Promise가 있으면 중복 요청 방지
  if (mem?.promise) return mem.promise;

  const promise = (async () => {
    try {
      // 2) Cache API에서 먼저 찾기
      const cache = await openCache();
      let response = await cache.match(url);

      if (!response) {
        // 3) 네트워크에서 가져와서 Cache API에 저장
        const fetched = await fetch(url);
        if (!fetched.ok) throw new Error('fetch failed');
        await cache.put(url, fetched.clone());
        response = fetched;
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      memCache.set(url, { objectUrl, promise: null });
      return objectUrl;
    } catch {
      memCache.delete(url);
      return url;
    }
  })();

  memCache.set(url, { objectUrl: null, promise });
  return promise;
};

export const getCachedSrc = (url) => {
  if (!url) return url;
  return memCache.get(url)?.objectUrl ?? url;
};

export const isImageCached = (url) => !!(url && memCache.get(url)?.objectUrl);

// 하위 호환
export const isImageDecoded = isImageCached;
export const preloadDecodedImage = preloadImage;
