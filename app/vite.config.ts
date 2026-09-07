import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// One self-contained dist/index.html: every JS/CSS/font/icon asset is inlined
// (assetsInlineLimit is effectively unlimited) so the file works from file://.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  // The dev-server pre-bundler cannot resolve the `?url` imports inside
  // @tldraw/assets; let Vite serve that package unbundled instead.
  optimizeDeps: { exclude: ['@tldraw/assets'] },
  // Bind to the Tailscale address only; this VPS also has a public interface.
  server: { host: '100.68.163.38', port: 5173, strictPort: true, allowedHosts: ['srv1443943'] },
  build: {
    target: 'es2020',
    assetsInlineLimit: 1_000_000_000,
    chunkSizeWarningLimit: 100_000,
    cssCodeSplit: false,
  },
})
