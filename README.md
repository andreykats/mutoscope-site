# mutoscope.app

The website of Mutoscope, an Apple TV app: a landing page (the turning reel, the name and
"Beta coming soon") and the privacy policy and support pages App Store Connect links to. Plain
static HTML, CSS and JavaScript; no framework, nothing loaded from other sites.

- `index.html` — the landing page.
- `privacy/index.html` — the privacy policy, **generated**: the app's own copy
  (plex-client-tvos `Mutoscope/Legal/PrivacyPolicy.md`) is the one source. After changing it there,
  run `node tools/render-privacy.js` (or pass the Markdown file's path) and commit the result.
  It stops on Markdown it doesn't handle rather than publishing it garbled.
- `support/index.html` — how to reach the developer (support@mutoscope.app), written by hand.
  Its LGPL source-code offer follows the app's Acknowledgements; keep the two in step.
- `assets/reel.js` — the reel, drawn into any `<svg data-mutoscope-reel>` and turned. A port of the
  app's `MutoscopeReel` (plex-client-tvos: `Mutoscope/Features/Components/MutoscopeLoadingView.swift`,
  from `docs/branding/mutoscope-icons/make_icons.py`); keep its numbers in step with those. Reduced
  motion holds it on the app icon's frame.
- `assets/site.css` — the icon's graphite and ivory.
- `assets/reel-still.svg`, `favicon.svg`, `apple-touch-icon.png` — the icon's still frame,
  generated from `assets/reel.js`: `node tools/render-stills.js` (needs `rsvg-convert`).

## Preview

Open `index.html` in a browser, or serve the folder: `python3 -m http.server 8791`.

## Hosting

GitHub Pages from the `main` branch root, custom domain in `CNAME` (`mutoscope.app`);
`.nojekyll` serves the files as they are. Not set up yet: the repository, Pages and the domain's
DNS are still to do.
