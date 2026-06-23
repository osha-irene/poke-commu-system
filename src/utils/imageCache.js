// url → { objectUrl: string | null, promise: Promise }
const cache = new Map();

export const getCachedSrc = (url) => {
  if (!url) return url;
  return cache.get(url)?.objectUrl ?? url;
};

export const isImageCached = (url) => !!(url && cache.get(url)?.objectUrl);

export const preloadImage = (url) => {
  if (!url) return Promise.resolve(url);

  const existing = cache.get(url);
  if (existing) return existing.promise;

  const promise = fetch(url)
    .then(res => {
      if (!res.ok) throw new Error('fetch failed');
      return res.blob();
    })
    .then(blob => {
      const objectUrl = URL.createObjectURL(blob);
      cache.get(url).objectUrl = objectUrl;
      return objectUrl;
    })
    .catch(() => {
      cache.delete(url);
      return url;
    });

  cache.set(url, { objectUrl: null, promise });
  return promise;
};

// 하위 호환
export const isImageDecoded = isImageCached;
export const preloadDecodedImage = preloadImage;
