module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
  ],
  rules: {
    indent: "off",
    quotes: "off",
    semi: "off",
    "comma-dangle": "off",
    "object-curly-spacing": "off",
    "padded-blocks": "off",
  },
  parserOptions: {
    ecmaVersion: 2020,
  },
};
