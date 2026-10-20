import "react-native-gesture-handler";

/**
 * Production JS fatals must not abort the process.
 *
 * Build 73 (1.0.3) crash log: RCTExceptionsManager.reportFatal → RCTFatal →
 * SIGABRT ~2s after launch. That path is RN's default ErrorUtils handler
 * escalating an uncaught JS exception. Swallow fatals in release so the UI
 * can still paint; log the message for diagnosis.
 *
 * Must run before App loads. InitializeCore (via gesture-handler → RN) installs
 * the default handler first; we replace it here.
 */
(() => {
  try {
    type Handler = (error: Error, isFatal?: boolean) => void;
    type Utils = {
      setGlobalHandler: (handler: Handler) => void;
      getGlobalHandler?: () => Handler | undefined;
    };
    // InitializeCore installs this on global before our App runs.
    const fromGlobal = (globalThis as { ErrorUtils?: Utils }).ErrorUtils;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fromModule = !fromGlobal
      ? (require("react-native/Libraries/vendor/core/ErrorUtils").default as Utils)
      : null;
    const ErrorUtils = fromGlobal || fromModule;
    if (!ErrorUtils?.setGlobalHandler) return;
    const previous = ErrorUtils.getGlobalHandler?.();
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      const message = error?.stack || error?.message || String(error);
      console.error(`[LifeOS] ${isFatal ? "FATAL" : "error"}:`, message);
      if (typeof __DEV__ !== "undefined" && __DEV__ && previous) {
        previous(error, isFatal);
      }
      // Release: do not call ExceptionsManager / reportFatal (that SIGABRTs).
    });
  } catch (error) {
    console.warn("[LifeOS] could not install soft ErrorUtils handler", error);
  }
})();

import { registerRootComponent } from "expo";
import App from "./App";

registerRootComponent(App);
