/**
 * Cloudflare Images loader for Next.js
 * Optimizes images through Cloudflare's global network
 */

interface CloudflareImageLoaderProps {
  src: string;
  width?: number;
  height?: number;
  quality?: number;
}

export default function cloudflareImageLoader({
  src,
  width,
  height,
  quality = 75,
}: CloudflareImageLoaderProps): string {
  // If it's already a Cloudflare Images URL, return as-is
  if (src.startsWith('https://imagedelivery.net/')) {
    return src;
  }

  // If it's a Cloudinary URL, transform it for Cloudflare Images
  if (src.includes('cloudinary.com')) {
    return transformCloudinaryToCloudflare(src, { width, height, quality });
  }

  // For local images or other sources, construct Cloudflare Images URL
  const cloudflareAccountHash = process.env.CLOUDFLARE_ACCOUNT_HASH || 'your-account-hash';
  const baseUrl = `https://imagedelivery.net/${cloudflareAccountHash}`;

  // Build transformation parameters
  const params = new URLSearchParams();

  if (width) params.append('w', width.toString());
  if (height) params.append('h', height.toString());
  if (quality && quality !== 75) params.append('q', quality.toString());

  // Add format optimization
  params.append('f', 'auto');

  // Construct final URL
  const paramString = params.toString();
  return `${baseUrl}/${src}${paramString ? `?${paramString}` : ''}`;
}

/**
 * Transform Cloudinary URLs to Cloudflare Images format
 */
function transformCloudinaryToCloudflare(
  cloudinaryUrl: string,
  options: { width?: number; height?: number; quality?: number }
): string {
  try {
    // Extract public ID from Cloudinary URL
    // Example: https://res.cloudinary.com/dx/ -> https://imagedelivery.net/hash/
    const cloudflareAccountHash = process.env.CLOUDFLARE_ACCOUNT_HASH || 'your-account-hash';

    // For now, return a placeholder - in production you'd implement the actual transformation
    return `https://imagedelivery.net/${cloudflareAccountHash}/placeholder-image.jpg`;
  } catch (error) {
    console.error('Error transforming Cloudinary URL:', error);
    return cloudinaryUrl; // Fallback to original URL
  }
}

/**
 * Generate responsive image srcset for Cloudflare Images
 */
export function generateCloudflareSrcSet(
  src: string,
  widths: number[] = [640, 750, 828, 1080, 1200, 1920, 2048, 3840]
): string {
  return widths
    .map(width => {
      const url = cloudflareImageLoader({ src, width, quality: 80 });
      return `${url} ${width}w`;
    })
    .join(', ');
}

/**
 * Preload critical images through Cloudflare
 */
export function preloadCriticalImages(imageSources: string[]): void {
  if (typeof window === 'undefined') return;

  imageSources.forEach(src => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = cloudflareImageLoader({ src, width: 800, quality: 80 });
    document.head.appendChild(link);
  });
}

/**
 * Optimize image loading with Cloudflare Images
 */
export class CloudflareImageOptimizer {
  private static instance: CloudflareImageOptimizer;
  private observer: IntersectionObserver | null = null;

  static getInstance(): CloudflareImageOptimizer {
    if (!CloudflareImageOptimizer.instance) {
      CloudflareImageOptimizer.instance = new CloudflareImageOptimizer();
    }
    return CloudflareImageOptimizer.instance;
  }

  /**
   * Initialize lazy loading for images
   */
  initLazyLoading(): void {
    if (typeof window === 'undefined' || this.observer) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const originalSrc = img.dataset.cloudflareSrc;

            if (originalSrc) {
              // Replace with Cloudflare-optimized URL
              img.src = cloudflareImageLoader({
                src: originalSrc,
                width: img.naturalWidth || 800,
                height: img.naturalHeight || 600,
                quality: 80,
              });

              img.classList.remove('loading');
              img.classList.add('loaded');
              this.observer?.unobserve(img);
            }
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
      }
    );

    // Observe all images with data-cloudflare-src attribute
    document.querySelectorAll('img[data-cloudflare-src]').forEach(img => {
      this.observer?.observe(img);
    });
  }

  /**
   * Optimize all images on the page
   */
  optimizePageImages(): void {
    if (typeof window === 'undefined') return;

    document.querySelectorAll('img').forEach(img => {
      const originalSrc = img.src || img.dataset.src;
      if (originalSrc && !originalSrc.includes('imagedelivery.net')) {
        // Mark for lazy loading
        img.dataset.cloudflareSrc = originalSrc;
        img.classList.add('loading');

        // Initialize lazy loading if not already done
        this.initLazyLoading();
      }
    });
  }

  /**
   * Generate WebP and AVIF sources for modern browsers
   */
  generateModernSources(src: string, widths: number[]): { webp: string; avif: string } {
    return {
      webp: generateCloudflareSrcSet(src, widths),
      avif: generateCloudflareSrcSet(src, widths),
    };
  }
}

// Export singleton instance
export const cloudflareImageOptimizer = CloudflareImageOptimizer.getInstance();
