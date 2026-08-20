import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Core recommended configs with Type Checking enabled
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked, // <-- Changed to Type Checked

  {
    ignores: [
      "node_modules/",
      "dist/",
      "build/",
      ".env*",
      ".vite/",
      "coverage/",
      "*.log",
      ".git/"
    ]
  },

  {
    // Tell ESLint where your TypeScript project config lives
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        projectService: true, // <-- Automatically finds your tsconfig.json
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        console: "readonly",
        fetch: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        URLSearchParams: "readonly",
        FormData: "readonly",
        Blob: "readonly",
        File: "readonly",
        XMLHttpRequest: "readonly",
        AbortController: "readonly",
        AbortSignal: "readonly",
        EventTarget: "readonly",
        Event: "readonly",
        CustomEvent: "readonly",
        BroadcastChannel: "readonly",
        __DEV__: "readonly",
        __PROD__: "readonly"
      }
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_"
        }
      ],

      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "warn",
      "prefer-const": "warn",
      "no-var": "warn",
      "eqeqeq": ["warn", "always"],
      "curly": "warn",
      "brace-style": ["warn", "1tbs"],
      "no-else-return": "warn",
      "no-eval": "error",
      
      "no-implied-eval": "off",
      "@typescript-eslint/no-implied-eval": "error",
      
      "no-new-func": "error"
    }
  }
);
