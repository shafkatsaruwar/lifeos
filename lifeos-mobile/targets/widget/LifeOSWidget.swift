import SwiftUI
import WidgetKit

// MARK: - Snapshot (mirrors RN `src/lib/widgets/snapshot.ts`)

struct AttentionItem: Decodable, Identifiable {
  let id: String
  let kind: String
  let title: String
  let subtitle: String?
  let meta: String?
  let deepLink: String
  let urgency: Double

  private enum CodingKeys: String, CodingKey {
    case id, kind, title, subtitle, meta, deepLink, urgency
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    id = (try? c.decode(String.self, forKey: .id))
      ?? String((try? c.decode(Int.self, forKey: .id)) ?? 0)
    kind = try c.decode(String.self, forKey: .kind)
    title = try c.decode(String.self, forKey: .title)
    subtitle = try? c.decode(String.self, forKey: .subtitle)
    meta = try? c.decode(String.self, forKey: .meta)
    deepLink = try c.decode(String.self, forKey: .deepLink)
    if let d = try? c.decode(Double.self, forKey: .urgency) {
      urgency = d
    } else if let i = try? c.decode(Int.self, forKey: .urgency) {
      urgency = Double(i)
    } else {
      urgency = 0
    }
  }
}

struct FocusBlock: Decodable {
  let active: Bool
  let title: String?
  let project: String?
  let remainingMinutes: Int?
  let endsAtLabel: String?
  let nextTitle: String?
  let progress: Double?
  let deepLink: String

  private enum CodingKeys: String, CodingKey {
    case active, title, project, remainingMinutes, endsAtLabel, nextTitle, progress, deepLink
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    active = (try? c.decode(Bool.self, forKey: .active)) ?? false
    title = try? c.decode(String.self, forKey: .title)
    project = try? c.decode(String.self, forKey: .project)
    remainingMinutes = (try? c.decode(Int.self, forKey: .remainingMinutes))
      ?? (try? c.decode(Double.self, forKey: .remainingMinutes)).map { Int($0) }
    endsAtLabel = try? c.decode(String.self, forKey: .endsAtLabel)
    nextTitle = try? c.decode(String.self, forKey: .nextTitle)
    if let d = try? c.decode(Double.self, forKey: .progress) {
      progress = d
    } else if let i = try? c.decode(Int.self, forKey: .progress) {
      progress = Double(i)
    } else {
      progress = nil
    }
    deepLink = (try? c.decode(String.self, forKey: .deepLink)) ?? "lifeos://now"
  }
}

struct AttentionBlock: Decodable {
  let count: Int
  let headline: String
  let items: [AttentionItem]
  let deepLink: String

  private enum CodingKeys: String, CodingKey {
    case count, headline, items, deepLink
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    count = (try? c.decode(Int.self, forKey: .count))
      ?? (try? c.decode(Double.self, forKey: .count)).map { Int($0) }
      ?? 0
    headline = (try? c.decode(String.self, forKey: .headline)) ?? "You're clear"
    items = (try? c.decode([AttentionItem].self, forKey: .items)) ?? []
    deepLink = (try? c.decode(String.self, forKey: .deepLink)) ?? "lifeos://now"
  }
}

struct TaskRow: Decodable, Identifiable {
  let id: String
  let title: String
  let when: String
  let deepLink: String

  private enum CodingKeys: String, CodingKey {
    case id, title, when, deepLink
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    if let s = try? c.decode(String.self, forKey: .id) {
      id = s
    } else if let i = try? c.decode(Int.self, forKey: .id) {
      id = String(i)
    } else if let d = try? c.decode(Double.self, forKey: .id) {
      id = String(Int(d))
    } else {
      id = UUID().uuidString
    }
    title = try c.decode(String.self, forKey: .title)
    when = (try? c.decode(String.self, forKey: .when)) ?? ""
    deepLink = (try? c.decode(String.self, forKey: .deepLink)) ?? "lifeos://tasks"
  }
}

struct TasksBlock: Decodable {
  let dueToday: Int
  let highPriority: Int
  let items: [TaskRow]
  let deepLink: String

