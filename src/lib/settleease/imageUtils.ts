/**
 * Image compression utilities for receipt scanning
 * Optimizes images before upload to reduce payload size and improve performance
 */

export interface CompressionResult {
  base64: string;
  mimeType: string;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
}

/**
 * Compresses an image file to reduce size while maintaining quality
 * @param file - The image file to compress
 * @param maxWidth - Maximum width in pixels (default: 1200)
 * @param maxHeight - Maximum height in pixels (default: 1600)
 * @param quality - JPEG quality 0-1 (default: 0.85)
 * @returns Promise with compressed image data
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1200,
  maxHeight: number = 1600,
  quality: number = 0.85
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        // Round to integers
        width = Math.round(width);
        height = Math.round(height);
        
        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to JPEG for better compression
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Could not compress image'));
              return;
            }
            
            const compressedReader = new FileReader();
            compressedReader.onload = (ce) => {
              const dataUrl = ce.target?.result as string;
              const base64 = dataUrl.split(',')[1];
              
              resolve({
                base64,
                mimeType: 'image/jpeg',
                originalSize: file.size,
                compressedSize: blob.size,
                width,
                height,
              });
            };
            compressedReader.onerror = () => reject(new Error('Could not read compressed image'));
            compressedReader.readAsDataURL(blob);
          },
          'image/jpeg',
          quality
        );
      };
      
      img.onerror = () => reject(new Error('Could not load image'));
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Generates a low-resolution thumbnail for instant preview
 * @param file - The image file
 * @returns Promise with thumbnail data URL
 */
export async function generateThumbnail(file: File): Promise<string> {
  const result = await compressImage(file, 400, 600, 0.6);
  return `data:${result.mimeType};base64,${result.base64}`;
}

/**
 * Formats file size in human-readable format
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Validates if a file is a supported image type
 * @param file - The file to validate
 * @returns true if supported, false otherwise
 */
export function isSupportedImageType(file: File): boolean {
  const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  return supportedTypes.includes(file.type);
}

/**
 * Checks if image compression is needed based on file size
 * @param fileSize - Size in bytes
 * @param threshold - Threshold in bytes (default: 1MB)
 * @returns true if compression recommended
 */
export function shouldCompressImage(fileSize: number, threshold: number = 1024 * 1024): boolean {
  return fileSize > threshold;
}
