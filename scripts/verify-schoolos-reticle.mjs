#!/usr/bin/env node
import http from "node:http";

const PORT = 4400;
let endpoint = null;
let next = 1;
const pending = new Map();
let SESSION = process.env.RETICLE_SESSION || "";

function parseToolResult(message) {
  const text = message?.result?.content?.[0]?.text;
  if (!text) return message;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function send(method, params) {
  const id = next++;
  const body = JSON.stringify({ jsonrpc: "2.0", id, method, params });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`timeout waiting for ${method}`));
    }, 90000);
    pending.set(id, (message) => {
      clearTimeout(timer);
      resolve(message);
    });
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: PORT,
        path: endpoint,
        method: "POST",
        headers: { "Content-Type": "application/json", Host: "127.0.0.1:4400" },
      },
      (res) => res.resume(),
    );
    req.on("error", reject);
    req.end(body);
  });
}

async function call(name, args = {}) {
  const payload = name === "reticle_sessions" ? args : { sessionId: SESSION, ...args };
  const message = await send("tools/call", { name, arguments: payload });
  if (message.error) throw new Error(`${name}: ${JSON.stringify(message.error)}`);
  return parseToolResult(message);
}

function refsFromTree(tree, pattern) {
  const text = typeof tree === "string" ? tree : "";
  const out = [];
  const re = /- (button|link|textbox|searchbox|tab|menuitem) "([^"]*)"[^\n]*?\(ref=(e\d+)\)/g;
  let m;
  while ((m = re.exec(text))) {
    const [, role, name, ref] = m;
    if (!pattern || pattern.test(name) || pattern.test(role)) out.push({ role, name, ref });
  }
  // also match testid style annotations if present
  const re2 = /testid="([^"]+)"[^\n]*?\(ref=(e\d+)\)|\(ref=(e\d+)\)[^\n]*?testid="([^"]+)"/g;
  while ((m = re2.exec(text))) {
    out.push({ testid: m[1] || m[4], ref: m[2] || m[3] });
  }
  return out;
}

function findRef(tree, nameRe) {
  return refsFromTree(tree, nameRe)[0]?.ref;
}

async function start() {
  await send("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "schoolos-verify", version: "1.0.0" },
  });
  http
    .request(
      {
        hostname: "127.0.0.1",
        port: PORT,
        path: endpoint,
        method: "POST",
        headers: { "Content-Type": "application/json", Host: "127.0.0.1:4400" },
      },
      (res) => res.resume(),
    )
    .end(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }));

  const sessions = await call("reticle_sessions");
  SESSION = sessions.sessions?.[0]?.sessionId || SESSION;
  console.log("SESSION", SESSION, "skew", sessions.sessions?.[0]?.versionSkew || "none");

  let snap = await call("reticle_snapshot", { mode: "interactive" });
  console.log("WARNING", snap.warning || "none");
  console.log("TREE_HEAD", String(snap.tree).slice(0, 400));

  const loginRef = findRef(snap.tree, /Dev:\s*Test Login/i);
  if (loginRef) {
    const verdict = await call("reticle_act_and_wait", {
      ref: loginRef,
      action: "click",
      until: {
        kind: "allOf",
        predicates: [
          { kind: "element", query: { text: "School" } },
          { kind: "console", level: "error", absent: true },
        ],
      },
      timeout_ms: 25000,
    });
    console.log("LOGIN", JSON.stringify({ verified: verdict.verified, verifiedReason: verdict.verifiedReason, because: verdict.because }));
  } else {
    console.log("NO_LOGIN — maybe already in app");
  }

  snap = await call("reticle_snapshot", { mode: "interactive" });
  console.log("TREE_AFTER_LOGIN", String(snap.tree).slice(0, 600));
  const schoolRef = findRef(snap.tree, /^School$/);
  if (!schoolRef) {
    console.log("NO_SCHOOL_NAV");
    process.exit(2);
  }

  const schoolOpen = await call("reticle_act_and_wait", {
    ref: schoolRef,
    action: "click",
    until: {
      kind: "allOf",
      predicates: [
        { kind: "element", query: { testid: "school-planner" } },
        { kind: "console", level: "error", absent: true },
      ],
    },
    timeout_ms: 25000,
  });
  console.log("SCHOOL_OPEN", JSON.stringify({ verified: schoolOpen.verified, verifiedReason: schoolOpen.verifiedReason, because: schoolOpen.because }));

  snap = await call("reticle_snapshot", { mode: "interactive" });
  console.log("SCHOOL_TREE", String(snap.tree).slice(0, 900));

  // Prefer testid via query tool if available
  let timetableRef = null;
  try {
    const q = await call("reticle_query", { testid: "school-nav-timetable" });
    timetableRef = q?.ref || q?.nodes?.[0]?.ref || q?.matches?.[0]?.ref;
    console.log("QUERY_TIMETABLE", JSON.stringify(q).slice(0, 300));
  } catch (e) {
    console.log("QUERY_FAIL", e.message);
  }
  if (!timetableRef) timetableRef = findRef(snap.tree, /^Timetable$/);

  if (timetableRef) {
    const v = await call("reticle_act_and_wait", {
      ref: timetableRef,
      action: "click",
      until: {
        kind: "allOf",
        predicates: [
          { kind: "element", query: { testid: "school-timetable" } },
          { kind: "console", level: "error", absent: true },
        ],
      },
      timeout_ms: 20000,
    });
    console.log("TIMETABLE", JSON.stringify({ verified: v.verified, verifiedReason: v.verifiedReason, because: v.because }));
  }

  // Home + quick capture
  try {
    const homeQ = await call("reticle_query", { testid: "school-nav-home" });
    const homeRef = homeQ?.ref || homeQ?.matches?.[0]?.ref;
    if (homeRef) await call("reticle_act", { ref: homeRef, action: "click" });
  } catch {}

  snap = await call("reticle_snapshot", { mode: "interactive" });
  let captureRef = null;
  try {
    const cq = await call("reticle_query", { testid: "school-open-capture" });
    captureRef = cq?.ref || cq?.matches?.[0]?.ref;
  } catch {}
  if (!captureRef) captureRef = findRef(snap.tree, /Quick capture|Type anything/i);

  if (captureRef) {
    const open = await call("reticle_act_and_wait", {
      ref: captureRef,
      action: "click",
      until: {
        kind: "allOf",
        predicates: [
          { kind: "element", query: { testid: "school-capture-input" } },
          { kind: "console", level: "error", absent: true },
        ],
      },
      timeout_ms: 20000,
    });
    console.log("CAPTURE_OPEN", JSON.stringify({ verified: open.verified, verifiedReason: open.verifiedReason, because: open.because }));

    const iq = await call("reticle_query", { testid: "school-capture-input" });
    const inputRef = iq?.ref || iq?.matches?.[0]?.ref;
    if (inputRef) {
      await call("reticle_act", { ref: inputRef, action: "fill", text: "Read chapter 4" });
      const sq = await call("reticle_query", { testid: "school-capture-submit" });
      const submitRef = sq?.ref || sq?.matches?.[0]?.ref;
      if (submitRef) {
        const submitV = await call("reticle_act_and_wait", {
          ref: submitRef,
          action: "click",
          until: {
            kind: "allOf",
            predicates: [
              { kind: "console", level: "error", absent: true },
              {
                kind: "anyOf",
                predicates: [
                  { kind: "element", query: { testid: "school-capture-input" }, absent: true },
                  { kind: "element", query: { text: "Course code" } },
                  { kind: "element", query: { text: "Add a course first" } },
                ],
              },
            ],
          },
          timeout_ms: 20000,
        });
        console.log("CAPTURE_SUBMIT", JSON.stringify({ verified: submitV.verified, verifiedReason: submitV.verifiedReason, because: submitV.because }));
      }
    }
  } else {
    console.log("NO_CAPTURE");
  }

  await call("reticle_session", { action: "yield", mode: "waiting" }).catch(() => {});
}

http
  .get({ hostname: "127.0.0.1", port: PORT, path: "/mcp/sse", headers: { Host: "127.0.0.1:4400" }, agent: false }, (res) => {
    let buffer = "";
    res.setEncoding("utf8");
    res.on("data", (chunk) => {
      buffer += chunk;
      const frames = buffer.split("\n\n");
      buffer = frames.pop();
      for (const frame of frames) {
        const event = /^event: (.*)$/m.exec(frame)?.[1] ?? "message";
        const data = /^data: (.*)$/m.exec(frame)?.[1] ?? "";
        if (event === "endpoint") {
          endpoint = data;
          start().catch((err) => {
            console.error("FATAL", err);
            process.exit(1);
          });
          continue;
        }
        try {
          const message = JSON.parse(data);
          pending.get(message.id)?.(message);
          pending.delete(message.id);
        } catch {}
      }
    });
  })
  .on("error", (err) => {
    console.error(err);
    process.exit(1);
  });
