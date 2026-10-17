import {
  coalesceEventMeetingUrl,
  detectMeetingProvider,
  eventNotesLabel,
  eventPlaceLabel,
  extractMeetingUrl,
  meetingJoinLabel,
  resolveEventMeeting,
} from "../lib/meetingLinks";

describe("meetingLinks", () => {
  it("detects Zoom, Teams, and Webex hosts", () => {
    expect(detectMeetingProvider("https://us05web.zoom.us/j/123456789")).toBe("zoom");
    expect(detectMeetingProvider("https://teams.microsoft.com/l/meetup-join/19%3ameeting")).toBe("teams");
    expect(detectMeetingProvider("https://company.webex.com/meet/alice")).toBe("webex");
    expect(detectMeetingProvider("https://example.com/room")).toBeNull();
  });

  it("labels join actions without exposing the raw URL", () => {
    expect(meetingJoinLabel("zoom")).toBe("Join with Zoom");
    expect(meetingJoinLabel("teams")).toBe("Join with Teams");
    expect(meetingJoinLabel("webex")).toBe("Join with Webex");
  });

  it("extracts a meeting URL buried in notes", () => {
    const notes = "Bring slides. Zoom: https://zoom.us/j/555111222?pwd=abc Thanks!";
    expect(extractMeetingUrl(notes)).toBe("https://zoom.us/j/555111222?pwd=abc");
  });

  it("resolves meeting from url, location, or notes in priority order", () => {
    expect(
      resolveEventMeeting({
        url: "https://teams.microsoft.com/l/meetup-join/abc",
        location: "Room 12",
        notes: "https://zoom.us/j/1",
      })?.label,
    ).toBe("Join with Teams");
    expect(
      resolveEventMeeting({
        location: "https://company.webex.com/meet/bob",
      })?.label,
    ).toBe("Join with Webex");
  });

  it("hides meeting URLs from the place label", () => {
    expect(eventPlaceLabel("Library 204")).toBe("Library 204");
    expect(eventPlaceLabel("https://zoom.us/j/999")).toBeNull();
  });

  it("strips meeting URLs from notes while keeping other text", () => {
    expect(eventNotesLabel("Bring slides. https://zoom.us/j/1 Thanks!")).toBe("Bring slides. Thanks!");
    expect(eventNotesLabel("https://teams.microsoft.com/l/meetup-join/abc")).toBeNull();
  });

  it("coalesces a meeting URL from location or notes when url is empty", () => {
    expect(
      coalesceEventMeetingUrl({
        location: "https://company.webex.com/meet/bob",
      }),
    ).toBe("https://company.webex.com/meet/bob");
    expect(
      coalesceEventMeetingUrl({
        url: "https://example.com/doc",
        notes: "https://zoom.us/j/1",
      }),
    ).toBe("https://example.com/doc");
  });
});
