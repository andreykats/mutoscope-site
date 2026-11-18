// The Mutoscope reel, turning: the app icon's animation and its loading indicator.
//
// A port of the reel in the app repo (plex-client-tvos):
// Mutoscope/Features/Components/MutoscopeLoadingView.swift, itself a port of `spin_html`'s
// `frame()` in docs/branding/mutoscope-icons/make_icons.py, with the chosen icon's parameters
// (the Reel from round 4) and the graphite palette. Keep the numbers in step with those.
//
// The reel turns clockwise. Each card comes up the left; at 12 o'clock its tip is caught and
// held while the hub sweeps on, so it bows back against the turn; then it slips off, snaps
// forward with an overshoot and settles into the bunch on the right. Angles are degrees
// clockwise from 12 o'clock; lengths are the icon's units around the hub's centre, y down.
//
// In a page: any <svg data-mutoscope-reel> is drawn into and turned. Reduced motion holds it on
// the still icon's frame. In Node (tools/render-stills.js): require() it for the still frame.
(function (root) {
  'use strict';

  const CARD_COUNT = 20;
  const STEP = 360 / CARD_COUNT;
  const STOP = 0;             // the stop, at 12 o'clock
  const PHASE = 0.95;         // how far past the stop, in card spacings, the held root sweeps
  const SPRING = 13;          // tip bend of the card that's just slipped off
  const SHIFT = 14;           // how far released cards turn on at the root
  const RELEASED = 6;         // how many cards the spring and shift fade out over
  const ROOT_WIDTH = 12, TIP_WIDTH = 30;
  const ROOT_RADIUS = 54, TIP_RADIUS = 164;
  const HELD_ROOT_RADIUS = 46;
  const OUTLINE_WIDTH = 8;
  const SEAM_WIDTH = 3;
  const EXTENT = 172;         // everything is drawn within this radius
  const CARDS_PER_SECOND = 2;

  const RELEASE = STOP + PHASE * STEP;
  const CATCH = STOP - 1;
  const HELD_SPAN = (RELEASE - CATCH) / STEP;
  const SNAP = 0.25;
  const ICON_THETA = RELEASE - 1e-3;   // the still icon's instant

  // Graphite (REEL_PALETTES["graphite"]): ivory cards and hub; bolts, pin, rim and the held
  // card's seam take the icon's background tones.
  const PALETTE = {
    bg0: '#3A3B40', bg1: '#111214',
    light: '#EDE6D8', dark: '#9A9386', hub: '#E6DECF',
    seam: '#212226',   // lerp_hex(bg1, bg0, 0.4)
  };

  const mod = (a, m) => ((a % m) + m) % m;
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOutBack = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2; };
  const easeOut = x => 1 - (1 - x) ** 3;
  const point = (r, deg) => { const a = deg * Math.PI / 180; return [r * Math.sin(a), -r * Math.cos(a)]; };

  // Past 1 it carries on beyond `b`, each channel clamped, as lerp_hex does.
  function lerpHex(a, b, t) {
    const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16));
    const pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16));
    return '#' + pa.map((x, i) => Math.min(255, Math.max(0, Math.round(x + (pb[i] - x) * t)))
      .toString(16).padStart(2, '0')).join('');
  }

  const fade = p => (p < 1 ? 1 : Math.max(0, (RELEASED + 1 - p) / RELEASED));
  const TOP_TONE = (CARD_COUNT - 1) / (CARD_COUNT - 2);
  // Light just before the stop, darkest just after it, as in the still icon.
  function tone(p) {
    if (p < 0.3) return lerp(TOP_TONE, 0, p / 0.3);   // fading as it snaps away
    return Math.min(TOP_TONE, Math.max(0, (p - 1) / (CARD_COUNT - 2)));
  }

  function thetaAfter(seconds) {
    return mod(ICON_THETA + CARDS_PER_SECOND * STEP * seconds, 360);
  }

  // One frame: the cards under the hub (back to front) and the caught card over it.
  function frame(theta) {
    const n = CARD_COUNT;
    const past = Array.from({ length: n }, (_, k) => mod(theta + k * STEP - RELEASE, 360) / STEP);
    // The held card is the one nearest to slipping off. Just before it does, the next card's
    // tip has reached the stop too: pinned as well, but drawn as an ordinary card.
    let heldIndex = 0;
    for (let k = 1; k < n; k++) if (past[k] > past[heldIndex]) heldIndex = k;
    const heldBendAtRelease = CATCH - RELEASE;
    const pinnedRoot = p => RELEASE + (p - n) * STEP;   // normalized to just short of release

    const cards = [], snapping = [];
    let held = null;
    for (let k = 0; k < n; k++) {
      const angle = theta + k * STEP;
      const p = past[k];
      if (k === heldIndex) {
        held = { angle, rootRadius: HELD_ROOT_RADIUS, bend: CATCH - pinnedRoot(p), tone: TOP_TONE };
        continue;
      }
      const t = tone(p);
      if (p >= n - HELD_SPAN) {
        cards.push({ angle, rootRadius: ROOT_RADIUS, bend: Math.min(0, CATCH - pinnedRoot(p)), tone: t });
      } else if (p < SNAP) {
        const x = p / SNAP;
        snapping.push({
          angle: angle + SHIFT * fade(p) * easeOut(x), rootRadius: ROOT_RADIUS,
          bend: lerp(heldBendAtRelease, SPRING * fade(p), easeOutBack(x)), tone: t,
        });
      } else {
        cards.push({ angle: angle + SHIFT * fade(p), rootRadius: ROOT_RADIUS, bend: SPRING * fade(p), tone: t });
      }
    }
    return { theta, cards: cards.concat(snapping), held };
  }

  // A card's outline: a tapered plate whose centre line is a quadratic curve with its control
  // point on the radial line, so the root leaves straight and the bend grows towards the tip.
  function outline(card, steps = 20) {
    const p0 = point(card.rootRadius, card.angle);
    const c = point((card.rootRadius + TIP_RADIUS) / 2, card.angle);
    const p2 = point(TIP_RADIUS, card.angle + card.bend);
    const left = [], right = [];
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      const x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p2[0];
      const y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p2[1];
      const dx = 2 * (1 - t) * (c[0] - p0[0]) + 2 * t * (p2[0] - c[0]);
      const dy = 2 * (1 - t) * (c[1] - p0[1]) + 2 * t * (p2[1] - c[1]);
      const len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
      const half = (ROOT_WIDTH + (TIP_WIDTH - ROOT_WIDTH) * t) / 2;
      left.push([x + nx * half, y + ny * half]);
      right.push([x - nx * half, y - ny * half]);
    }
    return left.concat(right.reverse()).map(([x, y]) => x.toFixed(2) + ',' + y.toFixed(2)).join(' ');
  }

  const toneColor = t => lerpHex(PALETTE.dark, PALETTE.light, t);
  const boltPoints = theta => [45, 135, 225, 315].map(a => point(29, a + theta));

  // The still frame as SVG markup (no background), for the generated files.
  function stillMarkup() {
    const f = frame(ICON_THETA);
    const plate = (card, fill, width) =>
      `<polygon points="${outline(card)}" fill="${fill}" stroke="${fill}" stroke-width="${width}" stroke-linejoin="round"/>`;
    return f.cards.map(c => plate(c, toneColor(c.tone), OUTLINE_WIDTH)).join('') +
      `<circle r="50" fill="${PALETTE.hub}"/>` +
      `<circle r="50" fill="none" stroke="${PALETTE.bg1}" stroke-opacity="0.25" stroke-width="4"/>` +
      boltPoints(f.theta).map(([x, y]) => `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="6.5" fill="${PALETTE.bg1}"/>`).join('') +
      `<circle r="11" fill="${PALETTE.bg1}"/>` +
      plate(f.held, PALETTE.seam, OUTLINE_WIDTH + 2 * SEAM_WIDTH) +
      plate(f.held, toneColor(f.held.tone), OUTLINE_WIDTH);
  }

  // Draws the reel into an <svg> and turns it, building its elements once and moving them each
  // frame.
  function mount(svg) {
    const NS = 'http://www.w3.org/2000/svg';
    const el = (name, attrs, parent) => {
      const e = document.createElementNS(NS, name);
      for (const key in attrs) e.setAttribute(key, attrs[key]);
      parent.appendChild(e);
      return e;
    };
    svg.setAttribute('viewBox', `${-EXTENT} ${-EXTENT} ${2 * EXTENT} ${2 * EXTENT}`);
    svg.textContent = '';
    const plateAttrs = { 'stroke-width': OUTLINE_WIDTH, 'stroke-linejoin': 'round' };
    const cards = Array.from({ length: CARD_COUNT - 1 }, () => el('polygon', plateAttrs, svg));
    el('circle', { r: 50, fill: PALETTE.hub }, svg);
    el('circle', { r: 50, fill: 'none', stroke: PALETTE.bg1, 'stroke-opacity': 0.25, 'stroke-width': 4 }, svg);
    const bolts = [0, 1, 2, 3].map(() => el('circle', { r: 6.5, fill: PALETTE.bg1 }, svg));
    el('circle', { r: 11, fill: PALETTE.bg1 }, svg);
    const seam = el('polygon', { ...plateAttrs, 'stroke-width': OUTLINE_WIDTH + 2 * SEAM_WIDTH, fill: PALETTE.seam, stroke: PALETTE.seam }, svg);
    const held = el('polygon', plateAttrs, svg);

    function render(theta) {
      const f = frame(theta);
      f.cards.forEach((card, i) => {
        const fill = toneColor(card.tone);
        cards[i].setAttribute('points', outline(card));
        cards[i].setAttribute('fill', fill);
        cards[i].setAttribute('stroke', fill);
      });
      boltPoints(f.theta).forEach(([x, y], i) => {
        bolts[i].setAttribute('cx', x.toFixed(2));
        bolts[i].setAttribute('cy', y.toFixed(2));
      });
      const heldPoints = outline(f.held), heldFill = toneColor(f.held.tone);
      seam.setAttribute('points', heldPoints);
      held.setAttribute('points', heldPoints);
      held.setAttribute('fill', heldFill);
      held.setAttribute('stroke', heldFill);
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let start = null, request = 0;
    function tick(now) {
      if (start === null) start = now;
      render(thetaAfter((now - start) / 1000));
      request = requestAnimationFrame(tick);
    }
    // Each start begins on the icon's frame, its held card about to snap forward.
    function update() {
      cancelAnimationFrame(request);
      start = null;
      render(ICON_THETA);
      if (!reduceMotion.matches) request = requestAnimationFrame(tick);
    }
    reduceMotion.addEventListener('change', update);
    update();
  }

  const api = { EXTENT, PALETTE, ICON_THETA, frame, thetaAfter, outline, stillMarkup, mount };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MutoscopeReel = api;

  if (typeof document !== 'undefined') {
    const start = () => document.querySelectorAll('svg[data-mutoscope-reel]').forEach(mount);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
  }
})(typeof window !== 'undefined' ? window : globalThis);
