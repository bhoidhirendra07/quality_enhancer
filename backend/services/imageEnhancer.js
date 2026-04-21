/**
 * Image Enhancer Service
 * Uses Sharp (Lanczos algorithm) for high-quality image enhancement.
 *
 * Enhancement pipeline:
 * 1. Upscale (1.5x / 2x / 3x depending on level)
 * 2. Sharpen
 * 3. Normalize brightness/contrast
 * 4. Denoise (median filter via modulate)
 * 5. Optional watermark
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Enhancement presets
const PRESETS = {
  low: {
    scaleFactor: 1.5,
    sharpenSigma: 0.5,
    sharpenFlat: 0.5,
    sharpenJagged: 0.5,
    medianSize: 0,         // no denoise for low
    brightness: 1.02,
    saturation: 1.05,
  },
  medium: {
    scaleFactor: 2,
    sharpenSigma: 0.8,
    sharpenFlat: 0.8,
    sharpenJagged: 1.5,
    medianSize: 3,
    brightness: 1.05,
    saturation: 1.1,
  },
  high: {
    scaleFactor: 3,
    sharpenSigma: 1.2,
    sharpenFlat: 1.2,
    sharpenJagged: 2.2,
    medianSize: 5,
    brightness: 1.08,
    saturation: 1.15,
  },
};

/**
 * Enhance an image file.
 * @param {string} inputPath  - Path to uploaded file
 * @param {string} outputPath - Path for enhanced output
 * @param {object} options    - { level: 'low'|'medium'|'high', addWatermark: bool }
 * @param {function} onProgress - Callback(percent, message)
 */
async function enhanceImage(inputPath, outputPath, options = {}, onProgress = () => {}) {
  const { level = 'medium', addWatermark = false } = options;
  const preset = PRESETS[level] || PRESETS.medium;

  onProgress(5, 'Reading image metadata...');

  // Get original dimensions
  const metadata = await sharp(inputPath).metadata();
  const { width, height, format } = metadata;

  onProgress(15, 'Upscaling image...');

  const newWidth = Math.round(width * preset.scaleFactor);
  const newHeight = Math.round(height * preset.scaleFactor);

  // Limit max output dimension to 8000px to stay safe on low-end machines
  const maxDim = 6000;
  const scale = Math.min(1, maxDim / Math.max(newWidth, newHeight));
  const finalWidth = Math.round(newWidth * scale);
  const finalHeight = Math.round(newHeight * scale);

  onProgress(30, 'Applying sharpening...');

  let pipeline = sharp(inputPath)
    // Step 1: Upscale with Lanczos (high quality)
    .resize(finalWidth, finalHeight, {
      kernel: sharp.kernel.lanczos3,
      fit: 'fill',
    });

  onProgress(45, 'Denoising...');

  // Step 2: Denoise via median filter (only for medium/high)
  if (preset.medianSize > 0) {
    pipeline = pipeline.median(preset.medianSize);
  }

  onProgress(60, 'Enhancing brightness & colors...');

  // Step 3: Normalize + color enhancement
  pipeline = pipeline
    .normalise()                          // auto levels
    .modulate({
      brightness: preset.brightness,
      saturation: preset.saturation,
    });

  onProgress(75, 'Final sharpening pass...');

  // Step 4: Sharpen
  pipeline = pipeline.sharpen({
    sigma: preset.sharpenSigma,
    flat: preset.sharpenFlat,
    jagged: preset.sharpenJagged,
  });

  // Step 5: Optional watermark (text overlay via composite)
  if (addWatermark) {
    onProgress(85, 'Adding watermark...');
    const wmFontSize = Math.max(11, Math.round(finalWidth * 0.014));
    const watermarkSvg = Buffer.from(`
      <svg width="${finalWidth}" height="${finalHeight}">
        <style>text { font-family: 'Arial', 'Helvetica', sans-serif; font-style: italic; letter-spacing: 0.5px; }</style>
        <text
          x="${finalWidth - 14}" y="${finalHeight - 12}"
          text-anchor="end"
          font-size="${wmFontSize}px"
          fill="rgba(255,255,255,0.28)"
          stroke="rgba(0,0,0,0.15)" stroke-width="2" paint-order="stroke"
        >&#x26A1; QuickEnhance</text>
      </svg>
    `);
    pipeline = pipeline.composite([{ input: watermarkSvg, blend: 'over' }]);
  }

  onProgress(90, 'Saving enhanced image...');

  // Determine output format
  const outputExt = path.extname(outputPath).toLowerCase();
  if (outputExt === '.png') {
    await pipeline.png({ quality: 100, compressionLevel: 6 }).toFile(outputPath);
  } else {
    await pipeline.jpeg({ quality: 95, mozjpeg: true }).toFile(outputPath);
  }

  onProgress(100, 'Image enhanced successfully!');
  return outputPath;
}

module.exports = { enhanceImage };
