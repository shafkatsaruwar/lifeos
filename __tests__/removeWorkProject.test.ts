import { removeWorkProject, type WorkHubState } from "@/app/components/OSDashboards";

describe("removeWorkProject", () => {
  const hub: WorkHubState = {
    projects: [
      { id: "proj-a", name: "Project Sinclair", color: "#625af6", status: "active", createdAt: "2026-01-01" },
      { id: "proj-b", name: "Keep Me", color: "#47a47b", status: "active", createdAt: "2026-01-01" },
    ],
    deliverables: [
      { id: "del-a", projectId: "proj-a", title: "Landing", type: "document", status: "planned", priority: "high", dueDate: "2026-08-01", createdAt: "2026-01-01" },
      { id: "del-b", projectId: "proj-b", title: "Other", type: "code", status: "planned", priority: "low", dueDate: "2026-08-01", createdAt: "2026-01-01" },
    ],
    tasks: [
      { id: "task-a", deliverableId: "del-a", title: "Write copy", status: "done", priority: "medium", createdAt: "2026-01-01" },
      { id: "task-b", deliverableId: "del-b", title: "Keep task", status: "open", priority: "low", createdAt: "2026-01-01" },
    ],
    meetings: [
      { id: "meet-a", title: "Kickoff", start: "2026-08-01T10:00:00", type: "other", projectId: "proj-a", createdAt: "2026-01-01" },
      { id: "meet-b", title: "Standup", start: "2026-08-01T10:00:00", type: "standup", projectId: "proj-b", createdAt: "2026-01-01" },
    ],
  };

  it("removes the project and cascades related work items", () => {
    const next = removeWorkProject(hub, "proj-a");
    expect(next.projects.map((p) => p.id)).toEqual(["proj-b"]);
    expect(next.deliverables.map((d) => d.id)).toEqual(["del-b"]);
    expect(next.tasks.map((t) => t.id)).toEqual(["task-b"]);
    expect(next.meetings.map((m) => m.id)).toEqual(["meet-b"]);
  });

  it("is a no-op for unknown ids", () => {
    const next = removeWorkProject(hub, "missing");
    expect(next.projects).toHaveLength(2);
    expect(next.tasks).toHaveLength(2);
  });
});
