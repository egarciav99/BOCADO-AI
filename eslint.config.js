import js from "@eslint/js";
import react from "eslint-plugin-react";
import typescriptPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  js.configs.recommended,
  {
    // Ignore generated and vendor files (preferred over .eslintignore)
    ignores: [
      "dev-dist/**",
      "public/**",
      "storybook-static/**",
      "playwright-report/**",
      "test-results/**",
      "**/workbox-*.js",
      "registerSW.js",
      "firebase-messaging-sw.js",
    ],
    plugins: { react },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        fetch: "readonly",
        Headers: "readonly",
        Request: "readonly",
        Response: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        atob: "readonly",
        btoa: "readonly",
        indexedDB: "readonly",
        AbortController: "readonly",
        Blob: "readonly",
        caches: "readonly",
        TextEncoder: "readonly",
        crypto: "readonly",
        screen: "readonly",
        Notification: "readonly",
        ServiceWorkerRegistration: "readonly",
        self: "readonly",
        clients: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
      },
    },
    settings: { react: { version: "detect" } },
    rules: {
      "react/react-in-jsx-scope": "off",
    },
    files: ["src/**/*.js", "src/**/*.jsx"], // keep JS rules here
  },
  // TypeScript-specific configuration
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: true,
        tsconfigRootDir: process.cwd(),
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        fetch: "readonly",
        Headers: "readonly",
        Request: "readonly",
        Response: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        atob: "readonly",
        btoa: "readonly",
        indexedDB: "readonly",
        AbortController: "readonly",
        Blob: "readonly",
        caches: "readonly",
        TextEncoder: "readonly",
        crypto: "readonly",
        screen: "readonly",
        Notification: "readonly",
        ServiceWorkerRegistration: "readonly",
        self: "readonly",
        clients: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
      },
    },
    plugins: { "@typescript-eslint": typescriptPlugin, react },
    settings: { react: { version: "detect" } },
    rules: {
      ...((typescriptPlugin &&
        typescriptPlugin.configs &&
        typescriptPlugin.configs.recommended &&
        typescriptPlugin.configs.recommended.rules) ||
        {}),
      // relax a few rules to allow automated fixes and reduce noise
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-undef": "off",
      // keep JSX/react adjustments
      "react/react-in-jsx-scope": "off",
    },
  },
];
