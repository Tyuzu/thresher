import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Generates a tree string representation of a directory.
 * @param {string} dirPath - Absolute or relative path to target folder.
 * @param {string} prefix - Internal parameter for indent spacing.
 * @param {Set<string>} ignored - Set of directory/file names to skip.
 * @returns {string} Text tree structure.
 */
function generateDirectoryTree(dirPath, prefix = '', ignored = new Set(['node_modules', '.git', '.DS_Store', 'dist'])) {
  let result = '';

  let items;
  try {
    items = fs.readdirSync(dirPath);
  } catch (err) {
    return `${prefix} (Permission denied or directory missing)\n`;
  }

  items = items.filter(item => !ignored.has(item));

  items.sort((a, b) => {
    const aIsDir = fs.statSync(path.join(dirPath, a)).isDirectory();
    const bIsDir = fs.statSync(path.join(dirPath, b)).isDirectory();
    if (aIsDir && !bIsDir) return -1;
    if (!aIsDir && bIsDir) return 1;
    return a.localeCompare(b);
  });

  items.forEach((item, index) => {
    const isLast = index === items.length - 1;
    const itemPath = path.join(dirPath, item);
    const stats = fs.statSync(itemPath);

    const connector = isLast ? '└── ' : '├── ';
    result += `${prefix}${connector}${item}\n`;

    if (stats.isDirectory()) {
      const childPrefix = prefix + (isLast ? '    ' : '│   ');
      result += generateDirectoryTree(itemPath, childPrefix, ignored);
    }
  });

  return result;
}

// --- Usage ---
const targetDirectory = process.argv[2] || '.';
const absolutePath = path.resolve(targetDirectory);
const rootName = path.basename(absolutePath);

console.log(`\n${rootName}/`);
const treeOutput = generateDirectoryTree(absolutePath);
console.log(treeOutput);