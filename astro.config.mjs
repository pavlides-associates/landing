import { defineConfig } from 'astro/config';

export default defineConfig({
  // TODO(subdomain): not yet chosen. Ask before producing a production build.
  // site: 'https://<TODO-subdomain>',
  output: 'static',
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    // web-ifc ships a .wasm asset. In the browser build Vite handles it; if
    // a build ever chokes here, the usual escape hatch is:
    //   optimizeDeps: { exclude: ['web-ifc'] },
  },
});
