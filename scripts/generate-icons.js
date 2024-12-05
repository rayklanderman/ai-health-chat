import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sizes = [
  { width: 16, height: 16, name: 'favicon-16x16.png' },
  { width: 32, height: 32, name: 'favicon-32x32.png' },
  { width: 192, height: 192, name: 'android-chrome-192x192.png' },
  { width: 512, height: 512, name: 'android-chrome-512x512.png' }
];

async function generateIcons() {
  const inputFile = join(__dirname, '../public/logo.svg');
  
  for (const size of sizes) {
    const outputFile = join(__dirname, '../public', size.name);
    
    await sharp(inputFile)
      .resize(size.width, size.height)
      .png()
      .toFile(outputFile);
      
    console.log(`Generated ${size.name}`);
  }
}

generateIcons().catch(console.error);
