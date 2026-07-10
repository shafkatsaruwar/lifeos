# Tauri Desktop App Setup

LifeOS is now configured as a native macOS application using Tauri.

## Development

Run the development server with the native app:

```bash
npm run tauri dev
```

This will:
- Start the Next.js dev server on localhost:3000
- Launch the native Tauri app window
- Support hot reload

## Building for Production

Build the native macOS app and DMG:

```bash
npm run tauri build
```

This creates:
- `/src-tauri/target/release/bundle/macos/LifeOS.app` - Native macOS app
- `/src-tauri/target/release/bundle/dmg/LifeOS_0.1.0_x64.dmg` - DMG installer

## Features Configured

- ✅ Native macOS window (1280x800, resizable)
- ✅ macOS-specific build settings (minimum 11.0)
- ✅ DMG bundle for distribution
- ✅ App icon configuration
- ✅ Private API access enabled

## Next Steps

To add more native features:

1. **Menu Bar App**: Add `tauri-plugin-global-shortcut` for keyboard shortcuts
2. **Notifications**: Use `tauri-plugin-notification`
3. **Window State**: Add `tauri-plugin-window-state` for persistence
4. **Auto-updates**: Configure `tauri-plugin-updater`

These can be added to `src-tauri/Cargo.toml` as dependencies.
