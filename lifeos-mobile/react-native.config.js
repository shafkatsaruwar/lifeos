/**
 * Keep crash-prone packages out of store binaries even if they reappear
 * transitively. EAS_BUILD_PROFILE is set during EAS builds.
 */
const disableNative = { platforms: { ios: null, android: null } };

module.exports = {
  dependencies: {
    "expo-dev-client": disableNative,
    "expo-dev-launcher": disableNative,
    "expo-dev-menu": disableNative,
    "expo-dev-menu-interface": disableNative,
    "react-native-reanimated": disableNative,
    "react-native-worklets": disableNative,
  },
};
