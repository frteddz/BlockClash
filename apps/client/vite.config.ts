import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base keeps the built app loadable from a file:// path inside Capacitor later.
  base: './',
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    chunkSizeWarningLimit: 1800,
    rollupOptions: {
      output: {
        // Phaser barely changes between releases, so keep it in its own cached chunk.
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
});
