import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  // 1. Standalone global ignores
  {
    ignores: [
      "**/node_modules/",
      "**/dist/",
      "**/build/",
      "**/.env*",
      "**/.vite/",
      "**/coverage/",
      "**/*.log",
      "**/.git/"
    ]
  },

  // 2. Base ESLint recommended rules for all files
  js.configs.recommended,

  // 3. TypeScript recommended rules with Type Checking (scoped to TS files)
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ["**/*.ts", "**/*.tsx"]
  })),

  // 4. Custom project language options and rule overrides
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      },
      globals: {
        ...globals.browser,
        __DEV__: "readonly",
        __PROD__: "readonly"
      }
    },
    rules: {
      // Unused variables handling
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_"
        }
      ],

      // Code quality & safety
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "warn",
      "prefer-const": "warn",
      "no-var": "error",
      "eqeqeq": ["warn", "always"],
      "curly": ["warn", "all"],
      "no-else-return": "warn",
      "no-eval": "error",
      "no-new-func": "error",

      // Type-checked safety rules
      "no-implied-eval": "off",
      "@typescript-eslint/no-implied-eval": "error"
    }
  }
);