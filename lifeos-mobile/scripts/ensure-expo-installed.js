/**
 * EAS Build hook helper.
 *
 * In this repo the Next.js app lives at the git root and Expo lives in
 * lifeos-mobile/. Some EAS installs leave lifeos-mobile without node_modules/expo,
 * then `npx expo prebuild --no-install` fetches the latest Expo (57+) and fails.
 *
 * Run after EAS dependency install; if expo is missing, install locally.
 */
const { execSync } = require("child_process");

function hasExpo() {
  try {
    require.resolve("expo/package.json", { paths: [process.cwd()] });
    return true;
  } catch {
    return false;
  }
}

if (!hasExpo()) {
  console.log(`[eas] expo missing in ${process.cwd()} — running npm install`);
  execSync("npm install --legacy-peer-deps", { stdio: "inherit", cwd: process.cwd() });
}

if (!hasExpo()) {
  console.error("[eas] expo is still not installed after npm install");
  process.exit(1);
}

const expoPkg = require(require.resolve("expo/package.json", { paths: [process.cwd()] }));
console.log(`[eas] expo@${expoPkg.version} ready for prebuild`);
