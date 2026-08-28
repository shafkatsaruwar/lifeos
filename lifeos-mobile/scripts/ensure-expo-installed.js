/**
 * Ensure local `expo` (SDK 54) is resolvable before `npx expo prebuild`.
 *
 * Important timing:
 * - Use npm `postinstall` (runs during `npm install`, before prebuild).
 * - Do NOT rely on `eas-build-post-install` for this — on iOS that hook runs
 *   AFTER prebuild / pod install, which is too late.
 *
 * If `expo` is missing, `npx expo prebuild --no-install` fetches latest Expo
 * (57+) and fails with ConfigError.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const cwd = process.cwd();
const expoPkgPath = path.join(cwd, "node_modules", "expo", "package.json");
const expoBinPath = path.join(cwd, "node_modules", ".bin", "expo");

function hasLocalExpo() {
  return fs.existsSync(expoPkgPath) && fs.existsSync(expoBinPath);
}

function readExpoVersion() {
  return JSON.parse(fs.readFileSync(expoPkgPath, "utf8")).version;
}

if (process.env.LIFEOS_ENSURING_EXPO === "1") {
  process.exit(0);
}

if (!hasLocalExpo()) {
  console.log(`[eas] local expo missing in ${cwd} — installing dependencies`);
  process.env.LIFEOS_ENSURING_EXPO = "1";
  execSync("npm install --legacy-peer-deps", { stdio: "inherit", cwd, env: process.env });
}

if (!hasLocalExpo()) {
  console.log("[eas] expo still missing — installing expo@~54.0.35 explicitly");
  process.env.LIFEOS_ENSURING_EXPO = "1";
  execSync("npm install expo@~54.0.35 --legacy-peer-deps", {
    stdio: "inherit",
    cwd,
    env: process.env,
  });
}

if (!hasLocalExpo()) {
  console.error("[eas] expo is still not installed; prebuild would fetch Expo 57+ via npx");
  process.exit(1);
}

console.log(`[eas] expo@${readExpoVersion()} ready for prebuild`);
