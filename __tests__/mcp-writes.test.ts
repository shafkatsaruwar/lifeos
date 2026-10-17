import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { toDateKey } from "@/lib/helpers";
import { resetFirebaseAuthCache } from "@/lib/mcp/firebaseAuth";
import { parseAllowWrites, readStoreConfig } from "@/lib/mcp/store";
import { callTool } from "@/lib/mcp/tools";
import { executeWrite } from "@/lib/mcp/writes";
import { normalizeWorkspace } from "@/lib/mcp/workspace";
import type { StoreConfig } from "@/lib/mcp/store";

type Call = { method: string; path: string; body?: unknown; ifMatch?: string };

function httpResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  const lower = Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => lower[name.toLowerCase()] },
    json: async () => body,
  } as unknown as Response;
}

function payload(result: { content: Array<{ text: string }>; isError?: boolean }) {
  if (result.isError) return result.content[0].text;
  return JSON.parse(result.content[0].text);
}

function liveConfig(fetchImpl: typeof fetch, extra: Partial<StoreConfig> = {}): StoreConfig {
  return {
    allowWrites: true,
    firebaseDbUrl: "https://lifeos-test.firebaseio.com",
    userId: "user-1",
    firebaseAuth: "id-token-secret",
    fetchImpl,
    cwd: "/tmp/lifeos-mcp-empty",
    home: "/tmp/lifeos-mcp-empty-home",
    ...extra,
  };
}

function mockDb(seed: Record<string, unknown> = {}) {
  const data: Record<string, unknown> = { ...seed };
  const etags: Record<string, string> = {};
  const calls: Call[] = [];
  let conflictKey: string | null = null;
  let denyKey: { key: string; status: number } | null = null;

  const fetchImpl: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const path = url.pathname.replace(/^\//, "").replace(/\.json$/, "");
    if (path === "users/user-1" || path.split("/").length < 3 || /gmail|outlook|icloud/.test(path)) {
      throw new Error(`refusing unexpected path ${path}`);
    }
    const key = path.split("/").pop() || "";
    const method = (init?.method || "GET").toUpperCase();
    const headers = new Headers(init?.headers);
    const call: Call = { method, path, ifMatch: headers.get("if-match") || undefined };
    if (init?.body != null) call.body = JSON.parse(String(init.body));
    calls.push(call);

    if (denyKey && denyKey.key === key) {
      return httpResponse(denyKey.status, { error: "Permission denied" });
    }
    if (method === "GET") {
      etags[key] = etags[key] || `"${key}-1"`;
      return httpResponse(200, data[key] ?? null, { etag: etags[key] });
    }
    if (method === "PUT") {
      if (conflictKey === key) {
        conflictKey = null;
        etags[key] = `"${key}-conflict"`;
        return httpResponse(412, { error: "etag" }, { etag: etags[key] });
      }
      data[key] = call.body;
      etags[key] = `"${key}-2"`;
      return httpResponse(200, data[key], { etag: etags[key] });
    }
    return httpResponse(500, { error: "nope" });
  };

  return {
    fetchImpl,
    data,
    calls,
    puts: () => calls.filter((call) => call.method === "PUT"),
    armConflict(key: string) {
      conflictKey = key;
    },
    deny(key: string, status: number) {
      denyKey = { key, status };
    },
  };
}

describe("LIFEOS_ALLOW_WRITES", () => {
  it("stays off unless the value is an explicit opt-in", () => {
    expect(parseAllowWrites(undefined)).toBe(false);
    expect(parseAllowWrites("")).toBe(false);
    expect(parseAllowWrites("0")).toBe(false);
    expect(parseAllowWrites("false")).toBe(false);
    for (const value of ["1", "true", "YES", "on"]) {
      expect(parseAllowWrites(value)).toBe(true);
    }
    expect(readStoreConfig({}).allowWrites).toBe(false);
    expect(readStoreConfig({ LIFEOS_ALLOW_WRITES: "1" }).allowWrites).toBe(true);
  });
});

