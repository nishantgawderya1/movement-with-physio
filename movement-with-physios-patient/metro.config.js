const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * Fix: @clerk/clerk-expo 2.x pulls in react-dom (web-only) via its
 * useCustomElementPortal utility. Stub it out for React Native builds.
 */
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-dom') {
    // Return a no-op stub — none of the portal/web APIs are used in native
    return {
      filePath: require.resolve('./src/lib/reactDomStub.js'),
      type: 'sourceFile',
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
