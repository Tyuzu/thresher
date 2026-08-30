import { defineConfig, loadEnv } from 'vite';
import mkcert from 'vite-plugin-mkcert';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProd = mode === 'production';
  const isDevServer = command === 'serve';

  // Target Go backend running locally
  const BACKEND_TARGET = env.VITE_BACKEND_URL || 'http://localhost:4000';

  return {
    root: '.',

    plugins: [
      // Only run HTTPS cert generation during dev server tasks
      isDevServer && mkcert(),
      isProd && visualizer({ open: false, filename: 'stats.html' }),
    ].filter(Boolean),

    build: {
      outDir: 'dist',
      // Esbuild is vastly faster; drop console/debugger via esbuild directly
      minify: 'esbuild',
      chunkSizeWarningLimit: 400,
      assetsInlineLimit: 4096,
      cssCodeSplit: true,

      modulePreload: {
        polyfill: true,
      },

      sourcemap: isProd
        ? (env.ENABLE_SOURCEMAPS === 'true' ? 'hidden' : false)
        : true,

      rollupOptions: {
        output: {
          manualChunks(id) {
            // Normalize path separators for cross-platform compatibility (Windows vs Posix)
            const normalizedId = id.replace(/\\/g, '/').toLowerCase();

            if (normalizedId.includes('node_modules')) {
              if (normalizedId.includes('cropperjs')) return 'vendor-cropper';
              if (normalizedId.includes('hls.js')) return 'vendor-hls';
              if (normalizedId.includes('uuid')) return 'vendor-uuid';
              return 'vendor-core';
            }

            if (
              normalizedId.includes('/pages/farm/') ||
              normalizedId.includes('/pages/crop/')
            ) {
              return 'feature-farms';
            }
            if (
              normalizedId.includes('/pages/merechats/') ||
              normalizedId.includes('/pages/newchats/') ||
              normalizedId.includes('/pages/discord/')
            ) {
              return 'feature-chats';
            }
          },

          experimentalMinChunkSize: 5000,
          chunkFileNames: 'js/chunks/[name]-[hash].js',
          entryFileNames: 'js/[name]-[hash].js',

          assetFileNames: (assetInfo) => {
            const name = assetInfo.name || assetInfo.names?.[0] || '';
            const ext = name.split('.').pop()?.toLowerCase();

            if (ext && /png|jpe?g|gif|svg|webp|ico/.test(ext)) {
              return `assets/images/[name]-[hash][extname]`;
            }

            if (ext && /woff2?|ttf|otf|eot/.test(ext)) {
              return `assets/fonts/[name]-[hash][extname]`;
            }

            if (ext === 'css') {
              return `css/[name]-[hash][extname]`;
            }

            return `assets/[name]-[hash][extname]`;
          },
        },

        treeshake: {
          propertyReadSideEffects: false,
          tryCatchDeoptimization: false,
        },
      },
    },

    esbuild: {
      // Fast console & debugger dropping without Terser overhead
      drop: isProd ? ['console', 'debugger'] : [],
    },

    optimizeDeps: {
      include: ['uuid', 'hls.js'],
    },

    server: {
      allowedHosts: ['.trycloudflare.com', 'localhost'],
      
      proxy: {
        '/api/v1': {
          target: BACKEND_TARGET,
          changeOrigin: true,
          secure: false,
          ws: true,
        },

        '/ws': {
          target: BACKEND_TARGET,
          changeOrigin: true,
          secure: false,
          ws: true,
        },

        '/static': {
          target: BACKEND_TARGET,
          changeOrigin: true,
          secure: false,
        },
      },
    },

    define: {
      __DEV__: JSON.stringify(!isProd),
      __PROD__: JSON.stringify(isProd),
    },
  };
});