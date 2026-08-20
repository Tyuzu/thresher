const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

// File extensions to process
const VALID_EXTENSIONS = ['.js', '.ts', '.mjs', '.cjs'];

// Folders to completely ignore
const IGNORED_DIRS = ['node_modules', '.git', 'dist', 'build'];

function convertToNamedArgs(filePath) {
  try {
    const code = fs.readFileSync(filePath, 'utf-8');

    const ast = parser.parse(code, {
      sourceType: 'unambiguous', // Handles both ES Modules and standard scripts
      plugins: [
        'classProperties',
        'optionalChaining',
        'nullishCoalescing',
        'topLevelAwait'
      ],
    });

    let hasChanges = false;

    traverse(ast, {
      // 1. Function Definitions: function foo(a, b, c) -> function foo({ a, b, c })
      Function(path) {
        if (path.node.params.length < 3) return;

        // Skip if already destructured as a single object parameter
        if (path.node.params.length === 1 && t.isObjectPattern(path.node.params[0])) {
          return;
        }

        const properties = [];
        let canConvert = true;

        for (const param of path.node.params) {
          if (t.isIdentifier(param)) {
            properties.push(t.objectProperty(param, param, false, true));
          } else if (t.isAssignmentPattern(param) && t.isIdentifier(param.left)) {
            properties.push(
              t.objectProperty(param.left, t.assignmentPattern(param.left, param.right), false, true)
            );
          } else {
            canConvert = false;
            break;
          }
        }

        if (canConvert) {
          path.node.params = [t.objectPattern(properties)];
          hasChanges = true;
        }
      },

      // 2. Function Calls: foo(a, b, c) -> foo({ a, b, c }) or foo({ arg1: "val", ... })
      CallExpression(path) {
        const args = path.node.arguments;

        if (args.length < 3) return;

        // Skip if already passing a single object parameter
        if (args.length === 1 && t.isObjectExpression(args[0])) {
          return;
        }

        const properties = args.map((arg, index) => {
          if (t.isIdentifier(arg)) {
            return t.objectProperty(arg, arg, false, true);
          } else {
            const key = t.identifier(`arg${index + 1}`);
            return t.objectProperty(key, arg);
          }
        });

        path.node.arguments = [t.objectExpression(properties)];
        hasChanges = true;
      },
    });

    // Write back to file only if modifications occurred
    if (hasChanges) {
      const output = generate(ast, { retainLines: true }, code);
      fs.writeFileSync(filePath, output.code, 'utf-8');
      console.log(`[Updated] ${filePath}`);
    }
  } catch (err) {
    console.error(`[Error parsing] ${filePath}:`, err.message);
  }
}

function processDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.includes(entry.name)) {
        processDirectory(fullPath); // Recursive call for subdirectories
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (VALID_EXTENSIONS.includes(ext)) {
        convertToNamedArgs(fullPath);
      }
    }
  }
}

// Get targeted root directory path from CLI
const targetDir = process.argv[2];
if (!targetDir) {
  console.error('Usage: node convert-args-recursive.js <directory-path>');
  process.exit(1);
}

const resolvedPath = path.resolve(targetDir);

if (!fs.existsSync(resolvedPath)) {
  console.error(`Directory not found: ${resolvedPath}`);
  process.exit(1);
}

console.log(`Starting refactor in: ${resolvedPath}\n`);
processDirectory(resolvedPath);
console.log('\nRefactoring complete!');