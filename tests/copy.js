#!/usr/bin/env node
/* Copy check: the product must not show betting, odds or win-probability language,
 * and the xG disclaimer must stay wherever xG is shown or exported.
 * Run: node tests/copy.js
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const sources = ['index.html', 'analysis.html', 'js/app.js', 'js/agents.js', 'js/charts.js', 'js/pitch3d.js'];

// Terms that turn an estimate into advice. Disclaimers may name "betting" or "odds" only in negation.
const banned = [/\btips?\b/i, /\bwin(ning)? probability\b/i, /\bchance of (winning|scoring a goal)\b/i,
  /\bvalue bets?\b/i, /\baccumulators?\b/i, /\bstakes?\b/i, /\bodds (of|on)\b/i];

for (const f of sources) {
  const text = read(f);
  for (const re of banned) {
    assert.ok(!re.test(text), `${f}: banned phrase ${re}`);
  }
}

// Every surface that shows or exports xG carries the model-estimate disclaimer.
assert.match(read('analysis.html'), /model estimate[^<]*not a betting or odds signal/i, 'glossary disclaimer');
assert.match(read('js/app.js'), /xG is a model estimate, not a betting or odds signal/, 'export disclaimer');

console.log('OK: no betting, odds or win-probability copy; xG disclaimers present.');
