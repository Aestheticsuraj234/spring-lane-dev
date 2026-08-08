import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { LogStorage } from "./log-storage.js";

describe("LogStorage", () => {
  it("writes and reads deployment logs", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "spring-lane-logs-"));
    const storage = new LogStorage(dir);
    const deploymentId = "dep_test_1";

    await storage.init(deploymentId);
    await storage.append(deploymentId, "line one\n");
    await storage.append(deploymentId, "line two\n");

    const logs = await storage.read(deploymentId);
    assert.equal(logs, "line one\nline two\n");

    const onDisk = await readFile(storage.absolutePath(deploymentId), "utf8");
    assert.equal(onDisk, logs);
  });

  it("returns null for missing logs", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "spring-lane-logs-"));
    const storage = new LogStorage(dir);
    const logs = await storage.read("missing");
    assert.equal(logs, null);
  });
});
