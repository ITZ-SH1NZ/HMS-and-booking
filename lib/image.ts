/**
 * Dynamically updates Unsplash image URLs to request optimized dimensions and quality,
 * drastically reducing payload size and improving scroll/render performance.
 */
export function getOptimizedImageUrl(url: string | null | undefined, width: number = 600, quality: number = 80): string {
  if (!url) return "";
  
  if (url.includes("images.unsplash.com") || url.includes("plus.unsplash.com")) {
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.set("auto", "format");
      urlObj.searchParams.set("fit", "crop");
      urlObj.searchParams.set("w", width.toString());
      urlObj.searchParams.set("q", quality.toString());
      return urlObj.toString();
    } catch {
      // Fallback to manual string manipulation if URL parsing fails
      try {
        const base = url.split("?")[0];
        return `${base}?auto=format&fit=crop&w=${width}&q=${quality}`;
      } catch {
        return url;
      }
    }
  }
  
  return url;
}
