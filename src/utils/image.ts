/**
 * Client-side image compression utility using HTML Canvas.
 * This ensures uploaded base64 image strings remain small (e.g., under 15KB),
 * preventing Firestore 1MB document size limit errors.
 */
export function compressImage(
  base64Str: string,
  maxWidth: number = 200,
  maxHeight: number = 200,
  quality: number = 0.75
): Promise<string> {
  return new Promise((resolve) => {
    // If the string is empty or not a base64 image, skip
    if (!base64Str || !base64Str.startsWith('data:image/')) {
      resolve(base64Str);
      return;
    }

    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions while preserving aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        // Compress as image/jpeg (which supports quality scaling) or image/png
        // (will fall back to png if jpeg is not preferred, but jpeg provides the best compression ratio)
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        
        // If for some reason jpeg compression produces a larger string or fails, fallback to original
        if (compressedBase64.length < base64Str.length) {
          resolve(compressedBase64);
        } else {
          resolve(base64Str);
        }
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
}
