// eslint.config.js

const globals = require("globals");

module.exports = [
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        myCustomGlobal: "readonly",
      },
    },
    rules: {
      "no-restricted-globals": ["error", "name", "length"],
      "prefer-arrow-callback": "error",
      "quotes": ["error", "double", { "allowTemplateLiterals": true }],
      "indent": ["error", 2],
      "semi": ["warn", "always"],
      "no-console": "off",
    },
  },
  {
    files: ["src/**/*"],
    rules: {
      semi: ["warn", "always"],
    },
  },
  {
    files: ["test/**/*"],
    rules: {
      "no-console": "off",
    },
  },
];