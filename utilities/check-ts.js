import fs from "fs";
import path from "path";
import { glob } from "glob";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";

const traverse = traverseModule.default || traverseModule;

// Target directory (adjust if your source files are in `src/` or elsewhere)
const TARGET_DIR = "./js";

async function analyzeFiles() {
  // Find all .js, .jsx, .ts, and .tsx files
  const files = await glob(`${TARGET_DIR}/**/*.{js,jsx,ts,tsx}`, {
    ignore: ["**/node_modules/**", "**/dist/**", "**/build/**"],
  });

  console.log(`Scanning ${files.length} files...\n`);

  let tsCount = 0;
  let jsCount = 0;
  let errorCount = 0;

  const results = {
    typescript: [],
    javascript: [],
    errors: [],
  };

  for (const file of files) {
    const code = fs.readFileSync(file, "utf8");

    try {
      // Parse file with TypeScript plugin enabled
      const ast = parse(code, {
        sourceType: "module",
        plugins: ["typescript", "jsx"],
      });

      let hasTSConstruct = false;

      // Traverse the AST looking for TS-specific nodes
      traverse(ast, {
        enter(path) {
          // Check if node type starts with "TS" (e.g., TSTypeAnnotation, TSAsExpression, TSInterfaceDeclaration)
          if (path.node.type.startsWith("TS")) {
            hasTSConstruct = true;
            path.stop(); // Stop scanning this file early once found
          }
        },
      });

      if (hasTSConstruct) {
        tsCount++;
        results.typescript.push(file);
      } else {
        jsCount++;
        results.javascript.push(file);
      }
    } catch (err) {
      errorCount++;
      results.errors.push({ file, error: err.message });
    }
  }

  // Print Summary
  console.log("=== RESULTS ===");
  console.log(`Total Scanned Files: ${files.length}`);
  console.log(`TypeScript Files (contains TS syntax): ${tsCount}`);
  console.log(`Plain JavaScript Files: ${jsCount}`);
  if (errorCount > 0) console.log(`Parsing Errors: ${errorCount}`);

  // Optional: Output list of plain JS files if you need to migrate them
  if (results.javascript.length > 0) {
    console.log("\n--- Plain JavaScript Files ---");
    results.javascript.forEach((f) => console.log(f));
  }
}

analyzeFiles();