  private enum CodingKeys: String, CodingKey {
    case dueToday, highPriority, items, deepLink
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    dueToday = (try? c.decode(Int.self, forKey: .dueToday))
      ?? (try? c.decode(Double.self, forKey: .dueToday)).map { Int($0) }
      ?? 0
    highPriority = (try? c.decode(Int.self, forKey: .highPriority))
      ?? (try? c.decode(Double.self, forKey: .highPriority)).map { Int($0) }
      ?? 0
    items = (try? c.decode([TaskRow].self, forKey: .items)) ?? []
    deepLink = (try? c.decode(String.self, forKey: .deepLink)) ?? "lifeos://tasks"
  }
}

struct DeadlineBlock: Decodable {
  let title: String?
  let hoursLeft: Int?
  let label: String?
  let deepLink: String

  private enum CodingKeys: String, CodingKey {
    case title, hoursLeft, label, deepLink
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    title = try? c.decode(String.self, forKey: .title)
    hoursLeft = (try? c.decode(Int.self, forKey: .hoursLeft))
      ?? (try? c.decode(Double.self, forKey: .hoursLeft)).map { Int($0) }
    label = try? c.decode(String.self, forKey: .label)
    deepLink = (try? c.decode(String.self, forKey: .deepLink)) ?? "lifeos://tasks"
  }
}

struct CalendarBlock: Decodable {
  let title: String?
  let whenLabel: String?
  let prep: String?
  let deepLink: String

  private enum CodingKeys: String, CodingKey {
    case title, whenLabel, prep, deepLink
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    title = try? c.decode(String.self, forKey: .title)
    whenLabel = try? c.decode(String.self, forKey: .whenLabel)
    prep = try? c.decode(String.self, forKey: .prep)
    deepLink = (try? c.decode(String.self, forKey: .deepLink)) ?? "lifeos://calendar"
  }
}

struct TodayBlock: Decodable {
  let activeFocus: Int
  let tasksDue: Int
  let eventsSoon: Int
  let deadlineHot: Int
  let deepLink: String

  private enum CodingKeys: String, CodingKey {
    case activeFocus, tasksDue, eventsSoon, deadlineHot, deepLink
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    func int(_ key: CodingKeys) -> Int {
      (try? c.decode(Int.self, forKey: key))
        ?? (try? c.decode(Double.self, forKey: key)).map { Int($0) }
        ?? 0
    }
    activeFocus = int(.activeFocus)
    tasksDue = int(.tasksDue)
    eventsSoon = int(.eventsSoon)
    deadlineHot = int(.deadlineHot)
    deepLink = (try? c.decode(String.self, forKey: .deepLink)) ?? "lifeos://now"
  }
}

struct WidgetSnapshot: Decodable {
  let updatedAt: String
  let focus: FocusBlock
  let attention: AttentionBlock
  let tasks: TasksBlock
  let deadline: DeadlineBlock
  let calendar: CalendarBlock
  let today: TodayBlock
}

enum LifeOSWidgetKind: String {
  case nowFocus = "LifeOSNowFocusWidget"
  case attention = "LifeOSAttentionWidget"
  case tasks = "LifeOSTasksWidget"
  case deadline = "LifeOSDeadlineWidget"
  case calendar = "LifeOSCalendarWidget"
  case today = "LifeOSTodayWidget"
}

enum LifeOSWidgetPalette {
  static let glass = Color(red: 0.969, green: 0.965, blue: 0.953) // #F7F6F3
  static let ink = Color(red: 0.086, green: 0.086, blue: 0.102)
  static let muted = Color(red: 0.45, green: 0.47, blue: 0.51)
  static let now = Color(red: 0.231, green: 0.510, blue: 0.965) // blue
  static let attention = Color(red: 0.961, green: 0.620, blue: 0.043) // orange
  static let tasks = Color(red: 0.133, green: 0.773, blue: 0.369) // green
  static let deadline = Color(red: 0.937, green: 0.267, blue: 0.267) // red
  static let calendar = Color(red: 0.545, green: 0.361, blue: 0.965) // purple
  static let track = Color(red: 0.90, green: 0.90, blue: 0.91)
}

func decodeLifeOSSnapshot(_ data: Data) -> WidgetSnapshot? {
  if let snap = try? JSONDecoder().decode(WidgetSnapshot.self, from: data) {
    return snap
  }
  return nil
}

