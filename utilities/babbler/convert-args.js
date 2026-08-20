const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

function convertToNamedArgs(filePath) {
  const code = fs.readFileSync(filePath, 'utf-8');

  // Parse code into an AST (supporting modern JS / ES Modules)
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'classProperties', 'optionalChaining', 'nullishCoalescing'],
  });

  traverse(ast, {
    // 1. Convert Function Definitions: function foo(a, b, c) -> function foo({ a, b, c })
    Function(path) {
      // Threshold: minimum positional args to trigger transformation
      if (path.node.params.length < 3) return;

      // Ignore if already destructured as a single object parameter
      if (path.node.params.length === 1 && t.isObjectPattern(path.node.params[0])) {
        return;
      }

      const properties = [];
      let canConvert = true;

      for (const param of path.node.params) {
        if (t.isIdentifier(param)) {
          // Standard parameter: param
          properties.push(t.objectProperty(param, param, false, true));
        } else if (t.isAssignmentPattern(param) && t.isIdentifier(param.left)) {
          // Parameter with default value: param = defaultValue
          properties.push(
            t.objectProperty(param.left, t.assignmentPattern(param.left, param.right), false, true)
          );
        } else {
          // Skip complex/rest parameters
          canConvert = false;
          break;
        }
      }

      if (canConvert) {
        path.node.params = [t.objectPattern(properties)];
      }
    },

    // 2. Convert Function Calls: foo(a, b, c) -> foo({ a, b, c }) or foo({ arg1: "val1", arg2: "val2" })
    CallExpression(path) {
      const args = path.node.arguments;

      // Threshold: minimum positional arguments to trigger transformation
      if (args.length < 3) return;

      // Ignore if already passing a single object argument
      if (args.length === 1 && t.isObjectExpression(args[0])) {
        return;
      }

      const properties = args.map((arg, index) => {
        if (t.isIdentifier(arg)) {
          // Shorthand object property if variable name is available: { varName }
          return t.objectProperty(arg, arg, false, true);
        } else {
          // Fallback key generation for literals/expressions: { arg1: "value" }
          const key = t.identifier(`arg${index + 1}`);
          return t.objectProperty(key, arg);
        }
      });

      path.node.arguments = [t.objectExpression(properties)];
    },
  });

  // Regenerate updated JS code from AST
  const output = generate(ast, { retainLines: true }, code);
  fs.writeFileSync(filePath, output.code, 'utf-8');
  console.log(`Successfully transformed: ${filePath}`);
}

// Get targeted file path from CLI
const targetFile = process.argv[2];
if (!targetFile) {
  console.error('Usage: node convert-args.js <file-path.js>');
  process.exit(1);
}

convertToNamedArgs(path.resolve(targetFile));