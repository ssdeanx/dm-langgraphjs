import { FlatCompat } from "@eslint/eslintrc";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

// Remove import rules if the plugin is not installed or not needed
// import importPlugin from "eslint-plugin-import"; // Uncomment if you install eslint-plugin-import

const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  ...compat.extends("plugin:@typescript-eslint/recommended"),
  ...compat.extends("prettier"),
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
        sourceType: "module",
        ecmaVersion: 2022,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      // "import": importPlugin, // Uncomment if you install eslint-plugin-import
    },
    rules: {
      "no-process-env": 2,
      "@typescript-eslint/explicit-module-boundary-types": 0,
      "@typescript-eslint/no-empty-function": 0,
      "@typescript-eslint/no-shadow": 0,
      "@typescript-eslint/no-empty-interface": 0,
      "@typescript-eslint/no-use-before-define": ["error", "nofunc"],
      "@typescript-eslint/no-unused-vars": ["warn", { args: "none" }],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      camelcase: 0,
      "class-methods-use-this": 0,
      // Remove the following rules if you do NOT have eslint-plugin-import installed:
      // "import/extensions": [2, "ignorePackages"],
      // "import/no-extraneous-dependencies": [
      //   "error",
      //   { devDependencies: ["**/*.test.ts"] },
      // ],
      // "import/no-unresolved": 0,
      "import/prefer-default-export": 0,
      "keyword-spacing": "error",
      "max-classes-per-file": 0,
      "max-len": 0,
      "no-await-in-loop": 0,
      "no-bitwise": 0,
      "no-console": 0,
      "no-restricted-syntax": 0,
      "no-shadow": 0,
      "no-continue": 0,
      "no-underscore-dangle": 0,
      "no-use-before-define": 0,
      "no-useless-constructor": 0,
      "no-return-await": 0,
      "consistent-return": 0,
      "no-else-return": 0,
      "new-cap": ["error", { properties: false, capIsNew: false }],
    },
  },
];
