import UIKit
import UniformTypeIdentifiers

final class ShareViewController: UIViewController {
  private let appGroup = "group.com.shafkatsaruwar.lifeos"
  private let queueKey = "lifeosPendingShares"

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .systemBackground
    Task { await ingestAndHandoff() }
  }

  private func ingestAndHandoff() async {
    let payload = await collectPayload()
    if let payload {
      enqueue(payload)
    }
    openHost()
    extensionContext?.completeRequest(returningItems: nil)
  }

  private func collectPayload() async -> [String: String]? {
    guard let items = extensionContext?.inputItems as? [NSExtensionItem] else { return nil }

    for item in items {
      guard let attachments = item.attachments else { continue }
      for provider in attachments {
        if provider.hasItemConformingToTypeIdentifier(UTType.fileURL.identifier),
           let url = await loadFileURL(from: provider),
           url.pathExtension.lowercased() == "ics",
           let ics = try? String(contentsOf: url, encoding: .utf8)
        {
          return [
            "id": UUID().uuidString,
            "at": ISO8601DateFormatter().string(from: Date()),
            "kind": "ics",
            "text": ics,
            "filename": url.lastPathComponent,
          ]
        }

        if provider.hasItemConformingToTypeIdentifier("com.apple.ical.ics")
          || provider.hasItemConformingToTypeIdentifier(UTType.calendarEvent.identifier)
          || provider.hasItemConformingToTypeIdentifier(UTType.data.identifier)
        {
          if let ics = await loadString(from: provider, types: [
            "com.apple.ical.ics",
            UTType.calendarEvent.identifier,
            UTType.plainText.identifier,
            UTType.utf8PlainText.identifier,
            UTType.data.identifier,
            UTType.fileURL.identifier,
          ]),
             ics.uppercased().contains("BEGIN:VCALENDAR") || ics.uppercased().contains("BEGIN:VEVENT")
          {
            return [
              "id": UUID().uuidString,
              "at": ISO8601DateFormatter().string(from: Date()),
              "kind": "ics",
              "text": ics,
              "filename": "share.ics",
            ]
          }
        }

        if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier),
           let url = await loadURL(from: provider)
        {
          return [
            "id": UUID().uuidString,
            "at": ISO8601DateFormatter().string(from: Date()),
            "kind": "url",
            "text": url.absoluteString,
          ]
        }

        if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier),
           let text = await loadString(from: provider, types: [UTType.plainText.identifier])
        {
          return [
            "id": UUID().uuidString,
            "at": ISO8601DateFormatter().string(from: Date()),
            "kind": "text",
            "text": text,
          ]
        }
      }
    }

    if let text = items.first?.attributedContentText?.string, !text.isEmpty {
      return [
        "id": UUID().uuidString,
        "at": ISO8601DateFormatter().string(from: Date()),
        "kind": "text",
        "text": text,
      ]
    }
    return nil
  }

  private func loadString(from provider: NSItemProvider, types: [String]) async -> String? {
    for type in types {
      guard provider.hasItemConformingToTypeIdentifier(type) else { continue }
      do {
        let item = try await provider.loadItem(forTypeIdentifier: type)
        if let text = item as? String { return text }
        if let data = item as? Data, let text = String(data: data, encoding: .utf8) { return text }
        if let url = item as? URL {
          if url.isFileURL, let text = try? String(contentsOf: url, encoding: .utf8) { return text }
          return url.absoluteString
        }
      } catch {
        continue
      }
    }
    return nil
  }

  private func loadFileURL(from provider: NSItemProvider) async -> URL? {
    do {
      let item = try await provider.loadItem(forTypeIdentifier: UTType.fileURL.identifier)
      if let url = item as? URL { return url }
      if let data = item as? Data, let url = URL(dataRepresentation: data, relativeTo: nil) { return url }
    } catch {
      return nil
    }
    return nil
  }

  private func loadURL(from provider: NSItemProvider) async -> URL? {
    do {
      let item = try await provider.loadItem(forTypeIdentifier: UTType.url.identifier)
      return item as? URL
    } catch {
      return nil
    }
  }

  private func enqueue(_ payload: [String: String]) {
    guard let defaults = UserDefaults(suiteName: appGroup) else { return }
    var queue: [[String: String]] = []
    if let data = defaults.data(forKey: queueKey),
       let parsed = try? JSONSerialization.jsonObject(with: data) as? [[String: String]]
    {
      queue = parsed
    } else if let raw = defaults.string(forKey: queueKey),
              let data = raw.data(using: .utf8),
              let parsed = try? JSONSerialization.jsonObject(with: data) as? [[String: String]]
    {
      queue = parsed
    }
    queue.append(payload)
    if let data = try? JSONSerialization.data(withJSONObject: queue),
       let json = String(data: data, encoding: .utf8)
    {
      defaults.set(json, forKey: queueKey)
      defaults.synchronize()
      if let root = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup) {
        try? data.write(to: root.appendingPathComponent("\(queueKey).json"), options: .atomic)
      }
    }
  }

  private func openHost() {
    guard let url = URL(string: "lifeos://share") else { return }
    var responder: UIResponder? = self
    while let current = responder {
      if let application = current as? UIApplication {
        application.open(url, options: [:], completionHandler: nil)
        return
      }
      responder = current.next
    }
    extensionContext?.open(url, completionHandler: nil)
  }
}
