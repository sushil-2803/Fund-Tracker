module.exports = {
  extends: ['expo'],
  env: {
    node: true,
  },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
};
