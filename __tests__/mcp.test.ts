import { generateKeyPairSync } from "crypto";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { buildAssistantEnvBlock, maskSecret, sessionRefreshToken } from "@/lib/mcp/assistantAccess";
import { extractBearerToken, tokensMatch } from "@/lib/mcp/auth";
import { loadEnvFile, loadLifeOSEnvFiles } from "@/lib/mcp/env";
import {
  mintIdTokenFromRefreshToken,
  pickFirebaseAuthMode,
  resetFirebaseAuthCache,
} from "@/lib/mcp/firebaseAuth";
import {
  encodeSseMessage,
  encodeSsePayload,
  isAllowedOrigin,
  isNotificationOrResponseOnly,
  wantsSse,
} from "@/lib/mcp/http";
import { handleMcpPayload, handleMcpRequest, listToolDescriptors } from "@/lib/mcp/protocol";
import { discoverDataFiles, isFirebaseConfigured, loadWorkspace, readStoreConfig } from "@/lib/mcp/store";
import { callTool } from "@/lib/mcp/tools";
import { deriveTaskStatus, normalizeWorkspace } from "@/lib/mcp/workspace";

const fixture = join(__dirname, "fixtures", "lifeos-export.json");

describe("MCP auth", () => {
  it("extracts bearer tokens and rejects empty compares", () => {
    expect(extractBearerToken("Bearer secret-token")).toBe("secret-token");
    expect(extractBearerToken("secret-token")).toBe("secret-token");
    expect(tokensMatch("", "abc")).toBe(false);
    expect(tokensMatch("abc", "")).toBe(false);
    expect(tokensMatch("abc", "abc")).toBe(true);
    expect(tokensMatch("abc", "abd")).toBe(false);
  });
});

describe("MCP env loader", () => {
  it("loads key=value without overriding existing vars", () => {
    const dir = mkdtempSync(join(tmpdir(), "lifeos-mcp-env-"));
    const file = join(dir, ".env");
    writeFileSync(file, "LIFEOS_USER_ID=from-file\n# comment\nLIFEOS_MCP_TOKEN=\"tok\"\n");
    const env: NodeJS.ProcessEnv = { LIFEOS_USER_ID: "already" };
    loadEnvFile(file, env);
    expect(env.LIFEOS_USER_ID).toBe("already");
    expect(env.LIFEOS_MCP_TOKEN).toBe("tok");
  });

  it("discovers .env.local from a directory", () => {
    const dir = mkdtempSync(join(tmpdir(), "lifeos-mcp-env2-"));
    writeFileSync(join(dir, ".env.local"), "LIFEOS_DATA_PATH=/tmp/export.json\n");
    const env: NodeJS.ProcessEnv = {};
    const loaded = loadLifeOSEnvFiles(dir, env);
    expect(loaded.some((path) => path.endsWith(".env.local"))).toBe(true);
    expect(env.LIFEOS_DATA_PATH).toBe("/tmp/export.json");
  });
});

describe("workspace normalize", () => {
  it("reads Settings export shape (events + brainItems)", () => {
    const workspace = normalizeWorkspace(
      {
        exportedAt: "2026-08-01T00:00:00.000Z",
        tasks: [{ id: 1, title: "A", project: "P", due: "2026-08-02", done: true }],
        events: [{ id: "e1", title: "Meet", start: "2026-08-02T10:00:00.000Z", source: "LifeOS" }],
        brainItems: ["idea"],
        gmail: { encrypted: "should-never-leak" },
      },
      { source: "file", sourcePath: "/tmp/export.json" },
    );
    expect(workspace.tasks[0].status).toBe("Done");
    expect(workspace.calendar[0].title).toBe("Meet");
    expect(workspace.brain).toEqual(["idea"]);
    expect(JSON.stringify(workspace)).not.toContain("should-never-leak");
    expect(workspace.exportedAt).toBe("2026-08-01T00:00:00.000Z");
  });

  it("coerces Firebase object maps", () => {
    const workspace = normalizeWorkspace(
      {
        tasks: { "0": { id: 9, title: "Mapped" }, "2": { id: 10, title: "Hole" } },
        projects: { a: { name: "Alpha", kind: "maintenance", color: "#000" } },
        calendar: { x: { id: "c1", title: "Class", start: "2026-01-01T00:00:00.000Z" } },
      },
      { source: "firebase", userId: "uid-1" },
    );
    expect(workspace.tasks.map((task) => task.id).sort((a, b) => a - b)).toEqual([9, 10]);
    expect(workspace.projects[0].name).toBe("Alpha");
    expect(workspace.calendar[0].id).toBe("c1");
  });

  it("derives status from done/canceled flags", () => {
    expect(deriveTaskStatus({ canceled: true })).toBe("Canceled");
    expect(deriveTaskStatus({ done: true })).toBe("Done");
    expect(deriveTaskStatus({ status: "Waiting" })).toBe("Waiting");
    expect(deriveTaskStatus({})).toBe("Not started");
  });
});

