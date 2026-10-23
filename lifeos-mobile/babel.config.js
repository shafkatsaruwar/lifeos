module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // Reanimated removed for Old Arch TestFlight stability (build 73+).
    plugins: [],
  };
};
