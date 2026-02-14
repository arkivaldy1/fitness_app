const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add wasm to asset extensions for expo-sqlite web support
config.resolver.assetExts.push('wasm');

// Handle .wasm files as assets
config.transformer.assetPlugins = config.transformer.assetPlugins || [];

module.exports = config;
