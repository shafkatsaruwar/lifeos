const fs = require('fs');
const path = require('path');

// Xcode 26 correctly requires weak references to be mutable. Expo SDK 57's
// ExpoModulesJSI source still declares these as `weak let`, so normalize them
// after every install until the upstream package ships the compatibility fix.
const root = path.join(__dirname, '..', 'node_modules', 'expo-modules-jsi', 'apple', 'Sources', 'ExpoModulesJSI');

// Swift 6 in Xcode 26 also validates the Sendable conformances of the
// JavaScript runtime handles. These references are deliberately shared native
// handles (not Swift-owned state), so mark only the affected Expo SDK 57
// declarations as nonisolated/unsafe until Expo ships its Swift 6 update.
const sendableRuntimeFiles = new Set([
  'Contexts/HostFunctionContext.swift',
  'Contexts/HostObjectContext.swift',
  'Runtime/JavaScriptPropNameID.swift',
  'Runtime/Values/JavaScriptError.swift',
  'Runtime/Values/JavaScriptValue.swift',
]);

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(target);
    else if (entry.name.endsWith('.swift')) {
      const source = fs.readFileSync(target, 'utf8');
      let patched = source.replace(/weak let runtime/g, 'weak var runtime');
      const relativePath = path.relative(root, target);

      if (sendableRuntimeFiles.has(relativePath)) {
        patched = patched.replace(
          /(^\s*)(?:(private|internal)\s+)?weak var runtime:/gm,
          (_, indentation, visibility) => `${indentation}nonisolated(unsafe) ${visibility ? `${visibility} ` : ''}weak var runtime:`
        );
      }

      // Xcode 26 can see multiple `abs` overloads through Foundation here.
      // `Double.magnitude` is the exact same non-negative value without the
      // overload ambiguity, and the replacement stays idempotent.
      if (relativePath === 'Coding/JavaScriptCodable+Date.swift') {
        patched = patched.replace(/(?:(?:Swift\.)+abs\(milliseconds\)|abs\(milliseconds\))/g, 'milliseconds.magnitude');
      }

      if (patched !== source) fs.writeFileSync(target, patched);
    }
  }
}

if (fs.existsSync(root)) walk(root);

// macOS can attach Finder/resource-fork metadata to Expo's generated
// framework bundle. Xcode 26 refuses to sign bundles with that metadata.
// The inner Swift Package build does not need to sign its intermediate
// framework (the outer app build signs the final copy), so disable signing
// there and strip metadata both before and after it is staged.
const buildScript = path.join(__dirname, '..', 'node_modules', 'expo-modules-jsi', 'apple', 'scripts', 'build-xcframework.sh');
if (fs.existsSync(buildScript)) {
  const source = fs.readFileSync(buildScript, 'utf8');
  let patched = source
    // Remove old versions of this patch so postinstall stays idempotent.
    .replace(/(?:  xattr -cr "\$framework_src" 2>\/dev\/null \|\| true\n)+/g, '')
    .replace(/(?:  xattr -cr "\$\{staging_dir\}\/\$\{PACKAGE_NAME\}\.framework" 2>\/dev\/null \|\| true\n)+/g, '');

  if (!patched.includes('xattr -cr "$PACKAGE_DIR" 2>/dev/null || true')) {
    const nestedBuildMarker = '  (cd "$PACKAGE_DIR" && env -i "${env_args[@]}" ' + '\\' + '\n';
    patched = patched.replace(nestedBuildMarker, '  xattr -cr "$PACKAGE_DIR" 2>/dev/null || true\n  xattr -cr "$DERIVED_DATA_PATH" 2>/dev/null || true\n\n' + nestedBuildMarker);
  }

  if (!patched.includes('CODE_SIGNING_ALLOWED=NO')) {
    const swiftBuildMarker = '    SWIFT_COMPILATION_MODE=wholemodule ' + '\\' + '\n  )';
    patched = patched.replace(swiftBuildMarker, '    SWIFT_COMPILATION_MODE=wholemodule ' + '\\' + '\n    CODE_SIGNING_ALLOWED=NO ' + '\\' + '\n    CODE_SIGNING_REQUIRED=NO ' + '\\' + '\n  )');
  }

  if (!patched.includes('xattr -cr "${staging_dir}/${PACKAGE_NAME}.framework"')) {
    patched = patched.replace(
      '  cp -a "$framework_src" "$staging_dir/"',
      '  xattr -cr "$framework_src" 2>/dev/null || true\n  cp -a "$framework_src" "$staging_dir/"\n  xattr -cr "${staging_dir}/${PACKAGE_NAME}.framework" 2>/dev/null || true'
    );
  }
  if (patched !== source) fs.writeFileSync(buildScript, patched);
}
