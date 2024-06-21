// eslint.config.js
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import google from "eslint-config-google";

const compat = new FlatCompat();

export default [
  js.configs.recommended,
  ...compat.extend(google),
  {
    env: {
      node: true,
      es2021: true,
    },
    rules: {
      "no-restricted-globals": ["error", "name", "length"],
      "prefer-arrow-callback": "error",
      quotes: ["error", "double", { allowTemplateLiterals: true }],
      indent: ["error", 2],
    },
    overrides: [
      {
        files: ["**/*.spec.*"],
        env: {
          mocha: true,
        },
        rules: {},
      },
    ],
  },
];
