import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appHost,
  appPublicUrl,
  buildTraefikLabels,
  routerName,
} from "./traefik-labels.js";

describe("traefik labels", () => {
  it("builds dev labels for localhost", () => {
    const labels = buildTraefikLabels({
      appName: "demo",
      deploymentId: "clxyz1234567890",
      port: 8080,
      baseDomain: "localhost",
    });

    assert.equal(labels["traefik.enable"], "true");
    assert.equal(
      labels["traefik.http.routers.sl-demo-clxyz123.rule"],
      "Host(`demo.localhost`)",
    );
    assert.equal(
      labels["traefik.http.routers.sl-demo-clxyz123.entrypoints"],
      "web",
    );
    assert.equal(
      labels["traefik.http.services.sl-demo-clxyz123.loadbalancer.server.port"],
      "8080",
    );
    assert.equal(labels["spring-lane.app"], "demo");
  });

  it("builds prod labels with TLS", () => {
    const labels = buildTraefikLabels({
      appName: "demo",
      deploymentId: "abc",
      port: 8080,
      baseDomain: "example.com",
    });

    assert.equal(
      labels["traefik.http.routers.sl-demo-abc.entrypoints"],
      "websecure",
    );
    assert.equal(
      labels["traefik.http.routers.sl-demo-abc.tls.certresolver"],
      "letsencrypt",
    );
  });

  it("formats public URLs", () => {
    assert.equal(appHost("demo", "localhost"), "demo.localhost");
    assert.equal(appPublicUrl("demo", "localhost"), "http://demo.localhost");
    assert.equal(appPublicUrl("demo", "example.com"), "https://demo.example.com");
  });

  it("creates stable router names", () => {
    assert.equal(routerName("my-app", "deployment-id-1"), "sl-my-app-deployme");
  });
});
