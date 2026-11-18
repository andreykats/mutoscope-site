#!/usr/bin/env node
// Writes the reel's still frame (the app icon's instant) into the site's static images, from the
// same code that animates it in the page (assets/reel.js):
//   assets/reel-still.svg   the reel alone, shown when scripts are off
//   favicon.svg             the reel on the icon's graphite ground, rounded
//   apple-touch-icon.png    180×180, square (iOS rounds it), via rsvg-convert
// Run from anywhere: node tools/render-stills.js
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const site = path.resolve(__dirname, '..');
const reel = require(path.join(site, 'assets', 'reel.js'));
const { EXTENT, PALETTE } = reel;
const body = reel.stillMarkup();

function write(relative, text) {
  fs.writeFileSync(path.join(site, relative), text);
  console.log('wrote', relative);
}

// The reel on the icon's ground: the same radial gradient, centre to edge.
function tile(pad, radius) {
  const half = EXTENT + pad;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-half} ${-half} ${2 * half} ${2 * half}">` +
    `<defs><radialGradient id="g" cx="0" cy="0" r="${half * 1.3}" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="${PALETTE.bg0}"/><stop offset="1" stop-color="${PALETTE.bg1}"/></radialGradient></defs>` +
    `<rect x="${-half}" y="${-half}" width="${2 * half}" height="${2 * half}" rx="${radius}" fill="url(#g)"/>` +
    body + '</svg>\n';
}

write('assets/reel-still.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-EXTENT} ${-EXTENT} ${2 * EXTENT} ${2 * EXTENT}">${body}</svg>\n`);
write('favicon.svg', tile(20, 84));

const touchSVG = tile(80, 0);
try {
  const png = execFileSync('rsvg-convert', ['--width', '180', '--height', '180', '--format', 'png'], { input: touchSVG });
  fs.writeFileSync(path.join(site, 'apple-touch-icon.png'), png);
  console.log('wrote apple-touch-icon.png');
} catch (error) {
  console.error(`apple-touch-icon.png not written: rsvg-convert failed (${error.code || error.message}). ` +
    'Install it with `brew install librsvg`.');
  process.exitCode = 1;
}