func loadLifeOSSnapshot() -> WidgetSnapshot? {
  let groupId = "group.com.shafkatsaruwar.lifeos"
  let defaults = UserDefaults(suiteName: groupId)
  if let json = defaults?.string(forKey: "lifeosWidgetSnapshot"),
     let data = json.data(using: .utf8),
     let snap = decodeLifeOSSnapshot(data) {
    return snap
  }
  // File fallbacks (App Group container)
  if let root = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: groupId) {
    for name in ["lifeos-widget-snapshot.json", "lifeosWidgetSnapshot.json"] {
      let url = root.appendingPathComponent(name)
      if let data = try? Data(contentsOf: url), let snap = decodeLifeOSSnapshot(data) {
        return snap
      }
    }
  }
  return nil
}

// MARK: - Timeline

struct LifeOSEntry: TimelineEntry {
  let date: Date
  let kind: LifeOSWidgetKind
  let snapshot: WidgetSnapshot?
}

struct LifeOSProvider: TimelineProvider {
  let kind: LifeOSWidgetKind

  func placeholder(in context: Context) -> LifeOSEntry {
    LifeOSEntry(date: Date(), kind: kind, snapshot: nil)
  }

  func getSnapshot(in context: Context, completion: @escaping (LifeOSEntry) -> Void) {
    completion(LifeOSEntry(date: Date(), kind: kind, snapshot: loadLifeOSSnapshot()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<LifeOSEntry>) -> Void) {
    let entry = LifeOSEntry(date: Date(), kind: kind, snapshot: loadLifeOSSnapshot())
    // Refresh often enough for focus countdown / upcoming events.
    let next = Date().addingTimeInterval(5 * 60)
    completion(Timeline(entries: [entry], policy: .after(next)))
  }
}

// MARK: - Shared chrome

struct WidgetChrome<Content: View>: View {
  let eyebrow: String
  let dot: Color
  let deepLink: String
  @ViewBuilder var content: () -> Content

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack {
        Text(eyebrow)
          .font(.system(size: 11, weight: .bold))
          .tracking(0.8)
          .foregroundStyle(LifeOSWidgetPalette.muted)
        Spacer(minLength: 0)
        Circle()
          .fill(dot)
          .frame(width: 8, height: 8)
      }
      content()
      Spacer(minLength: 0)
    }
    .padding(14)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    // Use widgetURL (not Link-as-root) — Link wrappers often render blank on WidgetKit.
    .widgetURL(URL(string: deepLink) ?? URL(string: "lifeos://now")!)
  }
}

struct ProgressRail: View {
  let progress: Double
  let tint: Color
  let trailing: String

  var body: some View {
    HStack(spacing: 8) {
      GeometryReader { geo in
        ZStack(alignment: .leading) {
          Capsule().fill(LifeOSWidgetPalette.track)
          Capsule()
            .fill(tint)
            .frame(width: max(6, geo.size.width * CGFloat(min(1, max(0, progress)))))
        }
      }
      .frame(height: 6)
      Text(trailing)
        .font(.system(size: 13, weight: .bold))
        .foregroundStyle(LifeOSWidgetPalette.ink)
        .monospacedDigit()
    }
  }
}

struct PillTag: View {
  let color: Color
  let text: String

  var body: some View {
    HStack(spacing: 6) {
      Circle().fill(color).frame(width: 6, height: 6)
      Text(text)
        .font(.system(size: 11, weight: .semibold))
        .foregroundStyle(LifeOSWidgetPalette.ink)
        .lineLimit(1)
    }
    .padding(.horizontal, 8)
    .padding(.vertical, 5)
    .background(Color.white.opacity(0.72))
    .clipShape(Capsule())
  }
}

// MARK: - Views

struct NowFocusView: View {
  let snap: WidgetSnapshot?
  @Environment(\.widgetFamily) private var family

