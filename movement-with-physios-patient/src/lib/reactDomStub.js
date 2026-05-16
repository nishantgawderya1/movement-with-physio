/**
 * react-dom stub for React Native.
 *
 * @clerk/clerk-expo 2.x imports react-dom in its web portal utilities.
 * Those utilities are never called in a native context, so we safely stub
 * every export as a no-op to prevent Metro from failing.
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
