# LifeOS home-screen widgets

Canonical SwiftUI sources: [`../../targets/widget/LifeOSWidget.swift`](../../targets/widget/LifeOSWidget.swift)

They are compiled inside the existing **LiveActivity** WidgetKit extension (`ios/LiveActivity/LifeOSHomeWidgets.swift`) so we don’t need a second appex target.

## Family

| Widget | Size | Accent | Role |
|--------|------|--------|------|
| **Attention** | S / M | Orange | Notification brain (winner) |
| **Now / Focus** | S / M | Blue | Active focus + progress |
| **Tasks** | S / M | Green | Due today count / list |
| **Deadline** | S | Red | Hottest deadline |
| **Calendar** | S | Purple | Next event |
| **LifeOS Today** | L | Green | Stats + Attention rows |

## Data

RN writes App Group snapshot via `@bacons/apple-targets` `ExtensionStorage`:

- Group: `group.com.shafkatsaruwar.lifeos`
- Key: `lifeosWidgetSnapshot`
- Builder: `src/lib/widgets/snapshot.ts`

## Rebuild

```bash
EXPO_IMAGE_UTILS_NO_SHARP=1 npx expo run:ios
```

Then Home Screen → Edit → Add Widget → LifeOS.
