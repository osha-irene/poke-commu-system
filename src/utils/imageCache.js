const imagePromiseCache = new Map();
const decodedImageUrls = new Set();

export const isImageDecoded = (url) => decodedImageUrls.has(url);

export const preloadDecodedImage = (url) => {
  if (!url) return Promise.resolve(null);
  if (imagePromiseCache.has(url)) return imagePromiseCache.get(url);

  const promise = new Promise(resolve => {
    const image = new Image();
    image.onload = async () => {
      try {
        await image.decode?.();
      } catch {
        // A loaded image can still be displayed when decode() is unsupported.
      }
      decodedImageUrls.add(url);
      resolve(image);
    };
    image.onerror = () => {
      imagePromiseCache.delete(url);
      resolve(null);
    };
    image.src = url;
  });

  imagePromiseCache.set(url, promise);
  return promise;
};

