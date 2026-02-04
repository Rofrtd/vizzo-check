import sharp from 'sharp';

const SUPPORTED_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const MAX_DIMENSION = parseInt(process.env.IMAGE_MAX_DIMENSION || '1920', 10);
const JPEG_QUALITY = parseInt(process.env.IMAGE_JPEG_QUALITY || '85', 10);
const WEBP_QUALITY = parseInt(process.env.IMAGE_WEBP_QUALITY || '85', 10);
const PNG_COMPRESSION = parseInt(process.env.IMAGE_PNG_COMPRESSION || '6', 10);

/**
 * Resize (if needed) and re-encode image for lighter storage.
 * Does not use withMetadata() so EXIF and other metadata are stripped.
 * On unsupported mimetype or Sharp error, returns original buffer and mimetype.
 */
export async function processImage(
  buffer: Buffer,
  mimetype: string
): Promise<{ buffer: Buffer; mimetype: string }> {
  if (!SUPPORTED_MIMES.includes(mimetype)) {
    return { buffer, mimetype };
  }

  try {
    let pipeline = sharp(buffer);
    const metadata = await pipeline.metadata();
    const w = metadata.width ?? 0;
    const h = metadata.height ?? 0;
    const needsResize = w > MAX_DIMENSION || h > MAX_DIMENSION;

    if (needsResize) {
      pipeline = pipeline.resize(MAX_DIMENSION, MAX_DIMENSION, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    if (mimetype === 'image/jpeg' || mimetype === 'image/jpg') {
      const out = await pipeline
        .jpeg({ quality: JPEG_QUALITY })
        .toBuffer();
      return { buffer: out, mimetype };
    }
    if (mimetype === 'image/webp') {
      const out = await pipeline.webp({ quality: WEBP_QUALITY }).toBuffer();
      return { buffer: out, mimetype };
    }
    if (mimetype === 'image/png') {
      const out = await pipeline
        .png({ compressionLevel: Math.min(9, Math.max(0, PNG_COMPRESSION)) })
        .toBuffer();
      return { buffer: out, mimetype };
    }

    return { buffer, mimetype };
  } catch {
    return { buffer, mimetype };
  }
}
