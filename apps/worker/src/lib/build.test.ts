import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { detectBuildTool, imageTag } from "./build.js";

describe("build helpers", () => {
  it("formats docker image tags", () => {
    assert.equal(
      imageTag("demo", "clxyz1234567890"),
      "spring-lane/demo:clxyz1234567",
    );
  });

  it("rejects Node.js repos with a helpful message", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "spring-lane-build-"));
    try {
      await writeFile(path.join(dir, "package.json"), "{}");
      await assert.rejects(
        () => detectBuildTool(dir),
        /looks like a Node.js project/,
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("detects nested Spring Boot projects", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "spring-lane-build-"));
    const nested = path.join(dir, "app", "app");
    try {
      await mkdir(nested, { recursive: true });
      await writeFile(path.join(nested, "pom.xml"), "<project/>");
      const tool = await detectBuildTool(dir, "app/app");
      assert.equal(tool, "maven");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
