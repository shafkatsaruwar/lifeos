/**
 * Root postinstall helper for EAS only.
 *
 * This repo has a Next.js app at the git root and Expo in lifeos-mobile/.
 * If EAS ever runs `npm install` at the git root, mobile deps (including expo)
 * are not installed and prebuild fails. On EAS, install lifeos-mobile deps too.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

if (process.env.EAS_BUILD !== "true") {
  process.exit(0);
}

const mobileDir = path.join(__dirname, "..", "lifeos-mobile");
const mobilePkg = path.join(mobileDir, "package.json");

if (!fs.existsSync(mobilePkg)) {
  console.log("[eas] lifeos-mobile/package.json not found — skip");
  process.exit(0);
}

console.log("[eas] ensuring lifeos-mobile dependencies (nested Expo app)");
execSync("npm install --legacy-peer-deps", {
  stdio: "inherit",
  cwd: mobileDir,
  env: process.env,
});
