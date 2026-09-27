const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Limit worker threads to 2 to prevent V8 out-of-memory issues during transform
config.maxWorkers = 2;

module.exports = config;
