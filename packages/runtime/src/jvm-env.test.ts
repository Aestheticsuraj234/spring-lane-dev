import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPaketoJvmEnv,
  effectiveContainerMemoryMb,
  mergeContainerEnv,
} from "./jvm-env.js";

describe("jvm env", () => {
  it("enforces a Java-safe memory floor", () => {
    assert.equal(effectiveContainerMemoryMb(512), 768);
    assert.equal(effectiveContainerMemoryMb(1024), 1024);
  });

  it("tunes thread count for containers with 768MB or less", () => {
    assert.deepEqual(buildPaketoJvmEnv(512), {
      BPL_JVM_THREAD_COUNT: "50",
      BPL_JVM_HEAD_ROOM: "0",
    });
    assert.deepEqual(buildPaketoJvmEnv(768), {
      BPL_JVM_THREAD_COUNT: "50",
    });
  });

  it("leaves larger containers on Paketo defaults", () => {
    assert.deepEqual(buildPaketoJvmEnv(1024), {});
  });

  it("lets user env override platform defaults", () => {
    assert.deepEqual(
      mergeContainerEnv(
        { BPL_JVM_THREAD_COUNT: "50" },
        { BPL_JVM_THREAD_COUNT: "100", FOO: "bar" },
      ),
      { BPL_JVM_THREAD_COUNT: "100", FOO: "bar" },
    );
  });
});
