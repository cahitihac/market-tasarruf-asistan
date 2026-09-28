const { getDefaultConfig } = require('expo/metro-config');
const { existsSync } = require('node:fs');
const { dirname, resolve } = require('node:path');

const config = getDefaultConfig(__dirname);
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('.') && moduleName.endsWith('.js')) {
    const source = resolve(dirname(context.originModulePath), moduleName.slice(0, -3));
    for (const extension of ['.ts', '.tsx']) {
      if (existsSync(source + extension)) return context.resolveRequest(context, moduleName.slice(0, -3) + extension, platform);
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};
module.exports = config;
