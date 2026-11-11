const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const growthCss = fs.readFileSync(path.join(root, 'asset/character-growth.css'), 'utf8');
const viewport = html.match(/<meta\s+name="viewport"[^>]*>/i)?.[0] || '';
const inputBinding = html.match(/function bindInput\(\) \{([\s\S]*?)\/\/ Autoplay Policy/)?.[1] || '';

assert.match(viewport, /width=device-width/i, 'mobile viewport stays device-width');
assert.doesNotMatch(viewport, /user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?:\.0*)?(?:[,;"\s]|$)/i,
    'page-level zoom remains available for accessibility');
assert.match(html, /#app-frame\s*\{[^}]*touch-action\s*:\s*pan-x\s+pan-y/i,
    'game frame blocks zoom while preserving horizontal and vertical panning');
assert.match(inputBinding, /for \(const type of \["gesturestart", "gesturechange"\]\)/,
    'Safari gesture handlers are limited to the game frame');
assert.match(inputBinding, /addEventListener\(type,[\s\S]*?\{ passive: false \}\)/,
    'Safari gesture handlers can cancel native pinch zoom');
assert.match(growthCss, /\.growth-act\s*\{[^}]*touch-action\s*:\s*pan-x\s+pan-y/i,
    'long-press growth controls preserve panning without enabling pinch zoom');

console.log('PASS mobile-touch-zoom.test.cjs');