  var body: some View {
    let focus = snap?.focus
    let deep = (focus?.active == true) ? "lifeos://focus" : "lifeos://now"
    WidgetChrome(eyebrow: family == .systemMedium ? "NOW / FOCUS" : "NOW", dot: LifeOSWidgetPalette.now, deepLink: deep) {
      if let focus, focus.active, let title = focus.title {
        Text(title)
          .font(.system(size: family == .systemSmall ? 16 : 20, weight: .bold))
          .foregroundStyle(LifeOSWidgetPalette.ink)
          .lineLimit(family == .systemSmall ? 2 : 2)
        if family != .systemSmall {
          Text(secondaryLine(focus))
            .font(.system(size: 12, weight: .medium))
            .foregroundStyle(LifeOSWidgetPalette.muted)
            .lineLimit(2)
        }
        Spacer(minLength: 6)
        ProgressRail(
          progress: focus.progress ?? 0,
          tint: LifeOSWidgetPalette.now,
          trailing: "\(focus.remainingMinutes ?? 0)m"
        )
      } else if let focus, let title = focus.title {
        Text(family == .systemSmall ? "Finish the next\n25 minutes" : "Finish the next 25 minutes")
          .font(.system(size: family == .systemSmall ? 16 : 20, weight: .bold))
          .foregroundStyle(LifeOSWidgetPalette.ink)
        Text("\(title) — resume when ready")
          .font(.system(size: 12, weight: .medium))
          .foregroundStyle(LifeOSWidgetPalette.muted)
          .lineLimit(2)
      } else {
        Text(family == .systemSmall ? "Nothing in\nfocus" : "Nothing in focus")
          .font(.system(size: 18, weight: .bold))
          .foregroundStyle(LifeOSWidgetPalette.ink)
        Text("Open Now to start a session")
          .font(.system(size: 12, weight: .medium))
          .foregroundStyle(LifeOSWidgetPalette.muted)
      }
    }
  }

  private func secondaryLine(_ focus: FocusBlock) -> String {
    var parts: [String] = []
    if let ends = focus.endsAtLabel { parts.append("Focus ends at \(ends)") }
    if let next = focus.nextTitle { parts.append("next: \(next)") }
    return parts.joined(separator: " · ")
  }
}

struct AttentionView: View {
  let snap: WidgetSnapshot?
  @Environment(\.widgetFamily) private var family

  var body: some View {
    let block = snap?.attention
    WidgetChrome(eyebrow: "ATTENTION", dot: LifeOSWidgetPalette.attention, deepLink: "lifeos://now") {
      Text(block?.headline ?? "You're clear")
        .font(.system(size: family == .systemSmall ? 16 : 20, weight: .bold))
        .foregroundStyle(LifeOSWidgetPalette.ink)
        .lineLimit(2)

      if family == .systemSmall {
        VStack(alignment: .leading, spacing: 6) {
          ForEach((block?.items ?? []).prefix(2)) { item in
            PillTag(color: accent(for: item.kind), text: pillText(item))
          }
        }
        .padding(.top, 4)
      } else if let first = block?.items.first {
        HStack(alignment: .top, spacing: 10) {
          RoundedRectangle(cornerRadius: 2)
            .fill(accent(for: first.kind))
            .frame(width: 3, height: 36)
          VStack(alignment: .leading, spacing: 2) {
            Text(first.title)
              .font(.system(size: 14, weight: .bold))
              .foregroundStyle(LifeOSWidgetPalette.ink)
              .lineLimit(1)
            if let sub = first.subtitle {
              Text(sub)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(LifeOSWidgetPalette.muted)
                .lineLimit(1)
            }
          }
          Spacer(minLength: 0)
          if let meta = first.meta {
            Text(meta.uppercased())
              .font(.system(size: 11, weight: .bold))
              .foregroundStyle(LifeOSWidgetPalette.muted)
          }
        }
        .padding(.top, 4)
      }
    }
  }

  private func accent(for kind: String) -> Color {
    switch kind {
    case "deadline": return LifeOSWidgetPalette.deadline
    case "event": return LifeOSWidgetPalette.calendar
    case "focus": return LifeOSWidgetPalette.now
    default: return LifeOSWidgetPalette.attention
    }
  }

  private func pillText(_ item: AttentionItem) -> String {
    if item.kind == "deadline" { return item.subtitle ?? item.title }
    if item.kind == "event" { return item.title }
    return item.title
  }
}

struct TasksView: View {
  let snap: WidgetSnapshot?
  @Environment(\.widgetFamily) private var family

