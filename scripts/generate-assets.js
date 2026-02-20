const sharp = require('sharp');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const BG_COLOR = '#0f172a';
const MINT = '#4CFCAD';
const CYAN = '#4CD0FC';

function forgeSvg(width, height, fontSize, text = 'FORGE') {
  const gradientId = 'forgeGrad';
  const textY = height / 2;

  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${MINT}" />
          <stop offset="100%" stop-color="${CYAN}" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="${BG_COLOR}" />
      <text
        x="50%" y="${textY}"
        font-family="Arial Black, Arial, Helvetica, sans-serif"
        font-weight="900"
        font-size="${fontSize}"
        fill="url(#${gradientId})"
        text-anchor="middle"
        dominant-baseline="central"
        letter-spacing="${Math.round(fontSize * 0.08)}"
      >${text}</text>
    </svg>
  `);
}

function iconSvg(size) {
  // Full icon: FORGE text with slight vertical offset upward for visual centering
  const fontSize = Math.round(size * 0.22);
  return forgeSvg(size, size, fontSize);
}

function adaptiveIconSvg(size) {
  // Adaptive icon needs extra padding (safe zone is ~66% of total)
  const fontSize = Math.round(size * 0.16);
  return forgeSvg(size, size, fontSize);
}

function splashIconSvg(size) {
  // Splash icon: prominent FORGE text
  const fontSize = Math.round(size * 0.25);
  return forgeSvg(size, size, fontSize);
}

function faviconSvg(size) {
  // Favicon: just "F" monogram
  const fontSize = Math.round(size * 0.6);
  return forgeSvg(size, size, fontSize, 'F');
}

async function generate() {
  const assets = [
    {
      name: 'icon.png',
      svg: iconSvg(1024),
      size: 1024,
    },
    {
      name: 'adaptive-icon.png',
      svg: adaptiveIconSvg(1024),
      size: 1024,
    },
    {
      name: 'splash-icon.png',
      svg: splashIconSvg(512),
      size: 512,
    },
    {
      name: 'favicon.png',
      svg: faviconSvg(64),
      size: 64,
    },
  ];

  for (const asset of assets) {
    const outPath = path.join(ASSETS_DIR, asset.name);
    await sharp(asset.svg)
      .resize(asset.size, asset.size)
      .png()
      .toFile(outPath);
    console.log(`Generated ${asset.name} (${asset.size}x${asset.size})`);
  }

  console.log('\nAll assets generated in assets/');
}

generate().catch((err) => {
  console.error('Asset generation failed:', err);
  process.exit(1);
});
