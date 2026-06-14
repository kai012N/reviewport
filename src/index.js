// Public programmatic API. Keeping this tiny + dependency-free is the point:
// adapters (Vite plugin, etc.) build on these primitives.

export { reviewportOverlay } from './overlay.js';
export { buildOverlayScript, injectHtml } from './inject.js';
export { createProxy } from './proxy.js';
export { createStaticServer } from './serve.js';
export { validateManifest, CATEGORIES_HINT } from './schema/validate.js';
export { loadManifest, watchManifest, DEFAULT_MANIFEST_PATH } from './manifest.js';
export { installAgent, AGENTS } from './install.js';