  var body: some View {
    let block = snap?.tasks
    WidgetChrome(eyebrow: "TASKS", dot: LifeOSWidgetPalette.tasks, deepLink: "lifeos://tasks") {
      if family == .systemSmall {
        Text("\(block?.dueToday ?? 0)")
          .font(.system(size: 44, weight: .bold))
          .foregroundStyle(LifeOSWidgetPalette.ink)
          .padding(.top, 2)
        Text("due today")
          .font(.system(size: 13, weight: .medium))
          .foregroundStyle(LifeOSWidgetPalette.muted)
        Text("\(block?.highPriority ?? 0) high priority")
          .font(.system(size: 12, weight: .medium))
          .foregroundStyle(LifeOSWidgetPalette.muted)
      } else {
        VStack(alignment: .leading, spacing: 8) {
          ForEach((block?.items ?? []).prefix(3)) { item in
            Link(destination: URL(string: item.deepLink) ?? URL(string: "lifeos://tasks")!) {
              HStack(spacing: 10) {
                Circle()
                  .stroke(LifeOSWidgetPalette.track, lineWidth: 1.5)
                  .frame(width: 16, height: 16)
                Text(item.title)
                  .font(.system(size: 14, weight: .semibold))
                  .foregroundStyle(LifeOSWidgetPalette.ink)
                  .lineLimit(1)
                Spacer(minLength: 0)
                Text(item.when)
                  .font(.system(size: 12, weight: .medium))
                  .foregroundStyle(LifeOSWidgetPalette.muted)
              }
            }
          }
          if (block?.items.isEmpty ?? true) {
            Text("No open tasks")
              .font(.system(size: 14, weight: .semibold))
              .foregroundStyle(LifeOSWidgetPalette.muted)
          }
        }
      }
    }
  }
}

struct DeadlineView: View {
  let snap: WidgetSnapshot?

  var body: some View {
    let block = snap?.deadline
    WidgetChrome(eyebrow: "DEADLINE", dot: LifeOSWidgetPalette.deadline, deepLink: "lifeos://tasks") {
      Text(block?.label ?? "—")
        .font(.system(size: 40, weight: .bold))
        .foregroundStyle(LifeOSWidgetPalette.ink)
        .padding(.top, 2)
      Text(block?.title ?? "No hot deadlines")
        .font(.system(size: 13, weight: .medium))
        .foregroundStyle(LifeOSWidgetPalette.muted)
        .lineLimit(2)
    }
  }
}

struct CalendarWidgetView: View {
  let snap: WidgetSnapshot?

  var body: some View {
    let block = snap?.calendar
    WidgetChrome(eyebrow: "CALENDAR", dot: LifeOSWidgetPalette.calendar, deepLink: "lifeos://calendar") {
      Text(block?.whenLabel ?? "Clear")
        .font(.system(size: 20, weight: .bold))
        .foregroundStyle(LifeOSWidgetPalette.ink)
        .lineLimit(2)
        .padding(.top, 2)
      Text(block?.title ?? "No upcoming events")
        .font(.system(size: 13, weight: .medium))
        .foregroundStyle(LifeOSWidgetPalette.muted)
        .lineLimit(2)
      if let prep = block?.prep, !prep.isEmpty {
        Text(prep)
          .font(.system(size: 12, weight: .medium))
          .foregroundStyle(LifeOSWidgetPalette.muted)
          .lineLimit(1)
      }
    }
  }
}

struct TodayView: View {
  let snap: WidgetSnapshot?

  var body: some View {
    let today = snap?.today
    let attention = snap?.attention
    WidgetChrome(eyebrow: "LIFEOS TODAY", dot: LifeOSWidgetPalette.tasks, deepLink: "lifeos://now") {
      Text("Execute today.\nSee tomorrow.")
        .font(.system(size: 22, weight: .bold))
        .foregroundStyle(LifeOSWidgetPalette.ink)

      LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
        statCard("\(today?.activeFocus ?? 0)", "active focus")
        statCard("\(today?.tasksDue ?? 0)", "tasks due")
        statCard("\(today?.eventsSoon ?? 0)", "events soon")
        statCard("\(today?.deadlineHot ?? 0)", "deadline hot")
      }
      .padding(.vertical, 4)

      VStack(alignment: .leading, spacing: 8) {
        ForEach((attention?.items ?? []).prefix(2)) { item in
          HStack(alignment: .top, spacing: 10) {
            RoundedRectangle(cornerRadius: 2)
              .fill(item.kind == "event" ? LifeOSWidgetPalette.calendar : LifeOSWidgetPalette.now)
              .frame(width: 3, height: 34)
            VStack(alignment: .leading, spacing: 2) {
              Text(item.title)
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(LifeOSWidgetPalette.ink)
                .lineLimit(1)
              if let sub = item.subtitle {
                Text(sub)
                  .font(.system(size: 11, weight: .medium))
                  .foregroundStyle(LifeOSWidgetPalette.muted)
                  .lineLimit(1)
              }
            }
            Spacer(minLength: 0)
            if let meta = item.meta {
              Text(meta.uppercased())
                .font(.system(size: 10, weight: .bold))
                .foregroundStyle(LifeOSWidgetPalette.muted)
            }
          }
        }
      }
    }
  }

  private func statCard(_ value: String, _ label: String) -> some View {
    VStack(alignment: .leading, spacing: 2) {
      Text(value)
        .font(.system(size: 22, weight: .bold))
        .foregroundStyle(LifeOSWidgetPalette.ink)
      Text(label)
        .font(.system(size: 11, weight: .medium))
        .foregroundStyle(LifeOSWidgetPalette.muted)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(10)
    .background(Color.white.opacity(0.55))
    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
  }
}

