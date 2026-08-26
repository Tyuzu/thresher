import { defineConfig, loadEnv } from 'vite';
import mkcert from 'vite-plugin-mkcert';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProd = mode === 'production';

  // Target Go backend running locally (e.g., http://localhost:4000 or http://127.0.0.1:4000)
  const BACKEND_TARGET = env.VITE_BACKEND_URL || 'http://localhost:4000';

  return {
    root: '.',

    plugins: [
      mkcert(),
      isProd && visualizer({ open: true }),
    ].filter(Boolean),

    build: {
      outDir: 'dist',
      minify: isProd ? 'terser' : 'esbuild',
      chunkSizeWarningLimit: 400,
      assetsInlineLimit: 4096,
      cssCodeSplit: true,

      modulePreload: {
        polyfill: true,
      },

      terserOptions: {
        compress: {
          drop_console: isProd,
          drop_debugger: isProd,
          passes: 2,
        },
        mangle: {
          safari10: true,
        },
      },

      sourcemap: isProd
        ? (env.ENABLE_SOURCEMAPS === 'true' ? 'hidden' : false)
        : true,

      rollupOptions: {
        output: {
          manualChunks(id) {
            const lower = id.toLowerCase();

            if (id.includes('node_modules')) {
              if (lower.includes('cropperjs')) return 'vendor-cropper';
              if (lower.includes('hls.js')) return 'vendor-hls';
              if (lower.includes('uuid')) return 'vendor-uuid';
              return 'vendor-core';
            }

            if (lower.includes('/pages/farm/') || lower.includes('/pages/crop/')) return 'feature-farms';
            if (lower.includes('/pages/merechats/') || lower.includes('/pages/newchats/') || lower.includes('/pages/discord/')) return 'feature-chats';
          },

          experimentalMinChunkSize: 5000,
          chunkFileNames: 'js/chunks/[name]-[hash].js',
          entryFileNames: 'js/[name]-[hash].js',

          assetFileNames: (assetInfo) => {
            const name = assetInfo.name || assetInfo.names?.[0] || '';
            const ext = name.split('.').pop()?.toLowerCase();

            if (ext && /png|jpe?g|gif|svg/.test(ext)) {
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

    optimizeDeps: {
      include: ['uuid', 'hls.js'],
    },

server: {
      allowedHosts: ['.trycloudflare.com', 'localhost'],
      https: true,
      
      hmr: {
        protocol: 'wss',
        host: 'localhost',
        clientPort: 5173,
      },

      proxy: {
        // Option A: If your Go WS endpoint is under /api/v1 (e.g., wss://localhost:5173/api/v1/ws)
        '/api/v1': {
          target: BACKEND_TARGET,
          changeOrigin: true,
          secure: false,
          ws: true, // Enables proxying WebSockets / WSS to BACKEND_TARGET
        },

        // Option B: If you have a dedicated WebSocket endpoint like /ws or /socket
        '/ws': {
          target: BACKEND_TARGET,
          changeOrigin: true,
          secure: false,
          ws: true, // Upgrades http(s) requests to ws(s)
        },

        // Static uploads/cache proxy
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