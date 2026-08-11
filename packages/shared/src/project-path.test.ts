import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeProjectPath,
  packProjectPath,
  resolveProjectDir,
} from "./project-path.js";

describe("project path", () => {
  it("normalizes empty paths to repo root", () => {
    assert.equal(normalizeProjectPath(""), "");
    assert.equal(normalizeProjectPath("."), "");
    assert.equal(normalizeProjectPath("   "), "");
  });

  it("normalizes nested relative paths", () => {
    assert.equal(normalizeProjectPath("app/app"), "app/app");
    assert.equal(normalizeProjectPath("/app/app/"), "app/app");
    assert.equal(normalizeProjectPath("app\\app"), "app/app");
  });

  it("rejects unsafe paths", () => {
    assert.throws(() => normalizeProjectPath("../secrets"), /must not contain/);
    assert.throws(() => normalizeProjectPath("C:\\abs\\path"), /relative path/);
  });

  it("resolves project directories inside the clone", () => {
    const projectDir = resolveProjectDir("/tmp/repo", "app/app");
    assert.match(projectDir, /[/\\]tmp[/\\]repo[/\\]app[/\\]app$/);
  });

  it("maps pack workspace paths", () => {
    assert.equal(packProjectPath(""), "/workspace");
    assert.equal(packProjectPath("app/app"), "/workspace/app/app");
  });
});