extension View {
  @ViewBuilder
  func lifeOSWidgetBackground() -> some View {
    if #available(iOS 17.0, *) {
      self.containerBackground(for: .widget) {
        LifeOSWidgetPalette.glass
      }
    } else {
      self.background(LifeOSWidgetPalette.glass)
    }
  }
}

struct LifeOSWidgetRoot: View {
  let entry: LifeOSEntry

  var body: some View {
    Group {
      switch entry.kind {
      case .nowFocus: NowFocusView(snap: entry.snapshot)
      case .attention: AttentionView(snap: entry.snapshot)
      case .tasks: TasksView(snap: entry.snapshot)
      case .deadline: DeadlineView(snap: entry.snapshot)
      case .calendar: CalendarWidgetView(snap: entry.snapshot)
      case .today: TodayView(snap: entry.snapshot)
      }
    }
    .lifeOSWidgetBackground()
  }
}

// MARK: - Widget definitions

struct LifeOSNowFocusWidget: Widget {
  let kind = LifeOSWidgetKind.nowFocus.rawValue
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: LifeOSProvider(kind: .nowFocus)) { entry in
      LifeOSWidgetRoot(entry: entry)
    }
    .configurationDisplayName("Now / Focus")
    .description("What’s in focus and how long is left.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

struct LifeOSAttentionWidget: Widget {
  let kind = LifeOSWidgetKind.attention.rawValue
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: LifeOSProvider(kind: .attention)) { entry in
      LifeOSWidgetRoot(entry: entry)
    }
    .configurationDisplayName("Attention")
    .description("The notification brain — only what matters.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

struct LifeOSTasksWidget: Widget {
  let kind = LifeOSWidgetKind.tasks.rawValue
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: LifeOSProvider(kind: .tasks)) { entry in
      LifeOSWidgetRoot(entry: entry)
    }
    .configurationDisplayName("Tasks")
    .description("Due today and next actionable tasks.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

struct LifeOSDeadlineWidget: Widget {
  let kind = LifeOSWidgetKind.deadline.rawValue
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: LifeOSProvider(kind: .deadline)) { entry in
      LifeOSWidgetRoot(entry: entry)
    }
    .configurationDisplayName("Deadline")
    .description("Hottest deadline at a glance.")
    .supportedFamilies([.systemSmall])
  }
}

struct LifeOSCalendarWidget: Widget {
  let kind = LifeOSWidgetKind.calendar.rawValue
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: LifeOSProvider(kind: .calendar)) { entry in
      LifeOSWidgetRoot(entry: entry)
    }
    .configurationDisplayName("Calendar")
    .description("Next event on your calendar.")
    .supportedFamilies([.systemSmall])
  }
}

struct LifeOSTodayWidget: Widget {
  let kind = LifeOSWidgetKind.today.rawValue
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: LifeOSProvider(kind: .today)) { entry in
      LifeOSWidgetRoot(entry: entry)
    }
    .configurationDisplayName("LifeOS Today")
    .description("Execute today — stats plus Attention.")
    .supportedFamilies([.systemLarge])
  }
}

@main
struct LifeOSWidgetsBundle: WidgetBundle {
  var body: some Widget {
    LifeOSAttentionWidget()
    LifeOSNowFocusWidget()
    LifeOSTasksWidget()
    LifeOSDeadlineWidget()
    LifeOSCalendarWidget()
    LifeOSTodayWidget()
  }
}
