import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createFavicon(size, text) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#3B82F6'; // Blue background
  ctx.fillRect(0, 0, size, size);

  // Text
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${size * 0.4}px Arial`;
  
  // Split text into two lines
  const lines = text.split(' ');
  const lineHeight = size * 0.3;
  
  lines.forEach((line, i) => {
    ctx.fillText(line, size/2, size/2 + (i - 0.5) * lineHeight);
  });

  return canvas.toBuffer('image/png');
}

const sizes = [16, 32, 192, 512];
const outputDir = path.join(__dirname, '../public');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate favicons
sizes.forEach(size => {
  const buffer = createFavicon(size, 'AI Health');
  
  if (size <= 32) {
    fs.writeFileSync(path.join(outputDir, `favicon-${size}x${size}.png`), buffer);
  } else if (size === 192) {
    fs.writeFileSync(path.join(outputDir, 'android-chrome-192x192.png'), buffer);
  } else if (size === 512) {
    fs.writeFileSync(path.join(outputDir, 'android-chrome-512x512.png'), buffer);
  }
});
