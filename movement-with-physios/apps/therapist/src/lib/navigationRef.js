import { createNavigationContainerRef } from '@react-navigation/native';

/**
 * Shared NavigationContainer ref. Attached to the NavigationContainer in
 * AppNavigator.jsx and consumed by code that runs outside the React render
 * tree — notably expo-notifications' module-scope setNotificationHandler
 * and the addNotificationResponseReceivedListener callback, which fire
 * from native code and cannot use the useNavigation() hook.
 *
 * Methods like navigate(), goBack(), canGoBack(), getCurrentRoute() are
 * available either directly on this ref or via `.current` once the
 * container has mounted. Always guard with optional chaining or
 * isReady() — the ref is unattached during the very first render.
 */
export const navigationRef = createNavigationContainerRef();
