#!/usr/bin/env node
"use strict";

const { spawn } = require("child_process");
const path = require("path");

let tsxCli;
try {
  tsxCli = require.resolve("tsx/cli");
} catch {
  process.stderr.write("LifeOS MCP: install dependencies first (`npm install` in the repo root) so tsx is available.\n");
  process.exit(1);
}

const entry = path.join(__dirname, "stdio.ts");
const child = spawn(process.execPath, [tsxCli, entry, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
