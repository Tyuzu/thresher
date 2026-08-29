import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const required = [
  'src',
  'css',
  'public',
  'package.json',
  'vite.config.ts',
  'index.html',
];

const missing = required.filter((item) => !fs.existsSync(path.join(root, item)));

if (missing.length > 0) {
  console.error('Missing required frontend entries:');
  for (const item of missing) {
    console.error(` - ${item}`);
  }
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!pkg.name || !pkg.scripts || !pkg.scripts.dev) {
  console.error('Frontend package.json is missing required project metadata.');
  process.exit(1);
}

console.log(`Frontend project structure OK for ${pkg.name}`);
