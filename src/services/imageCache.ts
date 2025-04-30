interface CacheEntry {
  data: string;
  timestamp: number;
}

interface CacheData {
  entries: { [key: string]: CacheEntry };
  timestamp: number;
}

class ImageCacheService {
  private cache: Map<string, CacheEntry>;
  private readonly STORAGE_KEY = 'pokemon-sprite-cache';
  private readonly MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  private readonly MAX_CACHE_SIZE = 100; // Maximum number of images to store
  private readonly MAX_STORAGE_SIZE = 4.5 * 1024 * 1024; // 4.5MB limit for localStorage

  constructor() {
    this.cache = new Map();
    this.loadCacheFromStorage();
  }

  private async compressImage(base64: string): Promise<string> {
    // If the image is already small, return as is
    if (base64.length < 50000) { // 50KB
      return base64;
    }
    
    return new Promise<string>((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Create a temporary canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve(base64); // Fallback to original if canvas context unavailable
          return;
        }

        // Calculate new dimensions (maintain aspect ratio)
        let width = img.width;
        let height = img.height;
        
        // Only resize if the image is larger than 96x96
        // Most Pokemon sprites are 96x96 or smaller
        if (width > 96 || height > 96) {
          const ratio = Math.min(96 / width, 96 / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // Set canvas size
        canvas.width = width;
        canvas.height = height;

        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Clear canvas and ensure transparency
        ctx.clearRect(0, 0, width, height);

        // Draw image
        ctx.drawImage(img, 0, 0, width, height);

        // Get compressed PNG with transparency
        resolve(canvas.toDataURL('image/png', 0.9));
      };

      img.onerror = () => {
        console.warn('[ImageCache] Failed to load image for compression, using original');
        resolve(base64);
      };

      img.src = base64;
    });
  }

  private calculateStorageSize(): number {
    let total = 0;
    for (const [key, value] of this.cache) {
      total += key.length + value.data.length;
    }
    return total;
  }

  private removeOldestEntries(requiredSpace: number = 0) {
    // Convert cache entries to array and sort by timestamp
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest entries until we have enough space or reach MAX_CACHE_SIZE
    while (
      entries.length > 0 && 
      (this.calculateStorageSize() > this.MAX_STORAGE_SIZE - requiredSpace ||
       this.cache.size > this.MAX_CACHE_SIZE)
    ) {
      const [key] = entries.shift()!;
      this.cache.delete(key);
      console.info(`[ImageCache] Removed old entry: ${key}`);
    }
  }

  private loadCacheFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const { entries, timestamp }: CacheData = JSON.parse(stored);
        
        // Check if cache is older than MAX_CACHE_AGE
        if (Date.now() - timestamp < this.MAX_CACHE_AGE) {
          this.cache = new Map(
            Object.entries(entries).map(([key, value]) => [key, value as CacheEntry])
          );
          console.info(`[ImageCache] Loaded ${this.cache.size} images from cache (${this.calculateStorageSize() / 1024}KB used)`);
        } else {
          // Clear expired cache
          localStorage.removeItem(this.STORAGE_KEY);
          this.cache.clear();
          console.info('[ImageCache] Cache expired, cleared storage');
        }
      }
    } catch (error) {
      console.error('[ImageCache] Error loading image cache:', error);
      // If there's an error loading, clear the cache to prevent future issues
      localStorage.removeItem(this.STORAGE_KEY);
      this.cache.clear();
    }
  }

  private async saveCacheToStorage() {
    try {
      // First ensure we're within storage limits
      this.removeOldestEntries();
      
      const cacheObj: CacheData = {
        entries: Object.fromEntries(this.cache.entries()),
        timestamp: Date.now()
      };

      const serialized = JSON.stringify(cacheObj);
      
      // Check if the serialized data is too large
      if (serialized.length > this.MAX_STORAGE_SIZE) {
        // Remove more entries until it fits
        while (serialized.length > this.MAX_STORAGE_SIZE && this.cache.size > 0) {
          this.removeOldestEntries(serialized.length - this.MAX_STORAGE_SIZE);
        }
      }

      localStorage.setItem(this.STORAGE_KEY, serialized);
      console.info(`[ImageCache] Saved ${this.cache.size} images to storage (${this.calculateStorageSize() / 1024}KB used)`);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('[ImageCache] Storage quota exceeded, removing oldest entries');
        // Remove half of the cached entries
        const entriesToRemove = Math.ceil(this.cache.size / 2);
        this.removeOldestEntries(entriesToRemove);
        // Try saving again
        this.saveCacheToStorage();
      } else {
        console.error('[ImageCache] Error saving image cache:', error);
      }
    }
  }

  async getImage(url: string): Promise<string> {
    // Check memory cache first
    if (this.cache.has(url)) {
      const entry = this.cache.get(url)!;
      // Update timestamp to mark as recently used
      entry.timestamp = Date.now();
      console.info(`[ImageCache] Cache hit: ${url}`);
      return entry.data;
    }

    try {
      console.info(`[ImageCache] Cache miss, fetching: ${url}`);
      // Fetch and convert image to base64
      const response = await fetch(url);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      // Compress the image while preserving transparency
      const compressedData = await this.compressImage(base64);

      // Store in cache with timestamp
      const entry: CacheEntry = {
        data: compressedData,
        timestamp: Date.now()
      };
      
      this.cache.set(url, entry);
      await this.saveCacheToStorage();
      
      const originalSize = base64.length;
      const compressedSize = compressedData.length;
      const savings = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
      
      console.info(`[ImageCache] Successfully cached: ${url} (${savings}% smaller)`);

      return compressedData;
    } catch (error) {
      console.error('[ImageCache] Error caching image:', error);
      return url; // Fallback to original URL if caching fails
    }
  }

  clearImageCache(url: string) {
    if (this.cache.has(url)) {
      this.cache.delete(url);
      this.saveCacheToStorage();
      console.info(`[ImageCache] Cleared cache for: ${url}`);
    }
  }

  clearCache() {
    const size = this.cache.size;
    this.cache.clear();
    localStorage.removeItem(this.STORAGE_KEY);
    console.info(`[ImageCache] Cleared ${size} images from cache`);
  }
}

export const imageCache = new ImageCacheService();