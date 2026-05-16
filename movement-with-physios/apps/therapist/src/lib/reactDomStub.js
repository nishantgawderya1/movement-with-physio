/**
 * react-dom stub for React Native.
 * @clerk/clerk-expo 2.x imports react-dom in web portal utilities.
 * Those are never called in native, so we stub every export as a no-op.
 */
module.exports = {
  createPortal: () => null,
  render: () => null,
  hydrate: () => null,
  unmountComponentAtNode: () => false,
  findDOMNode: () => null,
  flushSync: (fn) => fn && fn(),
  unstable_batchedUpdates: (fn) => fn && fn(),
  __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: {},
};