describe("MCP write tools", () => {
  beforeEach(() => {
    resetFirebaseAuthCache();
  });

  it("refuses when writes are off, before it mentions file mode", async () => {
    const db = mockDb();
    const result = await executeWrite("create_task", { title: "Nope" }, liveConfig(db.fetchImpl, { allowWrites: false, dataPath: "/tmp/export.json" }));
    expect(result.isError).toBe(true);
    expect(payload(result)).toMatch(/LIFEOS_ALLOW_WRITES/);
    expect(db.puts()).toHaveLength(0);
  });

  it("refuses export-file mode and does not edit the file", async () => {
    const dir = mkdtempSync(join(tmpdir(), "lifeos-write-file-"));
    const file = join(dir, "export.json");
    writeFileSync(file, '{"tasks":[{"id":1,"title":"Keep"}]}\n');
    const before = readFileSync(file, "utf8");
    const db = mockDb();
    const result = await executeWrite("create_task", { title: "Nope" }, liveConfig(db.fetchImpl, { dataPath: file }));
    expect(result.isError).toBe(true);
    expect(payload(result)).toMatch(/export-file mode/);
    expect(payload(result)).toMatch(/never modified/);
    expect(readFileSync(file, "utf8")).toBe(before);
    expect(db.calls).toHaveLength(0);
  });

  it("refuses a discovered snapshot even when the flag is on", async () => {
    const home = mkdtempSync(join(tmpdir(), "lifeos-write-home-"));
    mkdirSync(join(home, ".lifeos"));
    const file = join(home, ".lifeos", "export.json");
    writeFileSync(file, "{}\n");
    const db = mockDb();
    const result = await executeWrite(
      "create_note",
      { title: "Nope" },
      liveConfig(db.fetchImpl, { firebaseDbUrl: undefined, userId: undefined, firebaseAuth: undefined, home, cwd: mkdtempSync(join(tmpdir(), "lifeos-write-cwd-")) }),
    );
    expect(result.isError).toBe(true);
    expect(payload(result)).toMatch(/snapshot file/);
    expect(readFileSync(file, "utf8")).toBe("{}\n");
    expect(db.calls).toHaveLength(0);
  });

  it("creates a task on users/{uid}/tasks and keeps sibling rows", async () => {
    const db = mockDb({
      tasks: [{ id: 1, title: "Keep me", project: "Inbox", checklist: ["stay"] }],
      projects: [{ name: "LifeOS", color: "#111111", kind: "finishable" }],
      classes: [{ id: "chem", code: "CHEM 201", color: "#00aa00" }],
      settings: { defaultFocusMinutes: 30, defaultEnergy: "Low" },
    });
    const created = await executeWrite("create_task", { title: "Write the brief", project: "LifeOS", due: "2026-10-20", nextAction: "Outline" }, liveConfig(db.fetchImpl));
    expect(created.isError).toBeUndefined();
    const task = payload(created);
    expect(task).toMatchObject({
      title: "Write the brief",
      project: "LifeOS",
      color: "#111111",
      due: "2026-10-20",
      priority: "Medium",
      focusMinutes: 30,
      energy: "Low",
      status: "Not started",
      notes: "",
      handoffNote: "",
      nextAction: "Outline",
      customProperties: [],
      submission: "",
      checklist: [],
      checklistProgress: [],
      focusSessionStarted: false,
      focusSessionRunning: false,
      focusHalfwayPrompted: false,
    });
    expect(task.done).toBeUndefined();
    expect(task.canceled).toBeUndefined();
    expect(typeof task.id).toBe("number");
    const put = db.puts().find((call) => call.path.endsWith("/tasks"));
    expect(put?.path).toBe("users/user-1/tasks");
    expect(db.calls.some((call) => call.path === "users/user-1" || call.path.includes("gmail"))).toBe(false);
    const stored = db.data.tasks as Array<Record<string, unknown>>;
    expect(stored).toHaveLength(2);
    expect(stored[0]).toMatchObject({ id: 1, checklist: ["stay"] });
    expect(JSON.stringify(put?.body)).not.toContain("id-token-secret");

    const linked = await executeWrite("create_task", { title: "Lab", classId: "chem" }, liveConfig(db.fetchImpl));
    expect(payload(linked)).toMatchObject({ project: "Inbox", classId: "chem", academicType: "Assignment", color: "#00aa00" });

    const missing = await executeWrite("create_task", { title: "Orphan", project: "Nope" }, liveConfig(db.fetchImpl));
    expect(missing.isError).toBe(true);
    expect(payload(missing)).toMatch(/No project named/);
  });

  it("updates, completes, uncompletes, and deletes one task", async () => {
    const db = mockDb({
      tasks: [{ id: 7, title: "Draft", project: "Inbox", status: "Not started", recurringDays: 7, focusSessionRunning: true, checklist: ["a"] }],
      projects: [],
      classes: [],
      settings: { nowTaskId: 7, momentumLog: [] },
    });
    const updated = await executeWrite("update_task", { id: 7, status: "Done", notes: "shipped" }, liveConfig(db.fetchImpl));
    expect(payload(updated)).toMatchObject({ status: "Done", done: true, canceled: false, notes: "shipped" });
    expect(payload(updated).completedAt).toBeUndefined();

    db.data.tasks = [{ id: 7, title: "Draft", project: "Inbox", status: "Not started", recurringDays: 7, focusSessionRunning: true, checklist: ["a"] }];
    const completed = await executeWrite("complete_task", { id: 7 }, liveConfig(db.fetchImpl));
    const body = payload(completed);
    expect(body.task).toMatchObject({ done: true, canceled: false, status: "Done" });
    expect(body.task.completedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    const nextDue = new Date();
    nextDue.setDate(nextDue.getDate() + 7);
    const expectedDue = toDateKey(nextDue);
    expect(body.spawned).toMatchObject({
      due: expectedDue,
      done: false,
      status: "Not started",
      focusSessionStarted: false,
      focusSessionRunning: true,
      checklistProgress: [false],
    });
    expect(body.spawned.completedAt).toBeUndefined();
    expect(body.spawned.focusRemainingSeconds).toBeUndefined();
    const order = db.puts().map((call) => call.path.split("/").pop());
    const settingsAt = order.lastIndexOf("settings");
    const tasksAt = order.lastIndexOf("tasks");
    expect(settingsAt).toBeGreaterThanOrEqual(0);
    expect(tasksAt).toBeGreaterThan(settingsAt);
    expect(db.data.settings).toMatchObject({ nowTaskId: null });
    expect((db.data.settings as { momentumLog: Array<{ type: string }> }).momentumLog[0].type).toBe("done");

    const opened = await executeWrite("uncomplete_task", { id: 7 }, liveConfig(db.fetchImpl));
    expect(payload(opened).task).toMatchObject({ done: false, canceled: false, status: "Not started" });
    expect(payload(opened).task.completedAt).toBeUndefined();

    const bulk = await executeWrite("delete_task", { ids: [7] }, liveConfig(db.fetchImpl));
    expect(bulk.isError).toBe(true);
    expect(payload(bulk)).toMatch(/Bulk delete/);
    const removed = await executeWrite("delete_task", { id: 7 }, liveConfig(db.fetchImpl));
    expect(payload(removed).deleted).toBe(true);
    expect((db.data.tasks as Array<{ id: number }>).some((task) => task.id === 7)).toBe(false);
    expect((db.data.tasks as Array<{ status: string }>).some((task) => task.status === "Not started")).toBe(true);
  });

  it("retries a task write once when Firebase returns 412", async () => {
    const db = mockDb({ tasks: [{ id: 1, title: "Keep" }], projects: [], classes: [], settings: {} });
    db.armConflict("tasks");
    const result = await executeWrite("create_task", { title: "Retry me" }, liveConfig(db.fetchImpl));
    expect(result.isError).toBeUndefined();
    const taskPuts = db.puts().filter((call) => call.path.endsWith("/tasks"));
    expect(taskPuts).toHaveLength(2);
    expect((db.data.tasks as Array<{ title: string }>).some((task) => task.title === "Retry me")).toBe(true);
  });

  it("explains a permission denial without leaking the token", async () => {
    const db = mockDb({ tasks: [] });
    db.deny("tasks", 403);
    const result = await executeWrite("create_task", { title: "Blocked" }, liveConfig(db.fetchImpl));
    expect(result.isError).toBe(true);
    const message = String(payload(result));
    expect(message).toMatch(/auth\.uid == \$uid/);
    expect(message).toMatch(/database\.rules\.json/);
    expect(message).not.toMatch(/id-token-secret/);
    expect(message).not.toMatch(/firebaseio/);
  });

  it("creates a LifeOS event with a local datetime and no Z", async () => {
    const db = mockDb({ calendar: [{ id: "evt-keep", title: "Stay", source: "iCal", start: "2026-01-01T00:00" }] });
    const result = await executeWrite("create_event", { title: "Standup", start: "2026-10-17", location: "Lab" }, liveConfig(db.fetchImpl));
    const event = payload(result);
    expect(event.id).toMatch(/^lifeos-\d+$/);
    expect(event).toMatchObject({ title: "Standup", start: "2026-10-17T09:00", end: "2026-10-17T10:00", source: "LifeOS", color: "#665df6" });
    expect(event.start).not.toMatch(/Z/);
    expect(db.puts()[0].path).toBe("users/user-1/calendar");
    expect((db.data.calendar as unknown[]).length).toBe(2);

    const renamed = await executeWrite("update_event", { id: event.id, title: "Standup 2" }, liveConfig(db.fetchImpl));
    expect(payload(renamed)).toMatchObject({ title: "Standup 2", source: "LifeOS" });
    const removed = await executeWrite("delete_event", { id: event.id }, liveConfig(db.fetchImpl));
    expect(payload(removed).deleted).toBe(true);
  });

  it("creates a project the web loader accepts and renames linked tasks", async () => {
    const db = mockDb({
      projects: [],
      tasks: [{ id: 3, title: "Linked", project: "Ops", color: "#000000" }],
      notes: [{ id: "n1", title: "Log", projectName: "Ops", body: "", updatedAt: "2026-01-01T00:00:00.000Z" }],
    });
    const created = await executeWrite("create_project", { name: "Ops", kind: "maintenance" }, liveConfig(db.fetchImpl));
    expect(payload(created)).toEqual({
      name: "Ops",
      desc: "An ongoing system to keep healthy.",
      progress: 100,
      color: "#625af6",
      iconName: "FolderKanban",
      tasks: 0,
      kind: "maintenance",
    });
    const duplicate = await executeWrite("create_project", { name: "Ops" }, liveConfig(db.fetchImpl));
    expect(duplicate.isError).toBe(true);

    const renamed = await executeWrite("update_project", { name: "Ops", newName: "Ops 2", color: "#abcdef" }, liveConfig(db.fetchImpl));
    expect(payload(renamed).name).toBe("Ops 2");
    expect(db.data.tasks).toEqual([expect.objectContaining({ project: "Ops 2", color: "#abcdef" })]);
    expect(db.data.notes).toEqual([expect.objectContaining({ projectName: "Ops 2" })]);
    const order = db.puts().map((call) => call.path.split("/").pop());
    const renamePuts = order.slice(order.indexOf("tasks"));
    expect(renamePuts.slice(0, 3)).toEqual(["tasks", "notes", "projects"]);
  });

  it("prepends a note and stamps updatedAt", async () => {
    const db = mockDb({ notes: [{ id: "old", title: "Old", body: "", updatedAt: "2026-01-01T00:00:00.000Z" }] });
    const created = await executeWrite("create_note", { title: "Fresh", body: "hello", template: "lined" }, liveConfig(db.fetchImpl));
    const note = payload(created);
    expect(note.title).toBe("Fresh");
    expect(note.body).toBe("hello");
    expect(note.template).toBe("lined");
    expect(note.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect((db.data.notes as Array<{ id: string }>)[0].id).toBe(note.id);
    expect((db.data.notes as Array<{ id: string }>)[1].id).toBe("old");
    const edited = await executeWrite("update_note", { id: note.id, body: "edited" }, liveConfig(db.fetchImpl));
    expect(payload(edited).body).toBe("edited");
    expect(payload(edited).updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe("career MCP tools", () => {
  beforeEach(() => {
    resetFirebaseAuthCache();
  });

  it("upserts tracker rows idempotently onto users/{uid}/career", async () => {
    const db = mockDb({
      career: {
        version: 1,
        companies: { "0": { id: "co-keep", name: "KeepCo", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" } },
        applications: {
          "0": {
            id: "app-keep",
            companyId: "co-keep",
            jobTitle: "Keeper",
            stageId: "saved",
            outcome: "none",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        },
        interviews: [{ id: "int-1", applicationId: "app-keep", title: "Screen" }],
        extraFlag: "keep-me",
        gmail: { encrypted: "secret-blob" },
      },
    });
    const rows = [
      {
        company: "Acme",
        role: "Engineer",
        status: "Rejected",
        dateApplied: "1/2/2026",
        link: "https://Jobs.Example.com/role/1/",
        salary: "120k",
        location: "NYC",
        notes: "referred",
      },
      {
        company: "Beta",
        role: "Designer",
        status: "Phone Screen",
        appliedAt: "2026-03-04",
        link: "https://beta.example/jobs/2",
      },
      { company: "Broken" },
    ];
    const first = await executeWrite("bulk_import_career", { entries: rows }, liveConfig(db.fetchImpl));
    expect(first.isError).toBeUndefined();
    const summary = payload(first);
    expect(summary.created).toBe(2);
    expect(summary.failed).toEqual([expect.objectContaining({ index: 2 })]);
    expect(db.puts()).toHaveLength(1);
    expect(db.puts()[0].path).toBe("users/user-1/career");
    const written = db.data.career as {
      applications: Array<Record<string, unknown>>;
      interviews: Array<{ id: string }>;
      extraFlag?: string;
      gmail?: unknown;
      companies: Array<{ name: string }>;
    };
    expect(Array.isArray(written.applications)).toBe(true);
    expect(written.applications.map((app) => app.jobTitle)).toEqual(expect.arrayContaining(["Engineer", "Designer", "Keeper"]));
    const acme = written.applications.find((app) => app.jobTitle === "Engineer")!;
    expect(acme).toMatchObject({
      stageId: "rejected",
      outcome: "none",
      appliedAt: "2026-01-02",
      salaryMin: 120000,
      salaryCurrency: "USD",
      location: "NYC",
      notes: "referred",
      jobUrl: "https://Jobs.Example.com/role/1/",
    });
    const beta = written.applications.find((app) => app.jobTitle === "Designer")!;
    expect(beta.stageId).toBe("recruiter_screening");
    expect(written.interviews).toEqual([{ id: "int-1", applicationId: "app-keep", title: "Screen" }]);
    expect(written.extraFlag).toBe("keep-me");
    expect(written.gmail).toBeUndefined();
    expect(JSON.stringify(written)).not.toContain("secret-blob");
    expect(written.companies.map((company) => company.name)).toEqual(expect.arrayContaining(["KeepCo", "Acme", "Beta"]));
    const acmeUpdatedAt = acme.updatedAt;

    const again = await executeWrite("bulk_import_career", { entries: rows.slice(0, 2) }, liveConfig(db.fetchImpl));
    const second = payload(again);
    expect(second.created).toBe(0);
    expect(second.updated).toBe(0);
    expect(second.unchanged).toBe(2);
    expect(second.entries.map((entry: { id: string }) => entry.id).sort()).toEqual([acme.id, beta.id].sort());
    expect(db.puts()).toHaveLength(1);
    const still = (db.data.career as { applications: Array<Record<string, unknown>> }).applications.find((app) => app.id === acme.id);
    expect(still?.updatedAt).toBe(acmeUpdatedAt);

    const moved = await executeWrite(
      "update_career_entry",
      { link: "https://jobs.example.com/role/1", status: "Offer" },
      liveConfig(db.fetchImpl),
    );
    expect(payload(moved).application).toMatchObject({ id: acme.id, stageId: "offer", outcome: "offer", notes: "referred" });

    const byName = await executeWrite(
      "update_career_entry",
      { company: "acme", role: "Engineer", status: "Offer" },
      liveConfig(db.fetchImpl),
    );
    expect(payload(byName).action).toBe("unchanged");
    expect(db.puts()).toHaveLength(2);

    const duplicate = await executeWrite(
      "create_career_entry",
      { company: "ACME", role: "Engineer" },
      liveConfig(db.fetchImpl),
    );
    expect(duplicate.isError).toBe(true);
    expect(payload(duplicate)).toMatch(/already exists/);

    const empty = await executeWrite("bulk_import_career", { entries: [] }, liveConfig(db.fetchImpl));
    expect(empty.isError).toBe(true);
  });

  it("lists career applications with status, date, and company filters", () => {
    const workspace = normalizeWorkspace(
      {
        career: {
          companies: [
            { id: "co-1", name: "Acme", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
            { id: "co-2", name: "Beta Labs", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
          ],
          applications: [
            {
              id: "app-1",
              companyId: "co-1",
              jobTitle: "Engineer",
              stageId: "rejected",
              appliedAt: "2026-01-02",
              updatedAt: "2026-04-01T00:00:00.000Z",
              createdAt: "2026-01-02T00:00:00.000Z",
            },
            {
              id: "app-2",
              companyId: "co-2",
              jobTitle: "Designer",
              stageId: "applied",
              appliedAt: "2026-03-04",
              updatedAt: "2026-03-05T00:00:00.000Z",
              createdAt: "2026-03-04T00:00:00.000Z",
            },
            {
              id: "app-3",
              companyId: "co-1",
              jobTitle: "No date",
              stageId: "saved",
              updatedAt: "2026-05-01T00:00:00.000Z",
              createdAt: "2026-05-01T00:00:00.000Z",
            },
          ],
        },
      },
      { source: "file", sourcePath: "/tmp/export.json" },
    );
    const listed = payload(callTool("list_career", { status: "Rejected", company: "acm", sort: "applied" }, workspace));
    expect(listed.total).toBe(1);
    expect(listed.applications[0]).toMatchObject({ id: "app-1", company: "Acme", stageId: "rejected", stage: "Rejected" });

    const ranged = payload(callTool("list_career", { appliedAfter: "2026-02-01", appliedBefore: "2026-12-31", sort: "status" }, workspace));
    expect(ranged.applications.map((app: { id: string }) => app.id)).toEqual(["app-2"]);

    const searched = payload(callTool("search_lifeos", { query: "Designer" }, workspace));
    expect(searched.hits).toEqual([expect.objectContaining({ type: "career_application", id: "app-2", extra: "Beta Labs" })]);
    expect(callTool("list_career", { status: "ghosted" }, workspace).isError).toBe(true);
  });
});
