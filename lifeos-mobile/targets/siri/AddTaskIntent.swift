import AppIntents
import Foundation

/// Siri / Shortcuts: “Add a task in LifeOS called …”
/// Opens the app (`openAppWhenRun`) and queues the title in the App Group.
/// JS `SiriTaskBridge` drains the queue and writes the Firebase task.
@available(iOS 16.0, *)
struct AddTaskIntent: AppIntent {
  static var title: LocalizedStringResource = "Add Task in LifeOS"
  static var description = IntentDescription("Creates a new task in your LifeOS Inbox.")
  /// Brings LifeOS to the foreground so the JS bridge can create the task.
  static var openAppWhenRun: Bool = true

  @Parameter(title: "Title", description: "What should the task be called?", requestValueDialog: "What should the task be called?")
  var title: String

  static var parameterSummary: some ParameterSummary {
    Summary("Add \(\.$title) in LifeOS")
  }

  @MainActor
  func perform() async throws -> some IntentResult {
    let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else {
      throw $title.needsValueError("What should the task be called?")
    }

    enqueuePendingTask(title: trimmed)
    return .result()
  }

  private func enqueuePendingTask(title: String) {
    let groupId = "group.com.shafkatsaruwar.lifeos"
    let key = "lifeosPendingSiriTasks"
    let entry: [String: Any] = [
      "title": title,
      "createdAt": ISO8601DateFormatter().string(from: Date()),
      "id": UUID().uuidString,
    ]

    let defaults = UserDefaults(suiteName: groupId)
    var pending: [[String: Any]] = []
    if let existing = defaults?.string(forKey: key),
       let data = existing.data(using: .utf8),
       let arr = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
      pending = arr
    }
    pending.append(entry)

    if let data = try? JSONSerialization.data(withJSONObject: pending),
       let json = String(data: data, encoding: .utf8) {
      defaults?.set(json, forKey: key)
      defaults?.synchronize()
      if let root = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: groupId) {
        try? data.write(to: root.appendingPathComponent("\(key).json"), options: .atomic)
      }
    }
  }
}

@available(iOS 16.0, *)
struct LifeOSAppShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    // Xcode 26 / new App Intents export only allows AppEntity/AppEnum in phrase
    // variables — not bare String. Siri will ask for the title via @Parameter.
    AppShortcut(
      intent: AddTaskIntent(),
      phrases: [
        "Add a task in \(.applicationName)",
        "Create a task in \(.applicationName)",
        "Add something to \(.applicationName)",
      ],
      shortTitle: "Add Task",
      systemImageName: "checkmark.circle"
    )
  }
}
