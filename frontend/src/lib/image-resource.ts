// 这里缓存的是“这个 URL 对应的图片资源是否已经被浏览器成功加载过”。
// 保守估计浏览器内存缓存的活跃窗口（当前页 + 上一页缩略图 + 近期详情原图）。
const MAX_CACHE_SIZE = 50;
const loadedImageUrls = new Map<string, true>();

const touchCache = (url: string) => {
  loadedImageUrls.delete(url);
  loadedImageUrls.set(url, true);

  if (loadedImageUrls.size > MAX_CACHE_SIZE) {
    const oldest = loadedImageUrls.keys().next().value;
    if (oldest !== undefined) {
      loadedImageUrls.delete(oldest);
    }
  }
};

export const isImageResourceCached = (url?: string | null) => {
  if (!url || !loadedImageUrls.has(url)) {
    return false;
  }
  touchCache(url);
  return true;
};

export const markImageResourceCached = (url?: string | null) => {
  if (url) {
    touchCache(url);
  }
};

export const evictImageResourceCache = (url?: string | null) => {
  if (url) {
    loadedImageUrls.delete(url);
  }
};

export const preloadImageResource = (url?: string | null, signal?: AbortSignal) => {
  if (!url || typeof window === "undefined") {
    return Promise.resolve(false);
  }

  if (signal?.aborted) {
    return Promise.resolve(false);
  }

  // 已经成功加载过的图片直接复用，不再重复创建 Image 对象。
  if (loadedImageUrls.has(url)) {
    touchCache(url);
    return Promise.resolve(true);
  }

  return new Promise<boolean>((resolve) => {
    const image = new window.Image();
    image.decoding = "async";
    image.onload = () => {
      touchCache(url);
      resolve(true);
    };
    image.onerror = () => {
      resolve(false);
    };

    if (signal) {
      signal.addEventListener("abort", () => {
        image.src = "";
        resolve(false);
      }, { once: true });
    }

    image.src = url;

    if (image.complete && image.naturalWidth > 0) {
      touchCache(url);
      resolve(true);
    }
  });
};