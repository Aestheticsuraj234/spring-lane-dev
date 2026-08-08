import type { Request } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { Octokit } from "@octokit/rest";
import { auth } from "../auth.js";
import type { AuthedRequest } from "../middleware/require-auth.js";

export async function getGithubAccessToken(req: Request): Promise<string> {
  const session = (req as AuthedRequest).session;
  const result = await auth.api.getAccessToken({
    body: {
      providerId: "github",
      userId: session.user.id,
    },
    headers: fromNodeHeaders(req.headers),
  });

  if (!result?.accessToken) {
    throw new GithubAuthError("GitHub account is not linked");
  }

  return result.accessToken;
}

export async function createGithubClient(req: Request): Promise<Octokit> {
  const accessToken = await getGithubAccessToken(req);
  return new Octokit({ auth: accessToken });
}

export class GithubAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GithubAuthError";
  }
}

export function parseRepoFullName(fullName: string): { owner: string; repo: string } {
  const [owner, repo] = fullName.split("/");
  if (!owner || !repo) {
    throw new Error("Invalid repository name");
  }
  return { owner, repo };
}
