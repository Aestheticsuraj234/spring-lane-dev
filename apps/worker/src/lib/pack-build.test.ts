import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import {
  buildPackDockerArgs,
  dockerSocketMountArgs,
  dockerSourceMountArgs,
  normalizeBuilderImage,
  packContainerEnvArgs,
} from "./pack-build.js";

describe("pack build helpers", () => {
  it("mounts the repo into /workspace", () => {
    const args = dockerSourceMountArgs("data/builds/deploy-1");
    assert.match(args[1], /[/\\]data[/\\]builds[/\\]deploy-1:\/workspace$/);
  });

  it("normalizes builder image tags", () => {
    assert.equal(
      normalizeBuilderImage("paketobuildpacks/builder-jammy-base"),
      "paketobuildpacks/builder-jammy-base:latest",
    );
    assert.equal(
      normalizeBuilderImage("paketobuildpacks/builder-jammy-base:0.4.611"),
      "paketobuildpacks/builder-jammy-base:0.4.611",
    );
  });

  it("sets docker host and cache key for pack containers", () => {
    assert.deepEqual(packContainerEnvArgs("cache-key"), [
      "-e",
      "DOCKER_HOST=unix:///var/run/docker.sock",
      "-e",
      "PACK_VOLUME_KEY=cache-key",
    ]);
  });

  it("builds docker run args for pack", () => {
    const repoDir = path.join("data", "builds", "deploy-1");
    const { command, args } = buildPackDockerArgs({
      repoDir,
      imageName: "spring-lane/demo:abc123",
      packImage: "buildpacksio/pack:0.40.8",
      builder: "paketobuildpacks/builder-jammy-base",
      packVolumeKey: "cache-key",
    });

    assert.equal(command, "docker");
    assert.equal(args[0], "run");
    assert.equal(args[1], "--rm");
    assert.ok(args.includes("buildpacksio/pack:0.40.8"));
    assert.ok(args.includes("build"));
    assert.ok(args.includes("spring-lane/demo:abc123"));
    assert.ok(args.includes("--path"));
    assert.ok(args.includes("/workspace"));
    assert.ok(args.includes("--builder"));
    assert.ok(args.includes("paketobuildpacks/builder-jammy-base"));
    assert.ok(args.includes("--trust-builder"));
    assert.ok(args.includes("PACK_VOLUME_KEY=cache-key"));
  });

  it("honors a custom docker socket mount", () => {
    const args = dockerSocketMountArgs("/custom/docker.sock");
    assert.deepEqual(args, ["-v", "/custom/docker.sock:/var/run/docker.sock"]);
  });
});
