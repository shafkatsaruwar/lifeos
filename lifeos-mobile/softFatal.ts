/**
 * Soft-fail production JS fatals so they cannot SIGABRT via RCTFatal.
 *
 * Build 73 (1.0.3): RCTExceptionsManager.reportFatal → RCTFatal → Abort.
 * Must load as an import immediately after gesture-handler (and before App)
 * so Metro/Babel hoist keeps this ahead of App evaluation.
 */
(() => {
  try {
    type Handler = (error: Error, isFatal?: boolean) => void;
    type Utils = {
      setGlobalHandler: (handler: Handler) => void;
      getGlobalHandler?: () => Handler | undefined;
    };
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
      // Release: do not escalate to ExceptionsManager.reportFatal (SIGABRT).
    });
  } catch (error) {
    console.warn("[LifeOS] could not install soft ErrorUtils handler", error);
  }
})();
