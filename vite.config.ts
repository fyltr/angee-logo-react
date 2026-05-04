import { defineConfig, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'node:path';

// Two build modes:
//   - default: configurator demo (SPA → dist/, deploys to logo.angee.ai)
//   - --mode lib: library bundle (→ dist-lib/, published as @angee/logo-react)
export default defineConfig(({ mode }): UserConfig => {
  if (mode === 'lib') {
    return {
      plugins: [
        react(),
        dts({
          include: ['src/lib', 'src/components', 'src/index.ts'],
          tsconfigPath: 'tsconfig.lib.json',
          rollupTypes: true,
        }),
      ],
      build: {
        outDir: 'dist-lib',
        emptyOutDir: true,
        sourcemap: true,
        lib: {
          entry: resolve(__dirname, 'src/index.ts'),
          formats: ['es', 'cjs'],
          fileName: (format) => format === 'es' ? 'index.js' : 'index.cjs',
        },
        rollupOptions: {
          external: ['react', 'react-dom', 'react/jsx-runtime'],
          output: {
            globals: { react: 'React', 'react-dom': 'ReactDOM' },
            // Force the bundled CSS to land at dist-lib/style.css so it matches
            // the `./style.css` entry in package.json exports.
            assetFileNames: (asset) => {
              if (asset.names?.some(n => n.endsWith('.css'))) return 'style.css';
              return 'assets/[name][extname]';
            },
          },
        },
      },
    };
  }

  // Demo / configurator app
  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
  };
});
