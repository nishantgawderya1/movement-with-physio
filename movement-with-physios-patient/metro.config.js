const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

/**
 * FIX 1: react-native-webrtc imports `event-target-shim/index`, but v6's
 *        package.json `exports` field doesn't expose `./index` as a public
 *        subpath. Bypass Node's exports check by resolving directly to the
 *        literal file inside the nested v6 under react-native-webrtc.
 *
 * FIX 2: @clerk/clerk-expo 2.x pulls in react-dom (web-only). Stub for native.
 */
const WEBRTC_EVENT_TARGET_SHIM_DIR = path.join(
  __dirname,
  'node_modules/react-native-webrtc/node_modules/event-target-shim',
);

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName.startsWith('event-target-shim') &&
    context.originModulePath.includes('react-native-webrtc')
  ) {
    if (moduleName === 'event-target-shim' || moduleName === 'event-target-shim/index') {
      return { filePath: path.join(WEBRTC_EVENT_TARGET_SHIM_DIR, 'index.js'), type: 'sourceFile' };
    }
    if (moduleName === 'event-target-shim/es5') {
      return { filePath: path.join(WEBRTC_EVENT_TARGET_SHIM_DIR, 'es5.js'), type: 'sourceFile' };
    }
  }
  if (moduleName === 'react-dom') {
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