describe("store loader", () => {
  it("reads LIFEOS_DATA_PATH export JSON", async () => {
    const loaded = await loadWorkspace({ dataPath: fixture });
    expect(loaded.workspace.source).toBe("file");
    expect(loaded.workspace.tasks).toHaveLength(3);
    expect(loaded.workspace.classes[0].code).toBe("CHEM 201");
    expect(loaded.workspace.work.projects[0].name).toBe("Q3 launch");
  });

  it("discovers default snapshot files", () => {
    const dir = mkdtempSync(join(tmpdir(), "lifeos-mcp-disc-"));
    mkdirSync(join(dir, "data"));
    writeFileSync(join(dir, "data", "lifeos.json"), JSON.stringify({ tasks: [] }));
    expect(discoverDataFiles(dir, join(dir, "no-home")).some((path) => path.endsWith("lifeos.json"))).toBe(true);
  });

  it("returns an empty workspace with a warning when nothing is configured", async () => {
    const isolated = mkdtempSync(join(tmpdir(), "lifeos-mcp-missing-"));
    const loaded = await loadWorkspace({ cwd: isolated, home: isolated });
    expect(loaded.workspace.source).toBe("empty");
    expect(loaded.warning).toMatch(/No LifeOS store found/);
  });

  it("loads Firebase user nodes through REST", async () => {
    const fetchImpl: typeof fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        tasks: [{ id: 7, title: "Cloud task", project: "Inbox", due: "2026-09-01" }],
        gmail: { encrypted: "nope" },
      }),
    })) as unknown as typeof fetch;

    const loaded = await loadWorkspace({
      firebaseDbUrl: "https://example.firebaseio.com",
      firebaseAuth: "id-token",
      userId: "user-1",
      fetchImpl,
    });
    expect(loaded.workspace.source).toBe("firebase");
    expect(loaded.workspace.tasks[0].title).toBe("Cloud task");
    expect(JSON.stringify(loaded.workspace)).not.toContain("nope");
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://example.firebaseio.com/users/user-1.json?auth=id-token",
      expect.anything(),
    );
  });

  it("signs in with email/password before reading Firebase", async () => {
    const fetchImpl: typeof fetch = jest.fn(async (url) => {
      if (String(url).includes("identitytoolkit")) {
        return { ok: true, json: async () => ({ idToken: "minted-token" }) };
      }
      return { ok: true, json: async () => ({ tasks: [] }) };
    }) as unknown as typeof fetch;

    const loaded = await loadWorkspace({
      firebaseDbUrl: "https://example.firebaseio.com",
      firebaseApiKey: "api-key",
      firebaseEmail: "a@b.com",
      firebasePassword: "pw",
      userId: "user-1",
      fetchImpl,
    });
    expect(loaded.workspace.source).toBe("firebase");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("maps env names into store config", () => {
    const config = readStoreConfig({
      LIFEOS_DATA_PATH: "./export.json",
      LIFEOS_USER_ID: "abc",
      NEXT_PUBLIC_FIREBASE_DB_URL: "https://db.example.com",
      LIFEOS_FIREBASE_REFRESH_TOKEN: "refresh-xyz",
      LIFEOS_FIREBASE_API_KEY: "web-key",
      FIREBASE_SERVICE_ACCOUNT_JSON: '{"client_email":"a@b","private_key":"k"}',
    });
    expect(config.dataPath).toBe("./export.json");
    expect(config.userId).toBe("abc");
    expect(config.firebaseDbUrl).toBe("https://db.example.com");
    expect(config.firebaseRefreshToken).toBe("refresh-xyz");
    expect(config.firebaseApiKey).toBe("web-key");
    expect(config.serviceAccountJson).toContain("client_email");
  });

  it("treats Firebase as configured only when url, uid, and an auth method are set", () => {
    expect(isFirebaseConfigured({ firebaseDbUrl: "https://db.example.com", userId: "u" })).toBe(false);
    expect(isFirebaseConfigured({
      firebaseDbUrl: "https://db.example.com",
      userId: "u",
      firebaseRefreshToken: "r",
      firebaseApiKey: "k",
    })).toBe(true);
  });

  it("uses Firebase even when a discovered export file exists", async () => {
    resetFirebaseAuthCache();
    const dir = mkdtempSync(join(tmpdir(), "lifeos-mcp-shadow-"));
    mkdirSync(join(dir, ".lifeos"));
    writeFileSync(join(dir, ".lifeos", "export.json"), JSON.stringify({ tasks: [{ id: 1, title: "Stale export" }] }));

    const fetchImpl: typeof fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ tasks: [{ id: 2, title: "Live firebase" }] }),
    })) as unknown as typeof fetch;

    const loaded = await loadWorkspace({
      cwd: dir,
      home: dir,
      firebaseDbUrl: "https://example.firebaseio.com",
      firebaseAuth: "id-token",
      userId: "user-1",
      fetchImpl,
    });
    expect(loaded.workspace.source).toBe("firebase");
    expect(loaded.workspace.tasks[0].title).toBe("Live firebase");
    expect(fetchImpl).toHaveBeenCalled();
  });

  it("uses an explicit LIFEOS_DATA_PATH even when Firebase env is complete", async () => {
    const fetchImpl: typeof fetch = jest.fn() as unknown as typeof fetch;
    const loaded = await loadWorkspace({
      dataPath: fixture,
      firebaseDbUrl: "https://example.firebaseio.com",
      firebaseAuth: "id-token",
      userId: "user-1",
      fetchImpl,
    });
    expect(loaded.workspace.source).toBe("file");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("falls back to a discovered export only when Firebase env is incomplete", async () => {
    const dir = mkdtempSync(join(tmpdir(), "lifeos-mcp-fileonly-"));
    writeFileSync(join(dir, "lifeos-export.json"), JSON.stringify({ tasks: [{ id: 3, title: "Discovered" }] }));
    const loaded = await loadWorkspace({
      cwd: dir,
      home: join(dir, "no-home"),
      firebaseDbUrl: "https://example.firebaseio.com",
      userId: "user-1",
    });
    expect(loaded.workspace.source).toBe("file");
    expect(loaded.workspace.tasks[0].title).toBe("Discovered");
    expect(loaded.warning).toMatch(/discovered snapshot/);
  });

  it("mints an ID token from a refresh token before reading Firebase", async () => {
    resetFirebaseAuthCache();
    const fetchImpl: typeof fetch = jest.fn(async (url) => {
      if (String(url).includes("securetoken.googleapis.com")) {
        return { ok: true, json: async () => ({ id_token: "refreshed-id", expires_in: "3600" }) };
      }
      expect(String(url)).toContain("auth=refreshed-id");
      return { ok: true, json: async () => ({ tasks: [{ id: 4, title: "From refresh" }] }) };
    }) as unknown as typeof fetch;

    const loaded = await loadWorkspace({
      firebaseDbUrl: "https://example.firebaseio.com",
      firebaseApiKey: "api-key",
      firebaseRefreshToken: "google-refresh",
      userId: "user-1",
      fetchImpl,
    });
    expect(loaded.workspace.source).toBe("firebase");
    expect(loaded.workspace.tasks[0].title).toBe("From refresh");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("refreshes on 401 when a refresh token is available", async () => {
    resetFirebaseAuthCache();
    let rtdbCalls = 0;
    const fetchImpl: typeof fetch = jest.fn(async (url) => {
      const href = String(url);
      if (href.includes("securetoken.googleapis.com")) {
        return { ok: true, json: async () => ({ id_token: "new-id", expires_in: "3600" }) };
      }
      rtdbCalls += 1;
      if (href.includes("expired-id")) {
        return { ok: false, status: 401, statusText: "Unauthorized", json: async () => ({ error: "Permission denied" }) };
      }
      return { ok: true, json: async () => ({ tasks: [{ id: 5, title: "After refresh" }] }) };
    }) as unknown as typeof fetch;

    const loaded = await loadWorkspace({
      firebaseDbUrl: "https://example.firebaseio.com",
      firebaseAuth: "expired-id",
      firebaseApiKey: "api-key",
      firebaseRefreshToken: "google-refresh",
      userId: "user-1",
      fetchImpl,
    });
    expect(loaded.workspace.tasks[0].title).toBe("After refresh");
    expect(rtdbCalls).toBe(2);
  });

  it("reads Firebase with a service account access token", async () => {
    resetFirebaseAuthCache();
    const { privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
      publicKeyEncoding: { type: "spki", format: "pem" },
    });
    const serviceAccount = {
      client_email: "mcp@test.iam.gserviceaccount.com",
      private_key: privateKey,
    };
    const fetchImpl: typeof fetch = jest.fn(async (url) => {
      if (String(url).includes("oauth2.googleapis.com/token")) {
        return { ok: true, json: async () => ({ access_token: "ya29.admin", expires_in: 3600 }) };
      }
      expect(String(url)).toContain("access_token=ya29.admin");
      expect(String(url)).toContain("/users/user-1.json");
      return { ok: true, json: async () => ({ tasks: [{ id: 6, title: "Admin read" }] }) };
    }) as unknown as typeof fetch;

    const loaded = await loadWorkspace({
      firebaseDbUrl: "https://example.firebaseio.com",
      userId: "user-1",
      serviceAccountJson: JSON.stringify(serviceAccount),
      fetchImpl,
    });
    expect(loaded.workspace.source).toBe("firebase");
    expect(loaded.workspace.tasks[0].title).toBe("Admin read");
  });

  it("rejects a missing or invalid export file", async () => {
    await expect(loadWorkspace({ dataPath: join(tmpdir(), "no-such-lifeos.json") })).rejects.toThrow(/does not exist/);
    const dir = mkdtempSync(join(tmpdir(), "lifeos-mcp-badjson-"));
    const file = join(dir, "broken.json");
    writeFileSync(file, "{not json");
    await expect(loadWorkspace({ dataPath: file })).rejects.toThrow(/not valid JSON/);
  });

  it("surfaces Firebase HTTP errors", async () => {
    const fetchImpl: typeof fetch = jest.fn(async () => ({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({ error: "Permission denied" }),
    })) as unknown as typeof fetch;

    await expect(loadWorkspace({
      firebaseDbUrl: "https://example.firebaseio.com",
      firebaseAuth: "bad-token",
      userId: "user-1",
      fetchImpl,
    })).rejects.toThrow(/Firebase read failed \(401\)/);
  });
});

describe("MCP tools", () => {
  const workspace = normalizeWorkspace(JSON.parse(readFileSync(fixture, "utf8")), { source: "file" });

  it("lists open tasks by default and can include done", () => {
    const open = JSON.parse(callTool("list_tasks", {}, workspace).content[0].text);
    expect(open.tasks.map((task: { id: number }) => task.id)).toEqual([101, 102]);
    const all = JSON.parse(callTool("list_tasks", { includeDone: true }, workspace).content[0].text);
    expect(all.total).toBe(3);
  });

  it("filters academic tasks and fetches one task", () => {
    const listed = JSON.parse(callTool("list_tasks", { classId: "class-chem" }, workspace).content[0].text);
    expect(listed.tasks).toHaveLength(1);
    expect(listed.tasks[0].title).toMatch(/chapter 4/);
    const one = JSON.parse(callTool("get_task", { id: 101 }, workspace).content[0].text);
    expect(one.nextAction).toBe("Write MCP.md");
    expect(callTool("get_task", { id: 999 }, workspace).isError).toBe(true);
  });

  it("lists projects, classes, school, and work", () => {
    expect(JSON.parse(callTool("list_projects", {}, workspace).content[0].text).projects[0].name).toBe("LifeOS");
    expect(JSON.parse(callTool("list_classes", {}, workspace).content[0].text).classes[0].code).toBe("CHEM 201");
    const school = JSON.parse(callTool("list_school", {}, workspace).content[0].text);
    expect(school.profile.major).toBe("Chemistry");
    expect(school.academicTasks).toHaveLength(1);
    const work = JSON.parse(callTool("list_work", { kind: "tasks" }, workspace).content[0].text);
    expect(work.tasks[0].title).toBe("Draft API section");
    expect(callTool("list_work", { kind: "nope" }, workspace).isError).toBe(true);
  });

  it("hides stored iCal events unless asked", () => {
    const inApp = JSON.parse(callTool("list_events", {}, workspace).content[0].text);
    expect(inApp.events.map((event: { id: string }) => event.id)).toEqual(["evt-1"]);
    const all = JSON.parse(callTool("list_events", { includeExternal: true }, workspace).content[0].text);
    expect(all.total).toBe(2);
  });

  it("searches across collections", () => {
    const result = JSON.parse(callTool("search_lifeos", { query: "CHEM" }, workspace).content[0].text);
    expect(result.hits.some((hit: { type: string }) => hit.type === "class")).toBe(true);
    expect(callTool("search_lifeos", {}, workspace).isError).toBe(true);
    expect(callTool("nope", {}, workspace).isError).toBe(true);
  });

  it("reports store status", () => {
    const status = JSON.parse(callTool("lifeos_status", {}, workspace, { warning: "hi" }).content[0].text);
    expect(status.counts.openTasks).toBe(2);
    expect(status.warning).toBe("hi");
    expect(status.limitations.join(" ")).toMatch(/Read-only/);
  });
});

describe("Firebase auth helpers", () => {
  beforeEach(() => resetFirebaseAuthCache());

  it("picks auth methods in documented order", () => {
    expect(pickFirebaseAuthMode({ firebaseAuth: "id", firebaseRefreshToken: "r", firebaseApiKey: "k" })).toBe("id-token");
    expect(pickFirebaseAuthMode({
      firebaseEmail: "a@b.com",
      firebasePassword: "pw",
      firebaseApiKey: "k",
      firebaseRefreshToken: "r",
    })).toBe("password");
    expect(pickFirebaseAuthMode({ firebaseRefreshToken: "r", firebaseApiKey: "k" })).toBe("refresh-token");
    expect(pickFirebaseAuthMode({
      serviceAccountJson: JSON.stringify({ client_email: "a@b", private_key: "k" }),
    })).toBe("service-account");
    expect(pickFirebaseAuthMode({})).toBeNull();
  });

  it("mints an ID token from Identity Toolkit refresh_token grant", async () => {
    const fetchImpl: typeof fetch = jest.fn(async (url, init) => {
      expect(String(url)).toContain("https://securetoken.googleapis.com/v1/token?key=api-key");
      expect(String(init?.body)).toContain("grant_type=refresh_token");
      expect(String(init?.body)).toContain("refresh_token=rtok");
      return { ok: true, json: async () => ({ id_token: "minted", expires_in: "1800" }) };
    }) as unknown as typeof fetch;
    const minted = await mintIdTokenFromRefreshToken("api-key", "rtok", fetchImpl);
    expect(minted.idToken).toBe("minted");
    expect(minted.expiresInMs).toBe(1800 * 1000);
  });
});

describe("Assistant access helpers", () => {
  it("masks secrets and builds the stdio env block", () => {
    expect(maskSecret("")).toBe("not available");
    expect(maskSecret("abcd")).toBe("••••");
    expect(maskSecret("refresh-token-wxyz")).toBe("••••wxyz");
    expect(sessionRefreshToken({ refreshToken: "abc" })).toBe("abc");
    expect(sessionRefreshToken({ stsTokenManager: { refreshToken: "nested" } })).toBe("nested");
    expect(buildAssistantEnvBlock({
      userId: "uid-1",
      dbUrl: "https://db.example.com",
      apiKey: "key",
      refreshToken: "rt",
    })).toBe(
      "LIFEOS_USER_ID=uid-1\nLIFEOS_FIREBASE_DB_URL=https://db.example.com\nLIFEOS_FIREBASE_API_KEY=key\nLIFEOS_FIREBASE_REFRESH_TOKEN=rt",
    );
  });
});

describe("MCP Streamable HTTP helpers", () => {
  it("detects SSE accept and encodes message events", () => {
    expect(wantsSse("application/json, text/event-stream")).toBe(true);
    expect(wantsSse("application/json")).toBe(false);
    expect(encodeSseMessage({ jsonrpc: "2.0", id: 1, result: {} })).toBe(
      "event: message\ndata: {\"jsonrpc\":\"2.0\",\"id\":1,\"result\":{}}\n\n",
    );
    expect(encodeSsePayload([{ id: 1 }, { id: 2 }])).toContain("event: message");
  });

  it("treats notifications and client responses as 202 bodies", () => {
    expect(isNotificationOrResponseOnly({ jsonrpc: "2.0", method: "notifications/initialized" })).toBe(true);
    expect(isNotificationOrResponseOnly({ jsonrpc: "2.0", id: 1, method: "initialize" })).toBe(false);
    expect(isNotificationOrResponseOnly({ jsonrpc: "2.0", id: 1, result: {} })).toBe(true);
  });

  it("blocks remote origins against localhost (DNS rebinding) and allows hosted clients", () => {
    expect(isAllowedOrigin("https://evil.example", "localhost:3000")).toBe(false);
    expect(isAllowedOrigin("http://localhost:3000", "localhost:3000")).toBe(true);
    expect(isAllowedOrigin(null, "lifeos-mu-three.vercel.app")).toBe(true);
    expect(isAllowedOrigin("https://cursor.com", "lifeos-mu-three.vercel.app")).toBe(true);
  });
});

describe("MCP protocol", () => {
  const config = { dataPath: fixture };

  it("advertises the expected tools", () => {
    const names = listToolDescriptors().map((tool) => tool.name);
    expect(names).toEqual([
      "lifeos_status",
      "list_tasks",
      "get_task",
      "list_projects",
      "list_classes",
      "list_school",
      "list_work",
      "list_events",
      "search_lifeos",
    ]);
  });

  it("handles initialize, tools/list, and tools/call", async () => {
    const init = await handleMcpRequest({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05" } }, config);
    expect(init?.result).toMatchObject({ serverInfo: { name: "lifeos" } });

    const listed = await handleMcpRequest({ jsonrpc: "2.0", id: 2, method: "tools/list" }, config);
    const tools = (listed?.result as { tools: Array<{ name: string }> }).tools;
    expect(tools.length).toBeGreaterThanOrEqual(9);

    const called = await handleMcpRequest({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "list_tasks", arguments: { project: "LifeOS" } },
    }, config);
    const text = (called?.result as { content: Array<{ text: string }> }).content[0].text;
    expect(text).toContain("Finish MCP connector brief");
  });

  it("ignores initialized notifications and answers ping", async () => {
    expect(await handleMcpRequest({ jsonrpc: "2.0", method: "notifications/initialized" }, config)).toBeNull();
    expect(await handleMcpRequest({ jsonrpc: "2.0", id: 8, method: "ping" }, config)).toEqual({
      jsonrpc: "2.0",
      id: 8,
      result: {},
    });
  });

  it("handles batch payloads and unknown methods", async () => {
    const batch = await handleMcpPayload(
      [
        { jsonrpc: "2.0", id: 1, method: "ping" },
        { jsonrpc: "2.0", method: "notifications/initialized" },
      ],
      config,
    );
    expect(Array.isArray(batch)).toBe(true);
    expect((batch as Array<{ id: number }>).map((item) => item.id)).toEqual([1]);

    const missing = await handleMcpRequest({ jsonrpc: "2.0", id: 9, method: "nope" }, config);
    expect(missing?.error?.code).toBe(-32601);
  });

  it("validates JSON-RPC shape and tools/call params", async () => {
    const badVersion = await handleMcpRequest({ jsonrpc: "1.0", id: 1, method: "ping" }, config);
    expect(badVersion?.error?.code).toBe(-32600);

    const noMethod = await handleMcpRequest({ jsonrpc: "2.0", id: 2 }, config);
    expect(noMethod?.error?.code).toBe(-32600);

    const noName = await handleMcpRequest({ jsonrpc: "2.0", id: 3, method: "tools/call", params: {} }, config);
    expect(noName?.error?.code).toBe(-32602);

    const resources = await handleMcpRequest({ jsonrpc: "2.0", id: 4, method: "resources/list" }, config);
    expect(resources?.result).toEqual({ resources: [] });

    const prompts = await handleMcpRequest({ jsonrpc: "2.0", id: 5, method: "prompts/list" }, config);
    expect(prompts?.result).toEqual({ prompts: [] });

    const invalid = await handleMcpPayload("nope", config);
    expect((invalid as { error?: { code: number } }).error?.code).toBe(-32700);
  });
});
