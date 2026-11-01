import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

function generateDualPagesPlugin() {
  return {
    name: 'generate-dual-pages-lite-and-docs',
    closeBundle() {
      const distDir = path.resolve('dist');
      const docsDir = path.resolve('docs');
      const indexPath = path.join(distDir, 'index.html');
      if (!fs.existsSync(indexPath)) return;

      const indexHtml = fs.readFileSync(indexPath, 'utf-8');
      const liteHtml = indexHtml
        .replace(
          '<title>',
          '<script>window.FORCE_LITE_MODE = true;</script>\n  <title>[LITE TAB A] '
        );

      const distLitePath = path.join(distDir, 'lite.html');
      fs.writeFileSync(distLitePath, liteHtml, 'utf-8');

      fs.mkdirSync(docsDir, { recursive: true });
      fs.writeFileSync(path.join(docsDir, 'index.html'), indexHtml, 'utf-8');
      fs.writeFileSync(path.join(docsDir, 'lite.html'), liteHtml, 'utf-8');
      console.log('✓ Generated dist/index.html, dist/lite.html, docs/index.html, docs/lite.html');
    }
  };
}

export default defineConfig({
  plugins: [viteSingleFile(), generateDualPagesPlugin()],
  build: {
    target: 'esnext',
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false,
    outDir: 'dist'
  }
});
