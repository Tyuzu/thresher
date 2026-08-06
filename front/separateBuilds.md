Yes, it is entirely possible to build completely separate `dist` output folders for each domain (e.g., `dist/farms`, `dist/events`, `dist/admin`).

However, before doing this, it helps to distinguish between two different architecture targets:

1. **Standalone Micro-Frontends (Multi-Page Apps / Separate Deployments):** Each feature is a completely isolated build with its own `index.html` entry point, deployed independently to different subpaths (`/farms`, `/events`).
2. **Single Build with Multi-Entry Bundles:** One build step generates distinct output subfolders inside `dist/` using multiple HTML or JS entry points.

---

### Method 1: Multi-Entry Build inside `vite.config.js` (Single Config)

If you want a single `vite build` command to generate isolated entries, you can define multiple HTML or JavaScript entry points in Rollup's `input` settings.

#### 1. Create Feature HTML Entry Points

Create standalone HTML entry points (e.g., `farms.html`, `events.html`, `admin.html`) alongside your main `index.html`:

```html
<!-- farms.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Farms Feature</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/entries/farms.js"></script>
  </body>
</html>

```

#### 2. Update `vite.config.js`

Configure `rollupOptions.input` with multiple entries:

```javascript
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        farms: resolve(__dirname, 'farms.html'),
        events: resolve(__dirname, 'events.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
      output: {
        // Direct outputs to specific directories inside dist
        entryFileNames: (chunk) => {
          if (chunk.name !== 'main') {
            return `${chunk.name}/[name]-[hash].js`;
          }
          return 'js/[name]-[hash].js';
        },
      }
    }
  }
});

```

---

### Method 2: Completely Isolated Builds (Micro-Frontend Style)

If you want **`dist-farms/`**, **`dist-events/`**, and **`dist-admin/`** as completely separated folders built independently, pass an environment variable (like `APP_TARGET`) during the build.

#### 1. Update `vite.config.js`

```javascript
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const target = process.env.APP_TARGET || 'main';

  // Map build targets to their specific entry point and output dir
  const targetConfigs = {
    farms: { entry: 'farms.html', outDir: 'dist/farms' },
    events: { entry: 'events.html', outDir: 'dist/events' },
    admin: { entry: 'admin.html', outDir: 'dist/admin' },
    main: { entry: 'index.html', outDir: 'dist/main' },
  };

  const currentConfig = targetConfigs[target] || targetConfigs.main;

  return {
    build: {
      outDir: currentConfig.outDir,
      emptyOutDir: true, // Cleans target dist subfolder before building
      rollupOptions: {
        input: resolve(__dirname, currentConfig.entry),
      },
    },
  };
});

```

#### 2. Add NPM Build Scripts in `package.json`

```json
{
  "scripts": {
    "build:main": "APP_TARGET=main vite build",
    "build:farms": "APP_TARGET=farms vite build",
    "build:events": "APP_TARGET=events vite build",
    "build:admin": "APP_TARGET=admin vite build",
    "build:all": "npm run build:main && npm run build:farms && npm run build:events && npm run build:admin"
  }
}

```

---

### Trade-offs to Keep in Mind

| Feature | Single Dynamic Bundle (Current Setup) | Multiple `dist` Outputs (Isolated Builds) |
| --- | --- | --- |
| **Shared Vendor Code** | ✅ Shared `vendor.js` is cached across routes. | ❌ Vendor code (e.g., UI libraries) is duplicated in each `dist`. |
| **Navigation Speed** | ✅ Instant single-page navigation between routes. | ❌ Hard page reload when navigating from `/farms` to `/events`. |
| **Deployment** | Must deploy the entire app together. | Features can be deployed on independent servers/CDN paths. |
| **State Management** | Global memory/state remains intact across features. | State is cleared when jumping between feature apps. |

If your app operates as a single Single-Page Application (SPA), your current setup (dynamic code-splitting with feature chunks) provides the best performance and user experience. If you are building micro-applications meant to run on separate servers or subdomains, separate `dist` builds are the standard choice.