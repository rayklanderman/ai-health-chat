import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createFavicon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Set background
  ctx.fillStyle = '#0284c7'; // Sky blue background
  ctx.fillRect(0, 0, size, size);

  // Add medical cross
  ctx.fillStyle = '#ffffff';
  
  // Vertical bar of cross
  const crossWidth = size * 0.2;
  const crossHeight = size * 0.6;
  const x = (size - crossWidth) / 2;
  const y = (size - crossHeight) / 2;
  
  ctx.fillRect(x, y, crossWidth, crossHeight);
  
  // Horizontal bar of cross
  const horizontalWidth = size * 0.6;
  const horizontalHeight = size * 0.2;
  const hx = (size - horizontalWidth) / 2;
  const hy = (size - horizontalHeight) / 2;
  
  ctx.fillRect(hx, hy, horizontalWidth, horizontalHeight);

  // Add a subtle glow effect
  ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
  ctx.shadowBlur = size * 0.1;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  return canvas.toBuffer('image/png');
}

const sizes = [16, 32, 192, 512];
const outputDir = path.join(__dirname, '../public');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate favicons for different sizes
sizes.forEach(size => {
  const buffer = createFavicon(size);
  
  if (size <= 32) {
    fs.writeFileSync(path.join(outputDir, `favicon-${size}x${size}.png`), buffer);
  } else if (size === 192) {
    fs.writeFileSync(path.join(outputDir, 'android-chrome-192x192.png'), buffer);
  } else if (size === 512) {
    fs.writeFileSync(path.join(outputDir, 'android-chrome-512x512.png'), buffer);
  }
});

// Create SVG favicon
const svgContent = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" fill="#0284c7"/>
  <rect x="14" y="8" width="4" height="16" fill="white"/>
  <rect x="8" y="14" width="16" height="4" fill="white"/>
  <rect x="0" y="0" width="32" height="32" fill="#0284c7" fill-opacity="0.1"/>
</svg>`;

fs.writeFileSync(path.join(outputDir, 'favicon.svg'), svgContent);

console.log('Generated favicons successfully!');
