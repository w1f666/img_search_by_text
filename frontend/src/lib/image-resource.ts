// 这里缓存的是“这个 URL 对应的图片资源是否已经被浏览器成功加载过”。
const loadedImageUrls = new Set<string>();

export const isImageResourceCached = (url?: string | null) => {
  return Boolean(url && loadedImageUrls.has(url));
};

export const markImageResourceCached = (url?: string | null) => {
  if (url) {
    loadedImageUrls.add(url);
  }
};

export const preloadImageResource = (url?: string | null) => {
  if (!url || typeof window === "undefined") {
    return Promise.resolve(false);
  }

  // 已经成功加载过的图片直接复用，不再重复创建 Image 对象。
  if (loadedImageUrls.has(url)) {
    return Promise.resolve(true);
  }

  return new Promise<boolean>((resolve) => {
    const image = new window.Image();
    image.decoding = "async";
    image.onload = () => {
      loadedImageUrls.add(url);
      resolve(true);
    };
    image.onerror = () => {
      resolve(false);
    };
    image.src = url;

    if (image.complete && image.naturalWidth > 0) {
      loadedImageUrls.add(url);
      resolve(true);
    }
  });
};