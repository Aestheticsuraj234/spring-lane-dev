export interface TraefikLabelOptions {
  appName: string;
  deploymentId: string;
  port: number;
  baseDomain: string;
  traefikNetwork: string;
}

export function routerName(appName: string, deploymentId: string): string {
  return `sl-${appName}-${deploymentId.slice(0, 8)}`;
}

export function appHost(appName: string, baseDomain: string): string {
  return `${appName}.${baseDomain}`;
}

export function appPublicUrl(appName: string, baseDomain: string): string {
  const protocol = baseDomain === "localhost" ? "http" : "https";
  return `${protocol}://${appHost(appName, baseDomain)}`;
}

export function buildTraefikLabels(options: TraefikLabelOptions): Record<string, string> {
  const router = routerName(options.appName, options.deploymentId);
  const host = appHost(options.appName, options.baseDomain);
  const isDev = options.baseDomain === "localhost";

  const labels: Record<string, string> = {
    "traefik.enable": "true",
    "traefik.docker.network": options.traefikNetwork,
    [`traefik.http.routers.${router}.rule`]: `Host(\`${host}\`)`,
    [`traefik.http.routers.${router}.service`]: router,
    [`traefik.http.services.${router}.loadbalancer.server.port`]: String(options.port),
    "spring-lane.app": options.appName,
    "spring-lane.deployment": options.deploymentId,
  };

  if (isDev) {
    labels[`traefik.http.routers.${router}.entrypoints`] = "web";
  } else {
    labels[`traefik.http.routers.${router}.entrypoints`] = "websecure";
    labels[`traefik.http.routers.${router}.tls.certresolver`] = "letsencrypt";
  }

  return labels;
}
