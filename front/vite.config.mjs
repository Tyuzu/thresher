import { defineConfig, loadEnv } from 'vite';
import mkcert from 'vite-plugin-mkcert';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProd = mode === 'production';

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

            // Vendor chunking
            if (id.includes('node_modules')) {
              if (lower.includes('hls.js')) return 'vendor-hls';
              return 'vendor';
            }

            // Explicit feature chunking for distinct domain bundles
            if (lower.includes('/pages/farm/') || lower.includes('/pages/crop/')) return 'feature-farms';
            if (lower.includes('/pages/events/')) return 'feature-events';
            if (lower.includes('/pages/baitos/')) return 'feature-baito';
            if (lower.includes('/pages/posts/') || lower.includes('/pages/tumblr/')) return 'feature-social';
            if (lower.includes('/pages/merechats/') || lower.includes('/pages/newchats/') || lower.includes('/pages/discord/')) return 'feature-chats';
            if (lower.includes('/pages/admin/')) return 'feature-admin';
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
      proxy: {
        '/api/v1': {
          target: 'https://localhost:4000',
          changeOrigin: true,
          secure: false,
        },
        '/static/uploads': {
          target: 'https://localhost:4000',
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