import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { imageTag } from "./build.js";

describe("build helpers", () => {
  it("formats docker image tags", () => {
    assert.equal(
      imageTag("demo", "clxyz1234567890"),
      "spring-lane/demo:clxyz1234567",
    );
  });
});
