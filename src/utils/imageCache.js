const CACHE_NAME = 'poke-img-v1';

// 세션 내 메모리 캐시 (objectURL 재사용)
const memCache = new Map();

const openCache = () => caches.open(CACHE_NAME);

// raw.githubusercontent.com은 동시 요청이 조금만 몰려도 429(rate limit)를 내뱉는다.
// DB에 예전 raw.githubusercontent.com URL이 이미 저장돼 있는 경우까지 대비해
// 실제 요청 직전에 항상 jsdelivr 미러로 바꿔서 fetch한다.
const RAW_GITHUB_SPRITE_PREFIX = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/';
const JSDELIVR_SPRITE_PREFIX = 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/';
export const toReliableSpriteUrl = (url) =>
  typeof url === 'string' && url.startsWith(RAW_GITHUB_SPRITE_PREFIX)
    ? JSDELIVR_SPRITE_PREFIX + url.slice(RAW_GITHUB_SPRITE_PREFIX.length)
    : url;

export const preloadImage = async (url) => {
  if (!url) return url;

  // 1) 이미 이번 세션에 object URL 만들어놨으면 즉시 반환
  const mem = memCache.get(url);
  if (mem?.objectUrl) return mem.objectUrl;
  // 진행 중인 Promise가 있으면 중복 요청 방지
  if (mem?.promise) return mem.promise;

  const fetchUrl = toReliableSpriteUrl(url);

  const promise = (async () => {
    try {
      // 2) Cache API에서 먼저 찾기
      const cache = await openCache();
      let response = await cache.match(fetchUrl);

      if (!response) {
        // 3) 네트워크에서 가져와서 Cache API에 저장
        const fetched = await fetch(fetchUrl);
        if (!fetched.ok) throw new Error('fetch failed');
        await cache.put(fetchUrl, fetched.clone());
        response = fetched;
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      memCache.set(url, { objectUrl, promise: null });
      return objectUrl;
    } catch {
      memCache.delete(url);
      return fetchUrl;
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
