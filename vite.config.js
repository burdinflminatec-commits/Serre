import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

function syncDocsPlugin() {
  return {
    name: 'sync-docs-index',
    closeBundle() {
      const distDir = path.resolve('dist');
      const docsDir = path.resolve('docs');
      const indexPath = path.join(distDir, 'index.html');
      if (!fs.existsSync(indexPath)) return;

      fs.mkdirSync(docsDir, { recursive: true });
      fs.copyFileSync(indexPath, path.join(docsDir, 'index.html'));
      console.log('✓ Synced dist/index.html -> docs/index.html');
    }
  };
}

export default defineConfig({
  plugins: [viteSingleFile(), syncDocsPlugin()],
  build: {
    target: 'esnext',
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false,
    outDir: 'dist'
  }
});
