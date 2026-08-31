import { buildTasksFromNote, parseActionItems, stripNoteBody, noteSpaceValue } from "@/lib/noteToTask";

describe("noteToTask", () => {
  it("strips HTML from note bodies", () => {
    expect(stripNoteBody("<p>Hello <strong>world</strong></p>")).toBe("Hello world");
  });

  it("builds a single task from a titled note", () => {
    const [task] = buildTasksFromNote(
      { title: "Follow up", body: "Email Sarah about the contract.", projectName: "Career" },
      { defaultFocusMinutes: 45, defaultEnergy: "Medium" },
    );
    expect(task.title).toBe("Follow up");
    expect(task.notes).toContain("Email Sarah");
    expect(task.spaceValue).toBe("project:Career");
  });

  it("fans out meeting action items into multiple tasks", () => {
    const tasks = buildTasksFromNote(
      {
        title: "Standup",
        template: "meeting",
        body: "ATTENDEES:\nTeam\nACTION ITEMS:\nShip login fix\nUpdate docs",
      },
      { defaultFocusMinutes: 45, defaultEnergy: "Medium" },
    );
    expect(tasks.map((t) => t.title)).toEqual(["Ship login fix", "Update docs"]);
  });

  it("parses action items from plain meeting notes", () => {
    expect(parseActionItems("ACTION ITEMS:\n- One\n- Two")).toEqual(["One", "Two"]);
  });

  it("maps class-linked notes to class space values", () => {
    expect(noteSpaceValue({ title: "", body: "", classId: "abc123" })).toBe("class:abc123");
  });
});
