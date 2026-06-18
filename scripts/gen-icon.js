const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const path = require('path');

const GOLD = '#D4A017';
const BG = '#0D0D0D';
const GLOW = '#1E1A0A';

// Lucide "Hand" icon path data (viewBox 0 0 24 24), stroke-based.
const HAND_PATHS = [
  'M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2',
  'M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2',
  'M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8',
  'M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15',
];

function hand(scale, mirror, rotateDeg, cx, cy, strokeWidth) {
  const sx = mirror ? -scale : scale;
  const paths = HAND_PATHS.map(
    d => `<path d="${d}" stroke="${GOLD}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
  ).join('');
  return `<g transform="translate(${cx},${cy}) rotate(${rotateDeg}) scale(${sx},${scale}) translate(-12,-12)">${paths}</g>`;
}

function buildSvg(size) {
  const S = size / 24 * 0.64; // hand glyph scale
  const strokeWidth = 1.3; // local units; the group's scale(S) scales this up too
  const cy = size * 0.56;
  const offsetX = size * 0.225;
  const left = hand(S, false, -9, size / 2 - offsetX, cy, strokeWidth);
  const right = hand(S, true, -9, size / 2 + offsetX, cy, strokeWidth);

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bgGlow" cx="50%" cy="42%" r="65%">
      <stop offset="0%" stop-color="${GLOW}"/>
      <stop offset="100%" stop-color="${BG}"/>
    </radialGradient>
  </defs>
  <rect x="0" y="0" width="${size}" height="${size}" fill="url(#bgGlow)"/>
  ${left}
  ${right}
</svg>`;
}

function render(size, outFile) {
  const svg = buildSvg(size);
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } });
  const png = resvg.render().asPng();
  fs.writeFileSync(outFile, png);
  console.log('wrote', outFile, size);
}

const outDir = path.join(__dirname, '..', 'assets', 'images');
render(1024, path.join(outDir, 'icon.png'));
render(256, path.join(outDir, 'favicon.png'));
render(1024, path.join(outDir, 'icon-preview.png'));
