import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import {
  buildPackDockerArgs,
  dockerSocketMountArgs,
  dockerSourceMountArgs,
} from "./pack-build.js";

describe("pack build helpers", () => {
  it("mounts the repo into /workspace", () => {
    const args = dockerSourceMountArgs("data/builds/deploy-1");
    assert.match(args[1], /[/\\]data[/\\]builds[/\\]deploy-1:\/workspace$/);
  });

  it("builds docker run args for pack", () => {
    const repoDir = path.join("data", "builds", "deploy-1");
    const { command, args } = buildPackDockerArgs({
      repoDir,
      imageName: "spring-lane/demo:abc123",
      packImage: "buildpacksio/pack:0.36.4",
      builder: "paketobuildpacks/builder-jammy-base",
    });

    assert.equal(command, "docker");
    assert.equal(args[0], "run");
    assert.equal(args[1], "--rm");
    assert.ok(args.includes("buildpacksio/pack:0.36.4"));
    assert.ok(args.includes("build"));
    assert.ok(args.includes("spring-lane/demo:abc123"));
    assert.ok(args.includes("--path"));
    assert.ok(args.includes("/workspace"));
    assert.ok(args.includes("--builder"));
    assert.ok(args.includes("paketobuildpacks/builder-jammy-base"));
    assert.ok(args.includes("--trust-builder"));
  });

  it("honors a custom docker socket mount", () => {
    const args = dockerSocketMountArgs("/custom/docker.sock");
    assert.deepEqual(args, ["-v", "/custom/docker.sock:/var/run/docker.sock"]);
  });
});
