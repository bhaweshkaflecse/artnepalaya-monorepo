const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');
const svgIndex = config.resolver.assetExts.indexOf('svg');
if (svgIndex > -1) config.resolver.assetExts.splice(svgIndex, 1);
config.resolver.sourceExts.push('svg');
module.exports = config;
