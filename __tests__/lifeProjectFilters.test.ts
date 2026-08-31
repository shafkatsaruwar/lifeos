import {
  allOpenWorkAreaTasks,
  filterLifeProjects,
  isWorkLinkedTask,
  isWorkProjectName,
  openTaskCountForWorkProject,
} from "../lifeos-mobile/src/lib/workos";
import type { Project, Task } from "../lifeos-mobile/src/types";

describe("work project life filters", () => {
  const work = {
    projects: [{ id: "wp-1", name: "UML", color: "#625af6", status: "active" as const, createdAt: "2026-01-01" }],
    deliverables: [],
    tasks: [],
    meetings: [],
  };

  const projects: Project[] = [
    { name: "Photography", kind: "finishable" },
    { name: "UML", kind: "finishable", iconName: "BriefcaseBusiness" },
  ];

  it("detects work project names", () => {
    expect(isWorkProjectName("UML", work)).toBe(true);
    expect(isWorkProjectName("Photography", work)).toBe(false);
  });

  it("filters mirrored work projects from life lists", () => {
    expect(filterLifeProjects(projects, work).map((p) => p.name)).toEqual(["Photography"]);
  });

  it("detects work-linked life tasks", () => {
    const task: Task = {
      id: 1,
      title: "Get hours",
      project: "UML",
      status: "Not started",
      checklist: [],
      checklistProgress: [],
    };
    expect(isWorkLinkedTask(task, work)).toBe(true);
  });

  it("counts life tasks assigned to a work project in Work OS totals", () => {
    const lifeTasks: Task[] = [
      {
        id: 1,
        title: "Check Bullhorn Access",
        project: "UML",
        due: "2026-09-01",
        status: "Not started",
        checklist: [],
        checklistProgress: [],
      },
      {
        id: 2,
        title: "Check ServiceNow Access",
        project: "UML",
        due: "2026-09-01",
        status: "Not started",
        checklist: [],
        checklistProgress: [],
      },
    ];
    expect(openTaskCountForWorkProject(work, lifeTasks, work.projects[0])).toBe(2);
    const merged = allOpenWorkAreaTasks(work, lifeTasks);
    expect(merged.workTasks).toHaveLength(0);
    expect(merged.lifeTasks).toHaveLength(2);
  });
});
