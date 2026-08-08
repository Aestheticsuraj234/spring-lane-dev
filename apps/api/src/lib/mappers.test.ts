import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  APP_NAME_PATTERN,
  slugifyAppName,
  toBranchDto,
  toEnvVarDto,
  toRepoDto,
} from "./mappers.js";

describe("mappers", () => {
  it("slugifies app names", () => {
    assert.equal(slugifyAppName("My Cool App"), "my-cool-app");
    assert.equal(slugifyAppName("  Hello__World!!  "), "hello-world");
    assert.equal(APP_NAME_PATTERN.test("my-cool-app"), true);
    assert.equal(APP_NAME_PATTERN.test("-bad"), false);
  });

  it("maps repo and branch DTOs", () => {
    const repo = toRepoDto({
      id: 1,
      full_name: "acme/demo",
      private: false,
      default_branch: "main",
      description: "Demo",
      updated_at: "2026-01-01T00:00:00Z",
    });
    assert.equal(repo.fullName, "acme/demo");
    assert.equal(repo.defaultBranch, "main");

    const branch = toBranchDto({
      name: "main",
      commit: { sha: "abc123" },
    });
    assert.equal(branch.commitSha, "abc123");
  });

  it("maps env var DTOs without values", () => {
    assert.deepEqual(toEnvVarDto("DATABASE_URL"), {
      key: "DATABASE_URL",
      hasValue: true,
    });
  });
});
